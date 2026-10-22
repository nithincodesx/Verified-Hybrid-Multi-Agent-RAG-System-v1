"""
Verified RAG Agent — FastAPI backend

Exposes a single pipeline endpoint that orchestrates the three agents
(Retriever → Drafter → Verifier) and returns the full trace log so the
frontend can render each stage.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator, List

import uuid

import chromadb
from fastapi import BackgroundTasks, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from backend.agents.drafter import DraftAgent
from backend.agents.retriever import RetrieverAgent
from backend.agents.verifier import VerifierAgent
from backend.config import Settings, get_settings, mask_key, save_settings
from backend.ingestion import chunk_text
from backend.models.schemas import (
    DeleteResponse,
    DocumentInfo,
    DocumentListResponse,
    DraftResult,
    HealthResponse,
    PipelineResponse,
    ProviderSettingsRequest,
    ProviderSettingsResponse,
    QueryRequest,
    RetrievalResult,
    VerificationResult,
)
from backend.services.llm_client import (
    embed_texts as llm_embed_texts,
    health_check as llm_health_check,
)

# ── Logging ────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("verified-rag")

# ── Global agent instances (lifespan-managed) ──────────────────────────

_retriever: RetrieverAgent | None = None
_drafter: DraftAgent | None = None
_verifier: VerifierAgent | None = None
_settings: Settings | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup / shutdown lifecycle."""
    global _retriever, _drafter, _verifier, _settings
    try:
        _settings = get_settings()
        _retriever = RetrieverAgent(_settings)
        _drafter = DraftAgent(_settings)
        _verifier = VerifierAgent(_settings)
        logger.info("Agents initialised — ready to serve")
    except RuntimeError as exc:
        logger.warning("Startup incomplete: %s", exc)
    yield
    _retriever = _drafter = _verifier = _settings = None
    logger.info("Agents shut down")


app = FastAPI(
    title="Verified RAG Agent",
    version="1.0.0",
    description=(
        "A Retrieval-Augmented Generation pipeline with a built-in "
        "verification layer. Every answer is checked against the source "
        "chunks before being returned."
    ),
    lifespan=lifespan,
)

# Allow the frontend (Vite dev server on 5173, or prod build) to call us.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Endpoints ──────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Lightweight health check — confirms ChromaDB + the active LLM provider are reachable."""
    db_ok = _retriever.health_check() if _retriever else False
    llm_ok = llm_health_check(_settings) if _settings else False
    doc_count = None
    if db_ok and _settings:
        try:
            chroma = chromadb.PersistentClient(path=_settings.chroma_persist_dir)
            col = chroma.get_collection(_settings.collection_name)
            doc_count = col.count()
        except Exception:
            pass
    return HealthResponse(
        status="ok" if (db_ok and llm_ok) else "degraded",
        db_connected=db_ok,
        gemini_configured=llm_ok,
        doc_count=doc_count,
        hybrid_search_enabled=_settings.enable_hybrid_search if _settings else False,
        confidence_threshold=_settings.confidence_threshold if _settings else 0.0,
    )


# ── Upload endpoint (async with BackgroundTasks) ────────────────────

ALLOWED_UPLOAD_EXTENSIONS = {".txt", ".md", ".pdf", ".csv", ".json"}
MAX_UPLOAD_SIZE = 512 * 1024  # 512 KB max to avoid blocking the server

# In-memory upload task store — maps task_id to status dict
_upload_tasks: dict[str, dict] = {}


async def _process_upload(task_id: str, content: bytes, filename: str, ext: str):
    """Background task: chunk, embed, and store the document.

    Blocking work (embedding, ChromaDB writes) runs in worker threads via
    ``asyncio.to_thread`` so the event loop stays free — otherwise the
    response body can stall on Windows and the frontend never receives it.
    """
    try:
        _upload_tasks[task_id]["status"] = "processing"

        text = content.decode("utf-8") if ext != ".pdf" else await asyncio.to_thread(_extract_pdf_text, content)
        if not text.strip():
            _upload_tasks[task_id].update({"status": "error", "error": "File appears to be empty."})
            return

        doc_name = filename
        chunks = chunk_text(text, _settings.chunk_size, _settings.chunk_overlap)
        _upload_tasks[task_id]["chunk_count"] = len(chunks)

        if not chunks:
            _upload_tasks[task_id].update({"status": "error", "error": "No text could be extracted."})
            return

        _upload_tasks[task_id]["status"] = "embedding"
        vectors = await asyncio.to_thread(llm_embed_texts, _settings, chunks)

        _upload_tasks[task_id]["status"] = "storing"
        await asyncio.to_thread(_store_chunks, doc_name, chunks, vectors)

        logger.info("✅ Uploaded '%s' → %d chunks", doc_name, len(chunks))
        _upload_tasks[task_id].update({"status": "completed", "filename": doc_name, "chunks": len(chunks)})

    except Exception as exc:
        logger.exception("Upload failed for '%s'", filename)
        _upload_tasks[task_id].update({"status": "error", "error": str(exc)})


