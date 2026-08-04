"""
Unified LLM client — routes generation + embeddings to the configured
provider (OpenAI, OpenRouter, or local Ollama).

- ``chat`` / ``generate`` → OpenAI-compatible ``/chat/completions`` for
  OpenAI & OpenRouter; Ollama ``/api/chat`` otherwise.
- ``embed_texts`` / ``embed_text`` → OpenAI ``/embeddings`` (provider
  "openai") or Ollama ``/api/embed`` ("ollama" and "openrouter" —
  OpenRouter has no embedding API, so local Ollama is used instead).
- ``health_check`` → provider-aware reachability probe.
"""

from __future__ import annotations

import logging
import time
from typing import Dict, List, Optional

import httpx

from backend.config import Settings
from backend.services import local_embedder, ollama_client

logger = logging.getLogger(__name__)

_OPENROUTER_EXTRA_HEADERS = {
    "HTTP-Referer": "https://freebuff.app",
    "X-Title": "Verified RAG",
}


# ── Generation helpers ─────────────────────────────────────────────────

def draft_model(settings: Settings) -> str:
    """Model used for the draft stage, per active provider."""
    if settings.provider == "openai":
        return settings.openai_model
    if settings.provider == "openrouter":
        return settings.openrouter_model
    return settings.draft_model


def verifier_model(settings: Settings) -> str:
    """Model used for the verification stage, per active provider."""
    if settings.provider == "openai":
        return settings.openai_model
    if settings.provider == "openrouter":
        return settings.openrouter_model
    return settings.verifier_model


def _api_key(settings: Settings) -> str:
    if settings.provider == "openai":
        return settings.openai_api_key
    return settings.openrouter_api_key


def _api_base(settings: Settings) -> str:
    if settings.provider == "openai":
        return settings.openai_base_url.rstrip("/")
    return settings.openrouter_base_url.rstrip("/")


def _request_headers(settings: Settings) -> dict:
    headers = {
        "Authorization": f"Bearer {_api_key(settings)}",
        "Content-Type": "application/json",
    }
    if settings.provider == "openrouter":
        headers.update(_OPENROUTER_EXTRA_HEADERS)
    return headers


def chat(
    settings: Settings,
    model: str,
    messages: List[Dict[str, str]],
    *,
    temperature: float = 0.0,
    max_tokens: int = 1024,
    top_p: float = 0.95,
    max_retries: Optional[int] = None,
) -> str:
    """
    Call the active provider's chat endpoint and return the assistant text.

    Routes to Ollama's ``/api/chat`` for local models, or to an
    OpenAI-compatible ``/chat/completions`` endpoint for OpenAI and
    OpenRouter.
    """
    if settings.provider == "ollama":
        return ollama_client.chat(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            base_url=settings.ollama_base_url,
            max_retries=max_retries or settings.max_retries,
        )

    # ── OpenAI / OpenRouter (OpenAI-compatible) ─────────────────────
    api_key = _api_key(settings)
    if not api_key:
        raise RuntimeError(
            f"Provider '{settings.provider}' has no API key configured. "
            "Add your key in the ⚙ settings panel (top-right)."
        )

    # Reasoning-class models (o1/o3…, incl. OpenRouter prefixes like
    # "openai/o1-preview") reject temperature/top_p and use
    # max_completion_tokens instead of max_tokens.
    reasoning = model.lower().split("/")[-1].startswith(("o1", "o3"))
    payload = {"model": model, "messages": messages, "stream": False}
    if reasoning:
        payload["max_completion_tokens"] = max_tokens
    else:
        payload.update(
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
        )

    retries = max_retries or settings.max_retries
    for attempt in range(retries):
        try:
            resp = httpx.post(
                f"{_api_base(settings)}/chat/completions",
                headers=_request_headers(settings),
                json=payload,
                timeout=120.0,
            )
            if resp.status_code == 401:
                raise RuntimeError(
                    f"{settings.provider}: invalid API key (HTTP 401). "
                    "Check the key in the ⚙ settings panel."
                )
            resp.raise_for_status()
            data = resp.json()
            content = (data["choices"][0]["message"].get("content") or "").strip()
            return content
        except RuntimeError:
            raise  # config / auth errors — don't retry
        except Exception as exc:
            logger.warning(
                "%s chat attempt %d/%d failed: %s",
                settings.provider, attempt + 1, retries, exc,
            )
            if attempt < retries - 1:
                time.sleep(1.5 * (attempt + 1))
            else:
                raise
    return ""


