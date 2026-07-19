import os
import shutil
from pathlib import Path
from typing import List, Dict, Any, cast, Optional
from datetime import datetime

from dotenv import load_dotenv
from sqlalchemy.orm import Session
import tiktoken
from rq import get_current_job

from app.models import Document, DocumentChunk
from app.models.collection import Collection
from app.config.config import CHUNK_MAX_TOKENS, EMBEDDING_TOKENIZER_MODEL
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


def convert_docx_to_pdf(docx_path: Path, output_dir: Path) -> Path:
    """Convertit un fichier DOCX en PDF en utilisant LibreOffice (soffice) en mode headless"""
    import subprocess
    import shutil
    
    soffice_path = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice_path:
        # Essayer des chemins par défaut courants si non trouvé dans le PATH
        for path in ["/usr/bin/soffice", "/usr/bin/libreoffice", "/Applications/LibreOffice.app/Contents/MacOS/soffice"]:
            if os.path.exists(path):
                soffice_path = path
                break
                
    if not soffice_path:
        raise RuntimeError("LibreOffice (soffice) est introuvable. Impossible de convertir le document Word en PDF.")

    cmd = [
        soffice_path,
        "--headless",
        "--convert-to", "pdf",
        "--outdir", str(output_dir),
        str(docx_path)
    ]
    
    print(f"Exécution de la conversion LibreOffice: {' '.join(cmd)}")
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Erreur lors de la conversion Word vers PDF par LibreOffice: {result.stderr or result.stdout}")
        
    pdf_filename = docx_path.stem + ".pdf"
    pdf_path = output_dir / pdf_filename
    if not pdf_path.exists():
        raise RuntimeError(f"Le fichier PDF converti est introuvable après la conversion LibreOffice: {pdf_path}")
        
    return pdf_path


def convert_document(file_path: Path):
    """Convertit un fichier PDF en document DoclingDocument structurel (Docx déjà converti au préalable)"""
    from docling.document_converter import DocumentConverter, PdfFormatOption
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions, TableFormerMode, TableStructureOptions, EasyOcrOptions
    from docling.datamodel.accelerator_options import AcceleratorDevice, AcceleratorOptions

    # Configuration des options de conversion PDF
    pdf_pipeline_options = PdfPipelineOptions()
    pdf_pipeline_options.do_ocr = True
    pdf_pipeline_options.ocr_options = EasyOcrOptions(lang=["fr", "en"])
    pdf_pipeline_options.images_scale = 2.0
    pdf_pipeline_options.generate_picture_images = True
    pdf_pipeline_options.do_table_structure = True
    pdf_pipeline_options.table_structure_options = TableStructureOptions(
        mode = TableFormerMode.ACCURATE
    )
    pdf_pipeline_options.accelerator_options = AcceleratorOptions(
        num_threads=4, device=AcceleratorDevice.AUTO
    )

    # Conversion du document
    converter = DocumentConverter(
        allowed_formats=[InputFormat.PDF],
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pdf_pipeline_options)
        }
    )
    result = converter.convert(str(file_path))
    return result.document


