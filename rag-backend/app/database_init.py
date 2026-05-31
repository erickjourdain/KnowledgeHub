from app.config.database import SessionLocal
from app.models import User, RoleEnum
from app.utils.security import hash_password
from dotenv import load_dotenv
import os

load_dotenv()

def init_db():
    # Les tables sont gérées par alembic, on crée uniquement l'admin si besoin
    print("Vérification de l'existence d'un utilisateur ADMIN...")
    db = SessionLocal()
    try:
        # Vérifier si un admin existe déjà
        admin = db.query(User).filter(User.role == RoleEnum.ADMIN).first()
        if admin:
            print("Un utilisateur ADMIN existe déjà.")
            return
        else:
            print("Aucun utilisateur ADMIN trouvé. Création d'un nouvel admin...")
        
        # Créer l'admin depuis le .env
        admin_username = os.getenv("ADMIN_USERNAME", "admin")
        admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "changeme123")
        
        new_admin = User(
            username=admin_username,
            email=admin_email,
            hashed_password=hash_password(admin_password),
            is_active=True,
            role=RoleEnum.ADMIN
        )
        
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        print(f"Admin créé : {new_admin.username} ({new_admin.email})")
        
    except Exception as e:
        print(f"Erreur lors de l'initialisation : {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    load_dotenv()
    init_db()