import os
import shutil
from typing import cast

from sqlalchemy import func, update
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import lazyload, raiseload, Session

from app.schemas import CollectionCreate, CollectionListResponse, CollectionResponse, CollectionUpdate
from app.models import Collection, Document, DocumentChunk, RoleEnum, User, collection_users, JobIngestion, JobQueryKb, Conversation, Message
from app.utils.directory import get_knowledge_base_dir


def check_is_gestionnaire(collection: CollectionResponse, user: User) -> bool:
    """Vérifie si l'utilisateur est gestionnaire de la collection"""

    return bool(collection.creator_id == user.id and user.role == RoleEnum.GESTIONNAIRE)


def get_collection_without_relations(
    collection_id: int,
    user: User,
    db: Session,
) -> CollectionListResponse | None:
    """Récupère une collection sans ses relations"""

    try:
        # On utilise raiseload pour ne pas charger les relations de la collection
        # En fonction du rôle de l'utilisateur, on récupère les collections auxquelles il a accès
        # Les administrateurs ont accès à toutes les collections
        if user.role == RoleEnum.ADMIN:
            collection = db.query(Collection).options(raiseload("*")) \
                .filter(Collection.id == collection_id).first()
        # Les gestionnaires ont accès aux collections qu'ils ont créées ou auxquelles ils sont associés
        elif user.role == RoleEnum.GESTIONNAIRE:
            collection = db.query(Collection).options(raiseload("*")) \
                .filter(Collection.id == collection_id, (Collection.creator_id == user.id) | Collection.authorized_users.any(id=user.id)).first()    
        # Les utilisateurs ont accès aux collections auxquelles ils sont associés
        else:
            collection = db.query(Collection).options(raiseload("*")) \
                .filter(Collection.authorized_users.any(id=user.id), Collection.id == collection_id).first()
            
        # Si la collection n'existe pas, on retourne None
        if not collection:
            return None
        
        # Vérification des droits d'accès à la collection
        
        # On compte le nombre de documents associés à la collection
        nb_documents = db.query(func.count(Document.id)) \
            .filter(Document.collection_id == collection_id, Document.is_indexed).scalar()
        # On compte le nombre d'utilisateurs associés à la collection
        nb_users = db.query(func.count(collection_users.c.user_id)) \
            .filter(collection_users.c.collection_id == collection_id).scalar()

        response = CollectionListResponse.model_validate(collection)

        # On ajoute les compteurs à la collection
        response.authorized_users_count = nb_users
        response.documents_count = nb_documents

        return response
    
    except Exception as e:
        print(f"Error in get_collection_without_relations: {e}")
        raise e
    

def get_collections_without_relations(
    user: User,
    db: Session,
    offset: int = 0,
    limit: int = 20,
    search: str | None = None
) -> list[CollectionListResponse]:
    """Récupère toutes les collections sans leurs relations"""

    try:
        # On utilise raiseload pour ne pas charger les relations de la collection
        # En fonction du rôle de l'utilisateur, on récupère les collections auxquelles il a accès
        # Les administrateurs ont accès à toutes les collections
        if user.role == RoleEnum.ADMIN:
            if search:
                collections = db.query(Collection).options(raiseload("*")) \
                    .filter(Collection.name.like(f'%{search}%')) \
                    .offset(offset).limit(limit).all()
            else:
                collections = db.query(Collection).options(raiseload("*")) \
                    .offset(offset).limit(limit).all()
        # Les gestionnaires ont accès aux collections qu'ils ont créées ou auxquelles ils sont associés
        elif user.role == RoleEnum.GESTIONNAIRE:
            if search:
                collections = db.query(Collection).options(raiseload("*")) \
                    .filter((Collection.creator_id == user.id) | Collection.authorized_users.any(id=user.id)) \
                    .filter(Collection.name.like(f'%{search}%')) \
                    .offset(offset).limit(limit).all()
            else:
                collections = db.query(Collection).options(raiseload("*")) \
                    .filter((Collection.creator_id == user.id) | Collection.authorized_users.any(id=user.id)) \
                    .offset(offset).limit(limit).all()
        # Les utilisateurs ont accès aux collections auxquelles ils sont associés
        else:
            if search:
                collections = db.query(Collection).options(raiseload("*")) \
                    .filter(Collection.authorized_users.any(id=user.id)) \
                    .filter(Collection.name.like(f'%{search}%')) \
                    .offset(offset).limit(limit).all()
            else:
                collections = db.query(Collection).options(raiseload("*")) \
                    .filter(Collection.authorized_users.any(id=user.id)) \
                    .offset(offset).limit(limit).all()

        # On prépare la réponse en ajoutant les compteurs de documents et d'utilisateurs à chaque collection
        responses = []
        for collection in collections:
            # On compte le nombre de documents associés à la collection
            nb_documents = db.query(func.count(Document.id)) \
                .filter(Document.collection_id == collection.id, Document.is_indexed).scalar()
            # On compte le nombre d'utilisateurs associés à la collection
            nb_users = db.query(func.count(collection_users.c.user_id)) \
                .filter(collection_users.c.collection_id == collection.id).scalar()

            response = CollectionListResponse.model_validate(collection)

            # On ajoute les compteurs à la collection
            response.authorized_users_count = nb_users
            response.documents_count = nb_documents

            responses.append(response)

        return responses
    
    except Exception as e:
        print(f"Error in get_collections_without_relations: {e}")
        raise e
    

