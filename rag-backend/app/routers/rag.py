import os
from xml.dom import NotFoundErr

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.queue import query_kb_queue
from app.config.database import get_db
from app.config.ollama import get_ollama_client
from app.dependencies import get_current_user
from app.models.user import User
from app.services.collections import get_collection_without_relations
from app.services.conversations import get_conversation_by_uuid
from app.schemas import JobResponse, RagQuery, JobStatus

load_dotenv()

router = APIRouter()

@router.post("/query", response_model=JobResponse)
def query_rag(
    query: RagQuery, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Interface pour interroger le système de base de connaissances."""

    try:
        # Vérifier que l'utilisateur a accès à la collection
        collection = get_collection_without_relations(
            collection_id_or_slug=query.collection_id,
            user=current_user,
            db=db
        )
        if collection is None:
            raise NotFoundErr("Collection non trouvée")

        # Initialiser la conversation à None par défaut
        conversation = None

        # Vérifier que la conversation existe si un UUID de conversation est fourni
        if query.conversation_uuid:
            conversation = get_conversation_by_uuid(
                conversation_uuid=query.conversation_uuid,
                user=current_user,
                db=db
            )

        # Définition du modèle à utiliser par le modèle de langage Ollama
        model = query.model or os.getenv("OLLAMA_QUERY_MODEL", "gemma3:4b")

        # Validation du modèle demandé auprès de la liste des modèles installés sur Ollama
        try:
            ollama_client = get_ollama_client()
            models_list = ollama_client.list()
            installed_models = {m.model for m in models_list.models}
            if model not in installed_models and f"{model}:latest" not in installed_models:
                # Tenter aussi d'enlever le tag :latest pour la vérification inverse
                clean_model = model.split(":")[0] if ":" in model else model
                if clean_model not in {m.split(":")[0] for m in installed_models}:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Le modèle '{model}' n'est pas disponible ou installé sur le serveur Ollama."
                    )
        except HTTPException:
            raise
        except Exception as e:
            print(f"Erreur de validation du modèle Ollama: {e}")
            raise HTTPException(
                status_code=500, 
                detail="Impossible de contacter le serveur Ollama pour valider le modèle"
            )

        # Définition du nombre de chunks à retourner
        top_k = query.top_k or 5

        # 2. Lancement du job de recherche dans la base de connaissances via RQ
        job = query_kb_queue.enqueue(
            "app.jobs.query_kb.query_kb_job",
            query=query.query,
            model=model,
            collection_id=collection.id,
            conversation_id=conversation.id if conversation else None,
            top_k=top_k,
            user_id=current_user.id,
            document_ids=query.document_ids,
            exclude_document_ids=query.exclude_document_ids,
        )

        return JobResponse(
            status=JobStatus.QUEUED,
            job_id=job.id
        )

    except NotFoundErr as e:
        raise HTTPException(status_code=404, detail=e)
    except PermissionError as e:
        raise HTTPException(status_code=401, detail=e)
    except Exception as e:
        print(f"erreur: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'interrogation du modèle de langage Ollama")