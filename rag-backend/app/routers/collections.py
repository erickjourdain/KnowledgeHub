import os
from typing import List, Optional, cast

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from rq.job import JobStatus
from sqlalchemy import func
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from app.core.queue import ingestion_queue, redis_conn
from app.config.database import get_db
from app.models import User, RoleEnum, Document, DocumentChunk, collection_managers
from app.schemas import (
    CollectionCreate,
    CollectionResponse, 
    CollectionUpdate,
    CollectionListResponse,
    DocumentsResponseNbChunks,
    JobResponse,
    BackendResponse, 
    PaginatedResponse,
    UsersInCollection,
    ChunkResponse
)
from app.dependencies import get_current_user
from app.utils.directory import get_temp_dir, get_knowledge_base_dir
from app.utils.file import allowed_file, save_temp_file
from app.services.collections import (
    append_user,
    check_is_gestionnaire,
    check_collection_name_exists, 
    create_collection,
    delete_collection,
    get_collection_without_relations, 
    get_collections_without_relations,
    get_nb_collections,
    remove_user,
    update_collection,
    check_collection_has_active_jobs,
    append_manager,
    remove_manager
)
from app.services.documents import(
    delete_document,
    get_documents_by_collection_without_relations, 
    get_documents_count_by_collection
)
from app.services.users import test_users_collection

load_dotenv()

router = APIRouter()

