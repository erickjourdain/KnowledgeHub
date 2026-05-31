from pathlib import Path
from sqlalchemy.orm import Session
from rq import get_current_job

from app.config.database import SessionLocal
from app.models.collection import Collection
from app.models.job import JobIngestion
from app.services.document_processor import process_document


def ingestion_job(
    filename: str,
    collection_id: int,
    temp_dir: Path,
    knowledge_base_dir: Path,
):
    """
    Job RQ exécuté par le worker
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

        # Créer l'enregistrement JobIngestion au début
        job_ingestion = JobIngestion(
            uuid=job.id,
            collection_id=collection_id,
            filename=filename,
            status="processing",
        )
        db.add(job_ingestion)
        db.commit()

        # Traitement du document (conversion markdown, découpage en chunks, vectorisation, etc.)
        document_id = process_document(
            file_name=filename,
            collection=collection,
            temp_dir=temp_dir,
            knowledge_base_dir=knowledge_base_dir,
            db=db,
        )

        # Mettre à jour le job avec le résultat
        job_ingestion.status = "finished"
        job_ingestion.document_id = document_id
        db.commit()

    except Exception as e:
        # Mettre à jour le job avec l'erreur
        if 'job_ingestion' in locals():
            job_ingestion.status = job.get_status()
            job_ingestion.error = str(e)
            db.commit()
        raise e

    finally:
        db.close()