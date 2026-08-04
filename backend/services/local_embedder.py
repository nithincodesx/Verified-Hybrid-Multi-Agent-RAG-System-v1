"""
Local Embedder — deterministic, offline fallback embeddings.

When the active provider can't produce embeddings (e.g. OpenRouter has no
embedding API and local Ollama isn't running), we fall back to this
built-in feature-hashing embedder so ingestion + retrieval keep working.

Quality is lower than a real embedding model, but it is:
  - fully offline / zero-cost / zero-key
  - deterministic (stable across restarts, unlike Python's salted hash())
  - fixed 768-d to match nomic-embed-text, so switching to Ollama later
    doesn't change collection dimensions
"""

from __future__ import annotations

import math
import re
import zlib
from typing import List

DEFAULT_DIM = 768

_TOKEN_RE = re.compile(r"[a-z0-9']+")


def _tokens(text: str) -> List[str]:
    """Lowercased word tokens (len > 1), plus character bigrams for signal."""
    words = [t for t in _TOKEN_RE.findall(text.lower()) if len(t) > 1]
    tokens = list(words)
    # Character bigrams capture sub-word overlap for better fuzzy matching
    for w in words:
        tokens.extend(w[i : i + 2] for i in range(len(w) - 1))
    return tokens


def _hash_index(token: str, dim: int) -> int:
    """Deterministic hash → bucket index (zlib.crc32 is stable across runs)."""
    return zlib.crc32(token.encode("utf-8")) % dim


def embed_text(text: str, dim: int = DEFAULT_DIM) -> List[float]:
    """Embed a single string into a unit-length vector of size *dim*."""
    vec = [0.0] * dim
    for token in _tokens(text):
        vec[_hash_index(token, dim)] += 1.0

    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]
    return vec


def embed_texts(texts: List[str], dim: int = DEFAULT_DIM) -> List[List[float]]:
    """Embed a list of strings."""
    return [embed_text(t, dim) for t in texts]
