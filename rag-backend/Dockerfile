# ==========================================
# ÉTAPE 1 : Compilation du Frontend React/Vite
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend

# Définition de l'URL de l'API pour Vite (ajustable si besoin)
ENV VITE_API_URL=/api

# Copie des fichiers de dépendances depuis le dossier indépendant du front
COPY rag-frontend/package*.json ./
RUN npm install

# Copie du reste du code source du frontend et construction
COPY rag-frontend/ ./
RUN npm run build

# ==========================================
# ÉTAPE 2 : Configuration du Backend FastAPI
# ==========================================
# Backend Python API
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    libgl1 \
    libxcb1 \
    libxcb-xinerama0 \
    libxcb-icccm4 \
    libxcb-image0 \
    libxcb-keysyms1 \
    libxcb-randr0 \
    libxcb-render-util0 \
    libxcb-shape0 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-privileged user and group
RUN groupadd -r -g 10001 appgroup && \
    useradd -r -u 10001 -g appgroup -m -d /home/appuser -s /sbin/nologin appuser

# Copy requirements and install dependencies
COPY rag-backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY rag-backend/app ./app
COPY rag-backend/alembic ./alembic
COPY rag-backend/scripts ./scripts
COPY rag-backend/prompts ./prompts
COPY rag-backend/alembic.ini .
COPY rag-backend/pyrightconfig.json .
COPY rag-backend/.env .env
COPY rag-backend/worker.py .
COPY rag-backend/entrypoint.sh .

# Récupération du build React de l'étape 1 vers le dossier statique de FastAPI
COPY --from=frontend-builder /frontend/dist ./app/static

# Create necessary directories and ensure appuser has write permissions
RUN mkdir -p /app/temp /app/knowledge_base /app/.cache/huggingface && \
    chown -R appuser:appgroup /app && \
    chmod +x /app/entrypoint.sh

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV HF_HOME=/app/.cache/huggingface

# Expose port
EXPOSE 8000

# Switch to the non-root user
USER appuser

# Run the application
CMD ["./entrypoint.sh"]
