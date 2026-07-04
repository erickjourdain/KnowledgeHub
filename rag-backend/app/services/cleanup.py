import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.models.job import JobIngestion


def cleanup_finished_ingestion_jobs(db: Session) -> int:
    """Delete JobIngestion records that are finished and older than 24 hours,

    or unfinished but missing from Redis/RQ.

    Args:
        db (Session): The SQLAlchemy session.

    Returns:
        int: Number of rows deleted.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
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

        # Suppression des jobs non terminés dans la base de données mais inexistants dans RQ
        from rq.job import Job
        from rq.exceptions import NoSuchJobError
        from app.core.queue import redis_conn

        unfinished_jobs = (
            db.query(JobIngestion)
            .filter(JobIngestion.status.notin_(["finished", "failed"]))
            .all()
        )

        deleted_unfinished_count = 0
        for job_db in unfinished_jobs:
            try:
                # Vérifier si le job existe dans Redis
                Job.fetch(str(job_db.uuid), connection=redis_conn)
            except NoSuchJobError:
                # Supprimer le job de la base s'il n'existe pas/plus dans Redis
                db.delete(job_db)
                deleted_unfinished_count += 1
            except Exception as e:
                logging.error("Error checking job %s in Redis: %s", job_db.uuid, e)

        if deleted_unfinished_count > 0:
            db.commit()
            logging.info("Deleted %s unfinished ingestion jobs missing from Redis/RQ", deleted_unfinished_count)
            count += deleted_unfinished_count

        return count
    except Exception:
        db.rollback()
        logging.exception("Failed to cleanup finished ingestion jobs")
        raise
