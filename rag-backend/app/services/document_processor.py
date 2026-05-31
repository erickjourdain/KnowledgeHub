import os
import re
import shutil
from pathlib import Path
from typing import List, Dict, Any

from docling.document_converter import DocumentConverter, PdfFormatOption, WordFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PaginatedPipelineOptions, PdfPipelineOptions, TableFormerMode, TableStructureOptions
from docling.datamodel.accelerator_options import AcceleratorDevice, AcceleratorOptions
from markdown_it import MarkdownIt
from dotenv import load_dotenv
from sqlalchemy.orm import Session
import tiktoken
from rq import get_current_job

from app.models import Document, DocumentChunk
from app.models.collection import Collection
from app.config.ollama import get_ollama_client
from app.utils.redis import publish_progress

load_dotenv()

# Configuration
OLLAMA_EMBEDDING_MODEL = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
ollama_client = get_ollama_client()

# Initialisation de l'encodeur tiktoken
encoder = tiktoken.get_encoding("cl100k_base")

def count_tokens(text: str) -> int:
    """Token counting using tiktoken"""
    return len(encoder.encode(text))


def delete_temp_file(file_path: Path) -> None:
    """Supprime le fichier temporaire"""
    if file_path.exists():
        file_path.unlink()


def convert_to_markdown(file_path: Path) -> str:
    """Convertit un fichier PDF ou DOCX en markdown via docling"""
    # Configuration des options de conversion PDF
    pdf_pipeline_options = PdfPipelineOptions()
    pdf_pipeline_options.do_ocr = False
    pdf_pipeline_options.images_scale = 2.0
    pdf_pipeline_options.generate_picture_images = True
    pdf_pipeline_options.do_table_structure = True
    pdf_pipeline_options.table_structure_options = TableStructureOptions(
        mode = TableFormerMode.ACCURATE
    )
    pdf_pipeline_options.accelerator_options = AcceleratorOptions(
        num_threads=4, device=AcceleratorDevice.AUTO
    )

    # Configuration des options de conversion DOCX
    docx_pipepline_options = PaginatedPipelineOptions()
    docx_pipepline_options.images_scale = 2.0
    docx_pipepline_options.generate_picture_images = True
    docx_pipepline_options.accelerator_options = AcceleratorOptions(
        num_threads=4, device=AcceleratorDevice.AUTO
    )

    # Conversion du document
    converter = DocumentConverter(
        allowed_formats=[InputFormat.PDF, InputFormat.DOCX],
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pdf_pipeline_options),
            InputFormat.DOCX: WordFormatOption(pipeline_options=docx_pipepline_options)
        }
    )
    result = converter.convert(str(file_path))
    markdown = result.document.export_to_markdown()

    return markdown


def chunk_markdown_deterministic(
    markdown: str,
    document_id: int,
    window_size_words: int = 400,
    overlap_words: int = 60,
    max_tokens_security: int = 900
) -> List[Dict[str, Any]]:

    md = MarkdownIt()
    tokens = md.parse(markdown)

    hierarchy = []
    current_page = None
    buffer = []
    chunks = []

    # ------------------------
    # Création chunk
    # ------------------------

    def build_chunk(text: str):

        contextual_text = (
            " > ".join(hierarchy) + "\n\n" + text
            if hierarchy else text
        )

        token_count = count_tokens(contextual_text)

        # Sécurité tokens (rarement déclenché)
        if token_count > max_tokens_security:
            words = contextual_text.split()
            contextual_text = " ".join(words[:window_size_words])

        chunks.append({
            "content": contextual_text,
            "token_count": count_tokens(contextual_text),
            "metadata": {
                "document_id": document_id,
                "chapter": hierarchy[0] if len(hierarchy) > 0 else None,
                "section": hierarchy[1] if len(hierarchy) > 1 else None,
                "subsection": hierarchy[2] if len(hierarchy) > 2 else None,
                "page": current_page,
                "hierarchy": list(hierarchy)
            }
        })

    # ------------------------
    # Sliding Window DÉTERMINISTE
    # ------------------------

    def create_chunks_from_text(text: str):

        words = text.split()
        total_words = len(words)

        if total_words == 0:
            return

        step = window_size_words - overlap_words

        # GARANTIE MATHÉMATIQUE
        if step <= 0:
            raise ValueError("overlap_words must be < window_size_words")

        start = 0

        while start < total_words:
            end = min(start + window_size_words, total_words)
            slice_words = words[start:end]
            slice_text = " ".join(slice_words)

            build_chunk(slice_text)

            start += step

    # ------------------------
    # Flush buffer
    # ------------------------

    def flush_buffer():
        nonlocal buffer

        if not buffer:
            return

        full_text = "\n\n".join(buffer).strip()
        create_chunks_from_text(full_text)
        buffer = []

    # ------------------------
    # Parsing Markdown AST
    # ------------------------

    for i, token in enumerate(tokens):

        if token.type == "heading_open":
            flush_buffer()

            level = int(token.tag[1])
            heading_text = tokens[i + 1].content.strip()

            hierarchy = hierarchy[:level - 1]
            if len(hierarchy) < level:
                hierarchy.append(heading_text)
            else:
                hierarchy[level - 1] = heading_text

        elif token.type == "inline":
            text = token.content.strip()

            if re.match(r"^Page\s+\d+", text, re.IGNORECASE):
                match = re.search(r"\d+", text)
                if match:
                    current_page = int(match.group())
            elif text:
                buffer.append(text)

    flush_buffer()

    # GARANTIE : au moins 1 chunk
    if not chunks:
        build_chunk(markdown.strip())

    return chunks


