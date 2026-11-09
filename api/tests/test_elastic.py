"""Elasticsearch paths, with a fake client. No cluster needed; proves fallback, privacy and mirroring."""

from __future__ import annotations

import pytest

from app.data.talks import TALKS
from app.es import client as es_client
from app.es.ingest import talk_doc
from tests.conftest import *  # noqa: F403 - fixtures


class FakeES:
    def __init__(self, fail: bool = False):
        self.fail, self.indexed, self.queries = fail, [], []

    def search(self, **kw):
        self.queries.append(kw)
        if self.fail:
            raise ConnectionError("down")
        return {
            "hits": {
                "hits": [
                    {"_score": 1.5, "_source": {"id": "talk-observability"}},
                    {"_score": 1.0, "_source": {"id": "nope"}},
                ]
            }
        }

    def index(self, **kw):
        if self.fail:
            raise ConnectionError("down")
        self.indexed.append(kw)


@pytest.fixture
def fake(monkeypatch):
    f = FakeES()
    monkeypatch.setattr(es_client, "client", lambda: f)
    return f


def test_search_uses_elasticsearch_and_drops_unknown_ids(client, fake):
    r = client.post("/api/search", json={"q": "beginner telemetry"}).json()
    assert r["backend"] == "elasticsearch"
    assert [h["id"] for h in r["hits"]] == ["talk-observability"]
    assert "rrf" in fake.queries[0]["retriever"]


def test_search_falls_back_to_local_when_elasticsearch_fails(client, monkeypatch):
    monkeypatch.setattr(es_client, "client", lambda: FakeES(fail=True))
    r = client.post("/api/search", json={"q": "observability"}).json()
    assert r["backend"] == "local" and r["hits"]


def test_reports_are_mirrored_with_no_profile(client, fake):
    client.post(
        "/api/reports",
        json={"problem": "elevator_not_working", "location_id": "elev-b-2", "device_token": "token-0001"},
    )
    assert fake.indexed and fake.indexed[0]["index"] == "reports"
    assert set(fake.indexed[0]["document"]) == {"problem", "location_id", "device_token", "created_at"}


def test_mirror_failure_never_breaks_the_request(client, monkeypatch):
    monkeypatch.setattr(es_client, "client", lambda: FakeES(fail=True))
    r = client.post(
        "/api/reports",
        json={"problem": "elevator_not_working", "location_id": "elev-b-2", "device_token": "token-0002"},
    )
    assert r.status_code == 201


def test_talk_docs_hold_no_person_fields():
    doc = talk_doc(TALKS[0])
    assert "speaker" not in doc and "profile" not in doc
    assert len(TALKS) >= 30
