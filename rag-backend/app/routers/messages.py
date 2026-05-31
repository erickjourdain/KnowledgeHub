from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import MessageResponse
from app.services.conversations import get_conversation_by_id
from app.services.messages import get_message_by_uuid


router = APIRouter()

@router.get("/{uuid}", response_model=MessageResponse)
def get_message_uuid(
    uuid,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> MessageResponse:
    try:
        message = get_message_by_uuid(message_uuid=uuid, db=db)

        if not message:
            raise HTTPException(status_code=404, detail="Message non trouvé")
        
        get_conversation_by_id(
            conversation_id=message.conversation_id,
            user=current_user,
            db=db)
        
        return message

    except NoResultFound as e:
        raise HTTPException(status_code=404, detail=e)
    except PermissionError as e:
        raise HTTPException(status_code=404, detail=e)
    except Exception as e:
        print(f"Error in getting messages: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération du message")