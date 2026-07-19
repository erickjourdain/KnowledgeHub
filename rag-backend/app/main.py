from contextlib import asynccontextmanager
import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.config.database import get_db, SessionLocal
import asyncio
from datetime import datetime, time, timedelta
from app.services.cleanup import cleanup_finished_ingestion_jobs
from app.database_init import init_db
from app.models import Collection
from app.config.ollama import get_ollama_client
from app.routers import chat, collections, conversations, jobs, messages, rag, test_chat, users, llm, websocket
from app.schemas import BackendResponse
from app.utils.directory import get_knowledge_base_dir
from app.core.queue import redis_conn
from app.config.config import ALLOWED_ORIGINS

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize DB and run cleanup
    init_db()
    # Run cleanup once at startup
    db = SessionLocal()
    try:
        cleanup_finished_ingestion_jobs(db)
    finally:
        db.close()
    # Schedule daily cleanup at 6am
    async def _daily_cleanup_task():
        while True:
            now = datetime.now()
            next_run = datetime.combine(now.date(), time(6, 0))
            if now >= next_run:
                next_run += timedelta(days=1)
            await asyncio.sleep((next_run - now).total_seconds())
            db = SessionLocal()
            try:
                cleanup_finished_ingestion_jobs(db)
            finally:
                db.close()
    asyncio.create_task(_daily_cleanup_task())
    yield
    # Shutdown : tu peux ajouter du code ici si besoin

app = FastAPI(
    title="RAG API",
    description="API pour une application RAG avec FastAPI",
    lifespan=lifespan,
    version="1.0.0"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

# Inclure les routers
app.include_router(rag.router, prefix="/api/rag", tags=["RAG"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(collections.router, prefix="/api/collections", tags=["Collections"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["Conversations"])
app.include_router(messages.router, prefix="/api/messages", tags=["Message"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(llm.router, prefix="/api/ollama", tags=["Ollama"])
app.include_router(test_chat.router, prefix="/api/test", tags=["Test Chat Api"])

# Inclure le router WebSocket
app.include_router(websocket.router, tags=["WebSocket"])

# Configuration pour servir le Frontend React
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    raise RuntimeError("Dossier static non disponible")

app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

# Les fichiers statiques de la base de connaissances (knowledge base) ne sont plus montés publiquement pour des raisons de sécurité.
# L'accès aux documents est désormais restreint et passe par un endpoint authentifié.
knowledge_base_dir = get_knowledge_base_dir()
knowledge_base_dir.mkdir(parents=True, exist_ok=True)


@app.get("/api", response_model=BackendResponse)
def root():
    return BackendResponse(
        status=True,
        message="RAG API est en ligne !"
    )

@app.get("/api/health", response_model=BackendResponse)
def health_check(db: Session = Depends(get_db)):
    try:
        db.query(Collection).first()
        client = get_ollama_client()
        client.list()
        redis_conn.ping()
        return BackendResponse(
            status=True,
            message="Ok: tous les services sont opérationnels"
        )
    except Exception as e:
        return BackendResponse(
            status=False,
            message=f"Erreur: {e}"
        )

# Capturer toutes les autres routes non-API pour les confier au routeur de React (Single Page Application)
@app.get("/{catchall:path}")
async def serve_spa(catchall: str):
    # Si la route commence par "api", on laisse FastAPI renvoyer une erreur 404 normale
    if catchall.startswith("api"):
        return HTMLResponse(status_code=404, content="API Route not found")
    # Sinon, on renvoie l'index.html de React pour gérer la navigation
    return FileResponse(os.path.join(static_dir, "index.html"))