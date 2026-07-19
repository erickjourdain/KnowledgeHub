# KnowledgeHub

Application RAG (Retrieval-Augmented Generation) pleine stack moderne et sécurisée permettant de charger des documents, de les indexer et d'interagir avec eux via un agent conversationnel intelligent.

## Technologies Clés

- **Backend** : FastAPI + PostgreSQL (pgvector) + Redis & RQ (Redis Queue) + Ollama + Docling (parseur de documents)
- **Frontend** : React 19 + TypeScript + Vite + TanStack Router (routage par fichiers) + TanStack Query + Jotai (gestion d'état) + Material UI v7

---

## 🚀 Nouvelles Fonctionnalités & Améliorations Récentes

Depuis ses premières versions, l'application a été considérablement enrichie :

### 📄 Visualisation & Gestion des Documents
- **Conversion Word (DOCX) vers PDF** : Intégration de LibreOffice en mode headless dans l'image Docker pour convertir automatiquement les documents `.docx` en `.pdf` lors de l'ingestion.
- **Visualiseur PDF Intégré** : Ouverture des documents sources directement dans le navigateur. Si une page spécifique est associée à l'extrait (chunk), le visualiseur s'ouvre directement à la bonne page (`#page=N`).
- **Sélection des Sources** : Possibilité de sélectionner ou désélectionner des documents spécifiques au sein d'une collection pour restreindre ou élargir le contexte utilisé lors des discussions.

### 👥 Administration & Droits d'Accès
- **Multi-gestionnaires par Collection** : Vous pouvez maintenant affecter plusieurs gestionnaires à une même collection pour une administration partagée (importation, réindexation, gestion des utilisateurs autorisés).
- **Routage par Slugs** : Transition d'un routage basé sur les identifiants techniques (`id`) vers des slugs lisibles et uniques pour les collections et les utilisateurs, améliorant la lisibilité des URL et la navigation.

### 💬 Interface de Chat & RAG Avancé
- **Sélection du LLM** : Choix dynamique du modèle de génération (ex: `gemma3:4b`) directement depuis l'interface de discussion.
- **Déduplication des Sources** : Optimisation de l'affichage et de l'envoi des sources pour éviter les doublons et maximiser la qualité du contexte.
- **Barre d'outils d'écriture (ComposerToolbar)** : Amélioration de l'interface de saisie avec formatage Markdown enrichi.

### ⚙️ Page d'Informations Techniques
- Ajout d'une page dédiée `/info` décrivant les détails de l'infrastructure RAG (modèle d'embeddings Ollama, modèle de Reranker Cross-encoder Camembert, paramètres de découpage/chunking et tokenizer).

### 🔒 Sécurité & Robustesse
- **Audit de Sécurité Cyber** : Durcissement des images Docker avec exécution sous utilisateur non-root (`appuser`), validation stricte des uploads, limitation de type MIME, et sécurisation des protocoles WebSockets.
- **Optimisation de la Mémoire** : Résolution des fuites mémoire et optimisation du nettoyage lors de l'ingestion hiérarchique de volumineux documents.

---

## 🛠️ Prérequis

- [Docker](https://www.docker.com/) et Docker Compose
- [Ollama](https://ollama.com/) (installé localement sur la machine hôte)

---

## ⚙️ Configuration des Variables d'Environnement

### 1. Backend (`rag-backend/.env`)

Copiez le fichier `.env.example` vers `.env` et configurez les variables :

```bash
cd rag-backend
cp .env.example .env
```

| Variable | Description | Valeur par défaut / Exemple |
|----------|-------------|-----------------------------|
| `APP_NAME` | Nom de l'application | `KnowledgeHub` |
| `ALLOWED_ORIGINS` | Domaines autorisés pour les requêtes CORS | `http://localhost:5173` |
| `DB_HOST` | Hôte PostgreSQL | `rag-postgres` |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `DB_NAME` | Nom de la base | `rag-db` |
| `DB_USER` | Utilisateur PostgreSQL | `rag-user` |
| `DB_PWD` | Mot de passe PostgreSQL | `votre_mot_de_passe_fort` |
| `ADMIN_USERNAME` | Nom d'utilisateur admin par défaut | `admin` |
| `ADMIN_EMAIL` | Email de l'administrateur | `admin@localhost.com` |
| `ADMIN_PASSWORD` | Mot de passe admin | `mot_de_passe_admin_fort` |
| `SECRET_KEY` | Clé secrète JWT | `clé_secrète_jwt_forte` |
| `OLLAMA_HOST` | Hôte Ollama | `host.docker.internal` |
| `OLLAMA_PORT` | Port Ollama | `11434` |
| `OLLAMA_EMBEDDING_MODEL` | Modèle d'embeddings | `embeddinggemma` |
| `OLLAMA_QUERY_MODEL` | Modèle pour les requêtes | `gemma3:4b` |
| `REDIS_HOST` | Hôte Redis | `rag-redis` |
| `REDIS_PORT` | Port Redis | `6379` |
| `REDIS_PASSWORD` | Mot de passe Redis | `redis_password_fort` |
| `WORKERS_COUNT` | Nombre de workers de tâche en arrière-plan | `1` |
| `RQ_WORKER_MODE` | Type fonctionnement Worker (`simple` ou `fork`) | `simple` |
| `RERANKER_MODEL` | Modèle de reranking des résultats | `antoinelouis/crossencoder-distilcamembert-mmarcoFR` |
| `RERANKER_THRESHOLD` | Score minimal pour le reranking | `0.0` |
| `CHUNK_MAX_TOKENS` | Taille max des chunks de texte | `512` |
| `EMBEDDING_TOKENIZER_MODEL` | Modèle du tokenizer d'embeddings | `nomic-ai/nomic-embed-text-v1` |
| `HOST_STORAGE_PATH` | Chemin de stockage absolu sur la machine hôte | `/Users/votre_user/Programmation/knowledge_base` |

### 2. Frontend (`rag-frontend/.env`)

Copiez le fichier `.env.example` vers `.env` et configurez :

```bash
cd rag-frontend
cp .env.example .env
```

| Variable | Description | Exemple |
|----------|-------------|---------|
| `VITE_API_URL` | URL racine de l'API backend | `/api` |

---

## 🚀 Installation & Démarrage

### 1. Lancer Ollama (machine hôte)

Assurez-vous qu'Ollama est installé et téléchargez les modèles nécessaires :

```bash
# Démarrer Ollama si ce n'est pas fait
ollama serve

# Dans un autre terminal, télécharger les modèles requis
ollama pull embeddinggemma
ollama pull gemma3:4b
```

### 2. Lancer les Conteneurs Docker

Depuis la racine du projet, lancez la construction et le démarrage des services :

```bash
cd rag-backend
docker-compose up -d --build
```

### 3. Appliquer les Migrations de Base de Données

Une fois les conteneurs démarrés et la base PostgreSQL prête, exécutez les migrations Alembic :

```bash
docker-compose exec api alembic upgrade head
```

---

## 🗺️ Services Disponibles

| Service | URL | Description |
|---------|-----|-------------|
| **Interface Frontend** | [http://localhost:8000](http://localhost:8000) | Interface utilisateur web complète |
| **API Backend** | [http://localhost:8000/api](http://localhost:8000/api) | Point d'entrée de l'API |
| **Documentation API (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) | Outil de test et spécification de l'API |
| **PostgreSQL** | `localhost:5432` | Stockage des données (utilisateurs, métadonnées, embeddings pgvector) |
| **Redis** | `localhost:6379` | Cache et files d'attente (RQ) pour l'ingestion asynchrone |

---

## 💻 Commandes Utiles

```bash
# Consulter les logs de l'application en temps réel
docker-compose logs -f

# Arrêter les conteneurs
docker-compose down

# Accéder au shell dans le conteneur API
docker-compose exec api bash

# Relancer le worker Redis Queue spécifique
docker-compose restart worker
```

---

## 📁 Structure du Projet

```
RAG/
├── rag-backend/          # Backend FastAPI
│   ├── app/              # Code source Python (API, Modèles, Jobs, Services)
│   │   ├── config/       # Fichiers de configuration (Ollama, App)
│   │   ├── models/       # Modèles SQLAlchemy (User, Document, Collection...)
│   │   ├── routers/      # Points d'accès API (RAG, Collections, Users...)
│   │   ├── services/     # Ingestion, parsing Docling, traitement de texte
│   │   └── utils/        # Fonctions utilitaires (slugs, validation fichiers...)
│   ├── alembic/          # Historique et scripts des migrations de base de données
│   ├── prompts/          # Prompts système pour le LLM
│   ├── Dockerfile        # Dockerfile multi-étape (compilation frontend + backend)
│   └── docker-compose.yml
├── rag-frontend/         # Frontend React
│   ├── src/              # Code source React (Components, Routes, Providers...)
│   │   ├── api/          # Appels API Axios (users, collections, chat...)
│   │   ├── components/   # Composants réutilisables (DrawerList, ErrorPage, SourceDocumentCard...)
│   │   ├── routes/       # Pages configurées avec TanStack Router
│   │   └── store/        # Atoms Jotai pour la gestion d'état local
│   ├── public/           # Fichiers statiques publics
│   └── package.json
├── CLAUDE.md             # Guide de développement et commandes
└── README.md             # Présentation générale et guide d'installation
```

---

## 💡 Premiers Pas

1. Connectez-vous à [http://localhost:8000](http://localhost:8000) avec le compte administrateur par défaut défini dans votre `.env` (ex: `admin` / `mot_de_passe_admin_fort`).
2. Créez une nouvelle **Collection** (elle possédera un slug d'URL automatique).
3. Importez des documents (fichiers `.pdf`, `.docx`, ou `.txt`). Ils seront convertis et découpés de manière hiérarchique en tâche de fond.
4. Sélectionnez le modèle de réponse LLM souhaité dans le Chat.
5. Discutez avec votre collection de documents !