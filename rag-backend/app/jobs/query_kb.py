from typing import cast
from rq import get_current_job
from sqlalchemy.orm import Session

from app.config.database import SessionLocal
from app.models import Collection, Conversation, JobQueryKb, Message, User
from app.services.query_kb_processing import query_db_processing
from app.utils.redis import publish_progress


def query_kb_job(
    query: str,
    model: str,
    collection_id: int,
    conversation_id: int | None,
    top_k: int,
    user_id: int,
    document_ids: list[int] | None = None,
    exclude_document_ids: list[int] | None = None,
):
    """
    Job RQ exécuté par le worker pour la recherche dans la base de connaissances
    """

    db: Session = SessionLocal()
    job = get_current_job()
    if job is None:
        raise RuntimeError("Aucun job RQ en cours d'exécution trouvé")
    
    job_query_kb: JobQueryKb | None = None
    try:
        # Vérifier que la collection existe
        collection = db.query(Collection).get(collection_id)
        if not collection:
            raise ValueError(f"La collection {collection_id} n'existe pas") 

        # Créer l'enregistrement JobQueryKb au début
        job_query_kb = JobQueryKb(
            uuid=job.id,
            collection_id=collection_id,
            query=query,
            creator_id=user_id,
            status="processing",
        )
        db.add(job_query_kb)
        db.commit()

        result = query_db_processing(
            query=query,
            collection=collection,
            conversation_id=conversation_id,
            model=model,
            top_k=top_k,
            db=db,
            document_ids=document_ids,
            exclude_document_ids=exclude_document_ids,
        )

        # Créer une nouvelle conversation si conversation_id n'est pas fourni
        if not conversation_id:
            if result.title:
                conversation=Conversation(
                    collection_id=collection_id,
                    title=result.title,
                    creator_id=user_id
                )
                db.add(conversation)
                db.commit()
                db.refresh(conversation)
                conversation_id = cast(int, conversation.id)
            else:
                raise ValueError("Aucun titre généré pour la conversation, impossible de créer une nouvelle conversation sans titre")
        
        # Créer un message avec la question, la réponse et les sources
        reponse = result.reponse
        sources = [s.model_dump() for s in result.sources] if result.sources else []
        message=Message(
            conversation_id=conversation_id,
            sender_id=user_id,
            questions=query,
            answer=reponse,
            sources=sources
        )
        db.add(message)

        # Mettre à jour le job avec le résultat
        job_query_kb.status = "finished"
        job_query_kb.result = result.model_dump()
        db.commit()
        db.refresh(message)

        publish_progress(
            job.id,
            type="query",
            status=job.get_status(), 
            step="done", 
            progress=100, 
            message=f"Réponse enregistrée: {message.uuid}"
        )

    except Exception as e:
        # 1. Toujours notifier le WebSocket en premier via Redis (qui fonctionne indépendamment de la DB)
        try:
            publish_progress(
                job.id,
                type="query",
                status="failed",
                step="error",
                progress=100,
                message=f"Erreur: {str(e)}"
            )
        except Exception as pe:
            print(f"Erreur lors de la publication de la progression d'erreur: {pe}")

        # 2. Mettre à jour la base de données de manière sécurisée
        if job_query_kb is not None:
            try:
                db.rollback()  # Annuler la transaction en échec pour nettoyer la session
                job_query_kb.status = "failed"
                job_query_kb.error = str(e)
                db.commit()
            except Exception as dbe:
                print(f"Impossible de mettre à jour le statut du job en base de données : {dbe}")
            
        raise e

    finally:
        db.close()