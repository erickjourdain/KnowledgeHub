import uuid

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.config.database import Base
from datetime import datetime


# Table de relation many-to-many pour les utilisateurs autorisés
collection_users = Table(
    'collection_users',
    Base.metadata,
    Column('collection_id', Integer, ForeignKey('collections.id'), primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True)
)

# Table de relation many-to-many pour les gestionnaires
collection_managers = Table(
    'collection_managers',
    Base.metadata,
    Column('collection_id', Integer, ForeignKey('collections.id', ondelete='CASCADE'), primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
)

class Collection(Base):
    __tablename__ = "collections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, default=lambda: str(uuid.uuid4()), index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    modele: Mapped[str] = mapped_column(String(100), nullable=True)
    creator_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relations
    creator = relationship(
        "User",
        back_populates="created_collections"
    )
    managers = relationship(
        "User",
        secondary=collection_managers,
        back_populates="managed_collections"
    )
    authorized_users = relationship(
        "User",
        secondary=collection_users,
        back_populates="accessible_collections"
    )
    documents = relationship(
        "Document",
        back_populates="collection",
        cascade="all, delete-orphan"
    )
    conversations = relationship(
        "Conversation",
        back_populates="collection",
        cascade="all, delete-orphan"
    )
    jobs_query_kb = relationship(
        "JobQueryKb",
        back_populates="collection",
        cascade="all, delete-orphan"
    )