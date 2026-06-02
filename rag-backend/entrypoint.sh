#!/bin/bash
set -e

print_status() {
    echo "========================================="
    echo "=> $1"
    echo "========================================="
}

# Change to app directory where .env is located
cd /app

# Création répertoire temporaire pour les fichiers téléchargés
# mkdir -p /app/temp

print_status "Mise à jour de la base de données..."
APP_ENV=production python scripts/setup_db.py

# Nombre de workers RQ (défaut: 2)
WORKERS_COUNT=${WORKERS_COUNT:-2}

print_status "Démarrage de l'API FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 &
API_PID=$!

# Attendre que tous les processus soient actifs
wait $API_PID
