import time
from uuid import uuid4

from rq import get_current_job

from app.models.collection import Collection
from app.schemas import RagResponse
from app.utils.redis import publish_progress


def query_test_processing(
    query: str,
    collection: Collection,
    conversation_id: int | None
) -> RagResponse:
    """
    Test de la requête de traitement 
    """

    job = get_current_job()
    if job is None:
        raise RuntimeError("Aucun job RQ en cours d'exécution trouvé")
    
    waiting = 2

    try:
        publish_progress(
            job.id,
            type="query",
            status=job.get_status(), 
            step="starting", 
            progress=0, 
            message="Reformulation du prompt"
        )

        time.sleep(waiting)

        publish_progress(
            job.id,
            type="query",
            status=job.get_status(), 
            step="starting", 
            progress=25, 
            message="Embedding de la requête reformulée"
        )

        time.sleep(waiting)

        publish_progress(
            job.id,
            type="query",
            status=job.get_status(), 
            step="starting", 
            progress=30, 
            message="Recherche dans la base de connaissances des extraits pertinents"
        )

        time.sleep(waiting)

        publish_progress(
            job.id,
            type="query",
            status=job.get_status(), 
            step="starting", 
            progress=50, 
            message="Création du contexte pour le modèle de langage"
        )

        time.sleep(waiting)

        publish_progress(
            job.id,
            type="query",
            status=job.get_status(), 
            step="starting", 
            progress=70, 
            message="Interrogation du modèle de langage pour générer la réponse"
        )

        time.sleep(waiting)

        if conversation_id is None:
            title = f"Conversation {uuid4()}"
        else:
            title = None

        publish_progress(
            job.id,
            type="query",
            status=job.get_status(), 
            step="done", 
            progress=100, 
            message="Réponse générée avec succès"
        )

        return RagResponse(
            query=query,
            title=title,
            reponse=f"réponse {uuid4()}",
            sources=[{
                "fichier": "fichier_1",
                "chapitre": "chapitre_1",
                "section": "section_1",
                "page": "page_1"
            }]
        )
        
    except Exception as e:
        print(f"Erreur lors du traitement de la requête: {str(e)}")
        publish_progress(
            job.id,
            type="query",
            status="failed",
            step="erreur",
            progress=100,
            message="Erreur lors du traitement de la requête"
        )
        raise e