# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack RAG (Retrieval-Augmented Generation) application consisting of:
- **rag-backend**: FastAPI backend with PostgreSQL
- **rag-frontend**: React + TypeScript frontend with Vite

## Common Commands

### Backend
```bash
cd rag-backend

# Development (requires PostgreSQL)
source venv/bin/activate
uvicorn app.main:app --reload --port 3000

# Docker
docker-compose up -d --build
docker-compose exec backend alembic upgrade head
```

### Frontend
```bash
cd rag-frontend
npm run dev
npm run build
npm run lint
```

## Architecture

### Backend (FastAPI)
- **API Routes**: `/api/users`, `/api/documents`, `/api/collections`, `/api/rag`
- **Database**: PostgreSQL with SQLAlchemy ORM, Alembic migrations
- **Auth**: JWT tokens via python-jose, role-based access (ADMIN/GESTIONNAIRE/USER)
- **Models**: User, Document, DocumentChunk, Collection

### Frontend (React + Vite)
- **Routing**: TanStack Router with file-based routing in `src/routes/`
- **State**: Jotai for atomic state, TanStack Query for server state
- **UI**: Material UI v7, Axios for HTTP requests
- **Real-time**: WebSocket for job status updates

### Data Flow
1. Users register/login via frontend → JWT tokens stored in localStorage
2. Documents uploaded → chunks created → embeddings stored
3. RAG queries → retrieve relevant chunks → LLM generates response

## Environment Variables

### Backend (.env)
- `DATABASE_URL` - PostgreSQL connection
- `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` - Initial admin account
- `SECRET_KEY` - JWT secret

### Frontend (.env)
- `VITE_API_URL` - Backend API URL (defaults to `http://localhost:5000/api`)