"""Script de configuration automatique de la base de données pour Docker."""
import os
import sys
import subprocess
import time  # Ajouté pour gérer le délai d'attente de la base de données

# Ajouter le répertoire parent au path pour importer app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PWD


def run_command(cmd, check=True):
    """Exécute une commande shell en transmettant le mot de passe de manière sécurisée."""
    # On clone l'environnement actuel du système pour y injecter PGPASSWORD
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PWD

    print(f"Exécution: {' '.join(cmd)}")
    
    # On passe l'environnement modifié à subprocess
    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
        
    if check and result.returncode != 0:
        print(f"Erreur: commande échouée avec code {result.returncode}")
        sys.exit(1)
    return result


def wait_for_postgres():
    """Attend que PostgreSQL soit prêt à accepter des connexions."""
    print("\n=== Attente de la disponibilité de PostgreSQL ===")
    max_retries = 10
    delay = 3

    for i in range(max_retries):
        # Utilisation de pg_isready (outil standard de Postgres pour tester la connexion)
        result = run_command([
            "pg_isready", "-h", DB_HOST, "-p", DB_PORT, "-U", DB_USER
        ], check=False)
        
        if result.returncode == 0:
            print("PostgreSQL est prêt !")
            return
        
        print(f"PostgreSQL n'est pas encore prêt... Essai {i+1}/{max_retries}. Nouvelle tentative dans {delay}s.")
        time.sleep(delay)
        
    print("Erreur: Impossible de joindre PostgreSQL après plusieurs tentatives.")
    sys.exit(1)


def create_database():
    """Crée la base de données si elle n'existe pas."""
    print("\n=== Vérification / Création de la base de données ===")

    # Vérifier si la base existe (Suppression du -W et de l'argument mot de passe en clair)
    result = run_command([
        "psql", "-h", DB_HOST, "-p", DB_PORT, "-U", DB_USER,
        "-c", f"SELECT datname FROM pg_database WHERE datname = '{DB_NAME}';", "-d", "postgres"
    ], check=False)

    # Si le nom de la base de données (ex: 'rag-db') est trouvé dans la réponse
    if DB_NAME in result.stdout:
        print(f"La base '{DB_NAME}' existe déjà.")
    else:
        print(f"La base '{DB_NAME}' est introuvable. Création en cours...")
        # Amélioration 2 : On ajoute des guillemets doubles \" autour du nom pour gérer le tiret
        run_command([
            "psql", "-h", DB_HOST, "-p", DB_PORT, "-U", DB_USER,
            "-c", f'CREATE DATABASE "{DB_NAME}";', "-d", "postgres"
        ])


def enable_pgvector():
    """Active l'extension pgvector pour la recherche de vecteurs (RAG)."""
    print("\n=== Activation de pgvector ===")

    result = run_command([
        "psql", "-h", DB_HOST, "-p", DB_PORT, "-U", DB_USER,
        "-d", DB_NAME, "-c", "SELECT 1 FROM pg_extension WHERE extname = 'vector';"
    ], check=False)

    if "1 row" not in result.stdout:
        print("Activation de l'extension pgvector...")
        run_command([
            "psql", "-h", DB_HOST, "-p", DB_PORT, "-U", DB_USER,
            "-d", DB_NAME, "-c", "CREATE EXTENSION IF NOT EXISTS vector;"
        ])
    else:
        print("L'extension pgvector est déjà activée.")


def create_migration():
    """Applique les migrations alembic existantes sur la base de données."""
    print("\n=== Application des migrations Alembic ===")

    # Dans Docker, on ne crée pas de révision, on applique les migrations existantes.
    # Cela synchronise la structure de la base de données avec vos modèles Python.
    print("Mise à jour de la base de données vers la dernière version (head)...")
    run_command(["alembic", "upgrade", "head"])


def main():
    # Étape 0 essentielle pour Docker : attendre la BDD
    wait_for_postgres()
    
    # Étapes de configuration
    create_database()
    enable_pgvector()
    create_migration()

    print("\n=== Configuration terminée avec succès ! ===")


if __name__ == "__main__":
    main()