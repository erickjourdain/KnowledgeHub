from typing import List

from sqlalchemy import func
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session, joinedload

from app.models import Collection, User, collection_users
from app.utils.security import hash_password, verify_password

def get_users_by_collection(
  collection_id: int,
  db: Session      
) -> List[User]:
    """Récupère les utilisateurs autorisés à utiliser une collection"""
    try:
        collection = db.query(Collection).filter(Collection.id == collection_id) \
            .options(joinedload(Collection.authorized_users)).first()
        if not collection:
            raise NoResultFound("La collection recherchée est introuvable")
        return collection.authorized_users
    except Exception as e:
        print(f"Error in get_users_by_collection: {e}")
        raise e
    
def test_users_collection(
    collection_id: int,
    user_id: int,
    db: Session
) -> bool:
    """Tester si les utilisateurs sont autorisés à utiliser la collection"""
    try:
        auth_user = db.query(func.count(collection_users.c.user_id)) \
            .filter(collection_users.c.collection_id == collection_id, collection_users.c.user_id == user_id).scalar()
        
        return (auth_user == 1)

    except Exception as e:
        print(f"Error in test_users_collection: {e}")
        raise e
    
def check_user_password(
    username: str,
    password: str,
    db: Session
) -> User:
    """Vérifier si le mot de passe de l'utilisateur est correct"""
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise NoResultFound("L'utilisateur recherché est introuvable")
        if not verify_password(plain_password=password, hashed_password=user.hashed_password):
            raise ValueError("Mot de passe incorrect")
        return user
    except Exception as e:
        print(f"Error in check_user_password: {e}")
        raise e
    
def change_user_password(
    user: User,
    new_password: str,
    db: Session
) -> User:
    """Changer le mot de passe d'un utilisateur"""
    try:
        user.hashed_password = hash_password(password=new_password)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        print(f"Error in change_user_password: {e}")
        raise e