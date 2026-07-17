import os

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, raiseload

from app.models import Document, DocumentChunk
from app.schemas import DocumentsResponseNbChunks
from app.utils.directory import get_knowledge_base_dir


def get_documents_by_collection_without_relations(
    collection_id: int, 
    db: Session,
    skip: int = 0, 
    limit: int = 10,
    search: str | None = None
) -> list[DocumentsResponseNbChunks]:
    """Récupère les documents d'une collection sans les relations"""
    try:
        query = db.query(Document).filter(Document.collection_id == collection_id, Document.is_indexed)
        if search:
            query = query.filter(Document.title.ilike(f"%{search}%"))
            
        documents = query.options(raiseload("*")).order_by(Document.created_at.desc()) \
            .offset(skip).limit(limit).all()
        
        responses = []
        for document in documents:
            response = DocumentsResponseNbChunks.model_validate(document)
            nb_chunks = db.query(func.count(DocumentChunk.id)).where(DocumentChunk.document_id == document.id).scalar()
            response.nb_chunks = nb_chunks
            responses.append(response)
        
        return responses
    
    except Exception as e:
        print(f"Error in get_documents_by_collection_without_relations: {e}")
        raise e
    
def get_documents_count_by_collection(collection_id: int, db: Session, search: str | None = None) -> int:
    """Récupère le nombre de documents d'une collection"""
    try:
        query = db.query(func.count(Document.id)) \
            .filter(Document.collection_id == collection_id, Document.is_indexed)
        if search:
            query = query.filter(Document.title.ilike(f"%{search}%"))
            
        count = query.scalar()
        return count
    
    except Exception as e:
        print(f"Error in get_documents_count_by_collection: {e}")
        raise e
    

def delete_document(document_id: int, collection_uuid: str, db: Session) -> bool:
    """Supprimer un document"""
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Le document n'existe pas")

        # Sauvegarder le titre pour la suppression du fichier après le commit
        document_title = document.title

        # Supprimer d'abord les chunks (pour respecter la contrainte de clé étrangère)
        db.query(DocumentChunk).where(DocumentChunk.document_id == document_id).delete()

        # Supprimer le document
        db.delete(document)

        # Commiter la transaction DB avant suppression du fichier
        db.commit()

        # Supprimer le fichier du système de fichiers (après le commit pour atomicité)
        file_path = os.path.join(get_knowledge_base_dir(), f"{collection_uuid}", document_title)
        try:
            os.remove(file_path)
        except FileNotFoundError:
            pass  # Le fichier n'existe pas, ce n'est pas critique

        return True
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error in delete_document: {e}")
        raise e