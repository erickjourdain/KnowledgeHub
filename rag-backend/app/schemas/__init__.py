from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Any, Optional, List, TypeVar, Generic

from rq.job import JobStatus
from app.models import RoleEnum
import re

# === Generic Paginated Response ===
T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    count: int

# === Document Schemas ===
class DocumentBase(BaseModel):
    title: str
    is_indexed: bool = False
    collection_id: int

class DocumentCreate(DocumentBase):
    pass

class DocumentResponse(DocumentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DocumentsResponseNbChunks(DocumentResponse):
    nb_chunks: Optional[int] = None

class ChunkResponse(BaseModel):
    id: int
    chunk_text: str
    dimension: Optional[int] = None
    embedding: Optional[List[float]] = None
    chapter: Optional[str] = None
    section: Optional[str] = None
    subsection: Optional[str] = None
    page: Optional[int] = None

    class Config:
        from_attributes = True

class DocumentDetailResponse(DocumentResponse):
    chunks: List[ChunkResponse] = []

# === RAG Schemas ===
class RagQuery(BaseModel):
    query: str
    collection_id: int
    conversation_uuid: Optional[str] = None
    title: Optional[str] = None
    model: Optional[str] = None
    top_k: Optional[int] = 5
    document_ids: Optional[List[int]] = None
    exclude_document_ids: Optional[List[int]] = None

class Source(BaseModel):
    id: int
    fichier: str
    chapitre: str
    section: str
    sous_section: str
    pages: str
    contenu: str

class RagResponse(BaseModel):
    query: str
    title: Optional[str] = None
    reponse: str
    sources: List[Source]

# === User Schemas ===
class UserBase(BaseModel):
    username: str
    email: EmailStr

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Le nom d\'utilisateur doit contenir au moins 3 caractères')
        if len(v) > 50:
            raise ValueError('Le nom d\'utilisateur ne doit pas dépasser 50 caractères')
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Le nom d\'utilisateur ne doit contenir que des lettres, chiffres et underscores (pas d\'espaces ni caractères spéciaux)')
        return v

class UserCreate(UserBase):
    password: str

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Le mot de passe doit contenir au moins 8 caractères')
        if len(v) > 128:
            raise ValueError('Le mot de passe ne doit pas dépasser 128 caractères')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Le mot de passe doit contenir au moins une lettre majuscule')
        if not re.search(r'[a-z]', v):
            raise ValueError('Le mot de passe doit contenir au moins une lettre minuscule')
        if not re.search(r'[0-9]', v):
            raise ValueError('Le mot de passe doit contenir au moins un chiffre')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Le mot de passe doit contenir au moins un caractère spécial')
        return v

class UserResponse(UserBase):
    id: int
    is_active: bool
    role: RoleEnum
    icon: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    role: Optional[RoleEnum] = None
    icon: Optional[str] = None

class PasswordUpdate(BaseModel):
    username: str
    old_password: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('Le mot de passe doit contenir au moins 8 caractères')
        if len(v) > 128:
            raise ValueError('Le mot de passe ne doit pas dépasser 128 caractères')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Le mot de passe doit contenir au moins une lettre majuscule')
        if not re.search(r'[a-z]', v):
            raise ValueError('Le mot de passe doit contenir au moins une lettre minuscule')
        if not re.search(r'[0-9]', v):
            raise ValueError('Le mot de passe doit contenir au moins un chiffre')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Le mot de passe doit contenir au moins un caractère spécial')
        return v

class UserLogin(BaseModel):
    username: str
    password: str

# === Auth Schemas ===
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[RoleEnum] = None

# === Collection Schemas ===
class CollectionBase(BaseModel):
    name: str
    description: Optional[str] = None
    modele: Optional[str] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if len(v) < 5:
            raise ValueError('Le nom doit contenir au moins 5 caractères')
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Le nom ne doit contenir que des lettres, chiffres et underscores (pas d\'espaces ni caractères spéciaux)')
        return v

    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v is not None and len(v) < 25:
            raise ValueError('La description doit contenir au moins 25 caractères si elle est fournie')
        return v

class CollectionCreate(CollectionBase):
    pass

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    authorized_users: Optional[List[int]] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None:
            if len(v) < 5:
                raise ValueError('Le nom doit contenir au moins 5 caractères')
            if not re.match(r'^[a-zA-Z0-9_]+$', v):
                raise ValueError('Le nom ne doit contenir que des lettres, chiffres et underscores (pas d\'espaces ni caractères spéciaux)')
        return v

    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v is not None and len(v) < 25:
            raise ValueError('La description doit contenir au moins 25 caractères si elle est fournie')
        return v

class CollectionResponse(CollectionBase):
    id: int
    uuid: str
    creator_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CollectionListResponse(CollectionResponse):
    authorized_users_count: int = 0
    documents_count: int = 0

class UsersInCollection(BaseModel):
    id: int
    authorized: bool

# === Conversation Schemas ===
class ConversationResponse(BaseModel):
    id: int
    uuid: str
    collection_id: int
    creator_id: int
    title: str
    created_at: datetime
    creator: Optional[UserResponse] = None

    class Config:
        from_attributes = True

class ConversationUpdate(BaseModel):
    title: Optional[str] = None

    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if v is not None and len(v) < 5:
            raise ValueError('Le titre doit contenir au moins 5 caractères')
        if v is not None and len(v) > 50:
            raise ValueError('Le titre doit contenir au maximum 50 caractères')
        return v

# === Job Schemas ===

class JobMeta(BaseModel):
    step: str
    message: str
    progress: int

class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    result: Optional[Any] = None
    error: Optional[str] = None

class JobIngestionResponse(BaseModel):
    id: int
    uuid: str
    collection_id: int
    filename: str
    document_id: int | None
    document: DocumentResponse | None
    status: str
    result: dict | None
    error: str | None
    created_at: datetime    

    class Config:
        from_attributes = True

class JobKbResponse(BaseModel):
    id: int
    uuid: str
    collection_id: int
    query: str
    creator_id: int
    status: str
    result: RagResponse | None
    error: str | None
    created_at: datetime    

    class Config:
        from_attributes = True

# === Message Schemas ===

class MessageResponse(BaseModel):
    id: int
    uuid: str
    conversation_id: int
    sender: UserResponse
    questions: str
    answer: Optional[str] = None
    sources: Optional[List[dict]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# === BackendResponse ===

class BackendResponse(BaseModel):
    status: bool
    message: str

# === LLM ===

class LlmModel(BaseModel):
    digest: str | None
    name: str | None
    embed: bool
    size: int | None
    parameter_size: str | None