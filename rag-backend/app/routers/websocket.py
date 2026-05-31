import json

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
import asyncio

from sqlalchemy.orm import Session
from app.core.queue import redis_async_conn
from app.config.database import get_db
from app.models.user import User
from app.utils.security import decode_token


router = APIRouter()


async def get_websocket_user(websocket: WebSocket, db: Session) -> dict | None:
    """Validate token from WebSocket query parameters."""
    token = websocket.query_params.get("token")
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

    return payload


@router.websocket("/ws/jobs")
async def job_ws(websocket: WebSocket, db: Session = Depends(get_db)):
    # Validate token before accepting the connection
    payload = await get_websocket_user(websocket, db)
    if payload is None:
        return  # WebSocket already closed by get_websocket_user
    await websocket.accept()

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
                channel = message["channel"].decode()
                job_id = channel.split(":")[1]
                data = json.loads(message["data"])
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