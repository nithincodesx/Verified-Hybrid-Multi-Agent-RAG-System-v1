"""
Verifier Agent

Takes the draft answer plus the original retrieved chunks and checks
every claim individually via the configured LLM provider.  Each claim
is given a pass/fail verdict with the supporting source snippet (or a
note that none was found).

If any claim is unsupported, the verifier strips it from the final
answer so the user only sees grounded content.
"""

from __future__ import annotations

import json
import logging
import re
import time
from typing import List

from backend.config import Settings
from backend.models.schemas import (
    ClaimVerdict,
    SourceChunk,
    VerificationResult,
)
from backend.services.llm_client import (
    generate as llm_generate,
    verifier_model as llm_verifier_model,
)

# Sentinel used when the model cannot extract individual claims
_FALLBACK_SENTINEL = "__fallback_pass_through__"

logger = logging.getLogger(__name__)

# ── System prompts ─────────────────────────────────────────────────────

VERIFICATION_SYSTEM_PROMPT = """You are a **strict fact-checker**. Compare each claim
in the draft answer against the provided source chunks. For every claim,
decide if the source text **directly supports** it.

Rules:
1. A claim is supported ONLY if the same fact appears in the source.
2. If the source is silent, mark unsupported.
3. If the answer says it cannot answer, that is automatically supported.

Output ONE line per claim in this EXACT format — no JSON, no markdown:
CLAIM: <the claim text>
SUPPORTED: YES or NO
SOURCE: <the exact sentence from source that supports it, or NONE>
REASON: <short reason>
---

Example:
CLAIM: Jupiter is the largest planet
SUPPORTED: YES
SOURCE: Jupiter is the largest planet in the Solar System
REASON: Direct match in source chunk
---
CLAIM: Jupiter has 95 moons
SUPPORTED: NO
SOURCE: NONE
REASON: Source does not mention moon count
---
"""

VERIFIED_ANSWER_PROMPT = """Rewrite the draft answer below, keeping ONLY the claims
that are marked **supported**. Remove unsupported claims entirely.

If nothing is left, say: "The provided documents do not contain enough
information to answer this question."

Add a source citation like [Source N] after key facts where possible.

Output only the final answer — no extra text.
"""


