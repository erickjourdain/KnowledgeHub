from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from urllib.parse import quote_plus

from app.config.config import DB_USER, DB_PWD, DB_HOST, DB_PORT, DB_NAME

if not DB_HOST or not DB_NAME or not DB_USER:
    raise ValueError("Les variables DB_HOST, DB_NAME, DB_USER doivent être définies dans le fichier .env")

DATABASE_URL = f"postgresql://{DB_USER}:{quote_plus(DB_PWD)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        print(f"Erreur de connexion à la base de données: {e}")
        raise
    finally:
        db.close()