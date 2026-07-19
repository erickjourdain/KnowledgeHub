import os
import re
import unicodedata
from pathlib import Path
import shutil

from fastapi import UploadFile

# Extensions autorisées
ALLOWED_EXTENSIONS = {".pdf", ".docx"}

def allowed_file(filename: str) -> bool:
    """Vérifie si le fichier a une extension autorisée"""
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def get_file_extension(filename: str) -> str:
    """Récupère l'extension du fichier"""
    return Path(filename).suffix.lower()


def secure_filename(filename: str) -> str:
    """
    Assainit un nom de fichier pour éviter les attaques de type Path Traversal.
    Ne conserve que les caractères alphanumériques, les tirets, les underscores et les points.
    Remplace les accents et normalise la chaîne.
    """
    # 1. Remplacer les antislashs de Windows par des slashs standards pour gérer tous les OS
    filename = filename.replace('\\', '/')
    
    # 2. Garder uniquement le nom de fichier de base (supprime les dossiers parents)
    filename = os.path.basename(filename)
    
    # 3. Normaliser pour enlever les accents (ex: é -> e)
    filename = unicodedata.normalize('NFKD', filename)
    filename = filename.encode('ascii', 'ignore').decode('ascii')
    
    # 4. Remplacer les espaces par des underscores
    filename = filename.replace(' ', '_')
    
    # 5. Supprimer tout caractère qui n'est pas : alphanumérique, point, tiret ou underscore
    filename = re.sub(r'[^a-zA-Z0-9._-]', '', filename)
    
    # 6. Supprimer les points ou tirets en début de fichier pour éviter les fichiers cachés ou les options Unix
    filename = filename.lstrip('.-')
    
    # Si le nom est vide après nettoyage, lui attribuer un nom par défaut sécurisé
    if not filename:
        filename = "uploaded_file"
        
    return filename


def save_temp_file(file: UploadFile, temp_dir: Path) -> Path:
    """Enregistre le fichier dans un répertoire temporaire après assainissement de son nom"""
    if file.filename is None:
        raise ValueError("Le fichier doit avoir un nom")
    
    # Assainir le nom de fichier pour sécurité
    file.filename = secure_filename(file.filename)
    
    temp_dir.mkdir(parents=True, exist_ok=True)
    file_path = temp_dir / file.filename
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return file_path