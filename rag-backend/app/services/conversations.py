from sqlalchemy import func
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session, raiseload, joinedload

from app.models import Conversation, Message, User
from app.schemas import ConversationUpdate


def get_conversation_messages(
    conversation_uuid: str,
    offset: int,
    limit: int,
    db: Session,
    user: User
) -> list[Message]:
    "Récupération des messages d'une conversation"
    try:
        conversation = db.query(Conversation).options(raiseload("*")) \
            .filter(Conversation.uuid == conversation_uuid).first()
        
        if not conversation:
            raise NoResultFound("Conversation non trouvée")
        
        if conversation.creator_id != user.id:
            raise PermissionError("Vous ne disposez pas des droits d'accès à cette conversation")
        
        return db.query(Message).options(joinedload(Message.sender), raiseload("*")) \
            .filter(Message.conversation_id == conversation.id) \
            .order_by(Message.created_at) \
            .offset(offset).limit(limit).all()

    except Exception as e:
        print(f"Error in get_conversation_messages: {e}")
        raise e
    

def get_nb_conversation_messages(
    conversation_uuid: str,
    db:Session,
    user: User
) -> int:
    "Récupération du nombre de messages d'une conversation"
    try:
        conversation = db.query(Conversation).options(raiseload("*")) \
            .filter(Conversation.uuid == conversation_uuid).first()
        
        if not conversation:
            raise NoResultFound("Conversation non trouvée")
        
        if conversation.creator_id != user.id:
            raise PermissionError("Vous ne disposez pas des droits d'accès à cette conversation")
        
        return db.query(func.count(Message.id)).options(raiseload("*")) \
            .filter(Message.conversation_id == conversation.id).scalar()

    except Exception as e:
        print(f"Error in get_nb_conversation_messages: {e}")
        raise e


def get_collection_conversations(
    collection_id: int,
    offset: int,
    limit: int,
    user: User,
    db: Session,
    search: str | None = None
) -> list[Conversation]:
    """Récupération des conversations"""
    try:
        if (search):
            return db.query(Conversation).options(joinedload(Conversation.creator), raiseload("*")) \
                .filter(Conversation.name.like(f'%{search}%')) \
                .filter(Conversation.creator_id == user.id) \
                .filter(Conversation.collection_id == collection_id) \
                .order_by(Conversation.created_at.desc()) \
                .offset(offset).limit(limit).all()
        else:
            return db.query(Conversation).options(joinedload(Conversation.creator), raiseload("*")) \
                .filter(Conversation.creator_id == user.id) \
                .filter(Conversation.collection_id == collection_id) \
                .order_by(Conversation.created_at.desc()) \
                .offset(offset).limit(limit).all()
            
    except Exception as e:
        print(f"Error in get_collection_conversations: {e}")
        raise e
    

def get_nb_collection_conversations(
    collection_id: int,
    user: User,
    db: Session,
    search: str | None = None
) -> int:
    """Récupération des conversations"""
    try:
        if (search):
            return db.query(func.count(Conversation.id)).options(raiseload("*")) \
                .filter(Conversation.name.like(f'%{search}%')) \
                .filter(Conversation.creator_id == user.id) \
                .filter(Conversation.collection_id == collection_id) \
                .scalar()
        else:
            return db.query(func.count(Conversation.id)).options(raiseload("*")) \
                .filter(Conversation.creator_id == user.id) \
                .filter(Conversation.collection_id == collection_id) \
                .scalar()
            
    except Exception as e:
        print(f"Error in get_nb_collection_conversations: {e}")
        raise e
    

def get_conversation_by_uuid(
    conversation_uuid: str,
    user: User,
    db: Session
) -> Conversation:
    """Récupération d'une conversation via son uuid"""
    try:
        conversation = db.query(Conversation).options(joinedload(Conversation.creator), raiseload("*")) \
            .filter(Conversation.uuid == conversation_uuid).first()
        
        if not conversation:
            raise NoResultFound("Conversation non trouvée")
        
        if conversation.creator_id != user.id:
            raise PermissionError("Vous ne disposez pas des droits pour accéder à cette conversation")
        
        return conversation
    
    except Exception as e:
        print(f"Error in get_conversation_by_uuid: {e}")
        raise e
    

def get_conversation_by_id(
    conversation_id: int,
    user: User,
    db: Session
) -> Conversation:
    """Récupération d'une conversation via son id"""
    try:
        conversation = db.query(Conversation).options(joinedload(Conversation.creator), raiseload("*")) \
            .filter(Conversation.id == conversation_id).first()
        
        if not conversation:
            raise NoResultFound("Conversation non trouvée")
        
        if conversation.creator_id != user.id:
            raise PermissionError("Vous ne disposez pas des droits pour accéder à cette conversation")
        
        return conversation
    
    except Exception as e:
        print(f"Error in get_conversation_by_id: {e}")
        raise e


def put_conversation_by_uuid(
    conversation_uuid: str,
    conversation_update: ConversationUpdate,
    user: User,
    db: Session
) -> Conversation:
    """Modification d'une conversation via son uuid"""
    try:
        conversation = db.query(Conversation).options(joinedload(Conversation.creator), raiseload("*")) \
            .filter(Conversation.uuid == conversation_uuid).first()
        
        if not conversation:
            raise NoResultFound("Conversation non trouvée")
        
        if conversation.creator_id != user.id:
            raise PermissionError("Vous ne disposez pas des droits pour accéder à cette conversation")
        
        if conversation_update.title is not None:
            conversation.title = conversation_update.title
        
        db.add(conversation)
        db.commit()

        return conversation

    except Exception as e:
        print(f"Error in put_conversation_by_uuid: {e}")
        raise e
    

def del_conversation_by_uuid(
    conversation_uuid: str,
    user: User,
    db: Session
) -> bool:
    """Suppression d'une conversation via son uuid"""
    try:
        conversation = db.query(Conversation).options(raiseload("*")) \
            .filter(Conversation.uuid == conversation_uuid).first()

        print(f"Conversation to delete: {conversation.uuid if conversation else 'Not found'}")
        if not conversation:
            raise NoResultFound("Conversation non trouvée")

        if conversation.creator_id != user.id:
            raise PermissionError("Vous ne disposez pas des droits pour accéder à cette conversation")

        # Supprimer les messages (nécessaire pour éviter les erreurs de clé étrangère)
        db.query(Message).filter(Message.conversation_id == conversation.id).delete()

        # Supprimer la conversation
        db.delete(conversation)
        db.commit()

        return True

    except Exception as e:
        print(f"Error in del_conversation_by_uuid: {e}")
        raise e