def get_nb_collections(db: Session, user: User, search: str | None = None) -> int:
    """Récupère le nombre total de collections auxquelles l'utilisateur a accès"""

    try:
        if user.role == RoleEnum.ADMIN:
            if search:
                return db.query(func.count(Collection.id)) \
                    .filter(Collection.name.like(f'%{search}%')).scalar()
            else:
                return db.query(func.count(Collection.id)).scalar()
        elif user.role == RoleEnum.GESTIONNAIRE:
            if search:
                return db.query(func.count(Collection.id)) \
                    .filter((Collection.creator_id == user.id) | Collection.authorized_users.any(id=user.id)) \
                    .filter(Collection.name.like(f'%{search}%')).scalar()
            else:
                return db.query(func.count(Collection.id)) \
                    .filter((Collection.creator_id == user.id) | Collection.authorized_users.any(id=user.id)) \
                    .scalar()
        else:
            if search:
                return db.query(func.count(Collection.id)) \
                    .filter(Collection.authorized_users.any(id=user.id)) \
                    .filter(Collection.name.like(f'%{search}%')).scalar()
            else:
                return db.query(func.count(Collection.id)) \
                    .filter(Collection.authorized_users.any(id=user.id)).scalar()
    
    except Exception as e:
        print(f"Error in get_nb_collections: {e}")
        raise e
    

def check_collection_name_exists(name: str, db: Session, exclude_id: int | None = None) -> bool:
    """Vérifie si une collection avec le même nom existe déjà"""

    query = db.query(Collection.id).filter(func.lower(Collection.name) == func.lower(name))
    if exclude_id is not None:
        query = query.filter(Collection.id != exclude_id)
    return query.first() is not None


def create_collection(collection: CollectionCreate, user: User, db: Session) -> CollectionResponse | None:
    """Crée une nouvelle collection"""

    try:
        new_collection = Collection(
            name=collection.name,
            description=collection.description,
            modele=collection.modele,
            creator_id=user.id
        )
        db.add(new_collection)
        db.commit()

        return get_collection_without_relations(cast(int, new_collection.id), user, db)
    except Exception as e:
        print(f"Error in create_collection: {e}")
        db.rollback()
        raise e
    

def update_collection(collection_id: int, collection_update: CollectionUpdate, db: Session) -> bool:
    """Met à jour une collection"""
    try:
        stmt = update(Collection).where(Collection.id == collection_id)

        if collection_update.name is not None:
            stmt = stmt.values(name=collection_update.name)
        if collection_update.description is not None:
            stmt = stmt.values(description=collection_update.description)
        
        db.execute(stmt)
        db.commit()
        return True
    except Exception as e:
        print(f"Error in update_collection: {e}")
        db.rollback()
        raise e
    

