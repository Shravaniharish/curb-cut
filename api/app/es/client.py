"""Elasticsearch Serverless access. Off unless ``ES_URL`` and ``ES_API_KEY`` are set, so local runs and tests need
no cluster. Only *public* documents go in (talks, venue, reports, changes). Never a profile, never a query text.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any

from app.config import settings

log = logging.getLogger("curb-cut.es")

TALKS, VENUE, REPORTS, CHANGES, QUESTIONS, TRANSCRIPTS = (
    "talks", "venue", "reports", "changes", "questions", "transcript_chunks",
)  # fmt: skip


def enabled() -> bool:
    return bool(settings.es_url and settings.es_api_key)


@lru_cache(maxsize=1)
def client() -> Any | None:
    if not enabled():
        return None
    from elasticsearch import Elasticsearch

    return Elasticsearch(settings.es_url, api_key=settings.es_api_key, request_timeout=10, max_retries=1)


def _semantic() -> dict[str, Any]:
    field: dict[str, Any] = {"type": "semantic_text"}
    if settings.es_inference_id:
        field["inference_id"] = settings.es_inference_id
    return field


MAPPINGS: dict[str, dict[str, Any]] = {
    TALKS: {
        "id": {"type": "keyword"},
        "title": {"type": "text", "copy_to": "semantic"},
        "abstract": {"type": "text", "copy_to": "semantic"},
        "topics": {"type": "keyword", "copy_to": "semantic"},
        "semantic": _semantic(),
        "room_id": {"type": "keyword"},
        "floor": {"type": "integer"},
        "start": {"type": "date"},
        "end": {"type": "date"},
        "access": {"type": "object", "enabled": True},
        "backup_talk_ids": {"type": "keyword"},
    },
    VENUE: {
        "id": {"type": "keyword"},
        "kind": {"type": "keyword"},
        "label": {"type": "text"},
        "floor": {"type": "integer"},
    },
    REPORTS: {
        "problem": {"type": "keyword"},
        "location_id": {"type": "keyword"},
        "device_token": {"type": "keyword", "index": False},
        "created_at": {"type": "date"},
    },
    CHANGES: {
        "type": {"type": "keyword"},
        "target": {"type": "keyword"},
        "details": {"type": "object", "enabled": False},
        "created_at": {"type": "date"},
        "fixed_at": {"type": "date"},
    },
    QUESTIONS: {"talk_id": {"type": "keyword"}, "text": {"type": "text"}, "asked_at": {"type": "date"}},
    TRANSCRIPTS: {"talk_id": {"type": "keyword"}, "at_second": {"type": "integer"}, "text": {"type": "text"}},
}


def ensure_indices(reset: bool = False) -> None:
    es = client()
    if es is None:
        raise RuntimeError("Set ES_URL and ES_API_KEY first.")
    for name, props in MAPPINGS.items():
        if reset and es.indices.exists(index=name):
            es.indices.delete(index=name)
        if not es.indices.exists(index=name):
            es.indices.create(index=name, mappings={"properties": props})


def mirror(index: str, doc_id: str, doc: dict[str, Any]) -> None:
    """Best effort copy of a public event. A failure is logged without the document and never reaches the caller."""
    es = client()
    if es is None:
        return
    try:
        es.index(index=index, id=doc_id, document=doc)
    except Exception as exc:  # noqa: BLE001 - mirroring must never break a request
        log.warning("elasticsearch mirror to %s failed: %s", index, type(exc).__name__)