def _store_chunks(doc_name: str, chunks: List[str], vectors: List[List[float]]) -> None:
    """Sync ChromaDB upsert — runs in a worker thread (see _process_upload)."""
    chroma = chromadb.PersistentClient(path=_settings.chroma_persist_dir)
    collection = chroma.get_or_create_collection(
        name=_settings.collection_name,
        metadata={"hnsw:space": "cosine"},
    )
    collection.upsert(
        ids=[f"{doc_name}-{i}" for i in range(len(chunks))],
        embeddings=vectors,
        metadatas=[{"source": doc_name, "chunk_index": i} for i in range(len(chunks))],
        documents=chunks,
    )


@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
):
    """
    Upload a document for async ingestion.

    Returns immediately with a ``task_id``. Poll ``GET /upload/{task_id}``
    to check progress. Accepts ``.txt``, ``.md``, ``.pdf`` files (max 512 KB).
    """
    if not _settings:
        raise HTTPException(status_code=503, detail="Backend not initialised.")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        return {"task_id": None, "error": f"Unsupported file type '{ext}'."}

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        max_kb = MAX_UPLOAD_SIZE // 1024
        return {"task_id": None, "error": f"File too large ({len(content)//1024} KB). Max {max_kb} KB."}

    task_id = str(uuid.uuid4())[:8]
    _upload_tasks[task_id] = {"status": "queued", "filename": file.filename, "chunks": 0}

    # Schedule background processing
    background_tasks.add_task(_process_upload, task_id, content, file.filename, ext)

    logger.info("📤 Upload queued: '%s' → task %s", file.filename, task_id)
    return {"task_id": task_id, "status": "queued"}


@app.get("/upload/{task_id}")
async def get_upload_status(task_id: str):
    """Poll this endpoint to check upload progress."""
    task = _upload_tasks.get(task_id)
    if not task:
        return {"status": "not_found"}
    return task


def _extract_pdf_text(content: bytes) -> str:
    """Extract text from a PDF blob using pypdf."""
    try:
        from pypdf import PdfReader
        import io
        reader = PdfReader(io.BytesIO(content))
        pages = [p.extract_text() for p in reader.pages if p.extract_text()]
        return "\n\n".join(pages)
    except ImportError:
        raise ImportError("pypdf is required for PDF uploads: pip install pypdf")


# ── Document management endpoints ────────────────────────────────────


def _get_chroma_collection():
    """Helper to get the ChromaDB collection."""
    chroma = chromadb.PersistentClient(path=_settings.chroma_persist_dir)
    return chroma.get_or_create_collection(
        name=_settings.collection_name,
        metadata={"hnsw:space": "cosine"},
    )


@app.get("/documents", response_model=DocumentListResponse)
async def list_documents() -> DocumentListResponse:
    """List all ingested documents with chunk counts."""
    if not _settings:
        raise HTTPException(status_code=503, detail="Backend not initialised.")
    try:
        collection = _get_chroma_collection()
        # Get all metadata to group by source
        all_data = collection.get(include=["metadatas"])

        source_counts: dict[str, int] = {}
        metadatas = all_data.get("metadatas", [])
        for meta in metadatas:
            if meta and isinstance(meta, dict):
                source = meta.get("source", "unknown")
                source_counts[source] = source_counts.get(source, 0) + 1

        docs = [
            DocumentInfo(filename=name, chunk_count=count)
            for name, count in sorted(source_counts.items())
        ]
        return DocumentListResponse(
            documents=docs,
            total_docs=len(docs),
            total_chunks=sum(d.chunk_count for d in docs),
        )
    except Exception as exc:
        logger.exception("Failed to list documents")
        return DocumentListResponse(documents=[], total_docs=0, total_chunks=0)


