from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Index, Computed
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import VECTOR
from app.config.database import Base
from datetime import datetime


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    is_indexed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    collection_id: Mapped[int] = mapped_column(Integer, ForeignKey("collections.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relations
    collection = relationship("Collection", back_populates="documents")
    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan"
    )
    jobs = relationship(
        "JobIngestion",
        back_populates="document",
        cascade="all, delete-orphan"
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    chunk_text = Column(Text, nullable=False)
    dimension = Column(Integer, nullable=True)
    embedding = Column(VECTOR(768), nullable=True)
    chapter = Column(String(512), nullable=True)
    section = Column(String(512), nullable=True)
    subsection = Column(String(512), nullable=True)
    page = Column(Integer, nullable=True)

    # Text search vector generated column
    chunk_text_search = Column(
        TSVECTOR,
        Computed("to_tsvector('french', chunk_text)", persisted=True),
        nullable=True
    )

    document = relationship("Document", back_populates="chunks")

    __table_args__ = (
        Index(
            "ix_document_chunks_chunk_text_search",
            "chunk_text_search",
            postgresql_using="gin",
        ),
        Index(
            "ix_document_chunks_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )
