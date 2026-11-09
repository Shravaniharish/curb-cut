"""Hybrid talk search: keyword (BM25) + Jina semantic_text, fused with reciprocal rank fusion."""

from __future__ import annotations

from app.es import client as es_client
from app.schemas import SearchHit


def hybrid_search(q: str, size: int = 20) -> list[SearchHit] | None:
    """Returns hits, or None when Elasticsearch is off or fails (the caller then uses the local search)."""
    es = es_client.client()
    if es is None:
        return None
    try:
        res = es.search(
            index=es_client.TALKS,
            size=size,
            source_includes=["id"],
            retriever={
                "rrf": {
                    "retrievers": [
                        {
                            "standard": {
                                "query": {"multi_match": {"query": q, "fields": ["title^3", "topics^2", "abstract"]}}
                            }
                        },
                        {"standard": {"query": {"semantic": {"field": "semantic", "query": q}}}},
                    ],
                    "rank_window_size": 50,
                }
            },
        )
    except Exception as exc:  # noqa: BLE001
        es_client.log.warning("elasticsearch search failed: %s", type(exc).__name__)
        return None
    return [
        SearchHit(id=h["_source"]["id"], score=float(h.get("_score") or 0), why="Meaning and keyword match")
        for h in res["hits"]["hits"]
    ]
