# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a FastAPI-based RAG (Retrieval-Augmented Generation) backend application. It provides APIs for managing documents, collections, and users, with authentication and role-based access control.

## Common Commands

```bash
# Run the server (requires PostgreSQL)
source venv/bin/activate
uvicorn app.main:app --reload --port 3000

# Run type checking
pyright

# Docker
docker-compose up -d --build              # Démarrer les services
docker-compose down                       # Arrêter les services
docker-compose logs -f backend            # Voir les logs du backend
docker-compose exec backend alembic upgrade head  # Appliquer les migrations
python scripts/setup_db.py                # Configurer la base (hors Docker)
```

## Architecture

### Technology Stack

- **FastAPI** - Web framework
- **SQLAlchemy** - ORM with PostgreSQL
- **Pydantic** - Data validation
- **JWT** - Authentication via python-jose
- **Bcrypt** - Password hashing

### API Structure

The API is organized with 4 main routers under `/api`:

| Route | Description |
| ----- | ----------- |
| `/api/users` | User registration, login, management |
| `/api/documents` | Document CRUD operations |
| `/api/collections` | Collection management with document/user associations |
| `/api/rag` | RAG query endpoint (stub implementation) |

### Database Models

- **User** - id, username, email, hashed_password, is_active, role (ADMIN/GESTIONNAIRE/USER)
- **Document** - id, title, content, source, timestamps, chunks relation
- **DocumentChunk** - id, document_id, chunk_text, chunk_index, embedding
- **Collection** - id, name, description, creator_id, authorized_users, documents

### Authentication Flow

1. Users register via `/api/users/register` (inactive by default)
2. Admin activates users via `/api/users/activate/{user_id}`
3. Users login via `/api/users/login` to get JWT access/refresh tokens
4. Tokens are validated via `get_current_user` dependency
5. Role checks are performed per-endpoint (ADMIN, GESTIONNAIRE, USER)

### Key Patterns

- Role-based access control is implemented in each router using `get_current_user` dependency
- Admin user is auto-created on startup from `.env` variables
- CORS is enabled for all origins
- Database tables are created on startup via SQLAlchemy `create_all`

## Environment Variables (.env)

``` .env
DATABASE_URL=postgresql://user:password@localhost:5432/rag_db
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=changeme
SECRET_KEY=your_jwt_secret_key
```

## Notes

- The RAG endpoint (`/api/rag/query`) is a stub that returns placeholder responses
- Docling is listed in requirements but not yet integrated into the RAG pipeline
- Tests directory is empty - no test framework configured yet
