from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import BackendResponse, ConversationResponse, ConversationUpdate, MessageResponse, PaginatedResponse
from app.services.collections import get_collection_without_relations
from app.services.conversations import (
    del_conversation_by_uuid, 
    get_collection_conversations, 
    get_conversation_messages, 
    get_nb_collection_conversations, 
    get_nb_conversation_messages, 
    put_conversation_by_uuid
)

router = APIRouter()


@router.get("/{conversation_uuid}/messages", response_model=PaginatedResponse[MessageResponse])
def get_messages(
    conversation_uuid: str,
    skip: int = 0,
    limit: int = 20,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        count = get_nb_conversation_messages(
            conversation_uuid=conversation_uuid,
            user=current_user,
            db=db
        )
        limit = 20 if limit > 20 else limit
        response = PaginatedResponse(
            data = get_conversation_messages(
                conversation_uuid=conversation_uuid,
                offset=(count - limit - skip) if ((count - limit - skip) > 0) else 0,
                limit=limit,
                user=current_user,
                db=db
            ),
            count = count
        )

        return response
    except NoResultFound as e:
        raise HTTPException(status_code=404, detail=e)
    except PermissionError as e:
        raise HTTPException(status_code=404, detail=e)
    except Exception as e:
        print(f"Error in getting messages: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des messages")
    

@router.get("/collection/{collection_id}", response_model=PaginatedResponse[ConversationResponse])
def get_conversations(
    collection_id: int,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer les conversations d'une collection"""
    try:
        collection = get_collection_without_relations(collection_id, current_user, db)
        if not collection:
            raise HTTPException(status_code=404, detail="Collection non trouvée")
        
        limit = 20 if limit > 20 else limit
        response = PaginatedResponse(
            data = get_collection_conversations(
                collection_id=collection_id,
                offset=skip,
                limit=limit,
                user=current_user,
                db=db,
                search=search
            ),
            count = get_nb_collection_conversations(
                collection_id=collection_id,
                user=current_user,
                db=db,
                search=search
            )
        )
        return response
    except Exception as e:
        print(f"Error in conversation retreival {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération de la convesration")
    

@router.put("/{conversation_uuid}", response_model=ConversationResponse)
def update_conversation(
    conversation_uuid: str,
    conversation_update: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update conversation"""
    try:
        conversation = put_conversation_by_uuid(
            conversation_uuid=conversation_uuid,
            conversation_update=conversation_update,
            user=current_user,
            db=db
        ) 
        return ConversationResponse(
            id=conversation.id,
            uuid=conversation.uuid,
            title=conversation.title,
            collection_id=conversation.collection_id,
            creator_id=conversation.creator_id,
            created_at=conversation.created_at
        )

    except NoResultFound:
        raise HTTPException(status_code=404, detail="La conversation n'existe pas")
    except PermissionError:
        raise HTTPException(status_code=403, detail="Vous ne disposez des droits suffisants pour effectuer cette opération")
    except Exception as e:
        print(f"Error in conversation update {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour de la convesration")


@router.delete("/{conversation_uuid}", response_model=BackendResponse)
def delete_conversation(
    conversation_uuid: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete conversation"""
    try:
        del_conversation_by_uuid(conversation_uuid=conversation_uuid, user=current_user, db=db)
        return BackendResponse(
            status=True,
            message="Conversation supprimée avec succès"
        )
    except NoResultFound:
        raise HTTPException(status_code=404, detail="La conversation n'existe pas")
    except PermissionError:
        raise HTTPException(status_code=403, detail="Vous ne disposez des droits suffisants pour effectuer cette opération")
    except Exception as e:
        print(f"Error in conversation retreival {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression de la convesration")