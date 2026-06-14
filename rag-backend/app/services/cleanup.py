import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.job import JobIngestion


def cleanup_finished_ingestion_jobs(db: Session) -> int:
    """Delete JobIngestion records that are finished and older than 24 hours.

    Args:
        db (Session): The SQLAlchemy session.

    Returns:
        int: Number of rows deleted.
    """
    cutoff = datetime.utcnow() - timedelta(hours=24)
    try:
        # Find jobs to delete
        jobs_to_delete = (
            db.query(JobIngestion)
            .filter(JobIngestion.status == "finished")
            .filter(JobIngestion.created_at < cutoff)
        )
        count = jobs_to_delete.count()
        if count:
            jobs_to_delete.delete(synchronize_session=False)
            db.commit()
            logging.info("Deleted %s finished ingestion jobs older than 24h", count)
        else:
            logging.info("No finished ingestion jobs older than 24h to delete")
        return count
    except Exception:
        db.rollback()
        logging.exception("Failed to cleanup finished ingestion jobs")
        raise
