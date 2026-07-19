from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.dependencies import get_current_user
from app.models import User, Conversation, Message, RoleEnum
from app.schemas import PaginatedResponse, MessageResponse


router = APIRouter()

@router.get("/messages/{conversation_id}", response_model=PaginatedResponse[MessageResponse])
def get_messages(
    conversation_id: int,
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Endpoint pour récupérer les messages d'une conversation"""
    try:
        # Vérifier que l'utilisateur a accès à la conversation
        conversation = db.query(Conversation).filter_by(id=conversation_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
        if conversation.creator_id != current_user.id and \
            conversation.collection.creator_id != current_user.id and \
            current_user.role != RoleEnum.ADMIN:
            raise HTTPException(status_code=403, detail="Accès refusé à cette conversation")

        # Récupérer les messages de la conversation avec pagination
        messages = db.query(Message).filter_by(conversation_id=conversation_id).order_by(Message.created_at.desc()).offset(offset).limit(limit).all()
        count = db.query(Message).filter_by(conversation_id=conversation_id).count()

        return PaginatedResponse(data=messages, count=count)
    except HTTPException:
        raise
    except Exception as e:
        print(f"erreur: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des messages")  

@router.get("/messages/{uuid}", response_model=MessageResponse)
def get_message_by_uuid(
    uuid: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Endpoint pour récupérer un message par son UUID"""
    try:
        # Récupérer le message par son UUID
        message = db.query(Message).filter_by(uuid=uuid).first()
        if not message:
            raise HTTPException(status_code=404, detail="Message non trouvé")
        
        # Vérifier que la conversation existe
        conversation = db.query(Conversation).filter_by(id=message.conversation_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation non trouvée")

        # Vérifier que l'utilisateur a accès à la conversation
        if conversation.creator_id != current_user.id and \
            conversation.collection.creator_id != current_user.id and \
            current_user.role != RoleEnum.ADMIN:
            raise HTTPException(status_code=403, detail="Accès refusé à cette conversation")

        return message
    except HTTPException:
        raise
    except Exception as e:
        print(f"erreur: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération du message")
    
@router.get("/messages/{conversation_id}/latest", response_model=MessageResponse)
def get_latest_message(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Endpoint pour récupérer le dernier message d'une conversation"""

    try:
        # Vérifier que la conversation existe
        conversation = db.query(Conversation).filter_by(id=conversation_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation non trouvée")
        
        # Vérifier que l'utilisateur a accès à la conversation
        if conversation.creator_id != current_user.id and \
            conversation.collection.creator_id != current_user.id and \
            current_user.role != RoleEnum.ADMIN:
            raise HTTPException(status_code=403, detail="Accès refusé à cette conversation")

        # Récupérer le dernier message de la conversation
        message = db.query(Message).filter_by(conversation_id=conversation_id).order_by(Message.created_at.desc()).first()
        if not message:
            raise HTTPException(status_code=404, detail="Aucun message trouvé dans cette conversation")

        return message
    except HTTPException:
        raise
    except Exception as e:
        print(f"erreur: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération du dernier message")    