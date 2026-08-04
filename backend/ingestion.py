#!/usr/bin/env python3
"""
Ingestion Script — Ollama Edition

Chunks one or more documents (PDF or plain text), embeds each chunk
via Ollama (local), and upserts the vectors into the ChromaDB
collection.  No API keys needed — fully offline.

Usage:
    python -m backend.ingestion path/to/doc.pdf [path/to/doc2.txt ...]

If a collection already exists, new chunks are **appended** (the script
does *not* drop the collection unless you pass ``--recreate``).
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
import time
from typing import List, Optional, Tuple

import chromadb
from chromadb.errors import NotFoundError as ChromaNotFound

from backend.config import get_settings, Settings
from backend.services.llm_client import embed_texts as llm_embed_texts
from backend.services.semantic_chunker import chunk_semantically

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger("ingestion")

SUPPORTED_EXTENSIONS: Tuple[str, ...] = (".txt", ".md", ".pdf")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Chunk, embed, and ingest documents into ChromaDB."
    )
    parser.add_argument("paths", nargs="+", help="Document file(s) to ingest")
    parser.add_argument(
        "--recreate",
        action="store_true",
        help="Delete and recreate the collection before ingesting",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=None,
        help=f"Override chunk size (default: {Settings.chunk_size})",
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=None,
        help=f"Override chunk overlap (default: {Settings.chunk_overlap})",
    )
    return parser.parse_args()


def read_document(path: str) -> str:
    """Read a file and return its text content."""
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        try:
            from pypdf import PdfReader
        except ImportError:
            raise ImportError("pypdf is required for PDF ingestion: pip install pypdf")

        reader = PdfReader(path)
        pages = [p.extract_text() for p in reader.pages if p.extract_text()]
        return "\n\n".join(pages)

    # Plain text / markdown
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


def chunk_text(
    text: str,
    chunk_size: int,
    overlap: int,
    settings: Optional[Settings] = None,
) -> List[str]:
    """
    Split *text* into chunks.

    If ``settings.enable_semantic_chunking`` is True and settings are
    provided, uses embedding-distance-based semantic chunking (more
    coherent chunks). Otherwise falls back to fixed-size word-boundary
    splitting.
    """
    if settings and settings.enable_semantic_chunking:
        logger.info("   using semantic chunking (threshold=%.3f) …", settings.semantic_chunk_threshold)
        return chunk_semantically(
            text=text,
            model=settings.embedding_model,
            base_url=settings.ollama_base_url,
            threshold=settings.semantic_chunk_threshold,
            settings=settings,
        )

    # ── Fixed-size word-boundary splitting (default) ────────────────
    chunks: List[str] = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))

        # If we're not at the end, try to break on a space
        if end < len(text):
            break_point = text.rfind(" ", start + chunk_size // 2, end)
            if break_point != -1:
                end = break_point

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        start += chunk_size - overlap
        if start >= len(text):
            break

    return chunks


def embed_chunks(
    settings: Settings,
    chunks: List[str],
    batch_log_interval: int = 8,
) -> List[List[float]]:
    """Embed a list of text chunks via the configured provider."""
    vectors = llm_embed_texts(settings=settings, texts=chunks)
    logger.info(
        "   embedded %d chunks via %s (%s)",
        len(vectors), settings.provider, settings.embedding_model,
    )
    return vectors


def ensure_collection(
    chroma_client: chromadb.PersistentClient,
    settings: Settings,
    recreate: bool,
) -> None:
    """Create (or recreate) the ChromaDB collection."""
    try:
        existing = chroma_client.get_collection(settings.collection_name)
        collection_exists = True
    except (ValueError, ChromaNotFound):
        collection_exists = False

    if recreate and collection_exists:
        logger.info("Deleting existing collection '%s' …", settings.collection_name)
        chroma_client.delete_collection(settings.collection_name)
        collection_exists = False

    if not collection_exists:
        logger.info(
            "Creating collection '%s' with cosine distance …",
            settings.collection_name,
        )
        chroma_client.create_collection(
            name=settings.collection_name,
            metadata={"hnsw:space": "cosine"},
        )
    else:
        logger.info(
            "Collection '%s' already exists — appending data.",
            settings.collection_name,
        )


def main() -> None:
    args = parse_args()

    # Validate files exist
    for p in args.paths:
        if not os.path.isfile(p):
            logger.error("File not found: %s", p)
            sys.exit(1)

    settings = get_settings()
    chunk_size = args.chunk_size or settings.chunk_size
    chunk_overlap = args.chunk_overlap or settings.chunk_overlap

    # ── Clients ────────────────────────────────────────────────────────
    chroma_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)

    ensure_collection(chroma_client, settings, recreate=args.recreate)
    collection = chroma_client.get_collection(settings.collection_name)

    # ── Process each document ──────────────────────────────────────────
    total_chunks = 0

    for doc_path in args.paths:
        doc_name = os.path.basename(doc_path)
        logger.info("📄 Reading %s …", doc_name)

        text = read_document(doc_path)
        if not text.strip():
            logger.warning("   empty document — skipping")
            continue

        chunks = chunk_text(text, chunk_size, chunk_overlap, settings)
        logger.info("   → %d chunks (semantic=%s)", len(chunks), settings.enable_semantic_chunking)

        if not chunks:
            continue

        # Embed via Ollama
        logger.info("   embedding …")
        vectors = embed_chunks(settings, chunks)

        # Build IDs, documents, and metadatas for ChromaDB
        ids = [f"{doc_name}-{i}" for i in range(len(chunks))]
        metadatas = [{"source": doc_name, "chunk_index": i} for i in range(len(chunks))]

        # Upsert into ChromaDB (idempotent — safe to re-run)
        collection.upsert(
            ids=ids,
            embeddings=vectors,
            metadatas=metadatas,
            documents=chunks,
        )
        total_chunks += len(chunks)
        logger.info("   ✅ ingested %d chunks from '%s'", len(chunks), doc_name)

    logger.info("🎉 Done — %d total chunks in collection '%s'", total_chunks, settings.collection_name)


if __name__ == "__main__":
    main()
