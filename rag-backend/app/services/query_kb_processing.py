from accelerate import scheduler
from PIL import ExifTags
from collections import defaultdict
import heapq
from typing import cast, Any
import json
from pathlib import Path

from rq import get_current_job
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models.collection import Collection
from app.models import DocumentChunk, Document
from app.config.config import PROMPTS_DIR, RERANKER_MODEL, RERANKER_THRESHOLD
from app.config.ollama import get_ollama_client
from app.schemas import RagResponse
from app.utils.redis import publish_progress


ollama_client = get_ollama_client()  # Initialiser le client Ollama une fois pour toute


def load_prompt(filename: str) -> str:
    """Charge un prompt depuis un fichier texte."""
    prompt_path = Path(PROMPTS_DIR) / filename
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()


def search_chunks(
    collection: Collection,
    query_embedding: list[float],
    bm25_query: str,
    top_k: int,
    db: Session,
) -> list[DocumentChunk]:
    """Recherche hybride : similarité cosinique + BM25"""

    # 1. Recherche par similarité cosinique (vectorielle)
    vector_chunks = db.scalars(
        select(DocumentChunk)
        .join(Document, DocumentChunk.document_id == Document.id)
        .where(Document.collection_id == collection.id)
        .order_by(DocumentChunk.embedding.cosine_distance(query_embedding))
        .limit(top_k * 2)  # Plus de résultats pour la fusion
    ).all()

    # 2. Recherche BM25 (via ts_rank de PostgreSQL)
    # Utilisation d'une expression SQL brute pour la concaténation des tsvectors
    tsvector_expr = text("""
        setweight(document_chunks.chunk_text_search, 'A') ||
        setweight(to_tsvector('french', document_chunks.chapter), 'B') ||
        setweight(to_tsvector('french', documents.title), 'B')
    """)

    # Exécution avec execute() pour obtenir les tuples (chunk, score)
    bm25_result = db.execute(
        select(
            DocumentChunk,
            func.ts_rank_cd(
                tsvector_expr,
                func.plainto_tsquery('french', bm25_query)
            ).label('bm25_score')
        )
        .join(Document, DocumentChunk.document_id == Document.id)
        .where(Document.collection_id == collection.id)
        .order_by(
            func.ts_rank_cd(
                tsvector_expr,
                func.plainto_tsquery('french', bm25_query)
            ).desc()
        )
        .limit(top_k * 2)
    ).all()

    bm25_chunks = [row[0] for row in bm25_result]

    # 3. Fusion RRF (Reciprocal Rank Fusion)
    # Combine les classements avec un score basé sur le rang (vectoriel pondéré à 1.0, BM25 pondéré à 0.8)
    rrf_k = 60
    w_vector = 1.0
    w_bm25 = 0.8
    chunk_scores = defaultdict(float)
    chunk_data = {}

    # Ajouter les scores de la recherche vectorielle
    for rank, chunk in enumerate(vector_chunks):
        chunk_id = cast(int, chunk.id)
        chunk_scores[chunk_id] += w_vector / (rrf_k + rank + 1)
        chunk_data[chunk_id] = chunk

    # Ajouter les scores BM25
    for rank, chunk in enumerate(bm25_chunks):
        chunk_id = cast(int, chunk.id)
        chunk_scores[chunk_id] += w_bm25 / (rrf_k + rank + 1)
        if chunk_id not in chunk_data:
            chunk_data[chunk_id] = chunk

    # Récupérer les top_k meilleurs chunks de manière optimisée
    top_chunk_ids = heapq.nlargest(top_k, chunk_scores.keys(), key=lambda x: chunk_scores[x])
    return [chunk_data[cid] for cid in top_chunk_ids]


def create_context_block(sources: list[dict]) -> str:
    """Formate un bloc de contexte pour le modèle de langage à partir des sources récupérées dans la base de données."""
    context_blocks = []

    for idx, source in enumerate(sources, start=1):
        id = source.get('chunk_id') or "id non précisé"
        filename = source.get('title') or "titre non précisé"
        chapter = source.get('chapter') or "chapitre non précisé"
        section = source.get('section') or "section non precisée"
        subsection = source.get('subsection') or "sous-section non précisée"
        doc = source.get('text') or "contenu non précisé"
        page = source.get('page') or "non spécifiées"

        block = f"""
            Chunk {idx} :
            ID : {id}
            Fichier : {filename}
            Chapitre : {chapter}
            Section : {section}
            Sous-section : {subsection}
            Pages: {page}
            Contenu :
            {doc.strip()}
        """
        context_blocks.append(block)

    return "\n\n".join(context_blocks)


_reranker_model = None

