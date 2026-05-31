import os
import shutil

from sqlalchemy import func, update
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import lazyload, raiseload, Session

from app.schemas import CollectionCreate, CollectionListResponse, CollectionResponse, CollectionUpdate
from app.models import Collection, Document, RoleEnum, User, collection_users
from app.utils.directory import get_knowledge_base_dir


def check_is_gestionnaire(collection: CollectionResponse, user: User) -> bool:
    """Vérifie si l'utilisateur est gestionnaire de la collection"""

    return collection.creator_id == user.id and user.role == RoleEnum.GESTIONNAIRE


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
                .filter(Collection.id == collection_id, Collection.creator_id == user.id | Collection.users.any(id=user.id)).first()    
        # Les utilisateurs ont accès aux collections auxquelles ils sont associés
        else:
            collection = db.query(Collection).options(raiseload("*")) \
                .filter(Collection.users.any(id=user.id), Collection.id == collection_id).first()
            
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
                    .filter(Collection.creator_id == user.id | Collection.users.any(id=user.id)) \
                    .filter(Collection.name.like(f'%{search}%')) \
                    .offset(offset).limit(limit).all()
            else:
                collections = db.query(Collection).options(raiseload("*")) \
                    .filter(Collection.creator_id == user.id | Collection.users.any(id=user.id)) \
                    .offset(offset).limit(limit).all()
        # Les utilisateurs ont accès aux collections auxquelles ils sont associés
        else:
            if search:
                collections = db.query(Collection).options(raiseload("*")) \
                    .filter(Collection.users.any(id=user.id)) \
                    .filter(Collection.name.like(f'%{search}%')) \
                    .offset(offset).limit(limit).all()
            else:
                collections = db.query(Collection).options(raiseload("*")) \
                    .filter(Collection.users.any(id=user.id)) \
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
                    .filter(Collection.creator_id == user.id | Collection.users.any(id=user.id)) \
                    .filter(Collection.name.like(f'%{search}%')).scalar()
            else:
                return db.query(func.count(Collection.id)) \
                    .filter(Collection.creator_id == user.id | Collection.users.any(id=user.id)) \
                    .scalar()
        else:
            if search:
                return db.query(func.count(Collection.id)) \
                    .filter(Collection.users.any(id=user.id)) \
                    .filter(Collection.name.like(f'%{search}%')).scalar()
            else:
                return db.query(func.count(Collection.id)) \
                    .filter(Collection.users.any(id=user.id)).scalar()
    
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

        return get_collection_without_relations(new_collection.id, user, db)
    except Exception as e:
        print(f"Error in create_collection: {e}")
        db.rollback()
        raise e
    

def update_collection(collection_id: int, collection_update: CollectionUpdate, db: Session) -> bool:
    """Met à jour une collection"""
    try:
        stmt = update(Collection).where(Collection.id == collection_id)

        if (collection_update.name):
            stmt = stmt.values(name=collection_update.name)
        if (collection_update.description):
            stmt = stmt.values(description=collection_update.description)
        
        db.execute(stmt)
        return True
    except Exception as e:
        print(f"Error in update_collection: {e}")
        raise e
    

def delete_collection(collection_id: int, collection_uuid: str, db: Session) -> bool:
    """Supprimer une collection"""
    try:
        db.query(Collection).where(Collection.id == collection_id).delete()

        # Supprimer le répertoire de la collection
        collection_dir = os.path.join(get_knowledge_base_dir(), f"{collection_uuid}")
        try:
            shutil.rmtree(collection_dir)
        except FileNotFoundError:
            pass  # Le répertoire n'existe pas, rien à faire

        db.commit()

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