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
    user: User
):
    """
    Job RQ exécuté par le worker pour la recherche dans la base de connaissances
    """

    db: Session = SessionLocal()
    job = get_current_job()
    if job is None:
        raise RuntimeError("Aucun job RQ en cours d'exécution trouvé")
    
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
            creator_id=user.id,
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
            db=db
        )

        # Créer une nouvelle conversation si conversation_id n'est pas fourni
        if not conversation_id:
            if result.title:
                conversation=Conversation(
                    collection_id=collection_id,
                    title=result.title,
                    creator_id=user.id
                )
                db.add(conversation)
                db.commit()
                db.refresh(conversation)
                conversation_id = conversation.id
            else:
                raise ValueError("Aucun titre généré pour la conversation, impossible de créer une nouvelle conversation sans titre")
        
        # Créer un message avec la question, la réponse et les sources
        reponse = result.reponse
        sources = result.sources
        message=Message(
            conversation_id=conversation_id,
            sender_id=user.id,
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
        # Mettre à jour le job avec l'erreur
        if 'job_query_kb' in locals():
            job_query_kb.status = job.get_status()
            job_query_kb.error = str(e)
            db.commit()
        raise e

    finally:
        db.close()