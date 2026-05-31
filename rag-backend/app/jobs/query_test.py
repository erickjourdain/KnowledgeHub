from rq import get_current_job
from sqlalchemy.orm import Session

from app.config.database import SessionLocal
from app.models.collection import Collection
from app.services.query_test_processing import query_test_processing


def query_test(
    query: str,
    collection_id: int,
    conversation_id: int
):
    """
    Job RQ exécuté par le worker pour tester le retour d'information vers le frontend
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
        
        query_test_processing(
            query=query,
            collection=collection,
            conversation_id=conversation_id
        )

    except Exception as e:
        print(f"Erreur lors du test {e}")

    finally:
        db.close()