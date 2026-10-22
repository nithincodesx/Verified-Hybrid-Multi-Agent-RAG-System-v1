"""
Configuration module for the Verified RAG Agent.

Supports three LLM providers:

  - ``"ollama"``     → local, free, offline (default)
  - ``"openai"``     → OpenAI API (requires an API key)
  - ``"openrouter"`` → OpenRouter API (requires an API key)

Provider resolution order:
  1. ``provider_settings.json`` (saved from the UI's ⚙ settings panel)
  2. The ``LLM_PROVIDER`` environment variable
  3. Auto-detect: ``OPENAI_API_KEY`` set → openai, else ``OPENROUTER_API_KEY`` set → openrouter
  4. Default → ollama
"""

import json
import os
from dataclasses import dataclass, fields
from typing import Any, Dict, List, Optional

# ── Provider selection ─────────────────────────────────────────────────
LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "")


def _env_bool(name: str, default: bool = False) -> bool:
    """Parse a boolean environment variable.

    Accepts the usual truthy spellings ("1", "true", "yes", "on") and treats
    anything else as False. Unset / unrecognised values fall back to ``default``.
    """
    raw = os.getenv(name)
    if raw is None:
        return default
    value = raw.strip().lower()
    if value in ("1", "true", "yes", "on", "y", "t"):
        return True
    if value in ("0", "false", "no", "off", "n", "f"):
        return False
    return default

# ── Ollama (local, free, offline) ──────────────────────────────────────
OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# Models — use .1b for speed on modest hardware; swap to :3b or :7b for quality
EMBEDDING_MODEL: str = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
DRAFT_MODEL: str = os.getenv("OLLAMA_DRAFT_MODEL", "llama3.2:1b")
VERIFIER_MODEL: str = os.getenv("OLLAMA_VERIFIER_MODEL", "llama3.2:1b")

EMBEDDING_DIMENSION: int = 768  # nomic-embed-text outputs 768-d vectors

# ── OpenAI ─────────────────────────────────────────────────────────────
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_EMBED_MODEL: str = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")

# ── OpenRouter ─────────────────────────────────────────────────────────
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")

# ── ChromaDB (persistent, no Docker needed) ──────────────────────────
CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
COLLECTION_NAME: str = "verified_rag_docs"

# ── Retrieval ──────────────────────────────────────────────────────────
TOP_K: int = 5                   # chunks returned per query
CHUNK_SIZE: int = 800            # characters per chunk
CHUNK_OVERLAP: int = 150         # overlap between consecutive chunks

# ── Hybrid Search (Vector + BM25) ───────────────────────────────────
ENABLE_HYBRID_SEARCH: bool = True   # combine BM25 + vector with RRF
RRF_K: int = 60                      # RRF constant (60 is standard)
BM25_K1: float = 1.5                # BM25 term-frequency saturation
BM25_B: float = 0.75                # BM25 length normalisation

# ── Semantic Chunking ──────────────────────────────────────────────────
# When True, replaces fixed-character splitter with embedding-distance
# based splitting (more coherent chunks).
ENABLE_SEMANTIC_CHUNKING: bool = False  # default False — needs more Ollama calls
SEMANTIC_CHUNK_THRESHOLD: float = 0.15 # cosine-distance shift that triggers a split

# ── Query Expansion ─────────────────────────────────────────────────────
# When True, the query is expanded with related terms (via the LLM and/or
# WordNet synonyms) BEFORE retrieval, to improve recall. Disabled by default
# so the existing retrieval behaviour is preserved exactly.
ENABLE_QUERY_EXPANSION: bool = _env_bool("ENABLE_QUERY_EXPANSION", False)
QUERY_EXPANSION_STRATEGY: str = os.getenv("QUERY_EXPANSION_STRATEGY", "llm")  # llm | synonym | hybrid
QUERY_EXPANSION_MAX_TERMS: int = int(os.getenv("QUERY_EXPANSION_MAX_TERMS", "5"))

# ── Cross-Encoder Reranking ─────────────────────────────────────────────
# When True, retrieved chunks are re-scored with a cross-encoder model AFTER
# retrieval, to improve precision. Disabled by default. If the model (or
# sentence-transformers) is unavailable, a deterministic keyword-overlap
# fallback is used instead.
ENABLE_RERANKING: bool = _env_bool("ENABLE_RERANKING", False)
RERANKER_MODEL: str = os.getenv("RERANKER_MODEL", "BAAI/bge-reranker-base")
RERANKER_TOP_K: int = int(os.getenv("RERANKER_TOP_K", "5"))  # 0 = keep every retrieved chunk
RERANKER_FALLBACK: bool = _env_bool("RERANKER_FALLBACK", True)

# ── Confidence / Distance Threshold ────────────────────────────────────
# If the top retrieved chunk's similarity score falls below this value,
# bypass the LLM entirely and return "No relevant context found".
CONFIDENCE_THRESHOLD: float = 0.35    # 0-1; raise to be stricter

# ── Rate-limit safety ──────────────────────────────────────────────────
# Keep a small sleep to avoid saturating the CPU/GPU (Ollama) or hammering
# the API provider on concurrent calls.
RATE_LIMIT_SLEEP: float = 0.3
MAX_RETRIES: int = 3

