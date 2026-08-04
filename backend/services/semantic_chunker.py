"""
Semantic Chunker — splits documents when embedding distances shift.

Instead of a fixed character window, this chunker slides a small window
over sentences and splits when the cosine distance between consecutive
window embeddings exceeds a threshold. This keeps semantically related
sentences together and prevents boundary loss.

Embeddings route through the configured provider (local Ollama by
default, or OpenAI when the OpenAI provider is active).
"""

from __future__ import annotations

import logging
from typing import List, Tuple

from backend.config import Settings
from backend.services import ollama_client
from backend.services.llm_client import embed_text as llm_embed_text

logger = logging.getLogger(__name__)

# ── Fallback sentence-split regex ──────────────────────────────────────

_SENTENCE_SPLIT = r"(?<=[.!?])\s+(?=[A-Z\"'(])"


def sentence_tokenize(text: str) -> List[str]:
    """Split text into sentences (simple but effective heuristics)."""
    import re
    sentences = re.split(_SENTENCE_SPLIT, text)
    # Clean up whitespace and filter empties
    return [s.strip() for s in sentences if s.strip()]


def chunk_semantically(
    text: str,
    model: str,
    base_url: str,
    threshold: float = 0.15,
    min_chunk_sentences: int = 3,
    max_chunk_sentences: int = 15,
    settings: Settings | None = None,
) -> List[str]:
    """
    Split *text* into chunks where semantic boundaries occur.

    The algorithm:
    1. Split the text into individual sentences.
    2. Group sentences into sliding windows of *min_chunk_sentences*.
    3. Embed each window via Ollama.
    4. Compute cosine distance between consecutive window embeddings.
    5. When the distance exceeds *threshold*, split at that boundary.
    6. Remaining sentences become the final chunk.

    Args:
        text: The full document text.
        model: Embedding model name (e.g. "nomic-embed-text").
        base_url: Ollama server URL (used for the local fallback).
        threshold: Cosine-distance threshold for a split (default 0.15).
                   Lower = more aggressive (more, smaller chunks).
        min_chunk_sentences: Minimum sentences per chunk.
        max_chunk_sentences: Maximum sentences per chunk (hard limit).
        settings: Optional active settings bundle — when provided, embeddings
                  route through the configured provider (OpenAI / Ollama).

    Returns:
        List of chunk text strings.
    """
    sentences = sentence_tokenize(text)
    if len(sentences) <= min_chunk_sentences:
        # Too short to need semantic splitting
        return [" ".join(sentences)]

    # ── Build sliding window embeddings ────────────────────────────────
    # We slide a window of `min_chunk_sentences` over the sentence list,
    # embedding each window and checking for shifts between consecutive ones.

    windows: List[str] = []
    for i in range(0, len(sentences) - min_chunk_sentences + 1):
        window = " ".join(sentences[i:i + min_chunk_sentences])
        windows.append(window)

    logger.info("Computing %d window embeddings for semantic chunking …", len(windows))

    embeddings: List[List[float]] = []
    for w in windows:
        if settings is not None:
            emb = llm_embed_text(settings=settings, text=w)
        else:
            emb = ollama_client.embed_text(model=model, text=w, base_url=base_url)
        if not emb:
            logger.warning("Empty embedding returned for semantic window — using fallback split")
            return _fixed_chunk_fallback(text)
        embeddings.append(emb)

    # ── Compute cosine distances between consecutive windows ───────────
    split_indices: List[int] = []
    for i in range(1, len(embeddings)):
        dist = _cosine_distance(embeddings[i - 1], embeddings[i])
        # The split happens at sentence boundary (i-1)/i, offset by
        # half the window size to center the boundary
        midpoint = i - 1 + min_chunk_sentences // 2
        if dist > threshold and midpoint not in split_indices:
            split_indices.append(midpoint)

    # ── If no splits detected, fall back ───────────────────────────────
    if not split_indices:
        logger.info("No semantic boundaries above threshold=%.3f — returning flat chunk", threshold)
        return _fixed_chunk_fallback(text, max_chunk_sentences * 20)

    # ── Build chunks from split points ─────────────────────────────────
    chunks: List[str] = []
    prev = 0
    for idx in sorted(split_indices):
        if idx - prev < min_chunk_sentences:
            # Skip — too small
            continue
        chunk = " ".join(sentences[prev:idx])
        if chunk.strip():
            chunks.append(chunk.strip())
        prev = idx

    # Remaining sentences
    if prev < len(sentences):
        remaining = " ".join(sentences[prev:])
        if remaining.strip():
            chunks.append(remaining.strip())

    # Enforce max_chunk_sentences — re-split any chunk that's too large
    final_chunks: List[str] = []
    for chunk in chunks:
        chunk_sentences = sentence_tokenize(chunk)
        if len(chunk_sentences) > max_chunk_sentences:
            # Simple re-split by sentence count
            for i in range(0, len(chunk_sentences), max_chunk_sentences):
                sub = " ".join(chunk_sentences[i:i + max_chunk_sentences])
                if sub.strip():
                    final_chunks.append(sub.strip())
        else:
            final_chunks.append(chunk)

    logger.info("Semantic chunker: %d sentences → %d chunks", len(sentences), len(final_chunks))
    return final_chunks


def _cosine_distance(a: List[float], b: List[float]) -> float:
    """Compute cosine distance (1 - cosine_similarity) between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 1.0
    similarity = dot / (norm_a * norm_b)
    return max(0.0, min(1.0, 1.0 - similarity))


def _fixed_chunk_fallback(text: str, chunk_size: int = 800) -> List[str]:
    """Fallback: simple fixed-size word-boundary chunking."""
    chunks: List[str] = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        if end < len(text):
            break_point = text.rfind(" ", start + chunk_size // 2, end)
            if break_point != -1:
                end = break_point
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - 150  # overlap
    return chunks
