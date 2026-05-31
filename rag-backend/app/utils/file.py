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


def save_temp_file(file: UploadFile, temp_dir: Path) -> Path:
    """Enregistre le fichier dans un répertoire temporaire"""
    if file.filename is None:
        raise ValueError("Le fichier doit avoir un nom")
    temp_dir.mkdir(parents=True, exist_ok=True)
    file_path = temp_dir / file.filename
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return file_path