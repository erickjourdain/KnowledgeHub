from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session
import urllib.parse
import random
from app.config.database import get_db
from app.config.config import env
from app.models import User, RoleEnum
from app.schemas import (
    BackendResponse, 
    PasswordUpdate, 
    UserCreate, 
    UserResponse, 
    UserUpdate, 
    Token, 
    PaginatedResponse
)
from app.services.users import change_user_password, check_user_password
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.dependencies import get_current_user
from app.utils.slug import slugify

router = APIRouter()


def generate_default_avatar(username: str) -> str:
    colors = [
        "#6366f1",  # Indigo
        "#a855f7",  # Violet
        "#ec4899",  # Pink
        "#3b82f6",  # Blue
        "#10b981",  # Green
        "#f59e0b",  # Amber
        "#ef4444",  # Red
        "#06b6d4"   # Cyan
    ]
    bg = random.choice(colors)
    label = username[0].upper() if username else "U"
    
    bg_clean = bg.lstrip('#')
    num = int(bg_clean, 16)
    r = min(255, max(0, (num >> 16) + int(255 * 0.2)))
    g = min(255, max(0, ((num >> 8) & 0x00FF) + int(255 * 0.2)))
    b = min(255, max(0, (num & 0x0000FF) + int(255 * 0.2)))
    end_color = f"#{r:02x}{g:02x}{b:02x}"
    
    grad_id = f"grad_{bg_clean}"
    gradient_defs = f'<defs><linearGradient id="{grad_id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="{bg}"/><stop offset="100%" stop-color="{end_color}"/></linearGradient></defs>'
    fill_value = f"url(#{grad_id})"
    
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">{gradient_defs}<rect width="96" height="96" rx="28" fill="{fill_value}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="700" fill="#ffffff">{label}</text></svg>'
    
    return f"data:image/svg+xml;utf8,{urllib.parse.quote(svg)}"


