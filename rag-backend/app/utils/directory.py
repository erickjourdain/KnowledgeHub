from pathlib import Path

from app.config.config import TEMP_DIR, KNOWLEDGE_BASE_DIR, PROMPTS_DIR


def get_temp_dir() -> Path:
    """Récupère le répertoire temporaire"""
    tempdir_path = TEMP_DIR
    return Path(tempdir_path)


def get_knowledge_base_dir() -> Path:
    """Récupère le répertoire de stockage des fichiers de base de connaissances"""
    knowledge_base_path = KNOWLEDGE_BASE_DIR
    return Path(knowledge_base_path)

def get_prompt_dir() -> Path:
    """Récupère le répertoire de stockage des fichiers de prompt"""
    prompt_path = PROMPTS_DIR
    return Path(prompt_path)