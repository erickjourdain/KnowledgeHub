from sqlalchemy import Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.config.database import Base
from app.models.enum import RoleEnum
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    role: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum), default=RoleEnum.USER)
    icon: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relations
    created_collections = relationship(
        "Collection",
        back_populates="creator"
    )
    managed_collections = relationship(
        "Collection",
        secondary="collection_managers",
        back_populates="managers"
    )
    accessible_collections = relationship(
        "Collection",
        secondary="collection_users",
        back_populates="authorized_users"
    )