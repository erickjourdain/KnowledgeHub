from sqlalchemy.orm import Session, joinedload

from app.models.conversation import Message


def get_message_by_uuid(
    message_uuid: str,
    db: Session
) -> Message | None:
    """Récupération d'un message via son uuid"""
    try:
        return db.query(Message).options(joinedload(Message.sender)).filter(Message.uuid == message_uuid).first()
    except Exception as e:
        print(f"Error in get_message_by_uuid: {e}")
        raise e