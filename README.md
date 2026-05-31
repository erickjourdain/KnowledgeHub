# KnowledgeHub

Application RAG (Retrieval-Augmented Generation) pleine stack avec :
- **Backend** : FastAPI + PostgreSQL (pgvector) + Redis
- **Frontend** : React + TypeScript + Vite

## Prérequis

- [Docker](https://www.docker.com/) et Docker Compose
- [Ollama](https://ollama.com/) (installé localement sur la machine hôte)

## Installation

### 1. Configuration des variables d'environnement

#### Backend (`rag-backend/.env`)

Copiez le fichier `.env.example` vers `.env` et configurez les variables :

```bash
cd rag-backend
cp .env.example .env
```

Variables principales à configurer :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DB_HOST` | Hôte PostgreSQL | `rag-postgres` |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `DB_NAME` | Nom de la base | `rag-db` |
| `DB_USER` | Utilisateur PostgreSQL | `rag-user` |
| `DB_PWD` | Mot de passe PostgreSQL | `votre_mot_de_passe_fort` |
| `ADMIN_USERNAME` | Nom d'utilisateur admin | `admin` |
| `ADMIN_EMAIL` | Email admin | `admin@votre_domaine.com` |
| `ADMIN_PASSWORD` | Mot de passe admin | `mot_de_passe_admin_fort` |
| `SECRET_KEY` | Clé secrète JWT | `clé_secrète_jwt_forte` |
| `OLLAMA_HOST` | Hôte Ollama | `host.docker.internal` |
| `OLLAMA_PORT` | Port Ollama | `11434` |
| `OLLAMA_EMBEDDING_MODEL` | Modèle d'embeddings | `embeddinggemma` |
| `OLLAMA_QUERY_MODEL` | Modèle pour les queries | `gemma3:4b` |
| `REDIS_PASSWORD` | Mot de passe Redis | `redis_password_fort` |
| `WORKERS_COUNT` | Nombre de workers | 1 |
| `RQ_WORKER_MODE` | Type fonctionnement Worker | `simple` |
| `HOST_STORAGE_PATH` | Chemin de stockage sur l'hôte | `/Users/votre_user/Programmation/knowledge_base` |

#### Frontend (`rag-frontend/.env`)

Copiez le fichier `.env.example` vers `.env` et configurez :

```bash
cd rag-frontend
cp .env.example .env
```

| Variable | Description | Exemple |
|----------|-------------|---------|
| `VITE_API_URL` | URL de l'API backend | `//localhost:8000/api` |

### 2. Lancer Ollama (machine hôte)

Assurez-vous qu'Ollama est installé et lancez les modèles nécessaires :

```bash
# Démarrer Ollama
ollama serve

# Dans un autre terminal, télécharger les modèles
ollama pull embeddinggemma
ollama pull gemma3:4b
```

### 3. Lancer les containers

Depuis la racine du projet :

```bash
cd rag-backend
docker-compose up -d --build
```

### 4. Appliquer les migrations

Après le démarrage des containers, appliquez les migrations de base de données :

```bash
docker-compose exec api alembic upgrade head
```

## Services

| Service | URL | Description |
|---------|-----|-------------|
| API Backend | http://localhost:8000/api | API de l'application |
| API Backend Doc| http://localhost:8000/docs | Documentation API sur `/docs` |
| Frontend | http://localhost:8000 | Interface utilisateur |
| PostgreSQL | localhost:5432 | Base de données |
| Redis | localhost:6379 | Cache et file d'attente |

## Commandes utiles

```bash
# Voir les logs
docker-compose logs -f

# Arrêter les containers
docker-compose down

# Reconstruire et démarrer
docker-compose up -d --build

# Accéder au container API
docker-compose exec api bash

```

## Structure du projet

```
RAG/
├── rag-backend/          # Backend FastAPI
│   ├── app/              # Code source de l'API
│   ├── alembic/          # Migrations DB
│   ├── prompts/          # Prompts LLM
│   ├── knowledge_base/   # Fichiers de connaissances
│   ├── Dockerfile
│   └── docker-compose.yml
├── rag-frontend/         # Frontend React
│   ├── src/              # Code source
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── CLAUDE.md             # Documentation interne
└── README.md
```

## Résolution de problèmes

### Ollama inaccessible depuis Docker

Si vous avez une erreur de connexion à Ollama, vérifiez que :
1. Ollama est bien lancé sur la machine hôte
2. Le paramètre `OLLAMA_HOST` est configuré sur `host.docker.internal` dans fichier .env
3. Les variables `extra_hosts` sont présentes dans le docker-compose.yml
4. Lancer le servuer ollama via l'instruction `export OLLAMA_HOST=0.0.0.0 & ollama serve`

### Erreurs de base de données

Vérifiez que PostgreSQL est prêt avant d'appliquer les migrations :
```bash
docker-compose ps  # Vérifier que postgres est "healthy"
```

### Premiers pas

1. Connectez-vous avec le compte admin configuré dans le `.env`
2. Créez une collection
3. Téléchargez des documents (PDF, TXT, etc.)
4. Interrogez vos documents via l'interface RAG