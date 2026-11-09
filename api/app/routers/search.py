"""Search over the schedule. Only the query text arrives: needs are applied on the device afterwards, so they never
reach the server. The query itself is never stored, logged or put in a span.
"""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends

from app.data.talks import Talk
from app.deps import get_store
from app.schemas import SearchHit, SearchRequest, SearchResponse
from app.services.store import Store
from app.telemetry import span

router = APIRouter(prefix="/api", tags=["search"])

STOPWORDS = {
    "a", "an", "the", "i", "me", "my", "want", "to", "for", "of", "in", "on", "about", "and", "or", "with",
    "talk", "talks", "session", "sessions", "show", "find", "looking", "something", "some", "is", "are", "that",
}  # fmt: skip

TOPIC_WORDS = {
    "Security": ["security", "secure", "supply", "chain", "rbac", "vulnerability", "sbom", "trust"],
    "Observability": ["observability", "monitoring", "tracing", "metrics", "logs", "logging", "telemetry"],
    "AI": ["ai", "ml", "llm", "machine", "learning"],
    "Platform engineering": ["platform", "engineering", "internal", "developer"],
    "Networking": ["network", "networking", "ingress", "mesh", "cni"],
    "Beginner-friendly": [
        "beginner", "beginners", "intro", "introduction", "basics", "starter", "new", "plain", "easy",
    ],
}  # fmt: skip


def tokenize(query: str) -> list[str]:
    words = re.split(r"[\s-]+", re.sub(r"[^a-z0-9\s-]", " ", query.lower()))
    return [w for w in words if w and w not in STOPWORDS]


def has_word(text: str, token: str) -> bool:
    return re.search(rf"(^|[^a-z0-9]){re.escape(token)}", text) is not None


def score_talk(talk: Talk, tokens: list[str]) -> SearchHit | None:
    title, abstract = talk.title.lower(), talk.abstract.lower()
    score, why = 0.0, []
    for token in tokens:
        if has_word(title, token):
            score += 3
            why.append(f'Title mentions "{token}"')
        for topic in talk.topics:
            if token in TOPIC_WORDS.get(topic, []) or has_word(topic.lower(), token):
                score += 2
                why.append(f"Topic: {topic}")
        if has_word(abstract, token):
            score += 1
            why.append(f'Description mentions "{token}"')
    if score <= 0:
        return None
    return SearchHit(id=talk.id, score=score, why="; ".join(dict.fromkeys(why)))


@router.post("/search", response_model=SearchResponse)
def search(body: SearchRequest, store: Store = Depends(get_store)) -> SearchResponse:
    tokens = tokenize(body.q)
    hits = [h for t in store.talks() if (h := score_talk(t, tokens))] if tokens else []
    hits.sort(key=lambda h: (-h.score, h.id))
    with span("search", token_count=len(tokens), hit_count=len(hits)):
        return SearchResponse(hits=hits)
