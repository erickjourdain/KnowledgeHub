from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base

class JobIngestion(Base):
    __tablename__ = "job_ingestion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    collection_id: Mapped[int] = mapped_column(Integer, ForeignKey("collections.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    document_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("documents.id"), nullable=True)
    status: Mapped[str] = mapped_column(String)
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    # Relations
    document = relationship(
        "Document",
        back_populates="jobs"
    )

class JobQueryKb(Base):
    __tablename__ = "job_query_kb"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    collection_id: Mapped[int] = mapped_column(Integer, ForeignKey("collections.id"), nullable=False)
    query: Mapped[str] = mapped_column(String, nullable=False)
    creator_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String)
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    collection = relationship(
        "Collection",
        back_populates="jobs_query_kb"
    )