VALID_PROVIDERS = ("ollama", "openai", "openrouter")

# ── Settings persistence ───────────────────────────────────────────────
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SETTINGS_FILE: str = os.getenv(
    "SETTINGS_FILE",
    os.path.join(_PROJECT_ROOT, "provider_settings.json"),
)

# Fields that are user-tunable via the settings panel / persisted to disk
PROVIDER_FIELDS: List[str] = [
    "provider",
    "ollama_base_url",
    "embedding_model",
    "draft_model",
    "verifier_model",
    "openai_api_key",
    "openai_base_url",
    "openai_model",
    "openai_embed_model",
    "openrouter_api_key",
    "openrouter_base_url",
    "openrouter_model",
]


@dataclass
class Settings:
    """Mutable settings bundle passed to every agent.

    Provider + model fields can be changed at runtime from the frontend
    (see ``PUT /settings``); agents hold a reference to the same object,
    so updates apply to the next request immediately.
    """
    # ── Active provider ─────────────────────────────────────────────
    provider: str = "ollama"

    # ── Ollama ──────────────────────────────────────────────────────
    ollama_base_url: str = OLLAMA_BASE_URL
    embedding_model: str = EMBEDDING_MODEL
    draft_model: str = DRAFT_MODEL
    verifier_model: str = VERIFIER_MODEL

    # ── OpenAI ──────────────────────────────────────────────────────
    openai_api_key: str = OPENAI_API_KEY
    openai_base_url: str = OPENAI_BASE_URL
    openai_model: str = OPENAI_MODEL
    openai_embed_model: str = OPENAI_EMBED_MODEL

    # ── OpenRouter ──────────────────────────────────────────────────
    openrouter_api_key: str = OPENROUTER_API_KEY
    openrouter_base_url: str = OPENROUTER_BASE_URL
    openrouter_model: str = OPENROUTER_MODEL

    # ── Retrieval / pipeline ────────────────────────────────────────
    embedding_dimension: int = EMBEDDING_DIMENSION
    chroma_persist_dir: str = CHROMA_PERSIST_DIR
    collection_name: str = COLLECTION_NAME
    top_k: int = TOP_K
    chunk_size: int = CHUNK_SIZE
    chunk_overlap: int = CHUNK_OVERLAP
    enable_hybrid_search: bool = ENABLE_HYBRID_SEARCH
    rrf_k: int = RRF_K
    bm25_k1: float = BM25_K1
    bm25_b: float = BM25_B
    enable_semantic_chunking: bool = ENABLE_SEMANTIC_CHUNKING
    semantic_chunk_threshold: float = SEMANTIC_CHUNK_THRESHOLD

    # ── Query expansion (optional, off by default) ──
    enable_query_expansion: bool = ENABLE_QUERY_EXPANSION
    query_expansion_strategy: str = QUERY_EXPANSION_STRATEGY
    query_expansion_max_terms: int = QUERY_EXPANSION_MAX_TERMS

    # ── Cross-encoder reranking (optional, off by default) ──
    enable_reranking: bool = ENABLE_RERANKING
    reranker_model: str = RERANKER_MODEL
    reranker_top_k: int = RERANKER_TOP_K
    reranker_fallback: bool = RERANKER_FALLBACK
    confidence_threshold: float = CONFIDENCE_THRESHOLD
    rate_limit_sleep: float = RATE_LIMIT_SLEEP
    max_retries: int = MAX_RETRIES


# ── Resolution helpers ─────────────────────────────────────────────────

def _resolve_provider() -> str:
    """Pick the initial provider from env vars."""
    if LLM_PROVIDER:
        return LLM_PROVIDER if LLM_PROVIDER in VALID_PROVIDERS else "ollama"
    if OPENAI_API_KEY:
        return "openai"
    if OPENROUTER_API_KEY:
        return "openrouter"
    return "ollama"


def get_settings() -> Settings:
    """Build a Settings object from env defaults + persisted overrides."""
    s = Settings(provider=_resolve_provider())
    _apply_disk_overrides(s)
    s.embedding_dimension = _embedding_dimension(s)
    return s


def _embedding_dimension(s: Settings) -> int:
    return 1536 if s.provider == "openai" else EMBEDDING_DIMENSION


def _apply_disk_overrides(s: Settings) -> None:
    """Overlay the persisted provider settings file (if any) on top of env defaults."""
    try:
        with open(SETTINGS_FILE, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError):
        return
    if not isinstance(data, dict):
        return
    for f in fields(Settings):
        if f.name not in data:
            continue
        try:
            setattr(s, f.name, data[f.name])
        except Exception:
            pass
    if s.provider not in VALID_PROVIDERS:
        s.provider = "ollama"


def save_settings(settings: Settings) -> None:
    """Persist provider settings to ``provider_settings.json`` (project root)."""
    data: Dict[str, Any] = {
        name: getattr(settings, name) for name in PROVIDER_FIELDS
    }
    with open(SETTINGS_FILE, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)


def mask_key(key: str) -> str:
    """Return a masked preview of an API key (or '' when unset)."""
    if not key:
        return ""
    if len(key) <= 8:
        return "•" * 8
    return f"{key[:4]}…{key[-4:]}"
