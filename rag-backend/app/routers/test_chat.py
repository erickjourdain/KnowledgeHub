from fastapi import APIRouter, Depends, HTTPException
from rq.job import JobStatus
from sqlalchemy.orm import Session

from app.core.queue import query_kb_test
from app.config.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas import JobResponse, RagQuery
from app.services.collections import get_collection_without_relations
from app.services.conversations import get_conversation_by_uuid


router = APIRouter()

@router.post("/query")
def chat_query(
    query: RagQuery,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
)->JobResponse:
    try:
        # Vérifier que l'utilisateur a accès à la collection
        collection = get_collection_without_relations(
            collection_id_or_slug=query.collection_id,
            user=current_user,
            db=db
        )
        if collection is None:
            raise HTTPException(status_code=404, detail="Collection non trouvée")
        
        # Vérifier que la conversation existe si un UUID de conversation est fourni
        if query.conversation_uuid:
            conversation = get_conversation_by_uuid(
                conversation_uuid=query.conversation_uuid,
                user=current_user,
                db=db
            )
            conversation_id = conversation.id
        else:
            conversation_id = None
        
        job = query_kb_test.enqueue(
            "app.jobs.query_test.query_test",
            query=query.query,
            collection_id=query.collection_id,
            conversation_id=conversation_id
        )
        
        return JobResponse(
            status=JobStatus.QUEUED,
            job_id=job.id
        )
    except Exception as e:
        print(f"erreur: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'interrogation du modèle de langage Ollama")