@router.get("", response_model=PaginatedResponse[UserResponse])
def get_users(
    skip: int = 0,
    limit: int = 100,
    is_active: bool | None = None,
    role: list[RoleEnum] | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Liste des utilisateurs (ADMIN ou GESTIONNAIRE uniquement)"""
    if current_user.role not in [RoleEnum.ADMIN, RoleEnum.GESTIONNAIRE]:
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    query = db.query(User)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if role is not None and len(role) > 0:
        query = query.filter(User.role.in_(role))

    total = query.count()
    data = query.offset(skip).limit(limit).all()
    return PaginatedResponse(data=data, count=total)


@router.post("/register", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Vérifier si l'username existe
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username déjà utilisé")
    
    # Vérifier si l'email existe
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    # Créer l'utilisateur
    new_user = User(
        username=user.username,
        email=user.email,
        slug=slugify(user.username),
        hashed_password=hash_password(user.password),
        is_active=False,
        role=RoleEnum.USER,
        icon=generate_default_avatar(user.username)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == 
form_data.username).first()
    if not user or not verify_password(form_data.password, str(user.hashed_password)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants invalides",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not bool(user.is_active):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé"
        )
    
    # Créer les tokens
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id, "role": user.role.value}
    )
    refresh_token = create_refresh_token(
        data={"sub": user.username, "user_id": user.id, "role": user.role.value}
    )
    
    secure_cookie = True if env == "production" else False
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=secure_cookie,
        samesite="lax",
        max_age=60 * 24 * 60
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=secure_cookie,
        samesite="lax",
        max_age=7 * 24 * 60 * 60
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=Token)
def refresh_token(
    response: Response,
    current_user: User = Depends(get_current_user)
):
    """Refresh le token d'accès"""
    access_token = create_access_token(
        data={
            "sub": current_user.username, 
            "user_id": current_user.id, 
            "role": current_user.role.value
        }
    )
    refresh_token = create_refresh_token(
        data={
            "sub": current_user.username, 
            "user_id": current_user.id, 
            "role": current_user.role.value
        }
    )
    
    secure_cookie = True if env == "production" else False
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=secure_cookie,
        samesite="lax",
        max_age=60 * 24 * 60
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=secure_cookie,
        samesite="lax",
        max_age=7 * 24 * 60 * 60
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/logout", response_model=BackendResponse)
def logout(response: Response):
    """Déconnexion de l'utilisateur en supprimant les cookies"""
    secure_cookie = True if env == "production" else False
    response.set_cookie(
        key="access_token",
        value="",
        httponly=True,
        secure=secure_cookie,
        samesite="lax",
        max_age=0
    )
    response.set_cookie(
        key="refresh_token",
        value="",
        httponly=True,
        secure=secure_cookie,
        samesite="lax",
        max_age=0
    )
    return BackendResponse(
        status=True,
        message="Déconnexion réussie"
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Récupérer les informations de l'utilisateur connecté"""
    return current_user


@router.put("/change-password", response_model=BackendResponse)
def change_password(
    password_update: PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Changer le mot de passe d'un utilisateur connecté (ADMIN ou l'utilisateur concerné uniquement)"""
    # Seul l'administrateur ou l'utilisateur connecté lui-même peut modifier son propre mot de passe
    if current_user.role != RoleEnum.ADMIN and current_user.username != password_update.username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas autorisé à modifier le mot de passe de cet utilisateur"
        )

    try:
        user = check_user_password(username=password_update.username, password=password_update.old_password, db=db)
        user = change_user_password(user=user, new_password=password_update.new_password, db=db)
        return BackendResponse(
            status=True,
            message="Mot de passe changé avec succès"
        )
    except NoResultFound:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    except ValueError:
        raise HTTPException(status_code=400, detail="Mot de passe incorrect")
    except Exception:
        raise HTTPException(status_code=400, detail="Impossible de changer le mot de passe")


def get_user_by_id_or_slug(user_id_or_slug: str, db: Session) -> User | None:
    try:
        user_id = int(user_id_or_slug)
        return db.query(User).filter(User.id == user_id).first()
    except ValueError:
        return db.query(User).filter(User.slug == user_id_or_slug).first()


@router.get("/{user_id_or_slug}", response_model=UserResponse)
def get_user(
    user_id_or_slug: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer un utilisateur par ID ou Slug"""
    user = get_user_by_id_or_slug(user_id_or_slug, db)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
    # Un utilisateur peut voir son propre profil, ADMIN peut voir tout le monde
    if current_user.id != user.id and current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    
    return user


@router.put("/{user_id_or_slug}", response_model=UserResponse)
def update_user(
    user_id_or_slug: str, 
    user_update: UserUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mettre à jour un utilisateur"""
    user = get_user_by_id_or_slug(user_id_or_slug, db)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
    # Vérifier les permissions
    if current_user.id != user.id and current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    
    # ADMIN peut modifier le rôle et is_active, sinon non
    update_data = user_update.model_dump(exclude_unset=True)
    
    if current_user.role != RoleEnum.ADMIN:
        update_data.pop("role", None)
        update_data.pop("is_active", None)
    
    for key, value in update_data.items():
        setattr(user, key, value)
        if key == "username":
            setattr(user, "slug", slugify(value))
    
    db.commit()
    db.refresh(user)
    return user
    

@router.delete("/{user_id_or_slug}", response_model=BackendResponse)
def delete_user(
    user_id_or_slug: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Supprimer un utilisateur (ADMIN uniquement)"""
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    
    user = get_user_by_id_or_slug(user_id_or_slug, db)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    db.delete(user)
    db.commit()
    return BackendResponse(
        status=True,
        message="Utilisateur supprimé"
    )


@router.post("/activate/{user_id_or_slug}", response_model=BackendResponse)
def activate_user(
    user_id_or_slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Activer un utilisateur (ADMIN uniquement)"""
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    
    user = get_user_by_id_or_slug(user_id_or_slug, db)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    setattr(user, "is_active", True)
    db.commit()
    db.refresh(user)
    return BackendResponse(
        status=True,
        message=f"Utilisateur {user.id} activé" 
    )


@router.post("/deactivate/{user_id_or_slug}")
def deactivate_user(
    user_id_or_slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Désactiver un utilisateur (ADMIN uniquement)"""
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    
    user = get_user_by_id_or_slug(user_id_or_slug, db)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    setattr(user, "is_active", False)
    db.commit()
    db.refresh(user)
    return BackendResponse(
        status=True,
        message=f"Utilisateur {user.id} désactivé" 
    )