def chunk_document_hierarchical(
    doc: Any,
    document_id: int,
    document_title: str
) -> List[Dict[str, Any]]:
    """Découpe un document DoclingDocument de manière hiérarchique en préservant la structure des tableaux"""
    from docling.chunking import HybridChunker
    from docling_core.transforms.chunker.hierarchical_chunker import (
        ChunkingDocSerializer,
        ChunkingSerializerProvider,
    )
    from docling_core.transforms.serializer.markdown import MarkdownTableSerializer

    class CustomSerializerProvider(ChunkingSerializerProvider):
        def get_serializer(self, doc):
            return ChunkingDocSerializer(
                doc=doc,
                table_serializer=MarkdownTableSerializer()
            )

    chunker = HybridChunker(
        tokenizer=EMBEDDING_TOKENIZER_MODEL,
        max_tokens=CHUNK_MAX_TOKENS,
        serializer_provider=CustomSerializerProvider(),
        repeat_table_header=True,
        merge_peers=True
    )
    doc_chunks = chunker.chunk(doc)

    chunks = []
    for chunk in doc_chunks:
        # contextualize() serialise le chunk avec sa hierarchie de titres parents
        content = chunker.contextualize(chunk)
        
        # Nettoyage des doubles retours à la ligne dans les tables Markdown
        import re
        content = re.sub(r'\|\s*\n\s*\n\s*\|', '|\n|', content)
        
        # Auto-contextualisation : ajout du nom du document au début (avec double saut de ligne pour séparer du tableau)
        prefix = f"[Document: {document_title}]\n\n"
        content = prefix + content
        
        # Extraction de la hiérarchie des titres
        meta: Any = chunk.meta
        hierarchy = getattr(meta, "headings", [])
        chapter = hierarchy[0] if len(hierarchy) > 0 else None
        section = hierarchy[1] if len(hierarchy) > 1 else None
        subsection = hierarchy[2] if len(hierarchy) > 2 else None
        
        # Extraction du numéro de page
        page = None
        doc_items = getattr(meta, "doc_items", [])
        if doc_items:
            first_item = doc_items[0]
            if getattr(first_item, "prov", None):
                page = first_item.prov[0].page_no

        chunks.append({
            "content": content,
            "token_count": count_tokens(content),
            "metadata": {
                "document_id": document_id,
                "chapter": chapter,
                "section": section,
                "subsection": subsection,
                "page": page,
                "hierarchy": list(hierarchy)
            }
        })
        
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
    db: Session,
    document_id: Optional[int] = None
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

        # Conversion préalable des fichiers Word .docx en PDF
        if file_name.lower().endswith(".docx"):
            print(f"Fichier Word détecté: {file_name}. Conversion en PDF avec LibreOffice...")
            try:
                pdf_path = convert_docx_to_pdf(temp_file_path, temp_dir)
                # Supprimer l'original .docx du dossier temporaire
                delete_temp_file(temp_file_path)
                
                # Mettre à jour les variables avec le nouveau fichier PDF
                file_name = pdf_path.name
                temp_file_path = pdf_path
                print(f"Conversion réussie. Nouveau fichier à traiter: {file_name}")
            except Exception as conv_err:
                print(f"Erreur lors de la conversion de {file_name} : {conv_err}")
                raise conv_err

        # Démarrage du traitement de conversion du document
        print(f"Début du traitement du document {file_name} (ID collection: {collection.id})")
        doc_structure = convert_document(temp_file_path)
        publish_progress(
            job.id, 
            type="ingestion",
            status=job.get_status(), 
            step="conversion", 
            progress=50, 
            message="Découpage (chunking)"
        )
       
        # Chunking du contenu de manière hiérarchique avec Docling
        print(f"Chunking du document {file_name} avec le chunker hiérarchique de Docling...")
        chunks = chunk_document_hierarchical(
            doc=doc_structure,
            document_id=int(str(collection.id)),
            document_title=file_name
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
            if document_id is not None:
                document = db.query(Document).filter(Document.id == document_id).first()
                if not document:
                    raise ValueError(f"Document {document_id} non trouvé")
                
                # Si le titre a changé (par exemple de .docx à .pdf), supprimer l'ancien fichier physique
                if document.title != file_name:
                    old_file_path = final_dir / str(document.title)
                    if old_file_path.exists():
                        try:
                            old_file_path.unlink()
                            print(f"Ancien fichier physique supprimé : {old_file_path}")
                        except Exception as e:
                            print(f"Erreur lors de la suppression de l'ancien fichier {old_file_path}: {e}")
                    document.title = file_name

                # Supprimer les chunks existants
                db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()
                document.is_indexed = True
                document.updated_at = datetime.now()
            else:
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
            return cast(int, document.id)
        
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