def generate(
    settings: Settings,
    model: str,
    prompt: str,
    *,
    system_prompt: Optional[str] = None,
    temperature: float = 0.0,
    max_tokens: int = 1024,
    top_p: float = 0.95,
    max_retries: Optional[int] = None,
) -> str:
    """Single-prompt convenience wrapper around :func:`chat`."""
    messages: List[Dict[str, str]] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    return chat(
        settings, model, messages,
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
        max_retries=max_retries,
    )


# ── Embedding helpers ──────────────────────────────────────────────────

def embed_texts(settings: Settings, texts: List[str]) -> List[List[float]]:
    """
    Embed a list of strings via the active provider.

    OpenAI → ``/embeddings`` (``text-embedding-3-small``).
    Ollama / OpenRouter → local Ollama ``/api/embed`` (OpenRouter has no
    embedding API, so local embeddings are used while answers come from
    the cloud).
    """
    # ── Fallback chain so ingestion/retrieval ALWAYS work: ──────────────
    #   1. OpenAI embeddings (works for the "openai" provider and for
    #      "openrouter" mode when an OpenAI key is also saved)
    #   2. Local Ollama (/api/embed) when it is reachable
    #   3. Built-in offline feature-hashing embedder (no key, no server)
    #
    # NOTE: switching the embed source between uploads of the same
    # collection can degrade retrieval quality (or change dimensions).
    if settings.openai_api_key:
        logger.info("Embedding via OpenAI (%s)", settings.openai_embed_model)
        return _openai_embed_texts(settings, texts)
    if ollama_client.health_check(settings.ollama_base_url):
        logger.info("Embedding via local Ollama (%s)", settings.embedding_model)
        return ollama_client.embed_texts(
            model=settings.embedding_model,
            texts=texts,
            base_url=settings.ollama_base_url,
        )
    logger.warning(
        "No OpenAI key and Ollama unreachable at %s — using LOCAL FALLBACK "
        "embeddings (lower retrieval quality). Start `ollama serve` or add an "
        "OpenAI key for better results.",
        settings.ollama_base_url,
    )
    return local_embedder.embed_texts(texts)


def embed_text(settings: Settings, text: str) -> List[float]:
    """Embed a single string — convenience wrapper around ``embed_texts``."""
    results = embed_texts(settings, [text])
    return results[0] if results else []


def _openai_embed_texts(settings: Settings, texts: List[str]) -> List[List[float]]:
    api_key = settings.openai_api_key
    if not api_key:
        raise RuntimeError(
            "OpenAI provider has no API key configured. "
            "Add your key in the ⚙ settings panel (top-right)."
        )
    model = settings.openai_embed_model
    payload = {"model": model, "input": texts}
    for attempt in range(settings.max_retries):
        try:
            resp = httpx.post(
                f"{settings.openai_base_url.rstrip('/')}/embeddings",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=60.0,
            )
            if resp.status_code == 401:
                raise RuntimeError(
                    "OpenAI: invalid API key (HTTP 401). Check the key in the ⚙ settings panel."
                )
            resp.raise_for_status()
            data = resp.json()
            items = sorted(data.get("data", []), key=lambda x: x.get("index", 0))
            return [item["embedding"] for item in items]
        except RuntimeError:
            raise
        except Exception as exc:
            logger.warning(
                "OpenAI embed attempt %d/%d failed: %s",
                attempt + 1, settings.max_retries, exc,
            )
            if attempt < settings.max_retries - 1:
                time.sleep(1.5 * (attempt + 1))
            else:
                raise
    return []


# ── Health / discovery ─────────────────────────────────────────────────

def health_check(settings: Settings) -> bool:
    """Return True if the active provider is reachable."""
    if settings.provider == "ollama":
        return ollama_client.health_check(settings.ollama_base_url)
    api_key = _api_key(settings)
    if not api_key:
        return False
    try:
        resp = httpx.get(
            f"{_api_base(settings)}/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=5.0,
        )
        return resp.status_code == 200
    except Exception:
        return False
