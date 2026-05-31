from ollama import Client

from app.config.config import OLLAMA_URL

def get_ollama_client():
    client = Client(OLLAMA_URL)
    return client