@app.delete("/documents/{filename}", response_model=DeleteResponse)
async def delete_document(filename: str) -> DeleteResponse:
    """Delete a document and all its chunks from the collection."""
    if not _settings:
        raise HTTPException(status_code=503, detail="Backend not initialised.")
    try:
        collection = _get_chroma_collection()
        # Get the chunk IDs for this source
        result = collection.get(
            where={"source": filename},
            include=["metadatas"],
        )
        ids = result.get("ids", [])
        if not ids:
            return DeleteResponse(
                success=False, filename=filename,
                deleted_chunks=0, error="Document not found.",
            )
        collection.delete(ids=ids)
        logger.info("🗑️ Deleted '%s' → %d chunks", filename, len(ids))
        return DeleteResponse(
            success=True, filename=filename, deleted_chunks=len(ids),
        )
    except Exception as exc:
        logger.exception("Failed to delete '%s'", filename)
        return DeleteResponse(
            success=False, filename=filename,
            deleted_chunks=0, error=str(exc),
        )


# ── Provider settings endpoints ───────────────────────────────────────


def _settings_response() -> ProviderSettingsResponse:
    """Build the masked settings response from the live Settings object."""
    s = _settings
    return ProviderSettingsResponse(
        provider=s.provider,
        openai_api_key=mask_key(s.openai_api_key),
        openai_base_url=s.openai_base_url,
        openai_model=s.openai_model,
        openrouter_api_key=mask_key(s.openrouter_api_key),
        openrouter_base_url=s.openrouter_base_url,
        openrouter_model=s.openrouter_model,
        ollama_base_url=s.ollama_base_url,
        embedding_model=s.embedding_model,
        draft_model=s.draft_model,
        verifier_model=s.verifier_model,
        enable_query_expansion=s.enable_query_expansion,
        query_expansion_strategy=s.query_expansion_strategy,
        query_expansion_max_terms=s.query_expansion_max_terms,
        enable_reranking=s.enable_reranking,
        reranker_model=s.reranker_model,
    )


def _merge_key(new_value: str, current: str) -> str:
    """Keep the existing key when the client sends an empty or masked value."""
    v = (new_value or "").strip()
    if not v or v.startswith("•") or "…" in v:
        return current
    return v


def _apply_settings_updates(body: ProviderSettingsRequest) -> None:
    """Apply the request to the live Settings object (mutates in place)."""
    s = _settings
    s.provider = body.provider
    s.openai_api_key = _merge_key(body.openai_api_key, s.openai_api_key)
    s.openrouter_api_key = _merge_key(body.openrouter_api_key, s.openrouter_api_key)
    if body.openai_base_url.strip():
        s.openai_base_url = body.openai_base_url.strip()
    if body.openai_model.strip():
        s.openai_model = body.openai_model.strip()
    if body.openrouter_base_url.strip():
        s.openrouter_base_url = body.openrouter_base_url.strip()
    if body.openrouter_model.strip():
        s.openrouter_model = body.openrouter_model.strip()
    if body.ollama_base_url.strip():
        s.ollama_base_url = body.ollama_base_url.strip()
    if body.embedding_model.strip():
        s.embedding_model = body.embedding_model.strip()
    if body.draft_model.strip():
        s.draft_model = body.draft_model.strip()
    if body.verifier_model.strip():
        s.verifier_model = body.verifier_model.strip()


@app.get("/settings", response_model=ProviderSettingsResponse)
async def get_provider_settings() -> ProviderSettingsResponse:
    """Return the current provider settings (API keys masked)."""
    if not _settings:
        raise HTTPException(status_code=503, detail="Backend not initialised.")
    return _settings_response()


@app.put("/settings", response_model=ProviderSettingsResponse)
async def update_provider_settings(body: ProviderSettingsRequest) -> ProviderSettingsResponse:
    """
    Update the active LLM provider and its credentials.

    Applied immediately (agents read the live settings object) and
    persisted to ``provider_settings.json`` so it survives restarts.
    """
    if not _settings:
        raise HTTPException(status_code=503, detail="Backend not initialised.")
    _apply_settings_updates(body)
    save_settings(_settings)
    logger.info("⚙ Provider settings updated → %s", _settings.provider)
    return _settings_response()


