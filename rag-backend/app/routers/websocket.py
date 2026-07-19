import json
from typing import cast
import asyncio
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from rq.job import Job

from app.core.queue import redis_conn, redis_async_conn
from app.config.database import get_db
from app.models.user import User
from app.models import JobIngestion, JobQueryKb
from app.models.enum import RoleEnum
from app.utils.security import decode_token
from app.services.collections import check_is_gestionnaire, get_collection_without_relations


router = APIRouter()


async def get_websocket_user(websocket: WebSocket, db: Session) -> User | None:
    """Validate token from WebSocket query parameters or subprotocols and return the User."""
    token = websocket.query_params.get("token")
    if not token:
        # Tenter de récupérer le token via le header Sec-WebSocket-Protocol
        protocol_header = websocket.headers.get("sec-websocket-protocol")
        if protocol_header:
            protocols = [p.strip() for p in protocol_header.split(",")]
            # Le format attendu côté client est : ["access_token", token]
            if len(protocols) > 1 and protocols[0] == "access_token":
                token = protocols[1]

    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token manquant")
        return None

    payload = decode_token(token)
    if payload is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token invalide")
        return None

    if payload.get("type") != "access":
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token invalide")
        return None

    username: str | None = payload.get("sub")
    if username is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token invalide")
        return None

    user = db.query(User).filter(User.username == username).first()

    if user is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token invalide")
        return None

    if not bool(user.is_active):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Utilisateur désactivé")
        return None

    return user


def check_job_permission(job_id: str, user: User, db: Session) -> bool:
    """Vérifie si un utilisateur est autorisé à écouter les statuts d'un job."""
    # 1. Vérification en base de données
    db_ingestion = db.query(JobIngestion).filter(JobIngestion.uuid == job_id).first()
    db_query = db.query(JobQueryKb).filter(JobQueryKb.uuid == job_id).first()

    if db_query:
        if user.role == RoleEnum.ADMIN:
            return True
        if user.role == RoleEnum.GESTIONNAIRE:
            if check_is_gestionnaire(cast(int, db_query.collection_id), user, db):
                return True
        if db_query.creator_id == user.id:
            return True
        return False
        
    if db_ingestion:
        if user.role == RoleEnum.ADMIN:
            return True
        if user.role == RoleEnum.GESTIONNAIRE:
            if check_is_gestionnaire(cast(int, db_ingestion.collection_id), user, db):
                return True
        return False

    # 2. Si le job n'est pas encore en base de données (ex: en attente dans Redis) ou est un job de test
    try:
        job = Job.fetch(job_id, connection=redis_conn)
        collection_id = job.kwargs.get("collection_id")
        user_id = job.kwargs.get("user_id")

        # Analyse des arguments positionnels si besoin
        if collection_id is None and len(job.args) > 1:
            func_name = job.func_name
            if func_name == "app.jobs.ingestion.ingestion_job":
                collection_id = job.args[1] if len(job.args) > 1 else None
            elif func_name == "app.jobs.query_kb.query_kb_job":
                collection_id = job.args[2] if len(job.args) > 2 else None
                user_id = job.args[5] if len(job.args) > 5 else None
            elif func_name == "app.jobs.query_test.query_test":
                collection_id = job.args[1] if len(job.args) > 1 else None

        if user.role == RoleEnum.ADMIN:
            return True
            
        if user_id is not None and user_id == user.id:
            return True
            
        if collection_id is not None:
            if user.role == RoleEnum.GESTIONNAIRE and check_is_gestionnaire(cast(int, collection_id), user, db):
                return True
            else:
                collection_obj = get_collection_without_relations(collection_id, user, db)
                if collection_obj is not None:
                    # Les utilisateurs simples ne peuvent voir que les jobs de requêtage
                    if job.func_name in ["app.jobs.query_kb.query_kb_job", "app.jobs.query_test.query_test"]:
                        return True
        return False
    except Exception:
        return False


@router.websocket("/ws/jobs")
async def job_ws(websocket: WebSocket, db: Session = Depends(get_db)):
    # Validate token before accepting the connection
    current_user = await get_websocket_user(websocket, db)
    if current_user is None:
        return  # WebSocket already closed by get_websocket_user
    
    # Accepter la connexion en retournant le sous-protocole attendu par le client
    protocol_header = websocket.headers.get("sec-websocket-protocol")
    subprotocol = None
    if protocol_header and "access_token" in protocol_header:
        subprotocol = "access_token"
        
    await websocket.accept(subprotocol=subprotocol)

    pubsub = redis_async_conn.pubsub()
    subscribed_jobs = set()

    listener_running = True
    has_subscription = False

    async def redis_listener():
        nonlocal has_subscription
        while listener_running:
            # Wait until client subscribes to at least one channel
            if not has_subscription:
                await asyncio.sleep(0.1)
                continue

            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message["type"] == "message":
                channel_raw = message.get("channel")
                channel = channel_raw.decode("utf-8") if isinstance(channel_raw, bytes) else str(channel_raw)
                
                job_id = channel.split(":")[1]
                
                data_raw = message.get("data")
                data_str = data_raw.decode("utf-8") if isinstance(data_raw, bytes) else str(data_raw)
                data = json.loads(data_str)
                
                await websocket.send_json({
                    "job_id": job_id, 
                    **data
                })
            await asyncio.sleep(0.01)

    listener_task = asyncio.create_task(redis_listener())

    try:
        while True:
            client_message = await websocket.receive_json()
            print("Received message from client:", client_message)

            action = client_message.get("action")
            job_id = client_message.get("job_id")

            if action == "subscribe" and job_id:
                # Vérifier l'autorisation avant de souscrire
                if not check_job_permission(job_id, current_user, db):
                    await websocket.send_json({
                        "error": "Non autorisé",
                        "job_id": job_id,
                        "message": "Vous n'avez pas la permission de vous abonner aux événements de ce job"
                    })
                    continue

                channel = f"job:{job_id}"
                await pubsub.subscribe(channel)
                subscribed_jobs.add(channel)
                has_subscription = True

            if action == "unsubscribe" and job_id:
                channel = f"job:{job_id}"
                await pubsub.unsubscribe(channel)
                subscribed_jobs.discard(channel)
                has_subscription = len(subscribed_jobs) > 0

    except WebSocketDisconnect:
        print("Client disconnected properly")

    except Exception as e:
        print("WebSocket error:", e)

    finally:
        listener_running = False
        listener_task.cancel()
        try:
            await listener_task
        except asyncio.CancelledError:
            pass

        for channel in subscribed_jobs:
            await pubsub.unsubscribe(channel)   

        await pubsub.close()