def get_reranker():
    global _reranker_model
    if _reranker_model is None:
        import torch
        from sentence_transformers import CrossEncoder
        device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Chargement du Reranker {RERANKER_MODEL} sur le périphérique : {device}...")
        _reranker_model = CrossEncoder(RERANKER_MODEL, device=device)
    return _reranker_model


def rerank_chunks_batch(
    chunks: list[DocumentChunk],
    query: str,
    model: str
) -> list[DocumentChunk]:
    """
    Reranke un lot de chunks localement en utilisant le modèle Cross-Encoder configuré.
    """
    if not chunks:
        return []

    try:
        model_encoder = get_reranker()
        
        # Préparation des paires (requête, texte du chunk)
        pairs = [(query, str(chunk.chunk_text or "")) for chunk in chunks]
        
        # Calcul des scores de pertinence
        scores = model_encoder.predict(cast(Any, pairs))
        
        # Associer les scores aux chunks et les trier par score décroissant
        scored_chunks = sorted(zip(chunks, scores), key=lambda x: float(x[1]), reverse=True)
        
        # Filtrer avec un seuil de pertinence (seuil configuré, ex: 0.0 pour distilcamembert)
        relevant_chunks = [chunk for chunk, score in scored_chunks if float(score) > RERANKER_THRESHOLD]
        
        # Si aucun chunk ne dépasse le seuil, on garde au moins le premier (le plus pertinent) pour éviter les contextes vides
        if not relevant_chunks and scored_chunks:
            relevant_chunks = [scored_chunks[0][0]]
            
        print(f"Reranking local ({RERANKER_MODEL}) terminé : {len(relevant_chunks)} chunks conservés sur {len(chunks)}.")
        return relevant_chunks

    except Exception as e:
        print(f"Erreur lors du reranking local : {e}. Conservation de tous les chunks par sécurité.")
        return chunks


