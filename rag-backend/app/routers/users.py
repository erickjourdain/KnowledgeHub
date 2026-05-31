from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session
from app.config.database import get_db
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

router = APIRouter()


@router.get("", response_model=PaginatedResponse[UserResponse])
def get_users(
    skip: int = 0,
    limit: int = 100,
    is_active: bool | None = None,
    role: RoleEnum | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Liste des utilisateurs (ADMIN ou GESTIONNAIRE uniquement)"""
    if current_user.role not in [RoleEnum.ADMIN, RoleEnum.GESTIONNAIRE]:
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    query = db.query(User)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if role is not None:
        query = query.filter(User.role == role)

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
        hashed_password=hash_password(user.password),
        is_active=False,
        role=RoleEnum.USER
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login(
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
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=Token)
def refresh_token(current_user: User = Depends(get_current_user)):
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
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Récupérer les informations de l'utilisateur connecté"""
    return current_user


@router.put("/change-password", response_model=BackendResponse)
def change_password(
    password_update: PasswordUpdate,
    db: Session = Depends(get_db)
):
    """Changer le mot de passe d'un utilisateur"""
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
        raise HTTPException(status_code=400, detail="Impossible de changer le mot de passe: ")


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupérer un utilisateur par ID"""
    # Un utilisateur peut voir son propre profil, ADMIN peut voir tout le monde
    if current_user.id != user_id and current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int, 
    user_update: UserUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mettre à jour un utilisateur"""
    # Vérifier les permissions
    if current_user.id != user_id and current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # ADMIN peut modifier le rôle et is_active, sinon non
    update_data = user_update.model_dump(exclude_unset=True)
    
    if current_user.role != RoleEnum.ADMIN:
        update_data.pop("role", None)
        update_data.pop("is_active", None)
    
    for key, value in update_data.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return user
    

@router.delete("/{user_id}", response_model=BackendResponse)
def delete_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Supprimer un utilisateur (ADMIN uniquement)"""
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    db.delete(user)
    db.commit()
    return BackendResponse(
        status=True,
        message="Utilisateur supprimé"
    )

@router.post("/activate/{user_id}", response_model=BackendResponse)
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Activer un utilisateur (ADMIN ou GESTIONNAIRE uniquement)"""
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    setattr(user, "is_active", True)
    db.commit()
    db.refresh(user)
    return BackendResponse(
        status=True,
        message=f"Utilisateur {user.id} activé" 
    )

@router.post("/deactivate/{user_id}")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Désactiver un utilisateur (ADMIN uniquement)"""
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    setattr(user, "is_active", False)
    db.commit()
    db.refresh(user)
    return BackendResponse(
        status=True,
        message=f"Utilisateur {user.id} désactivé" 
    )