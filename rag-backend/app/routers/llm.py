from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from app.models.user import User
from app.config.ollama import get_ollama_client
from app.schemas import LlmModel


router = APIRouter()

@router.get("/models", response_model=list[LlmModel])
def get_models(current_user: User= Depends(get_current_user)):
    try:
        ollama_client = get_ollama_client()
        models = ollama_client.list()
        return [LlmModel(
            name=model.model,
            digest=model.digest,
            size=model.size,
            embed=True if (model.model and model.model.find("embed") >= 0) else False,
            parameter_size=model.details.parameter_size if model.details else None
        ) for model in models.models]
    except Exception:
        raise HTTPException(status_code=500, detail="Impossible d'obtenir la liste des modèles Ollama")