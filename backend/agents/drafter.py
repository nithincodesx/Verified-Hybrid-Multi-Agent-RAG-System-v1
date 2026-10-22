"""
Draft Agent

Generates a concise, grounded answer using **only** the text from the
retrieved source chunks, via the configured LLM provider (local Ollama,
OpenAI, or OpenRouter).
"""

from __future__ import annotations

import logging
import time
from typing import List

from backend.config import Settings
from backend.models.schemas import DraftResult, SourceChunk
from backend.services.llm_client import (
    draft_model as llm_draft_model,
    generate as llm_generate,
)

logger = logging.getLogger(__name__)

# ── System prompt ──────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a **faithful answer drafting assistant**. Your only job is to
answer the user's question based **exclusively** on the provided source
text below.

Rules (read carefully):
1. Use **only** the content from the provided "Source Chunks".
2. If the source chunks do NOT contain enough information to answer the
   question, say: "The provided documents do not contain enough information
   to answer this question."
3. **Never** introduce facts, figures, names, or reasoning that is not
   present in the source chunks.  No outside knowledge.
4. Keep the answer concise (2-5 sentences when possible).
5. Do **not** mention that you are an AI or that you are limited by
   instructions — just give the answer.
6. If you use exact phrases from the source, put them in **"quotes"**.
7. Do **not** add commentary like "Based on the text..." — simply answer.

Now, here are the source chunks:
"""


class DraftAgent:
    """Generates a draft answer strictly from retrieved chunks."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    # ── public API ─────────────────────────────────────────────────────

    def draft(self, query: str, chunks: List[SourceChunk]) -> DraftResult:
        """
        Build a prompt from *chunks*, call Ollama, and return a
        ``DraftResult``.
        """
        start = time.perf_counter()

        try:
            prompt = self._build_prompt(query, chunks)
            answer = self._call_llm(prompt)
        except Exception:
            logger.exception("DraftAgent.draft failed")
            raise

        latency = (time.perf_counter() - start) * 1000
        logger.info("Draft generated in %.0f ms", latency)
        return DraftResult(answer=answer, latency_ms=round(latency, 1))

    # ── private helpers ────────────────────────────────────────────────

    def _build_prompt(self, query: str, chunks: List[SourceChunk]) -> str:
        """Assemble the full prompt: system instructions + chunks + question."""
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            header = f"[Source {i}]"
            if chunk.source:
                header += f" (from: {chunk.source})"
            context_parts.append(f"{header}\n{chunk.text}")

        context_block = "\n\n---\n\n".join(context_parts)

        return (
            f"{SYSTEM_PROMPT}\n\n"
            f"{context_block}\n\n"
            f"---\n\n"
            f"Question: {query}\n\n"
            f"Answer:"
        )

    def _call_llm(self, prompt: str) -> str:
        """Call the configured generation model (Ollama local, or OpenAI/OpenRouter cloud)."""
        return llm_generate(
            settings=self.settings,
            model=llm_draft_model(self.settings),
            prompt=prompt,
            temperature=0.15,
            max_tokens=512,
            top_p=0.9,
            max_retries=self.settings.max_retries,
        )