@router.post("", response_model=CollectionResponse)
def new_collection(
    collection: CollectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Créer une collection (ADMIN ou GESTIONNAIRE uniquement)"""
    if current_user.role not in [RoleEnum.ADMIN, RoleEnum.GESTIONNAIRE]:
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    
    # Vérifier si le nom existe déjà
    if check_collection_name_exists(collection.name, db):
        raise HTTPException(status_code=400, detail="Ce nom de collection existe déjà")

    try:
        collection.modele = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
        # Créer la collection
        new_collection = create_collection(collection, current_user, db)
        if not new_collection:
            raise HTTPException(status_code=500, detail="Erreur lors de la création de la collection")
        # Créer le répertoire de la collection
        collection_dir = os.path.join(get_knowledge_base_dir(), f"{new_collection.uuid}")
        os.makedirs(collection_dir, exist_ok=True)
        return new_collection
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erreur lors de la création de la collection")

@router.get("", response_model=PaginatedResponse[CollectionListResponse])
def get_collections(
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 25,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Liste des collections accessibles à l'utilisateur"""
    try:
        limit = 25 if limit > 25 else limit
        response = PaginatedResponse(
            data=get_collections_without_relations(
                user=current_user, 
                db=db, 
                offset=skip, 
                limit=limit,
                search=search
            ),
            count=get_nb_collections(db=db, user=current_user, search=search)
        )
        return response
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des collections")

@router.get("/{collection_id}", response_model=CollectionListResponse | None)
def get_collection(
    collection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer une collection par ID"""
    try:
        return get_collection_without_relations(collection_id, current_user, db)
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération de la collection")

@router.get("/{collection_id}/documents", response_model=PaginatedResponse[DocumentsResponseNbChunks])
def get_collection_documents(
    collection_id: int,
    skip: int = 0,
    limit: int = 20,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer les documents d'une collection"""
    try:
        collection = get_collection_without_relations(collection_id, current_user, db)
        if not collection:
            raise HTTPException(status_code=404, detail="Collection non trouvée")
        
        return PaginatedResponse(
            data=get_documents_by_collection_without_relations(collection_id, db, skip, limit, search),
            count=get_documents_count_by_collection(collection_id, db, search)
        )
        
    except Exception as e:
        print(f"Error in get_collection_documents: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des documents de la collection")


@router.put("/{collection_id}", response_model=CollectionResponse | None)
def maj_collection(
    collection_id: int,
    collection_update: CollectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Modifier une collection (ADMIN ou créateur GESTIONNAIRE)"""
    try:
        collection = get_collection_without_relations(collection_id, current_user, db)
        if current_user.role != RoleEnum.ADMIN and \
            collection is not None and \
            not check_is_gestionnaire(collection.id, current_user, db):
            raise HTTPException(status_code=403, detail="Permissions insuffisantes")
        
        if not collection:
            raise HTTPException(status_code=404, detail="Collection non trouvée")

        update_collection(
            collection_id=collection_id, 
            collection_update=collection_update,
            db=db
        )

        return get_collection_without_relations(collection_id, current_user, db)
    except Exception as e:
        print(f"Error in update_collection: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour de la collection")

@router.delete("/{collection_id}", response_model=BackendResponse)
def sup_collection(
    collection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Supprimer une collection (ADMIN uniquement ou créateur GESTIONNAIRE)"""
    try:
        collection = get_collection_without_relations(collection_id, current_user, db)
        if current_user.role != RoleEnum.ADMIN and \
            collection is not None and \
            not check_is_gestionnaire(collection.id, current_user, db):
            raise HTTPException(status_code=403, detail="Permissions insuffisantes")
        
        if not collection:
            raise HTTPException(status_code=404, detail="Collection non trouvée")
        
        # Vérification s'il existe des travaux d'ingestion ou de réindexation en cours pour cette collection
        check_collection_has_active_jobs(collection_id, db)

        delete_collection(collection_id=collection_id, collection_uuid=collection.uuid, db=db)
        
        return BackendResponse(
            status=True,
            message="Collection supprimée"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in delete_collection: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression de la collection")


@router.delete("/{collection_id}/documents/{document_id}", response_model=BackendResponse)
def remove_document_from_collection(
    collection_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retirer un document d'une collection (ADMIN ou créateur GESTIONNAIRE)"""
    try:
        collection = get_collection_without_relations(collection_id, current_user, db)
        if current_user.role != RoleEnum.ADMIN and \
            collection is not None and \
            not check_is_gestionnaire(collection.id, current_user, db):
            raise HTTPException(status_code=403, detail="Permissions insuffisantes")
        
        if not collection:
            raise HTTPException(status_code=404, detail="Collection non trouvée")

        # Vérification s'il existe des travaux d'ingestion ou de réindexation en cours pour cette collection
        check_collection_has_active_jobs(collection_id, db)
    
        delete_document(document_id=document_id, collection_uuid=collection.uuid, db=db)
        return BackendResponse(
            status=True,
            message="Document retiré de la collection"
        )
    except Exception as e:
        print(f"Error in delete document {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression du document")

@router.get("/{collection_id}/users")
def users_authorised(
    collection_id: int,
    users: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[UsersInCollection]:
    """Tester si la liste des utilisateurs est autorisés à accèder à la collection"""

    try:
        collection = get_collection_without_relations(collection_id=collection_id, user=current_user, db=db)
        if current_user.role != RoleEnum.ADMIN and \
            collection is not None and \
            not check_is_gestionnaire(collection.id, current_user, db):
            raise HTTPException(status_code=403, detail="Permissions insuffisantes")
        
        if not collection:
            raise HTTPException(status_code=404, detail="Collection non trouvée")

        authorisation: List[UsersInCollection] = []
        list_users = users.split(",")
        for user_id_str in list_users:
            user_id = int(user_id_str.strip())
            authorisation.append(
                UsersInCollection(
                    id=user_id,
                    authorized=test_users_collection(
                        collection_id=collection.id,
                        user_id=user_id,
                        db=db
                    )
                )
            )

        return authorisation
    except Exception as e:
        print(f"Error in get_users_collection: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des utilisateurs autorisés")


@router.post("/{collection_id}/users/{user_id}", response_model=BackendResponse)
def add_user_to_collection(
    collection_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ajouter un utilisateur à une collection (ADMIN ou créateur GESTIONNAIRE)"""
    try:
        collection = get_collection_without_relations(collection_id, current_user, db)
        if current_user.role != RoleEnum.ADMIN and \
            collection is not None and \
            not check_is_gestionnaire(collection.id, current_user, db):
            raise HTTPException(status_code=403, detail="Permissions insuffisantes")
        
        if not collection:
            raise HTTPException(status_code=404, detail="Collection non trouvée")
        
        append_user(collection_id=collection_id, user_id=user_id, db=db)
    
        return BackendResponse(
            status=True,
            message="Utilisateur ajouté à la collection"
        )
    except Exception as e:
        print(f"Error in add user {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'ajout de l'utilisateur")


@router.delete("/{collection_id}/users/{user_id}", response_model=BackendResponse)
def remove_user_from_collection(
    collection_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retirer un utilisateur d'une collection (ADMIN ou créateur GESTIONNAIRE)"""
    try:
        collection = get_collection_without_relations(collection_id, current_user, db)
        if current_user.role != RoleEnum.ADMIN and \
            collection is not None and \
            not check_is_gestionnaire(collection.id, current_user, db):
            raise HTTPException(status_code=403, detail="Permissions insuffisantes")
        
        if not collection:
            raise HTTPException(status_code=404, detail="Collection non trouvée")
        
        remove_user(collection_id=collection_id, user_id=user_id, db=db)
    
        return BackendResponse(
            status=True,
            message="Utilisateur supprimé de la collection"
        )
    except Exception as e:
        print(f"Error in remove user {e}")
        raise HTTPException(status_code=500, detail="Erreur lors du retrait de l'utilisateur")


@router.post("/{collection_id}/upload", response_model=JobResponse)
def upload_document_to_collection(
    collection_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload un fichier vers une collection (ADMIN ou créateur GESTIONNAIRE uniquement)

    Étapes:
    1. Vérification des droits (ADMIN ou créateur GESTIONNAIRE)
    2. Vérification du type de fichier (pdf ou docx)
    3. Enregistrement temporaire
    4. Lancement du job d'ingestion dans la queue RQ
    """
    try:
        # 1. Vérification des droits
        collection = get_collection_without_relations(collection_id, current_user, db)
        if current_user.role != RoleEnum.ADMIN and \
            collection is not None and \
            not check_is_gestionnaire(collection.id, current_user, db):
            raise HTTPException(status_code=403, detail="Permissions insuffisantes")
        
        if not collection:
            raise HTTPException(status_code=404, detail="Collection non trouvée")
        
        # 2. Vérification du type de fichier
        if (file.filename is None) or (not allowed_file(file.filename)):
            raise HTTPException(
                status_code=400,
                detail="Type de fichier non autorisé. Extensions autorisées: .pdf, .docx"
            )

        # 3.  Enregistrement temporaire
        temp_dir = get_temp_dir()
        save_temp_file(file, temp_dir)
        knowledge_base_dir = get_knowledge_base_dir()

        # 4. Lancement du job d'ingestion dans la queue RQ
        job = ingestion_queue.enqueue(
            "app.jobs.ingestion.ingestion_job",
            filename=file.filename,
            collection_id=collection_id,
            temp_dir=temp_dir,
            knowledge_base_dir=knowledge_base_dir
        )

        return JobResponse(
            status=JobStatus.QUEUED,
            job_id=job.id
        )
    except Exception as e:
        print(f"Error in upload: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'upload du fichier")


@router.post("/{collection_id}/reindex", response_model=List[JobResponse])
def reindex_collection_or_document(
    collection_id: int,
    document_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Réindexe un document spécifique ou tous les documents d'une collection.
    """
    try:
        # 1. Vérification des droits
        collection = get_collection_without_relations(collection_id, current_user, db)
        if current_user.role != RoleEnum.ADMIN and \
            collection is not None and \
            not check_is_gestionnaire(collection.id, current_user, db):
            raise HTTPException(status_code=403, detail="Permissions insuffisantes")
        
        if not collection:
            raise HTTPException(status_code=404, detail="Collection non trouvée")

        # Vérification s'il existe des travaux d'ingestion ou de réindexation en cours pour cette collection
        check_collection_has_active_jobs(collection_id, db)

        # 2. Identification des documents à réindexer
        if document_id is not None:
            document = db.query(Document).filter(
                Document.id == document_id, 
                Document.collection_id == collection_id
            ).first()
            if not document:
                raise HTTPException(status_code=404, detail="Document non trouvé")
            documents = [document]
        else:
            # Réindexer tous les documents déjà indexés de la collection
            documents = db.query(Document).filter(
                Document.collection_id == collection_id,
                Document.is_indexed == True
            ).all()

        if not documents:
            return []

        knowledge_base_dir = get_knowledge_base_dir()
        temp_dir = get_temp_dir()
        jobs = []

        # 3. Enqueue des jobs de réindexation
        for doc in documents:
            doc_title = cast(str, doc.title)
            doc_id_val = cast(int, doc.id)
            # Vérification de l'existence physique du fichier
            file_path = knowledge_base_dir / collection.uuid / doc_title
            if not file_path.exists():
                if document_id is not None:
                    # Si c'était un document précis, on lève une erreur
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Fichier physique non trouvé pour le document {doc_title}"
                    )
                else:
                    # Si c'est toute la collection, on ignore ce fichier et on continue
                    print(f"Avertissement : Fichier physique non trouvé pour le document {doc_title}, ignoré.")
                    continue

            # Lancement du job d'ingestion RQ
            job = ingestion_queue.enqueue(
                "app.jobs.ingestion.ingestion_job",
                filename=doc_title,
                collection_id=collection_id,
                temp_dir=temp_dir,
                knowledge_base_dir=knowledge_base_dir,
                document_id=doc_id_val
            )
            
            jobs.append(JobResponse(
                status=JobStatus.QUEUED,
                job_id=job.id
            ))

        return jobs

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in reindex: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la réindexation")


@router.get("/chunks/{chunk_id}", response_model=ChunkResponse)
def get_chunk(
    chunk_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupérer un chunk spécifique par son ID après vérification des droits d'accès
    à la collection parente.
    """
    try:
        # 1. Récupérer le chunk
        chunk = db.query(DocumentChunk).filter(DocumentChunk.id == chunk_id).first()
        if not chunk:
            raise HTTPException(status_code=404, detail="Chunk non trouvé")

        # 2. Récupérer le document parent pour obtenir collection_id
        document = db.query(Document).filter(Document.id == chunk.document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document associé au chunk non trouvé")

        # 3. Vérifier les droits d'accès à la collection
        collection = get_collection_without_relations(cast(int, document.collection_id), current_user, db)
        if not collection:
            raise HTTPException(status_code=403, detail="Accès interdit à la collection associée à ce chunk")

        return chunk
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_chunk: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération du chunk")


@router.get("/{collection_id}/managers", response_model=List[UsersInCollection])
def get_collection_managers_status(
    collection_id: int,
    users: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Tester si la liste des utilisateurs sont gestionnaires de la collection"""
    try:
        collection = get_collection_without_relations(collection_id=collection_id, user=current_user, db=db)
        if current_user.role != RoleEnum.ADMIN and \
            collection is not None and \
            not check_is_gestionnaire(collection.id, current_user, db):
            raise HTTPException(status_code=403, detail="Permissions insuffisantes")
        
        if not collection:
            raise HTTPException(status_code=404, detail="Collection non trouvée")

        status_list: List[UsersInCollection] = []
        list_users = users.split(",")
        for user_id_str in list_users:
            user_id = int(user_id_str.strip())
            is_mgr = db.query(func.count()).select_from(collection_managers).filter(
                collection_managers.c.collection_id == collection_id,
                collection_managers.c.user_id == user_id
            ).scalar() > 0
            status_list.append(
                UsersInCollection(
                    id=user_id,
                    authorized=is_mgr
                )
            )

        return status_list
    except Exception as e:
        print(f"Error in get_collection_managers_status: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération du statut des gestionnaires")


@router.post("/{collection_id}/managers/{user_id}", response_model=BackendResponse)
def add_manager_to_collection(
    collection_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ajouter un gestionnaire à une collection (ADMIN ou gestionnaire de la collection)"""
    try:
        collection = get_collection_without_relations(collection_id, current_user, db)
        if current_user.role != RoleEnum.ADMIN and \
            collection is not None and \
            not check_is_gestionnaire(collection.id, current_user, db):
            raise HTTPException(status_code=403, detail="Permissions insuffisantes")
        
        if not collection:
            raise HTTPException(status_code=404, detail="Collection non trouvée")
        
        # Verify user to add is GESTIONNAIRE
        user_to_add = db.query(User).filter(User.id == user_id).first()
        if not user_to_add:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        if user_to_add.role not in [RoleEnum.GESTIONNAIRE, RoleEnum.ADMIN]:
            raise HTTPException(status_code=400, detail="L'utilisateur doit avoir le rôle GESTIONNAIRE ou ADMIN")
        
        append_manager(collection_id=collection_id, user_id=user_id, db=db)
    
        return BackendResponse(
            status=True,
            message="Gestionnaire ajouté à la collection"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in add manager: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'ajout du gestionnaire")


@router.delete("/{collection_id}/managers/{user_id}", response_model=BackendResponse)
def remove_manager_from_collection(
    collection_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retirer un gestionnaire d'une collection (ADMIN ou gestionnaire de la collection)"""
    try:
        collection = get_collection_without_relations(collection_id, current_user, db)
        if current_user.role != RoleEnum.ADMIN and \
            collection is not None and \
            not check_is_gestionnaire(collection.id, current_user, db):
            raise HTTPException(status_code=403, detail="Permissions insuffisantes")
        
        if not collection:
            raise HTTPException(status_code=404, detail="Collection non trouvée")
        
        # Enforce at least one manager constraint
        mgr_count = db.query(func.count()).select_from(collection_managers).filter(
            collection_managers.c.collection_id == collection_id
        ).scalar()
        if mgr_count <= 1:
            raise HTTPException(status_code=400, detail="La collection doit avoir au moins un gestionnaire")
        
        remove_manager(collection_id=collection_id, user_id=user_id, db=db)
    
        return BackendResponse(
            status=True,
            message="Gestionnaire supprimé de la collection"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in remove manager: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors du retrait du gestionnaire")