def embed_chunks_batched(
    chunks,
    model="nomic-embed-text",
    batch_size=30,
):

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]

        texts = [chunk["content"] for chunk in batch]
        response = ollama_client.embed(
            model=model,
            input=texts
        )

        embeddings = response["embeddings"]

        for chunk, embedding in zip(batch, embeddings):
            chunk["embedding"] = embedding

    return chunks


def process_document(
    file_name: str,
    collection: Collection,
    temp_dir: Path,
    knowledge_base_dir: Path,
    db: Session
) -> int:
    """
    Traite un document : conversion, chunking, embeddings

    Args:
        file_name: Nom du fichier à traiter
        collection: Collection à laquelle le document appartient
        temp_dir: Répertoire temporaire
        knowledge_base_dir: Répertoire de stockage final

    Returns:
        int: l'id du document enregistré dans la base de données
    """
    temp_file_path = None
    final_dir = None
    job = get_current_job()
    if job is None:
        raise RuntimeError("No RQ job context found")

    try:
        publish_progress(
            job.id,
            type="ingestion",
            status=job.get_status(), 
            step="starting", 
            progress=0, 
            message="Conversion Markdown"
        )

        temp_file_path = temp_dir / file_name

        # Démarrage du traitement de conversion du document
        print(f"Début du traitement du document {file_name} (ID collection: {collection.id})")
        markdown_content = convert_to_markdown(temp_file_path)
        publish_progress(
            job.id, 
            type="ingestion",
            status=job.get_status(), 
            step="conversion", 
            progress=50, 
            message="Découpage (chunking)"
        )
       
        # Chunking du contenu markdown de manière déterministe avec contexte hiérarchique
        window_size_words = 400
        overlap_words = 60
        print(f"Chunking du document {file_name} avec une fenêtre de {window_size_words} mots et un chevauchement de {overlap_words} mots...")
        chunks = chunk_markdown_deterministic(
            markdown_content,
            document_id=int(str(collection.id)),
            window_size_words=window_size_words,
            overlap_words=overlap_words,
            max_tokens_security=800
        )
        publish_progress(
            job.id, 
            type="ingestion",
            status=job.get_status(), 
            step="chunking", 
            progress=70, 
            message=f"Embedding des {len(chunks)} chunks"
        )

        # Embedding des chunks par batch pour éviter les timeouts et limiter la charge sur Ollama
        batch_size = 20
        print(f"Embedding de {len(chunks)} chunks par batch de {batch_size}...")
        modele = str(collection.modele) if collection.modele is not None else OLLAMA_EMBEDDING_MODEL
        chunks = embed_chunks_batched(chunks, batch_size=batch_size, model=modele)
        publish_progress(
            job.id, 
            type="ingestion",
            status=job.get_status(), 
            step="embedding", 
            progress=90, 
            message="Enregistrement fichier"
        )

        # Enregistrement du fichier dans le dossier de la collection
        print(f"Enregistrement du fichier dans le dossier de la collection {collection.name}...")
        collection_dir_name = f"{collection.uuid}"
        final_dir = knowledge_base_dir / collection_dir_name
        final_dir.mkdir(parents=True, exist_ok=True)
        final_file_path = final_dir / file_name
        shutil.copy2(temp_file_path, final_file_path)
        delete_temp_file(temp_file_path)
        temp_file_path = None

        publish_progress(
            job.id, 
            type="ingestion",
            status=job.get_status(), 
            step="file_storage", 
            progress=95, 
            message="Enregistrement base de connaissances"
        )

        try:
            # Enregistrement dans la base de données avec gestion de la transactionnelle
            print("Enregistrement des métadonnées du document et des chunks dans la base de données...")
            document = Document(
                title=file_name,
                collection_id=collection.id,
                is_indexed=True
            )
            db.add(document)
            db.flush()  # Flush pour obtenir l'ID sans commiter

            # Enregistrement des chunks avec les embeddings dans la base de données
            print(f"Enregistrement de {len(chunks)} chunks dans la base de données...")
            for chunk in chunks:
                db_chunk = DocumentChunk(
                    document_id=document.id,
                    chunk_text=chunk["content"],
                    dimension=chunk["token_count"],
                    embedding=chunk["embedding"],
                    chapter=chunk["metadata"]["chapter"],
                    section=chunk["metadata"]["section"],
                    subsection=chunk["metadata"]["subsection"],
                    page=chunk["metadata"]["page"]
                )
                db.add(db_chunk)
            db.commit()  # Commit final si tout réussit
            
            publish_progress(
                job.id,
                type="ingestion",
                status=job.get_status(), 
                step="db_storage", 
                progress=100, 
                message="Traitement terminé"
            )

            # Retour de l'ID du document pour référence future
            print(f"Traitement du document {file_name} terminé avec succès. Document ID: {document.id}")
            return document.id
        
        except Exception as db_error:
            db.rollback()  # Rollback si une erreur survient
            raise db_error

    except Exception as e:
        # Nettoyage en cas d'erreur
        if temp_file_path and temp_file_path.exists():
            delete_temp_file(temp_file_path)

        if final_dir and final_dir.exists() and len(list(final_dir.iterdir())) == 0:
            final_dir.rmdir()

        print(f"Error processing document: {e}")
        publish_progress(
            job.id,
            type="ingestion",
            status="failed",
            step="erreur",
            progress=100, 
            message="Erreur lors du traitement du document"
        )
        raise e