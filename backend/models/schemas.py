"""
Pydantic models for the Verified RAG Agent pipeline.

These schemas are used throughout the backend and also serialise to the
JSON responses that the frontend consumes.
"""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# ── Query / Request ────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    """Incoming user question."""
    query: str = Field(..., min_length=1, description="User's question")
    top_k: Optional[int] = Field(None, ge=1, le=20, description="Override top-K")
    filter_source: Optional[str] = Field(None, description="Restrict search to a specific document source (filename)")
    # ── Optional query expansion (off by default) ──
    enable_query_expansion: Optional[bool] = Field(None, description="Expand the query with related terms before retrieval")
    query_expansion_strategy: Optional[str] = Field(None, description="Expansion strategy: llm | synonym | hybrid")
    query_expansion_max_terms: Optional[int] = Field(None, ge=1, le=20, description="Maximum expansion terms to generate")
    # ── Optional cross-encoder reranking (off by default) ──
    enable_reranking: Optional[bool] = Field(None, description="Rerank retrieved chunks with a cross-encoder model")
    reranker_model: Optional[str] = Field(None, description="Cross-encoder model name (default from config)")
    reranker_top_k: Optional[int] = Field(None, ge=0, le=50, description="Top-K chunks to keep after reranking (0 = keep all)")


# ── Retrieval ──────────────────────────────────────────────────────────

class SourceChunk(BaseModel):
    """A single chunk returned by the retriever."""
    chunk_id: str = Field(..., description="Unique chunk identifier")
    text: str = Field(..., description="Chunk text content")
    score: float = Field(..., ge=0.0, le=1.0, description="Relevance score")
    source: Optional[str] = Field(None, description="Original document name / path")


class RetrievalResult(BaseModel):
    """The retriever agent's full output."""
    query: str = Field(..., description="Original query")
    expanded_query: Optional[str] = Field(None, description="Query after expansion (if expansion was applied)")
    expansion_applied: bool = Field(False, description="Whether query expansion was applied")
    expansion_strategy: Optional[str] = Field(None, description="Expansion strategy used")
    expansion_terms: List[str] = Field(default_factory=list, description="Expansion terms added")
    chunks: List[SourceChunk] = Field(default_factory=list)
    latency_ms: float = 0.0
    hybrid_used: bool = Field(False, description="Whether hybrid search (vector + BM25) was used")
    below_threshold: bool = Field(False, description="Whether top chunk fell below confidence threshold")
    # ── Reranking metadata ──
    reranking_applied: bool = Field(False, description="Whether cross-encoder reranking was applied")
    reranker_model: Optional[str] = Field(None, description="Reranker model used")
    reranker_fallback_used: bool = Field(False, description="Whether fallback scoring was used instead of the model")
    reranker_error: Optional[str] = Field(None, description="Reranking error message, if any")


# ── Draft ──────────────────────────────────────────────────────────────

class DraftResult(BaseModel):
    """The draft agent's output — an answer built only from context."""
    answer: str = Field(..., description="Generated answer text")
    latency_ms: float = 0.0


# ── Verification ───────────────────────────────────────────────────────

class ClaimVerdict(BaseModel):
    """Verdict for a single claim extracted from the draft."""
    claim: str = Field(..., description="Claim extracted from the answer")
    supported: bool = Field(..., description="Whether the claim is supported by source")
    source_chunk: Optional[str] = Field(
        None, description="The supporting source text snippet, if supported"
    )
    explanation: Optional[str] = Field(
        None, description="Brief reason for the verdict"
    )


class VerificationResult(BaseModel):
    """The verifier agent's full output."""
    verdicts: List[ClaimVerdict] = Field(default_factory=list)
    passed: bool = Field(..., description="True if ALL claims are supported")
    verified_answer: Optional[str] = Field(
        None, description="Cleaned answer with unsupported claims removed"
    )
    latency_ms: float = 0.0


# ── Pipeline response (the single endpoint return type) ────────────────

class PipelineResponse(BaseModel):
    """Full trace of the RAG pipeline, returned to the frontend."""
    query: str = Field(..., description="Original user query")
    retrieval: RetrievalResult = Field(..., description="Retriever agent output")
    draft: DraftResult = Field(..., description="Draft agent output")
    verification: VerificationResult = Field(..., description="Verifier agent output")
    pipeline_latency_ms: float = 0.0
    error: Optional[str] = Field(None, description="Pipeline-level error, if any")
    filter_source: Optional[str] = Field(None, description="Source filter applied, if any")
    skipped_llm: bool = Field(False, description="True = LLM was bypassed due to low confidence")


# ── Upload ────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    filename: str = Field(..., description="Uploaded document filename")
    chunks: int = Field(..., description="Number of chunks ingested")
    success: bool = Field(..., description="Whether ingestion succeeded")
    error: Optional[str] = Field(None, description="Error message, if any")


# ── Document Management ───────────────────────────────────────────────

class DocumentInfo(BaseModel):
    filename: str = Field(..., description="Document filename")
    chunk_count: int = Field(..., description="Number of chunks for this document")


class DocumentListResponse(BaseModel):
    documents: List[DocumentInfo] = Field(default_factory=list)
    total_docs: int = 0
    total_chunks: int = 0


class DeleteResponse(BaseModel):
    success: bool = Field(..., description="Whether deletion succeeded")
    filename: str = Field(..., description="Deleted document filename")
    deleted_chunks: int = Field(0, description="Number of chunks deleted")
    error: Optional[str] = Field(None, description="Error message, if any")


# ── Provider settings ──────────────────────────────────────────────────

class ProviderSettingsRequest(BaseModel):
    """Provider settings the frontend sends to update the active LLM.

    API key fields are optional: an empty value (or the masked placeholder
    returned by ``GET /settings``) leaves the existing key untouched.
    """
    provider: Literal["ollama", "openai", "openrouter"] = "ollama"
    openai_api_key: str = ""
    openai_base_url: str = ""
    openai_model: str = ""
    openrouter_api_key: str = ""
    openrouter_base_url: str = ""
    openrouter_model: str = ""
    ollama_base_url: str = ""
    embedding_model: str = ""
    draft_model: str = ""
    verifier_model: str = ""
    enable_query_expansion: Optional[bool] = None
    query_expansion_strategy: Optional[str] = None
    query_expansion_max_terms: Optional[int] = None
    enable_reranking: Optional[bool] = None
    reranker_model: Optional[str] = None


class ProviderSettingsResponse(BaseModel):
    """Current provider settings (API keys are masked)."""
    provider: str = "ollama"
    openai_api_key: str = Field("", description="Masked key preview, or '' if unset")
    openai_base_url: str = ""
    openai_model: str = ""
    openrouter_api_key: str = Field("", description="Masked key preview, or '' if unset")
    openrouter_base_url: str = ""
    openrouter_model: str = ""
    ollama_base_url: str = ""
    embedding_model: str = ""
    draft_model: str = ""
    verifier_model: str = ""
    # Query expansion & reranking config (read-only)
    enable_query_expansion: bool = False
    query_expansion_strategy: str = "llm"
    query_expansion_max_terms: int = 5
    enable_reranking: bool = False
    reranker_model: str = "BAAI/bge-reranker-base"


# ── Health / Status ────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
    db_connected: bool = False
    gemini_configured: bool = False
    doc_count: Optional[int] = Field(None, description="Number of documents in the collection")
    hybrid_search_enabled: bool = Field(False, description="Whether hybrid search is active")
    confidence_threshold: float = Field(0.0, description="Current confidence threshold")