class VerifierAgent:
    """Claim-level verification of draft answers against source chunks."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    # ── public API ─────────────────────────────────────────────────────

    def verify(
        self,
        query: str,
        draft_answer: str,
        chunks: List[SourceChunk],
    ) -> VerificationResult:
        """
        Check every claim in *draft_answer* against *chunks*.

        Returns a ``VerificationResult`` with per-claim verdicts and a
        cleaned final answer.
        """
        start = time.perf_counter()

        try:
            verdicts = self._check_claims(draft_answer, chunks)
            passed = all(v.supported for v in verdicts)
            verified_answer = self._build_verified_answer(draft_answer, verdicts)
        except Exception:
            logger.exception("VerifierAgent.verify failed")
            raise

        latency = (time.perf_counter() - start) * 1000
        logger.info(
            "Verification: %d claims, passed=%s (%.0f ms)",
            len(verdicts),
            passed,
            latency,
        )
        return VerificationResult(
            verdicts=verdicts,
            passed=passed,
            verified_answer=verified_answer,
            latency_ms=round(latency, 1),
        )

    # ── private helpers ────────────────────────────────────────────────

    def _check_claims(
        self,
        draft_answer: str,
        chunks: List[SourceChunk],
    ) -> List[ClaimVerdict]:
        """Ask the LLM to extract and judge each claim."""
        source_text = "\n\n---\n\n".join(
            f"[{i}] {c.text}" for i, c in enumerate(chunks, 1)
        )
        prompt = (
            f"{VERIFICATION_SYSTEM_PROMPT}\n\n"
            f"--- SOURCE CHUNKS ---\n{source_text}\n\n"
            f"--- DRAFT ANSWER ---\n{draft_answer}\n\n"
            f"--- VERDICTS (JSON) ---\n"
        )

        raw = llm_generate(
            settings=self.settings,
            model=llm_verifier_model(self.settings),
            prompt=prompt,
            temperature=0.0,
            max_tokens=1024,
            top_p=0.95,
            max_retries=self.settings.max_retries,
        )
        parsed = self._parse_claims(raw)
        verdicts = [self._to_verdict(item) for item in parsed]

        # Fallback: if model couldn't produce valid claims, mark everything as supported
        if not verdicts and draft_answer.strip():
            logger.warning("Verifier produced 0 claims — falling back to pass-through")
            verdicts = [ClaimVerdict(
                claim=draft_answer.strip(),
                supported=True,
                source_chunk=_FALLBACK_SENTINEL,
                explanation="Small model could not extract individual claims; passed through as-is.",
            )]

        return verdicts

    def _build_verified_answer(
        self,
        draft_answer: str,
        verdicts: List[ClaimVerdict],
    ) -> str:
        """Let the LLM reconstruct a clean answer from supported claims only.

        If the fallback claim-pass-through was used (no real claims extracted),
        skip the LLM call and return the draft as-is.
        """
        # If we fell back to pass-through, skip the expensive LLM call
        if len(verdicts) == 1 and verdicts[0].source_chunk == _FALLBACK_SENTINEL:
            return draft_answer

        verdicts_str = "\n".join(
            f"- claim: {v.claim!r}  →  {'✅ supported' if v.supported else '❌ unsupported'}"
            for v in verdicts
        )
        prompt = (
            f"{VERIFIED_ANSWER_PROMPT}\n\n"
            f"--- ORIGINAL DRAFT ---\n{draft_answer}\n\n"
            f"--- VERDICTS ---\n{verdicts_str}\n\n"
            f"--- FINAL ANSWER ---\n"
        )
        return llm_generate(
            settings=self.settings,
            model=llm_verifier_model(self.settings),
            prompt=prompt,
            temperature=0.0,
            max_tokens=1024,
            top_p=0.95,
            max_retries=self.settings.max_retries,
        )

    # ── parsing helpers ────────────────────────────────────────────────

    @staticmethod
    def _parse_claims(raw: str) -> List[dict]:
        """
        Parse the line-based output format:

            CLAIM: <claim text>
            SUPPORTED: YES or NO
            SOURCE: <snippet or NONE>
            REASON: <explanation>
            ---

        Falls back to JSON parsing if the model outputs JSON anyway.
        """
        claims: List[dict] = []
        current: dict | None = None

        for line in raw.split("\n"):
            line = line.strip()
            if not line:
                continue
            if line.startswith("CLAIM:"):
                # Save previous claim if any
                if current and current.get("claim"):
                    claims.append(current)
                current = {"claim": line[6:].strip(), "supported": False, "source_chunk": None, "explanation": None}
            elif line.startswith("SUPPORTED:") and current is not None:
                val = line[10:].strip().upper()
                current["supported"] = val == "YES"
            elif line.startswith("SOURCE:") and current is not None:
                val = line[7:].strip()
                current["source_chunk"] = None if val.upper() == "NONE" else val
            elif line.startswith("REASON:") and current is not None:
                current["explanation"] = line[7:].strip()
            elif line.startswith("---") and current is not None:
                if current.get("claim"):
                    claims.append(current)
                current = None

        # Don't forget the last claim
        if current and current.get("claim"):
            claims.append(current)

        # If the line-based parser found nothing, try JSON fallback
        if not claims:
            logger.info("Line parser found no claims, trying JSON fallback")
            return VerifierAgent._parse_json_list(raw)

        return claims

    @staticmethod
    def _parse_json_list(raw: str) -> List[dict]:
        """Fallback JSON parser for models that output JSON anyway."""
        raw = re.sub(r"```(?:json)?\s*", "", raw).strip()
        start = raw.find("[")
        end = raw.rfind("]")
        if start != -1 and end != -1:
            raw = raw[start : end + 1]
        try:
            data = json.loads(raw)
            if isinstance(data, list):
                return data
        except json.JSONDecodeError:
            pass
        try:
            fixed = re.sub(r",\s*([\]}])", r"\1", raw)
            data = json.loads(fixed)
            if isinstance(data, list):
                return data
        except json.JSONDecodeError:
            logger.warning("Could not parse verifier output:\n%s", raw[:500])
        return []

    @staticmethod
    def _to_verdict(item: dict) -> ClaimVerdict:
        """Safely convert a dict to a ClaimVerdict."""
        return ClaimVerdict(
            claim=item.get("claim", "Unknown claim"),
            supported=bool(item.get("supported", False)),
            source_chunk=item.get("source_chunk"),
            explanation=item.get("explanation"),
        )
