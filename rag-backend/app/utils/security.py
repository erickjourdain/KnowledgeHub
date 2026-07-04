import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.config.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS

# Configuration
def hash_password(password: str) -> str:
    """
    Transforme un mot de passe en clair en une chaîne de caractères hachée et sécurisée.
    """
    # 1. Convertir le mot de passe textuel (str) en octets (bytes)
    password_bytes = password.encode('utf-8')
    
    # 2. Générer un 'sel' (salt) pour rendre le hachage unique
    salt = bcrypt.gensalt()
    
    # 3. Hacher le mot de passe et récupérer le résultat sous forme de texte
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    return hashed_bytes.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Vérifie si un mot de passe en clair correspond au mot de passe haché stocké en base.
    """
    # Convertir les deux chaînes en octets pour la comparaison par bcrypt
    plain_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    
    # Comparaison sécurisée contre les attaques temporelles
    return bcrypt.checkpw(plain_bytes, hashed_bytes)

# === JWT Functions ===

def create_access_token(data: dict, expires_delta: Optional[timedelta] = 
None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None