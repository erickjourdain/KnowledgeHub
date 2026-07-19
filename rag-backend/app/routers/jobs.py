from datetime import datetime, timedelta
from typing import cast

from fastapi import APIRouter, Depends, HTTPException
from rq.job import Job
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.core.queue import redis_conn
from app.config.database import get_db
from app.dependencies import get_current_user
from app.models.collection import Collection
from app.models.job import JobIngestion, JobQueryKb
from app.models.enum import RoleEnum
from app.models.user import User
from app.schemas import JobIngestionResponse, JobKbResponse, JobResponse
from app.services.cleanup import cleanup_finished_ingestion_jobs
from app.services.collections import check_is_gestionnaire, get_collection_without_relations


router = APIRouter()

@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer le statut et les détails d'un job par son ID avec contrôle d'accès."""
    try:
        job = Job.fetch(job_id, connection=redis_conn)
    except Exception:
        raise HTTPException(status_code=404, detail="Job non trouvé")
    
    # Vérification des autorisations (sécurité anti-IDOR/BOLA)
    db_ingestion = db.query(JobIngestion).filter(JobIngestion.uuid == job_id).first()
    db_query = db.query(JobQueryKb).filter(JobQueryKb.uuid == job_id).first()

    has_permission = False

    if db_query:
        if current_user.role == RoleEnum.ADMIN:
            has_permission = True
        elif current_user.role == RoleEnum.GESTIONNAIRE:
            if check_is_gestionnaire(cast(int, db_query.collection_id), current_user, db):
                has_permission = True
        elif db_query.creator_id == current_user.id:
            has_permission = True
    elif db_ingestion:
        if current_user.role == RoleEnum.ADMIN:
            has_permission = True
        elif current_user.role == RoleEnum.GESTIONNAIRE:
            if check_is_gestionnaire(cast(int, db_ingestion.collection_id), current_user, db):
                has_permission = True
    else:
        # Si le job n'est pas encore en base de données ou est un job de test
        collection_id = job.kwargs.get("collection_id")
        user_id = job.kwargs.get("user_id")

        if collection_id is None and len(job.args) > 1:
            func_name = job.func_name
            if func_name == "app.jobs.ingestion.ingestion_job":
                collection_id = job.args[1] if len(job.args) > 1 else None
            elif func_name == "app.jobs.query_kb.query_kb_job":
                collection_id = job.args[2] if len(job.args) > 2 else None
                user_id = job.args[5] if len(job.args) > 5 else None
            elif func_name == "app.jobs.query_test.query_test":
                collection_id = job.args[1] if len(job.args) > 1 else None

        if current_user.role == RoleEnum.ADMIN:
            has_permission = True
        else:
            if user_id is not None and user_id == current_user.id:
                has_permission = True
            elif collection_id is not None:
                if current_user.role == RoleEnum.GESTIONNAIRE and check_is_gestionnaire(cast(int, collection_id), current_user, db):
                    has_permission = True
                else:
                    collection_obj = get_collection_without_relations(collection_id, current_user, db)
                    if collection_obj is not None:
                        # Seuls les administrateurs et gestionnaires peuvent voir l'ingestion, les utilisateurs normaux ne voient que les requêtes
                        func_name = job.func_name
                        if func_name in ["app.jobs.query_kb.query_kb_job", "app.jobs.query_test.query_test"]:
                            has_permission = True

    if not has_permission:
        raise HTTPException(status_code=403, detail="Vous n'avez pas la permission d'accéder à ce job")
    
    return JobResponse(
        job_id=job_id,
        status=job.get_status(),
        result=job.result if job.is_finished else None,
        error=job.exc_info if job.is_failed else None
    )


@router.get("/ingestion/{uuid}", response_model=JobIngestionResponse)
def get_ingestion_job(
    uuid: str, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Récupérer l'état d'un job d'ingestion"""
    job = db.query(JobIngestion).filter(JobIngestion.uuid == uuid).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job non trouvé")
    
    # ADMIN a accès à tout
    if current_user.role in [RoleEnum.ADMIN]:
        return job
    
    # GESTIONNAIRE a accès s'il est gestionnaire de la collection associée au job
    if current_user.role in [RoleEnum.GESTIONNAIRE]:
        collection = db.query(Collection).filter(Collection.id == job.collection_id).first()
        if not collection:
            raise HTTPException(status_code=404, detail="Collection du job non trouvé")
        if check_is_gestionnaire(cast(int, collection.id), current_user, db):
            return job
        
    raise HTTPException(status_code=403, detail="Vous n'avez pas la permission d'accèder à ce job")

