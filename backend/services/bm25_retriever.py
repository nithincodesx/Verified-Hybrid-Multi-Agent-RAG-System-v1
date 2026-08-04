"""
BM25 Keyword Retriever — pure Python, zero dependencies.

Implements BM25Okapi scoring with standard IDF formulation.
Used alongside vector search in the hybrid retrieval pipeline,
with Reciprocal Rank Fusion (RRF) to merge results.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Dict, List, Tuple


class BM25Retriever:
    """
    BM25Okapi implementation that can be built from a corpus of chunks
    and queried with a search string.

    Thread-safe once built (the index is read-only after ``fit()``).
    """

    def __init__(
        self,
        k1: float = 1.5,
        b: float = 0.75,
    ) -> None:
        self.k1 = k1
        self.b = b
        self._fitted = False

        # corpus stats
        self._doc_count: int = 0
        self._avg_dl: float = 0.0
        self._doc_lengths: List[int] = []
        self._doc_terms: List[Dict[str, int]] = []  # token → tf per doc
        self._idf: Dict[str, float] = {}             # token → idf
        self._doc_ids: List[str] = []
        self._all_tokens: List[str] = []

    # ── public API ─────────────────────────────────────────────────────

    def fit(self, doc_ids: List[str], documents: List[str]) -> None:
        """
        Build the BM25 index from a list of document texts.

        Args:
            doc_ids: Unique identifier for each document (parallel to *documents*).
            documents: Raw text for each document.
        """
        if len(doc_ids) != len(documents):
            raise ValueError("doc_ids and documents must have the same length")

        self._doc_count = len(documents)
        self._doc_ids = list(doc_ids)
        self._doc_terms = []
        self._doc_lengths = []

        corpus_tokens: List[str] = []

        for text in documents:
            tokens = self._tokenize(text)
            term_freq = Counter(tokens)
            self._doc_terms.append(dict(term_freq))
            self._doc_lengths.append(len(tokens))
            corpus_tokens.extend(tokens)

        self._avg_dl = sum(self._doc_lengths) / self._doc_count if self._doc_count else 0.0
        self._compute_idf()
        self._fitted = True

    def search(self, query: str, top_k: int = 5) -> List[Tuple[str, float]]:
        """
        Return the top-*k* document IDs with their BM25 scores.

        Args:
            query: The search string (tokenized internally).
            top_k: Maximum number of results.

        Returns:
            List of ``(doc_id, bm25_score)`` tuples, sorted descending by score.
        """
        if not self._fitted or self._doc_count == 0:
            return []

        query_tokens = self._tokenize(query)
        if not query_tokens:
            return []

        scores: List[float] = [0.0] * self._doc_count
        for qt in set(query_tokens):
            idf = self._idf.get(qt, 0.0)
            if idf == 0.0:
                continue
            for i in range(self._doc_count):
                tf = self._doc_terms[i].get(qt, 0)
                if tf == 0:
                    continue
                numerator = tf * (self.k1 + 1)
                denominator = tf + self.k1 * (
                    1 - self.b + self.b * self._doc_lengths[i] / self._avg_dl
                )
                scores[i] += idf * numerator / denominator

        # Pair with doc ids, sort, take top_k
        ranked = sorted(
            zip(self._doc_ids, scores),
            key=lambda x: x[1],
            reverse=True,
        )
        return [(doc_id, round(score, 4)) for doc_id, score in ranked if score > 0.0][:top_k]

    def get_document_count(self) -> int:
        """Number of documents in the BM25 index."""
        return self._doc_count

    # ── private ────────────────────────────────────────────────────────

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        """Lowercase, split on non-alphanumeric, filter short tokens."""
        text = text.lower()
        tokens = re.findall(r"[a-z0-9]+", text)
        # Filter very short tokens (single chars, noise)
        return [t for t in tokens if len(t) > 1]

    def _compute_idf(self) -> None:
        """Compute IDF for every token across the corpus."""
        n = self._doc_count
        # df = number of documents containing the term
        df_counter: Counter = Counter()
        for term_dict in self._doc_terms:
            df_counter.update(term_dict.keys())

        # BM25Okapi IDF formula: log((N - n(q) + 0.5) / (n(q) + 0.5))
        for token, df in df_counter.items():
            self._idf[token] = math.log((n - df + 0.5) / (df + 0.5) + 1.0)


# ── RRF (Reciprocal Rank Fusion) ──────────────────────────────────────

def reciprocal_rank_fusion(
    vector_results: List[Tuple[str, float]],
    keyword_results: List[Tuple[str, float]],
    k: int = 60,
    top_k: int = 5,
) -> List[Tuple[str, float]]:
    """
    Merge two ranked result lists using RRF.

    Each list contains ``(doc_id, score)`` pairs sorted descending by score.
    The fusion formula:

        RRF_score(doc) = Σ 1 / (k + rank_of(doc_in_method))

    Args:
        vector_results: Results from dense vector search.
        keyword_results: Results from BM25 keyword search.
        k: RRF constant (default 60, standard value).
        top_k: How many results to return after fusion.

    Returns:
        ``(doc_id, rrf_score)`` tuples sorted by fused score descending.
    """
    fused: Dict[str, float] = {}

    for rank, (doc_id, _) in enumerate(vector_results):
        fused[doc_id] = fused.get(doc_id, 0.0) + 1.0 / (k + rank + 1)

    for rank, (doc_id, _) in enumerate(keyword_results):
        fused[doc_id] = fused.get(doc_id, 0.0) + 1.0 / (k + rank + 1)

    ranked = sorted(fused.items(), key=lambda x: x[1], reverse=True)
    return ranked[:top_k]