def query_db_processing(
    query: str,
    collection: Collection,
    conversation_id: int | None,
    model: str,
    top_k: int,
    db: Session
) -> RagResponse:
    """
    Traitement de la requête de recherche dans la base de connaissances
    """

    job = get_current_job()
    if job is None:
        raise RuntimeError("Aucun job RQ en cours d'exécution trouvé")
    
    try:
        publish_progress(
            job.id,
            type="query",
            status=job.get_status(), 
            step="starting", 
            progress=0, 
            message="Reformulation du prompt"
        )
        print(f"Démarrage du job de requêtage: {job.id}")
        # Reformule la question pour le modèle de langage (ex: ajouter des instructions spécifiques)
        print("Reformulation du prompt pour maximiser la pertinence des résultats de la recherche vectorielle...")
        reformulate_prompt = load_prompt("reformulate_prompt.txt")
        prompt=f"""
        QUESTION UTILISATEUR :
        {query}
        """
        ollama_response= ollama_client.generate(
            model=model,
            prompt=prompt,
            system=reformulate_prompt,
            format={
                "type": "object",
                "properties": {
                    "bm25_query": {"type": "string"},
                    "vector_query": {"type": "string"}
                },
                "required": ["bm25_query", "vector_query"]
            }
        )
        ollama_response = json.loads(ollama_response["response"])

        # Générer l'embedding pour la requête reformulée
        publish_progress(
            job.id,
            type="query",
            status=job.get_status(), 
            step="starting", 
            progress=25, 
            message="Embedding de la requête reformulée"
        )
        print("Génération de l'embedding pour la requête reformulée...")
        embedding_response = ollama_client.embeddings(model=str(collection.modele), prompt=ollama_response["vector_query"])
        query_embedding = embedding_response["embedding"]

        # Recherche hybride dans la base de connaissances: similarité cosinique + BM25        
        publish_progress(
            job.id,
            type="query",
            status=job.get_status(), 
            step="starting", 
            progress=30, 
            message="Recherche dans la base de connaissances des extraits pertinents"
        )
        print("Recherche dans la base de connaissances des extraits pertinents...")
        chunks_initial = search_chunks(
            collection=collection,
            query_embedding=query_embedding,
            bm25_query=ollama_response["bm25_query"],
            top_k=top_k * 2, # Récupérer plus de chunks pour le reranking
            db=db
        )

        # Reranking des chunks récupérés avec le modèle de langage pour n'avoir que les plus pertinents
        # (optionnel, à implémenter si nécessaire en fonction de la qualité des résultats retournés par la recherche hybride)
        publish_progress(
            job.id,
            type="query",
            status=job.get_status(), 
            step="starting", 
            progress=40, 
            message="Reranking des extraits récupérés pour n'avoir que les plus pertinents"
        )
        print("Reranking des extraits récupérés via Ollama...")       

        # Appel de la fonction de reranking
        filtered_chunks = rerank_chunks_batch(
            chunks=chunks_initial, 
            query=query, 
            model=model
        )
        
        # On ne garde au maximum que le top_k initialement demandé après le filtre
        chunks = filtered_chunks[:top_k]
        print(f"Reranking terminé : {len(chunks)} chunks conservés sur {len(chunks_initial)} analysés.")

        # Génération du bloc de contexte à partir des sources récupérées
        publish_progress(
            job.id,
            type="query",
            status=job.get_status(), 
            step="starting", 
            progress=50, 
            message="Création du contexte pour le modèle de langage"
        )

        # Formater les sources
        print("Création du contexte pour le modèle de langage...")
        sources = [
            {
                "chunk_id": row.id,
                "title": row.document.title,
                "text": row.chunk_text,
                "chapter": row.chapter,
                "section": row.section,
                "subsection": row.subsection,
                "page": row.page,
            }
            for row in chunks
        ]

        # Créer un bloc de contexte à partir des sources
        context_block = create_context_block(sources)
        print("Bloc de contexte créé")  

        system_prompt = load_prompt("system_prompt.txt")

        prompt = f"""
        CONTEXTE DOCUMENTAIRE :
        {context_block}

        QUESTION :
        {query}
        """

        # Interroger le modèle de langage avec le contexte et la question pour générer la réponse
        publish_progress(
            job.id,
            type="query",
            status=job.get_status(), 
            step="starting", 
            progress=70, 
            message="Interrogation du modèle de langage pour générer la réponse"
        )

        print("Interrogation du modèle de langage pour générer la réponse...")
        ollama_response = ollama_client.generate(
            model=model,
            prompt=prompt,
            system=system_prompt,
            options={"temperature": 0.1},
            format={
                "type": "object",
                "properties": {
                    "reponse": {"type": "string"},
                    "sources": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "integer"},
                                "fichier": {"type": "string"},
                                "chapitre": {"type": "string"},
                                "section": {"type": "string"},
                                "page": {"type": "integer"}
                            },
                            "required": ["id", "fichier", "chapitre", "section", "page"]
                        }
                    }
                },
                "required": ["reponse", "sources"]
            }
        )
        # Extraction et parsing du JSON renvoyé par Ollama
        rag_result = json.loads(ollama_response["response"])
        # SÉCURITÉ FORMATAGE : Nettoyage universel de la chaîne Markdown
        # Cela convertit les caractères textuels "\\n" en véritables sauts de ligne Python
        if "reponse" in rag_result and isinstance(rag_result["reponse"], str):
            rag_result["reponse"] = rag_result["reponse"].replace("\\n", "\n")

        # Reconstruct the sources list using the database chunks and avoid duplicate sources
        chunks_map = {chunk.id: chunk for chunk in chunks}
        formatted_sources = []
        if "sources" in rag_result and isinstance(rag_result["sources"], list):
            seen_sources = set()
            for src in rag_result["sources"]:
                if isinstance(src, dict):
                    src_id = src.get("id")
                    if src_id not in seen_sources and src_id is not None:
                        seen_sources.add(src_id)
                        chunk = chunks_map.get(src_id)
                        if chunk:
                            formatted_sources.append({
                                "id": chunk.id,
                                "fichier": chunk.document.title,
                                "chapitre": chunk.chapter or "chapitre non précisé",
                                "section": chunk.section or "section non précisée",
                                "sous_section": chunk.subsection or "sous-section non précisée",
                                "pages": str(chunk.page) if chunk.page is not None else "non spécifiée",
                                "contenu": chunk.chunk_text
                            })
                        else:
                            print(f"Warning: Source chunk with id {src_id} not found in retrieved chunks.")
            rag_result["sources"] = formatted_sources

        if conversation_id is None:
            print("Génération du titre de la conversation")
            system_prompt = load_prompt("title_prompt.txt")
            prompt=f"""
            QUESTION : 
            {query}
            
            REPONSE GENEREE : 
            {rag_result['reponse']}
            """
            ollama_response = ollama_client.generate(
                model=model,
                prompt=prompt,
                system=system_prompt,
                options={"temperature": 0.5},
            )
            title = ollama_response["response"].strip()
            print("Titre généré")
        else:
            title = None

        print("Réponse générée avec succès")
        publish_progress(
            job.id,
            type="query",
            status=job.get_status(), 
            step="done", 
            progress=90, 
            message="Réponse générée avec succès"
        )

        return RagResponse(
            query=query,
            title=title,
            reponse=rag_result.get("reponse", ""),
            sources=rag_result.get("sources", [])
        )

    except Exception as e:
        print(f"Erreur lors du traitement de la requête: {str(e)}")
        publish_progress(
            job.id,
            type="query",
            status="failed",
            step="erreur",
            progress=100,
            message="Erreur lors du traitement de la requête"
        )
        raise e