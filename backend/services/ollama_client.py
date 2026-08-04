"""
Ollama Client — zero-cost, fully local LLM + embedding calls.

Replaces the Google Gemini API with Ollama (http://localhost:11434)
so the entire pipeline runs offline with no API keys, no rate limits,
and full privacy.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = "http://localhost:11434"

# ── Embedding helpers ──────────────────────────────────────────────────

def embed_texts(model: str, texts: List[str], base_url: str = OLLAMA_BASE_URL) -> List[List[float]]:
    """
    Embed a list of strings via Ollama's embedding API.

    Ollama's ``/api/embed`` returns ``{"embeddings": [[...], [...]]}``
    — a 2D array.  We extract and return that directly.

    Returns a list of vectors (each vector is a list of floats).
    """
    for attempt in range(3):
        try:
            resp = httpx.post(
                f"{base_url}/api/embed",
                json={"model": model, "input": texts},
                timeout=60.0,
            )
            resp.raise_for_status()
            data = resp.json()
            embeddings = data.get("embeddings")
            if embeddings is None or not isinstance(embeddings, list):
                raise ValueError(
                    f"Expected 'embeddings' list in response, got: {type(embeddings)}"
                )
            return embeddings
        except Exception as exc:
            logger.warning(
                "Ollama embed attempt %d/3 failed: %s",
                attempt + 1, exc,
            )
            if attempt < 2:
                time.sleep(1.5 * (attempt + 1))
            else:
                raise
    return []


def embed_text(model: str, text: str, base_url: str = OLLAMA_BASE_URL) -> List[float]:
    """Embed a single string — convenience wrapper around embed_texts."""
    results = embed_texts(model, [text], base_url)
    return results[0] if results else []


# ── LLM generation helpers ─────────────────────────────────────────────

def generate(
    model: str,
    prompt: str,
    *,
    system_prompt: Optional[str] = None,
    temperature: float = 0.0,
    max_tokens: int = 1024,
    top_p: float = 0.95,
    base_url: str = OLLAMA_BASE_URL,
    max_retries: int = 3,
) -> str:
    """
    Call an Ollama generation model and return the response text.

    Args:
        model: Ollama model name (e.g. "llama3.2:3b").
        prompt: The full user/generation prompt.
        system_prompt: Optional system-level instruction.
        temperature: Sampling temperature (0.0 = deterministic).
        max_tokens: Maximum output tokens.
        top_p: Nucleus sampling parameter.
        base_url: Ollama server URL.
        max_retries: Number of retries on failure.

    Returns:
        The generated text (stripped).
    """
    payload: Dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
            "top_p": top_p,
        },
    }
    if system_prompt:
        payload["system"] = system_prompt

    for attempt in range(max_retries):
        try:
            resp = httpx.post(
                f"{base_url}/api/generate",
                json=payload,
                timeout=120.0,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "").strip()
        except Exception as exc:
            logger.warning(
                "Ollama generate attempt %d/%d failed: %s",
                attempt + 1, max_retries, exc,
            )
            if attempt < max_retries - 1:
                time.sleep(1.5 * (attempt + 1))
            else:
                raise


def chat(
    model: str,
    messages: List[Dict[str, str]],
    *,
    temperature: float = 0.0,
    max_tokens: int = 1024,
    top_p: float = 0.95,
    base_url: str = OLLAMA_BASE_URL,
    max_retries: int = 3,
) -> str:
    """
    Call an Ollama chat model and return the assistant's response text.

    Args:
        model: Ollama model name.
        messages: List of dicts with "role" ("user"/"assistant"/"system")
                  and "content".
        temperature: Sampling temperature.
        max_tokens: Maximum output tokens.
        top_p: Nucleus sampling parameter.
        base_url: Ollama server URL.
        max_retries: Number of retries on failure.

    Returns:
        The assistant's response text (stripped).
    """
    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
            "top_p": top_p,
        },
    }

    for attempt in range(max_retries):
        try:
            resp = httpx.post(
                f"{base_url}/api/chat",
                json=payload,
                timeout=120.0,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("message", {}).get("content", "").strip()
        except Exception as exc:
            logger.warning(
                "Ollama chat attempt %d/%d failed: %s",
                attempt + 1, max_retries, exc,
            )
            if attempt < max_retries - 1:
                time.sleep(1.5 * (attempt + 1))
            else:
                raise


# ── Health / discovery ─────────────────────────────────────────────────

def health_check(base_url: str = OLLAMA_BASE_URL) -> bool:
    """Return True if Ollama is reachable."""
    try:
        resp = httpx.get(f"{base_url}/api/tags", timeout=3.0)
        return resp.status_code == 200
    except Exception:
        return False


def model_available(model: str, base_url: str = OLLAMA_BASE_URL) -> bool:
    """Check if a specific model is pulled and ready."""
    try:
        resp = httpx.get(f"{base_url}/api/tags", timeout=3.0)
        if resp.status_code != 200:
            return False
        models = resp.json().get("models", [])
        return any(m.get("name", "").startswith(model) for m in models)
    except Exception:
        return False
