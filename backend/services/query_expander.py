"""Query Expansion Service.

Expands queries with related terms/synonyms to improve retrieval recall.
Degrades gracefully to the original query on failure.
"""

from __future__ import annotations

import logging
import re
from typing import List, Set, Tuple

from backend.config import Settings
from backend.services.llm_client import generate as llm_generate

logger = logging.getLogger(__name__)

EXPANSION_PROMPT = """Expand the query with related terms/synonyms (1-3 words each).
Rules: add 3-5 terms; no repeats of query words; no unrelated terms.
Output one term per line, no numbering.

Original: {query}
Terms:
"""


def get_query_expander(settings: Settings) -> "QueryExpander":
    return QueryExpander(settings)


class QueryExpander:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._wordnet_available = self._check_wordnet()
        self.last_expansion_terms: List[str] = []

    @property
    def name(self) -> str:
        return "QueryExpander"

    def expand(
        self, query: str, max_expansions: int = 5, strategy: str = "llm"
    ) -> str:
        if not query or not query.strip():
            return query
        self.last_expansion_terms = []
        expansions: List[str] = []
        try:
            if strategy == "llm":
                expansions = self._expand_with_llm(query, max_expansions)
            elif strategy == "synonym":
                expansions = self._expand_with_synonyms(query, max_expansions)
            elif strategy == "hybrid":
                half = max(1, max_expansions // 2)
                expansions = self._expand_with_llm(query, half) + self._expand_with_synonyms(query, half)
            else:
                logger.warning("Unknown expansion strategy: %s", strategy)
                return query
            expansions = self._deduplicate_expansions(query, expansions)
            self.last_expansion_terms = expansions
            if expansions:
                return f"{query} {' '.join(expansions)}"
            return query
        except Exception as exc:
            logger.warning("Query expansion failed: %s", exc)
            return query

    def _expand_with_llm(self, query: str, max_expansions: int) -> List[str]:
        prompt = EXPANSION_PROMPT.format(query=query)
        try:
            model = self.settings.draft_model
            response = llm_generate(
                settings=self.settings,
                model=model,
                prompt=prompt,
                temperature=0.5,
                max_tokens=150,
                top_p=0.9,
            )
            expansions: List[str] = []
            for line in response.strip().split("\n"):
                line = line.strip()
                if not line:
                    continue
                if line[0].isdigit() and ". " in line:
                    line = line.split(". ", 1)[1]
                elif line.startswith("- "):
                    line = line[2:]
                if line and len(line) < 50:
                    expansions.append(line)
            return expansions[:max_expansions]
        except Exception as exc:
            logger.warning("LLM query expansion failed: %s", exc)
            return []

    def _expand_with_synonyms(self, query: str, max_expansions: int) -> List[str]:
        if not self._wordnet_available:
            return []
        try:
            import nltk
            from nltk.corpus import wordnet

            expansions: Set[str] = set()
            for word in re.findall(r"\b[a-zA-Z]{3,}\b", query.lower()):
                for syn in wordnet.synsets(word):
                    for lemma in syn.lemmas():
                        synonym = lemma.name().replace("_", " ")
                        if synonym.lower() != word.lower():
                            expansions.add(synonym)
            return list(expansions)[:max_expansions]
        except Exception:
            return []

    def _deduplicate_expansions(self, query: str, expansions: List[str]) -> List[str]:
        query_lower = query.lower()
        query_words = set(query_lower.split())
        seen: Set[str] = set()
        unique: List[str] = []
        for exp in expansions:
            exp_lower = exp.lower().strip()
            if exp_lower in query_words or exp_lower in seen or exp_lower in query_lower:
                continue
            seen.add(exp_lower)
            unique.append(exp)
        return unique

    def _check_wordnet(self) -> bool:
        try:
            import nltk

            try:
                nltk.data.find("corpora/wordnet.zip")
                return True
            except LookupError:
                return False
        except ImportError:
            return False