@app.post("/pipeline", response_model=PipelineResponse)
async def run_pipeline(req: QueryRequest) -> PipelineResponse:
    """
    Execute the full RAG pipeline:

    1. **Retriever**  — embed the query, search ChromaDB, return top-k chunks.
    2. **Drafter**    — generate an answer using ONLY the retrieved chunks.
    3. **Verifier**   — check every claim against the source; flag or remove
                        unsupported claims.

    Returns a ``PipelineResponse`` with the full trace log (retrieval,
    draft, and verification) so the frontend can animate each stage.
    """
    if not (_retriever and _drafter and _verifier and _settings):
        raise HTTPException(
            status_code=503,
            detail="Agents not initialised. Check that your LLM provider "
                   "(Ollama local, or OpenAI/OpenRouter via the ⚙ settings) "
                   "and ChromaDB are accessible.",
        )

    pipeline_start = time.perf_counter()

    try:
        # ── Step 1: Retrieve (hybrid search + metadata filter) ─────────
        logger.info("🔄 Query: %s", req.query[:120])
        if req.filter_source:
            logger.info("   filtered source: %s", req.filter_source)
        retrieval = _retriever.retrieve(
            query=req.query,
            top_k=req.top_k,
            filter_source=req.filter_source,
            enable_query_expansion=req.enable_query_expansion or False,
            query_expansion_strategy=req.query_expansion_strategy or "llm",
            query_expansion_max_terms=req.query_expansion_max_terms or 5,
            enable_reranking=req.enable_reranking or False,
            reranker_top_k=req.reranker_top_k,
        )
        logger.info(
            "   retrieved %d chunks in %.0f ms (hybrid=%s, below_threshold=%s)",
            len(retrieval.chunks), retrieval.latency_ms,
            retrieval.hybrid_used, retrieval.below_threshold,
        )

        # ── Confidence threshold: skip LLM if chunks are too weak ─────
        if retrieval.below_threshold or not retrieval.chunks:
            reason = (
                "No relevant context found matching your query."
                if not retrieval.chunks
                else "The retrieved chunks did not meet the confidence threshold. "
                     "Consider refining your query or uploading more relevant documents."
            )
            logger.info("   ⏭ LLM bypassed — %s", reason)
            return PipelineResponse(
                query=req.query,
                retrieval=retrieval,
                draft=DraftResult(answer=""),
                verification=VerificationResult(
                    verdicts=[], passed=True,
                    verified_answer=reason,
                ),
                pipeline_latency_ms=round((time.perf_counter() - pipeline_start) * 1000, 1),
                filter_source=req.filter_source,
                skipped_llm=True,
            )

        # ── Step 2: Draft ──────────────────────────────────────────────
        await asyncio.sleep(_settings.rate_limit_sleep)  # rate-limit safety
        draft = _drafter.draft(query=req.query, chunks=retrieval.chunks)
        logger.info("   draft → %d chars", len(draft.answer))

        # ── Step 3: Verify ─────────────────────────────────────────────
        await asyncio.sleep(_settings.rate_limit_sleep)  # rate-limit safety
        verification = _verifier.verify(
            query=req.query,
            draft_answer=draft.answer,
            chunks=retrieval.chunks,
        )
        logger.info("   verification → %d claims, passed=%s",
                     len(verification.verdicts), verification.passed)

    except Exception as exc:
        logger.exception("Pipeline crashed")
        return PipelineResponse(
            query=req.query,
            retrieval=RetrievalResult(query=req.query, chunks=[]),
            draft=DraftResult(answer=""),
            verification=VerificationResult(verdicts=[], passed=False),
            pipeline_latency_ms=round((time.perf_counter() - pipeline_start) * 1000, 1),
            error=str(exc),
            filter_source=req.filter_source,
        )

    pipeline_latency = round((time.perf_counter() - pipeline_start) * 1000, 1)
    logger.info("✅ Pipeline complete in %.0f ms", pipeline_latency)

    final = PipelineResponse(
        query=req.query,
        retrieval=retrieval,
        draft=draft,
        verification=verification,
        pipeline_latency_ms=pipeline_latency,
        filter_source=req.filter_source,
    )
    return final


# ── Streaming pipeline (Server-Sent Events) ───────────────────────────

def _sse(event: str, payload: dict) -> str:
    """Format one SSE frame: ``event: <name>\ndata: <json>\n\n``."""
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


