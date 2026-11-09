"""Load the public programme and venue into Elasticsearch. Idempotent: documents are keyed by id."""

from __future__ import annotations

from dataclasses import asdict

from app.data.talks import TALKS
from app.data.venue import NODES
from app.es import client as es_client


def talk_doc(t) -> dict:  # noqa: ANN001
    return {
        "id": t.id, "title": t.title, "abstract": t.abstract, "topics": list(t.topics), "room_id": t.room_id,
        "floor": t.floor, "start": t.start.isoformat(), "end": t.end.isoformat(),
        "access": asdict(t.access), "backup_talk_ids": list(t.backup_talk_ids),
    }  # fmt: skip


def ingest(reset: bool = False) -> dict[str, int]:
    from elasticsearch.helpers import bulk

    es = es_client.client()
    es_client.ensure_indices(reset=reset)
    actions = [{"_index": es_client.TALKS, "_id": t.id, "_source": talk_doc(t)} for t in TALKS]
    actions += [
        {
            "_index": es_client.VENUE,
            "_id": n.id,
            "_source": {"id": n.id, "kind": n.kind, "label": n.label, "floor": n.floor},
        }
        for n in NODES
    ]
    # Embeddings are generated while indexing, so the first load can take a while.
    ok, _ = bulk(es.options(request_timeout=180), actions, chunk_size=10)
    return {"talks": len(TALKS), "venue": len(NODES), "indexed": ok}
