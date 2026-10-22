"""Cross-Encoder Reranker.

Reranks retrieved chunks with a cross-encoder model for higher precision.
Falls back to deterministic keyword-overlap scoring when sentence-transformers
or the model is unavailable.
"""

from __future__ import annotations

import logging
import math
from typing import List, Optional

from backend.models.schemas import SourceChunk

logger = logging.getLogger(__name__)

_SENTENCE_TRANSFORMERS_AVAILABLE = False
_CrossEncoder = None

try:
    from sentence_transformers import CrossEncoder as _CrossEncoder

    _SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    logger.info(
        "sentence-transformers not installed. Cross-encoder reranking will "
        "use fallback scoring. Install with: pip install sentence-transformers"
    )


def _fallback_score(query: str, document: str, original_score: float) -> float:
    """Keyword-overlap relevance proxy (70% original score + 30% Jaccard)."""
    query_tokens = set(query.lower().split())
    doc_tokens = set(document.lower().split())
    if not query_tokens:
        return original_score
    intersection = query_tokens & doc_tokens
    union = query_tokens | doc_tokens
    jaccard = len(intersection) / len(union) if union else 0.0
    return 0.7 * original_score + 0.3 * jaccard


def get_reranker(
    model_name: str = "BAAI/bge-reranker-base", use_fallback: bool = True
) -> "CrossEncoderReranker":
    """Factory: build a CrossEncoderReranker."""
    return CrossEncoderReranker(model_name=model_name, use_fallback=use_fallback)


class CrossEncoderReranker:
    DEFAULT_MODEL = "BAAI/bge-reranker-base"

    def __init__(self, model_name: str = DEFAULT_MODEL, use_fallback: bool = True) -> None:
        self._model_name = model_name
        self._use_fallback = use_fallback
        self._model = None
        self._loaded = False
        self._load_attempted = False

    @property
    def name(self) -> str:
        return f"CrossEncoder({self._model_name})"

    @property
    def is_available(self) -> bool:
        if not self._load_attempted:
            self._try_load()
        return self._loaded

    def _try_load(self) -> None:
        if self._load_attempted:
            return
        self._load_attempted = True
        if not _SENTENCE_TRANSFORMERS_AVAILABLE:
            logger.warning("sentence-transformers not installed. Using fallback scoring.")
            return
        try:
            logger.info("Loading cross-encoder model: %s", self._model_name)
            self._model = _CrossEncoder(self._model_name)
            self._loaded = True
            logger.info("Cross-encoder model loaded successfully")
        except Exception as exc:
            logger.warning(
                "Failed to load cross-encoder model %s: %s. Using fallback.",
                self._model_name,
                exc,
            )
            self._model = None
            self._loaded = False

    def rerank(
        self, query: str, chunks: List[SourceChunk], top_k: Optional[int] = None
    ) -> List[SourceChunk]:
        if not chunks:
            return []
        if not self._load_attempted:
            self._try_load()
        if self._loaded and self._model is not None:
            try:
                return self._rerank_with_model(query, chunks, top_k)
            except Exception as exc:
                logger.warning("Cross-encoder reranking failed: %s", exc)
                if self._use_fallback:
                    return self._rerank_with_fallback(query, chunks, top_k)
                return chunks[:top_k] if top_k is not None else chunks
        elif self._use_fallback:
            return self._rerank_with_fallback(query, chunks, top_k)
        else:
            return chunks[:top_k] if top_k is not None else chunks

    def _rerank_with_model(
        self, query: str, chunks: List[SourceChunk], top_k: Optional[int]
    ) -> List[SourceChunk]:
        pairs = [(query, chunk.text) for chunk in chunks]
        scores = self._model.predict(pairs)
        reranked: List[SourceChunk] = []
        for chunk, score in zip(chunks, scores):
            normalized = 1.0 / (1.0 + math.exp(-float(score)))
            reranked.append(chunk.model_copy(update={"score": round(normalized, 4)}))
        reranked.sort(key=lambda c: c.score, reverse=True)
        if top_k is not None and top_k > 0:
            reranked = reranked[:top_k]
        return reranked

    def _rerank_with_fallback(
        self, query: str, chunks: List[SourceChunk], top_k: Optional[int]
    ) -> List[SourceChunk]:
        reranked: List[SourceChunk] = []
        for chunk in chunks:
            new_score = _fallback_score(query, chunk.text, chunk.score)
            reranked.append(chunk.model_copy(update={"score": round(new_score, 4)}))
        reranked.sort(key=lambda c: c.score, reverse=True)
        if top_k is not None and top_k > 0:
            reranked = reranked[:top_k]
        return reranked
