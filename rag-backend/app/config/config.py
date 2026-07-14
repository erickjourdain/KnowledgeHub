import os
from pathlib import Path
from dotenv import load_dotenv

# Charger les variables d'environnement
env = os.getenv("APP_ENV", "development")  # Par défaut, on utilise l'environnement de développement

print(f"Chargement de la configuration pour l'environnement : {env}")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if env == "production":
    env_file_path = BASE_DIR / f".env"
else:
    env_file_path = BASE_DIR / f".env.{env}"

if not os.path.exists(env_file_path):
    raise FileNotFoundError(f"Le fichier de configuration {env_file_path} est introuvable. Veuillez créer ce fichier avec les variables d'environnement nécessaires.")

load_dotenv(env_file_path)

# Configuration de l'application
APP_NAME = os.getenv("APP_NAME", "RAG Application")

# Configuration de la base de données postgrsql
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "rag-db")
DB_USER = os.getenv("DB_USER", "rag-user")
DB_PWD = os.getenv("DB_PWD", "password")

# Configuration de la base de données redis
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")
REDIS_DB = os.getenv("REDIS_DB", "0")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "password")
REDIS_URL = f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"

# Configuration de RQ (Redis Queue)
RQ_WORKER_MODE = os.getenv("RQ_WORKER_MODE", "simple")  # simple, gevent, or multiprocessing
WORKERS_COUNT = int(os.getenv("WORKERS_COUNT", "1"))

# Configuration répertoire de l'application
TEMP_DIR = os.getenv("TEMP_DIR", "./temp")
KNOWLEDGE_BASE_DIR = os.getenv("KNOWLEDGE_BASE_DIR", "./knowledge_base")
PROMPTS_DIR = os.getenv("PROMPTS_DIR", "./prompts")

# Configuration de la sécurité JWT
SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key")  # Remplacez par une valeur forte en production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 heures
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Configuration ollama
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "localhost")
OLLAMA_PORT = os.getenv("OLLAMA_PORT", "11434")
OLLAMA_URL = f"{OLLAMA_HOST}:{OLLAMA_PORT}"
OLLAMA_EMBEDDING_MODEL = os.getenv("OLLAMA_EMBEDDING_MODEL", "embeddinggemma")
OLLAMA_QUERY_MODEL = os.getenv("OLLAMA_QUERY_MODEL", "gemma3:4b")

# Configuration Reranker
RERANKER_MODEL = os.getenv("RERANKER_MODEL", "antoinelouis/crossencoder-distilcamembert-mmarcoFR")
RERANKER_THRESHOLD = float(os.getenv("RERANKER_THRESHOLD", "0.0"))

# Configuration Chunking
CHUNK_MAX_TOKENS = int(os.getenv("CHUNK_MAX_TOKENS", "512"))
EMBEDDING_TOKENIZER_MODEL = os.getenv("EMBEDDING_TOKENIZER_MODEL", "nomic-ai/nomic-embed-text-v1")

# Affichage de la configuration (sans les valeurs sensibles)
print("=== Configuration de l'application ===")
print(f"  App Name: {APP_NAME}")
print("=== Configuration de la base de données ===")
print(f"  Host: {DB_HOST}")
print(f"  Port: {DB_PORT}")
print(f"  Name: {DB_NAME}")
print(f"  User: {DB_USER}")
print("  Password: ********")  # Sécurité : On masque le mot de passe dans les logs

print("=== Configuration de Redis ===")
print(f"  Host: {REDIS_HOST}")
print(f"  Port: {REDIS_PORT}")
print(f"  DB: {REDIS_DB}")
print("  Password: ********")  # Sécurité : On masque le mot de passe dans les logs

print("=== Configuration de RQ (Redis Queue) ===")
print(f"  RQ Worker Mode: {RQ_WORKER_MODE}")
print(f"  Workers Count: {WORKERS_COUNT}")

print("=== Configuration des répertoires ===")
print(f"  Temp Dir: {TEMP_DIR}")
print(f"  Knowledge Base Dir: {KNOWLEDGE_BASE_DIR}")
print(f"  Prompts Dir: {PROMPTS_DIR}")

print("=== Configuration de la sécurité ===")
print("  Secret Key: ********")  # Sécurité : On masque la clé secrète dans les logs

print("=== Configuration d'Ollama ===")
print(f"  Ollama URL: {OLLAMA_URL}")
print(f"  Embedding Model: {OLLAMA_EMBEDDING_MODEL}")
print(f"  Query Model: {OLLAMA_QUERY_MODEL}")

print("=== Configuration du Reranker ===")
print(f"  Reranker Model: {RERANKER_MODEL}")
print(f"  Reranker Threshold: {RERANKER_THRESHOLD}")

print("=== Configuration du Chunking ===")
print(f"  Max Tokens: {CHUNK_MAX_TOKENS}")
print(f"  Tokenizer Model: {EMBEDDING_TOKENIZER_MODEL}")