def delete_collection(collection_id: int, collection_uuid: str, db: Session) -> bool:
    """Supprimer une collection"""
    try:
        # Supprimer les associations d'utilisateurs autorisés dans la table de jointure
        # (nécessaire pour éviter les erreurs de clé étrangère)
        db.execute(collection_users.delete().where(collection_users.c.collection_id == collection_id))

        # Supprimer les jobs liés à la collection
        db.query(JobIngestion).filter(JobIngestion.collection_id == collection_id).delete()
        db.query(JobQueryKb).filter(JobQueryKb.collection_id == collection_id).delete()

        # Supprimer d'abord les messages des conversations (pour éviter les FK constraints)
        conversation_ids = db.query(Conversation.id).filter(Conversation.collection_id == collection_id).all()
        for conv_id in conversation_ids:
            db.query(Message).filter(Message.conversation_id == conv_id.id).delete()

        # Supprimer les conversations
        db.query(Conversation).filter(Conversation.collection_id == collection_id).delete()

        # Récupérer les documents de la collection
        documents = db.query(Document).filter(Document.collection_id == collection_id).all()

        # Supprimer les chunks de tous les documents
        for document in documents:
            db.query(DocumentChunk).where(DocumentChunk.document_id == document.id).delete()

        # Supprimer tous les documents
        db.query(Document).filter(Document.collection_id == collection_id).delete()

        # Supprimer la collection
        db.query(Collection).where(Collection.id == collection_id).delete()

        # Commiter la transaction DB avant suppression du répertoire
        db.commit()

        # Supprimer le répertoire de la collection (après le commit pour atomicité)
        collection_dir = os.path.join(get_knowledge_base_dir(), f"{collection_uuid}")
        try:
            shutil.rmtree(collection_dir)
        except FileNotFoundError:
            pass  # Le répertoire n'existe pas, ce n'est pas critique

        return True
    except Exception as e:
        db.rollback()
        print(f"Error in delete_collection: {e}")
        raise e
    

def append_user(collection_id: int, user_id: int, db: Session) -> bool:
    """Ajouter un utilisateur à une collection"""
    try:
        collection = db.query(Collection).filter(Collection.id == collection_id) \
            .options(lazyload(Collection.authorized_users)).first()
        if not collection:
            raise NoResultFound("Collection non trouvée")
        
        user = db.query(User).filter(User.id == user_id) \
            .options(raiseload("*")).first()
        if not user:
            raise NoResultFound("Utilisateur non trouvé")

        collection.authorized_users.append(user)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Error in append user: {e}")
        raise e
    

def remove_user(collection_id: int, user_id: int, db: Session) -> bool:
    """Ajouter un utilisateur à une collection"""
    try:
        collection = db.query(Collection).filter(Collection.id == collection_id) \
            .options(lazyload(Collection.authorized_users)).first()
        if not collection:
            raise NoResultFound("Collection non trouvée")
        
        user = db.query(User).filter(User.id == user_id) \
            .options(raiseload("*")).first()
        if not user:
            raise NoResultFound("Utilisateur non trouvé")

        collection.authorized_users.remove(user)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Error in append user: {e}")
        raise e


def check_collection_has_active_jobs(
    collection_id: int,
    db: Session,
    detail_message: str = "Impossible de supprimer la collection : une opération d'ingestion ou de réindexation est en cours."
) -> None:
    """Vérifie s'il existe des travaux d'ingestion ou de réindexation en cours pour cette collection.

    Lève une HTTPException 400 si un job est en cours.
    """
    from fastapi import HTTPException
    from rq.job import Job
    from app.core.queue import ingestion_queue, redis_conn

    # 1. Vérification dans la file d'attente RQ (queued, started, deferred)
    job_ids = []
    try:
        job_ids = (
            ingestion_queue.get_job_ids()
            + ingestion_queue.started_job_registry.get_job_ids()
            + ingestion_queue.deferred_job_registry.get_job_ids()
        )
    except Exception as rq_err:
        print(f"Avertissement lors de la récupération des jobs RQ : {rq_err}")

    if job_ids:
        try:
            jobs = Job.fetch_many(job_ids, connection=redis_conn)
            for job in jobs:
                if job and job.kwargs.get("collection_id") == collection_id:
                    raise HTTPException(
                        status_code=400,
                        detail=detail_message
                    )
        except HTTPException:
            raise
        except Exception as rq_err:
            print(f"Avertissement lors de l'inspection des jobs RQ : {rq_err}")

    # 2. Vérification dans la base de données (statut 'processing')
    active_db_job = db.query(JobIngestion).filter(
        JobIngestion.collection_id == collection_id,
        JobIngestion.status == "processing"
    ).first()

    if active_db_job:
        raise HTTPException(
            status_code=400,
            detail=detail_message
        )