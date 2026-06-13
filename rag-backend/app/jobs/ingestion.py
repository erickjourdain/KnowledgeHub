from pathlib import Path
from typing import Optional
import shutil
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
    document_id: Optional[int] = None,
):
    """
    Job RQ exécuté par le worker
    """

    db: Session = SessionLocal()
    job = get_current_job()
    if job is None:
        raise RuntimeError("Aucun job RQ en cours d'exécution trouvé")

    job_ingestion: Optional[JobIngestion] = None
    try:
        # Vérifier que la collection existe
        collection = db.query(Collection).get(collection_id)
        if not collection:
            raise ValueError(f"La collection {collection_id} n'existe pas")

        # Si document_id est fourni, copier le fichier physique vers temp_dir
        if document_id is not None:
            source_file = Path(knowledge_base_dir) / f"{collection.uuid}" / filename
            if not source_file.exists():
                raise FileNotFoundError(f"Le fichier source {source_file} n'existe pas")
            Path(temp_dir).mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_file, Path(temp_dir) / filename)

        # Créer l'enregistrement JobIngestion au début
        job_ingestion = JobIngestion(
            uuid=job.id,
            collection_id=collection_id,
            filename=filename,
            status="processing",
            document_id=document_id,
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
            document_id=document_id,
        )

        # Mettre à jour le job avec le résultat
        job_ingestion.status = "finished"
        job_ingestion.document_id = document_id
        db.commit()

    except Exception as e:
        # Mettre à jour le job avec l'erreur
        if job_ingestion is not None:
            job_ingestion.status = job.get_status()
            job_ingestion.error = str(e)
            db.commit()
        raise e

    finally:
        db.close()