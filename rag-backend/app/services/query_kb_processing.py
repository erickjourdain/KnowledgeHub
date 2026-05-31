import json
from pathlib import Path

from rq import get_current_job
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models.collection import Collection
from app.models import DocumentChunk, Document
from app.config.config import PROMPTS_DIR
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
    reformulated_query: str,
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
        setweight(to_tsvector('french', document_chunks.chunk_text), 'A') ||
        setweight(to_tsvector('french', document_chunks.chapter), 'B') ||
        setweight(to_tsvector('french', documents.title), 'B')
    """)

    # Exécution avec execute() pour obtenir les tuples (chunk, score)
    bm25_result = db.execute(
        select(
            DocumentChunk,
            func.ts_rank_cd(
                tsvector_expr,
                func.plainto_tsquery('french', reformulated_query)
            ).label('bm25_score')
        )
        .join(Document, DocumentChunk.document_id == Document.id)
        .where(Document.collection_id == collection.id)
        .order_by(
            func.ts_rank_cd(
                tsvector_expr,
                func.plainto_tsquery('french', reformulated_query)
            ).desc()
        )
        .limit(top_k * 2)
    ).all()

    bm25_chunks = [row[0] for row in bm25_result]

    # 3. Fusion RRF (Reciprocal Rank Fusion)
    # Combine les classements avec un score basé sur le rang
    rrf_k = 60  # Paramètre de fusion RRF

    chunk_scores: dict[int, float] = {}
    chunk_data: dict[int, DocumentChunk] = {}

    # Ajouter les scores de la recherche vectorielle
    for rank, chunk in enumerate(vector_chunks):
        chunk_id = chunk.id
        score = 1.0 / (rrf_k + rank + 1)
        chunk_scores[chunk_id] = chunk_scores.get(chunk_id, 0) + score
        chunk_data[chunk_id] = chunk

    # Ajouter les scores BM25
    for rank, chunk in enumerate(bm25_chunks):
        score = 1.0 / (rrf_k + rank + 1)
        chunk_id = chunk.id
        chunk_scores[chunk_id] = chunk_scores.get(chunk_id, 0) + score
        if chunk_id not in chunk_data:
            chunk_data[chunk_id] = chunk

    # Trier par score combiné et récupérer les top_k
    sorted_chunk_ids = sorted(chunk_scores.keys(), key=lambda x: chunk_scores[x], reverse=True)[:top_k]
    return [chunk_data[chunk_id] for chunk_id in sorted_chunk_ids]


def create_context_block(sources: list[dict]) -> str:
    """Formate un bloc de contexte pour le modèle de langage à partir des sources récupérées dans la base de données."""
    context_blocks = []

    for idx, source in enumerate(sources, start=1):
        filename = source.get('title') or "titre non précisé"
        chapter = source.get('chapter') or "chapitre non précisé"
        section = source.get('section') or "section non precisée"
        subsection = source.get('subsection') or "sous-section non précisée"
        doc = source.get('text') or "contenu non précisé"
        pages = source.get('pages') or "non spécifiées"

        block = f"""
            Source {idx}
            Fichier : {filename}
            Chapitre : {chapter}
            Section : {section}
            Sous-section : {subsection}
            Pages: {pages}
            Contenu :
            {doc.strip()}
        """
        context_blocks.append(block)

    return "\n\n".join(context_blocks)


def rerank_chunks_batch(
    chunks: list[DocumentChunk],
    query: str,
    model: str
) -> list[DocumentChunk]:
    """
    Analyse l'intégralité des chunks en un seul appel Ollama (Batch Reranking)
    pour optimiser les performances et réduire la latence.
    """
    if not chunks:
        return []

    # 1. Préparation de la liste des chunks à envoyer dans le prompt
    chunks_input = []
    for chunk in chunks:
        chunk_text = str(chunk.chunk_text or "")
        chunks_input.append({
            "id": chunk.id,
            "texte": chunk_text[:300] + "..." if len(chunk_text) > 300 else chunk_text
        })

    # 2. Configuration du Prompt Système pour l'analyse par lot
    rerank_prompt = load_prompt("rerank_prompt.txt")

    # 3. Construction du prompt utilisateur contenant tout le lot
    prompt_evaluation = f"""
    QUESTION DE L'UTILISATEUR :
    "{query}"

    LISTE DES CHUNKS À ÉVALUER :
    {json.dumps(chunks_input, ensure_ascii=False, indent=2)}
    """

    try:
        # 4. Appel unique à Ollama avec formatage JSON strict
        print(f"Envoi d'un lot de {len(chunks)} chunks à Ollama pour Reranking...")
        response = ollama_client.generate(
            model=model,
            prompt=prompt_evaluation,
            system=rerank_prompt,
            options={"temperature": 0.0},  # Température à 0 pour un maximum de rigueur
            format={
                "type": "object",
                "properties": {
                    "evaluations": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "chunk_id": {"type": "integer"},
                                "est_pertinent": {"type": "boolean"}
                            },
                            "required": ["chunk_id", "est_pertinent"]
                        }
                    }
                },
                "required": ["evaluations"]
            }
        )

        # 5. Traitement des résultats
        result_json = json.loads(response["response"])
        evaluations = result_json.get("evaluations", [])
        
        # Transformation des résultats en dictionnaire pour un accès rapide {id: bool}
        pertinence_map = {eval_item["chunk_id"]: eval_item["est_pertinent"] for eval_item in evaluations}
        
        # Reconstruction de la liste finale des chunks validés par le modèle
        relevant_chunks = []
        for chunk in chunks:
            # Si le modèle l'a validé (ou s'il a oublié un ID par erreur, on garde par sécurité)
            if pertinence_map.get(chunk.id, True) is True:
                relevant_chunks.append(chunk)
                #print(f"-> [CONSERVÉ] Chunk {chunk.id}")
            #else:
                #print(f"-> [ÉLIMINÉ] Chunk {chunk.id}")

        return relevant_chunks

    except Exception as e:
        print(f"Erreur lors du reranking par lot : {e}. Conservation de tous les chunks par sécurité.")
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
        ollama_response = ollama_client.chat(
            model=model, 
            messages=[
                {"role": "system", "content": reformulate_prompt},
                {"role": "user", "content": prompt}
            ],
        )
        reformulated_query = ollama_response["message"]["content"]
        print("Prompt reformulé")

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
        embedding_response = ollama_client.embeddings(model=collection.modele, prompt=reformulated_query)
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
            reformulated_query=reformulated_query,
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
                                "fichier": {"type": "string"},
                                "chapitre": {"type": "string"},
                                "section": {"type": "string"},
                                "page": {"type": "integer"}
                            },
                            "required": ["fichier", "chapitre", "section", "page"]
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