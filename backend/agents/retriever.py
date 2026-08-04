"""
Retriever Agent

Takes the user query and retrieves the top-k relevant chunks from the
vector database using **hybrid search**:

1. **Dense vector search** — embed the query via the configured provider, search ChromaDB
2. **BM25 keyword search** — lexical matching via pure-Python BM25
3. **Reciprocal Rank Fusion (RRF)** — merge both result lists

Also supports file-level metadata filtering and confidence threshold checks.
"""

from __future__ import annotations

import logging
import time
from typing import List, Optional

import chromadb
from chromadb.errors import NotFoundError as ChromaNotFound

from backend.config import Settings
from backend.models.schemas import RetrievalResult, SourceChunk
from backend.services.bm25_retriever import BM25Retriever, reciprocal_rank_fusion
from backend.services.llm_client import embed_text as llm_embed_text

logger = logging.getLogger(__name__)


class RetrieverAgent:
    """Hybrid retriever: vector search + BM25 keyword search + RRF fusion."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

        # ChromaDB persistent client (no Docker needed)
        self._chroma = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
        )

        # BM25 index — lazily built on first retrieval
        self._bm25: Optional[BM25Retriever] = None
        self._bm25_built = False
        self._bm25_cache_key: Optional[tuple] = None

    # ── public API ─────────────────────────────────────────────────────

    def retrieve(
        self,
        query: str,
        top_k: Optional[int] = None,
        collection_name: Optional[str] = None,
        filter_source: Optional[str] = None,
    ) -> RetrievalResult:
        """
        Retrieve chunks using hybrid search (vector + BM25 with RRF).

        Args:
            query: The user's search question.
            top_k: How many chunks to return (default from config).
            collection_name: ChromaDB collection name (default from config).
            filter_source: Optional document filename to restrict search to.

        Returns:
            A ``RetrievalResult`` containing fused chunks, scores, and metadata.
        """
        start = time.perf_counter()

        try:
            query_vector = self._embed(query)
            k = top_k or self.settings.top_k
            collection = collection_name or self.settings.collection_name

            # ── Step 1: Dense vector search ────────────────────────────
            vector_hits = self._vector_search(query_vector, k, collection, filter_source)
            vector_chunks = self._hits_to_chunks(vector_hits)

            # ── Step 2: BM25 keyword search (if hybrid enabled) ────────
            hybrid_used = False
            if self.settings.enable_hybrid_search and self._build_bm25_if_needed(collection, filter_source):
                bm25_ids = self._bm25_search(query, k)
                # Convert BM25 IDs→scores into chunk metadata for RRF
                vector_ids = [(c.chunk_id, c.score) for c in vector_chunks]
                fused_ids = reciprocal_rank_fusion(
                    vector_ids,
                    bm25_ids,
                    k=self.settings.rrf_k,
                    top_k=k,
                )
                # Re-order chunks to match RRF ranking
                # RRF only affects **ordering**, not scores.
                # Scores stay as the original vector similarity so the
                # confidence threshold check is not polluted by RRF's
                # tiny rank-based scores.
                id_to_chunk = {c.chunk_id: c for c in vector_chunks}
                fused_chunks: List[SourceChunk] = []
                for doc_id, _ in fused_ids:
                    if doc_id in id_to_chunk:
                        fused_chunks.append(id_to_chunk[doc_id])
                # Append any vector-only chunks that RRF missed (rare)
                for c in vector_chunks:
                    if c not in fused_chunks:
                        fused_chunks.append(c)
                vector_chunks = fused_chunks
                hybrid_used = True

            # ── Step 3: Confidence threshold check ─────────────────────
            below_threshold = False
            if vector_chunks:
                top_score = vector_chunks[0].score
                if top_score < self.settings.confidence_threshold:
                    logger.info(
                        "Top chunk score %.4f below threshold %.2f — marking low confidence",
                        top_score, self.settings.confidence_threshold,
                    )
                    below_threshold = True

        except Exception:
            logger.exception("RetrieverAgent.retrieve failed")
            raise

        latency = (time.perf_counter() - start) * 1000  # ms
        return RetrievalResult(
            query=query,
            chunks=vector_chunks,
            latency_ms=round(latency, 1),
            hybrid_used=hybrid_used,
            below_threshold=below_threshold,
        )

    def health_check(self) -> bool:
        """Return True if ChromaDB is reachable and the collection exists."""
        try:
            self._chroma.heartbeat()
            collections = self._chroma.list_collections()
            return any(c.name == self.settings.collection_name for c in collections)
        except Exception:
            return False

    # ── dense vector search ────────────────────────────────────────────

    def _embed(self, text: str) -> List[float]:
        """Embed via the configured provider (Ollama local or OpenAI cloud)."""
        return llm_embed_text(settings=self.settings, text=text)

    def _vector_search(
        self,
        vector: List[float],
        top_k: int,
        collection_name: str,
        filter_source: Optional[str] = None,
    ) -> dict:
        """Run ANN search against the ChromaDB collection with optional metadata filter."""
        try:
            collection = self._chroma.get_collection(name=collection_name)
        except (ValueError, ChromaNotFound):
            logger.warning("Collection '%s' not found — returning empty results", collection_name)
            return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

        query_kwargs = dict(
            query_embeddings=[vector],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )
        if filter_source:
            query_kwargs["where"] = {"source": filter_source}

        try:
            results = collection.query(**query_kwargs)
        except Exception as exc:
            raise RuntimeError(
                "Vector search failed: "
                f"{exc}. If you changed the embedding model/provider, "
                "re-upload your documents so stored embeddings match."
            ) from exc
        return results

    # ── BM25 keyword search ────────────────────────────────────────────

    def _build_bm25_if_needed(self, collection_name: str, filter_source: Optional[str] = None) -> bool:
        """
        Build the BM25 index from ChromaDB documents on first call.
        If *filter_source* is set, only index chunks from that source.
        Returns True if BM25 was successfully built/has data.
        """
        # We need to rebuild if filter_source changed since last build
        # For simplicity, cache by (collection, source) using a tuple key
        cache_key = (collection_name, filter_source)
        if self._bm25_cache_key == cache_key:
            return self._bm25 is not None and self._bm25.get_document_count() > 0

        try:
            collection = self._chroma.get_collection(name=collection_name)
        except (ValueError, ChromaNotFound):
            return False

        kwargs = {"include": ["documents", "metadatas"]}
        if filter_source:
            kwargs["where"] = {"source": filter_source}

        all_data = collection.get(**kwargs)
        doc_ids: List[str] = all_data.get("ids", [])
        documents: List[str] = all_data.get("documents", [])

        if not doc_ids or not documents:
            logger.warning("No documents to build BM25 index — skipping hybrid search")
            return False

        self._bm25 = BM25Retriever(k1=self.settings.bm25_k1, b=self.settings.bm25_b)
        self._bm25.fit(doc_ids, documents)
        self._bm25_cache_key = cache_key
        self._bm25_built = True
        logger.info("BM25 index built: %d docs (source=%s)", len(doc_ids), filter_source or "all")
        return True

    def _bm25_search(self, query: str, top_k: int) -> List[tuple[str, float]]:
        """Run BM25 keyword search. Returns list of (doc_id, score) tuples."""
        if not self._bm25:
            return []
        return self._bm25.search(query, top_k=top_k * 2)  # request more for fusion pool

    # ── result parsing ─────────────────────────────────────────────────

    @staticmethod
    def _hits_to_chunks(results: dict) -> List[SourceChunk]:
        """Convert raw ChromaDB query results into ``SourceChunk`` models."""
        chunks: List[SourceChunk] = []

        ids = results.get("ids", [[]])[0]
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        # ChromaDB returns L2-squared distances by default. Convert to a
        # 0-1 similarity score via: score = 1 / (1 + distance).
        for i in range(len(ids)):
            score = 1.0 / (1.0 + distances[i]) if distances else 0.0
            meta = metadatas[i] if i < len(metadatas) else {}
            chunks.append(
                SourceChunk(
                    chunk_id=ids[i],
                    text=documents[i] if i < len(documents) else "",
                    score=round(score, 4),
                    source=meta.get("source") if isinstance(meta, dict) else None,
                )
            )
        return chunks