@router.get("/ingestion/collection/{collection_id_or_slug}", response_model=list[JobIngestionResponse])
def get_insertion_job_collection(
    collection_id_or_slug: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupération des jobs du jour terminés pour une collection"""
    if current_user.role not in [RoleEnum.ADMIN, RoleEnum.GESTIONNAIRE]:
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ces informations") 

    collection = get_collection_without_relations(collection_id_or_slug, current_user, db)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection non trouvée")
    
    if current_user.role in [RoleEnum.GESTIONNAIRE] and not check_is_gestionnaire(cast(int, collection.id), current_user, db):
        raise HTTPException(status_code=403, detail="Vous ne pouvez accèder qu'aux collections dont vous êtes gestionnaire") 
   
    response =  db.query(JobIngestion).order_by(JobIngestion.created_at.desc()).filter(and_(
        JobIngestion.created_at + timedelta(days=5) > datetime.now() 
        , JobIngestion.collection_id == collection.id)).limit(20).all()
    
    print(f"{response}")
    return response

@router.get("/kb/{uuid}", response_model=JobKbResponse)
def get_kb_job(
    uuid: str, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Récupérer l'état d'un job de requête KB terminé"""
    job = db.query(JobQueryKb).filter(JobQueryKb.uuid == uuid).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job non trouvé")
    
    # ADMIN a accès à tout
    if current_user.role in [RoleEnum.ADMIN]:
        return job
    
    collection = db.query(Collection).filter(Collection.id == job.collection_id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection du job non trouvé")
    
    # GESTIONNAIRE a accès s'il est gestionnaire de la collection associée au job
    if current_user.role in [RoleEnum.GESTIONNAIRE]:
        if check_is_gestionnaire(cast(int, collection.id), current_user, db):
            return job

    # les autres utilisateurs s'ils sont l'initiateur du job
    if job.creator_id == current_user.id:
        return job
        
    raise HTTPException(status_code=403, detail="Vous n'avez pas la permission d'accèder à ce job")

@router.get("/kb/collection/{collection_id_or_slug}/user/{user_id}", response_model=list[JobKbResponse])
def get_kb_job_collection_user(
    collection_id_or_slug: str,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupération des jobs de requête KB pour une collection et un utilisateur"""
    if current_user.role not in [RoleEnum.ADMIN, RoleEnum.GESTIONNAIRE] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ces informations") 

    collection = get_collection_without_relations(collection_id_or_slug, current_user, db)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection non trouvée")
    
    if current_user.role in [RoleEnum.GESTIONNAIRE]:
        if not check_is_gestionnaire(cast(int, collection.id), current_user, db) and current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Vous n'avez pas accès à ces informations") 
       
    response =  db.query(JobQueryKb).order_by(JobQueryKb.created_at.desc()).filter(and_(
        JobQueryKb.collection_id == collection.id
        , JobQueryKb.creator_id == user_id
        , JobQueryKb.status == "finished")).limit(20).all()
    
    return response

@router.delete("/ingestion/cleanup", response_model=dict)
def cleanup_ingestion_jobs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete finished ingestion jobs older than 24h. Admin only."""
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Permission denied")
    deleted = cleanup_finished_ingestion_jobs(db)
    return {"deleted": deleted}