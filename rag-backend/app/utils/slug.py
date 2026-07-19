import re
import unicodedata

def slugify(text: str) -> str:
    """Génère un slug URL-safe à partir d'une chaîne de caractères."""
    if not text:
        return ""
    # Normalise les accents (ex: é -> e)
    text = unicodedata.normalize('NFKD', text)
    text = text.lower()
    # Supprime les caractères non ascii
    text = text.encode('ascii', 'ignore').decode('ascii')
    # Supprime les caractères qui ne sont pas alphanumériques, des espaces ou des tirets
    text = re.sub(r'[^\w\s-]', '', text)
    # Remplace les espaces et plusieurs tirets consécutifs par un seul tiret
    text = re.sub(r'[-\s]+', '-', text)
    return text.strip('-')