async def _run_pipeline_events(
    query: str,
    top_k: int | None,
    filter_source: str | None,
    enable_query_expansion: bool = False,
    query_expansion_strategy: str = "llm",
    query_expansion_max_terms: int = 5,
    enable_reranking: bool = False,
    reranker_top_k: int | None = None,
) -> AsyncGenerator[str, None]:
    """Run the 3-agent pipeline, yielding SSE frames as stages complete."""
    pipeline_start = time.perf_counter()
    try:
        yield _sse("stage", {"stage": "retrieval", "status": "started"})
        retrieval = await asyncio.to_thread(
            _retriever.retrieve,
            query,
            top_k,
            None,
            filter_source,
            enable_query_expansion,
            query_expansion_strategy,
            query_expansion_max_terms,
            enable_reranking,
            reranker_top_k,
        )
        yield _sse("stage", {
            "stage": "retrieval", "status": "done",
            "latency_ms": retrieval.latency_ms,
            "chunks": len(retrieval.chunks),
            "hybrid_used": retrieval.hybrid_used,
            "below_threshold": retrieval.below_threshold,
        })

        if retrieval.below_threshold or not retrieval.chunks:
            reason = (
                "No relevant context found matching your query."
                if not retrieval.chunks
                else "The retrieved chunks did not meet the confidence threshold. "
                     "Consider refining your query or uploading more relevant documents."
            )
            yield _sse("stage", {"stage": "draft", "status": "skipped"})
            yield _sse("stage", {"stage": "verification", "status": "skipped"})
            response = PipelineResponse(
                query=query, retrieval=retrieval,
                draft=DraftResult(answer=""),
                verification=VerificationResult(
                    verdicts=[], passed=True, verified_answer=reason),
                pipeline_latency_ms=round(
                    (time.perf_counter() - pipeline_start) * 1000, 1),
                filter_source=filter_source, skipped_llm=True,
            )
            yield _sse("done", response.model_dump())
            return

        await asyncio.sleep(_settings.rate_limit_sleep)
        yield _sse("stage", {"stage": "draft", "status": "started"})
        draft = await asyncio.to_thread(
            _drafter.draft, query=query, chunks=retrieval.chunks)
        yield _sse("stage", {
            "stage": "draft", "status": "done",
            "latency_ms": draft.latency_ms, "chars": len(draft.answer)})

        await asyncio.sleep(_settings.rate_limit_sleep)
        yield _sse("stage", {"stage": "verification", "status": "started"})
        verification = await asyncio.to_thread(
            _verifier.verify, query=query,
            draft_answer=draft.answer, chunks=retrieval.chunks)
        yield _sse("stage", {
            "stage": "verification", "status": "done",
            "latency_ms": verification.latency_ms,
            "claims": len(verification.verdicts),
            "passed": verification.passed})

        response = PipelineResponse(
            query=query, retrieval=retrieval, draft=draft,
            verification=verification,
            pipeline_latency_ms=round(
                (time.perf_counter() - pipeline_start) * 1000, 1),
            filter_source=filter_source,
        )
        yield _sse("done", response.model_dump())

    except Exception as exc:
        logger.exception("[stream] Pipeline crashed")
        yield _sse("error", {"error": str(exc)})


@app.get("/pipeline/stream")
async def run_pipeline_stream(
    query: str = Query(..., min_length=1, description="User's question"),
    top_k: int | None = Query(None, ge=1, le=20),
    filter_source: str | None = Query(None),
    enable_query_expansion: bool = Query(False, description="Expand the query with related terms before retrieval"),
    query_expansion_strategy: str = Query("llm", description="Expansion strategy: llm | synonym | hybrid"),
    query_expansion_max_terms: int = Query(5, ge=1, le=20, description="Maximum expansion terms"),
    enable_reranking: bool = Query(False, description="Rerank retrieved chunks with a cross-encoder model"),
    reranker_top_k: int | None = Query(None, ge=0, le=50, description="Top-K chunks to keep after reranking"),
) -> StreamingResponse:
    """Stream the RAG pipeline as Server-Sent Events (one event per stage)."""
    if not (_retriever and _drafter and _verifier and _settings):
        raise HTTPException(
            status_code=503,
            detail="Agents not initialised. Check that your LLM provider "
                   "(Ollama local, or OpenAI/OpenRouter via the settings) "
                   "and ChromaDB are accessible.",
        )
    return StreamingResponse(
        _run_pipeline_events(
            query, top_k, filter_source,
            enable_query_expansion, query_expansion_strategy,
            query_expansion_max_terms, enable_reranking, reranker_top_k,
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
