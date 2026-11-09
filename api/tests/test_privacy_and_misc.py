from __future__ import annotations

import logging

from conftest import MARCUS, NOW, plan_state
from opentelemetry import trace
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from app.config import settings

SECRET_QUERY = "zebra-umbrella-query"


def test_profile_and_query_text_never_reach_logs_or_span_attributes(client, caplog):
    exporter = InMemorySpanExporter()
    trace.get_tracer_provider().add_span_processor(SimpleSpanProcessor(exporter))
    with caplog.at_level(logging.DEBUG):
        client.post("/api/search", json={"q": f"security {SECRET_QUERY}"})
        cid = client.post("/api/changes", json={"type": "elevator_down", "target": "B"}).json()["id"]
        plan = plan_state(["talk-supply-chain"])
        client.post("/api/replan", json={"profile": MARCUS, "plan": plan, "change_id": cid})
        client.post("/api/replan", json={"profile": MARCUS, "plan": plan, "personal": {"type": "missed"}})
    spans = exporter.get_finished_spans()
    names = {s.name for s in spans}
    assert {"search", "replan", "changes.create"} <= names
    forbidden = (SECRET_QUERY, "stepFreeRouting", "step_free_routing", "screen_reader", "Security", "Observability")
    for s in spans:
        for key, value in (s.attributes or {}).items():
            assert not any(f in str(value) for f in forbidden), (s.name, key)
    assert not any(f in caplog.text for f in forbidden)


def test_no_endpoint_stores_a_profile(client, store):
    cid = client.post("/api/changes", json={"type": "elevator_down", "target": "B"}).json()["id"]
    client.post("/api/replan", json={"profile": MARCUS, "plan": plan_state(["talk-supply-chain"]), "change_id": cid})
    client.post("/api/plan", json={"profile": MARCUS, "current_location_id": "room-251", "now": NOW})
    dump = repr(store.__dict__)
    assert "stepFreeRouting" not in dump and "Observability" not in dump and "step_free_routing" not in dump


def test_search_matches_the_web_demo_search_and_only_needs_the_query(client):
    hits = client.post("/api/search", json={"q": "supply chain security"}).json()["hits"]
    assert {h["id"] for h in hits} >= {"talk-supply-chain", "talk-qa"}
    assert all(h["why"] for h in hits)
    assert client.post("/api/search", json={"q": "security", "profile": MARCUS}).status_code == 422
    assert client.post("/api/search", json={"q": "the a of"}).json()["hits"] == []


def test_session_transcript_catchup_and_questions(client):
    t = client.get("/api/sessions/talk-supply-chain/transcript").json()
    assert len(t) == 14 and t[0]["offset_sec"] == 0
    bullets = client.get("/api/sessions/talk-supply-chain/catchup", params={"at_sec": 130}).json()["bullets"]
    assert [b["offset_sec"] for b in bullets] == [80, 100, 120]
    assert client.get("/api/sessions/nope/transcript").status_code == 404

    q = client.post("/api/sessions/talk-supply-chain/questions", json={"text": " What about small teams? "}).json()
    assert q["text"] == "What about small teams?" and q["read_out_at"] is None
    assert set(q) == {"id", "talk_id", "text", "asked_at", "read_out_at"}  # no author, no device
    read = client.post(f"/api/sessions/talk-supply-chain/questions/{q['id']}/read").json()
    assert read["read_out_at"] is not None
    assert client.get("/api/sessions/talk-supply-chain/questions").json()[0]["read_out_at"]


def test_session_stream_replays_chunks_in_order(client):
    with client.stream("GET", "/api/sessions/talk-qa/stream", params={"speed": 1000}) as r:
        body = "".join(r.iter_text())
    assert body.count("event: chunk") == 4 and "event: end" in body


def test_organizer_actions_can_be_locked(client, monkeypatch):
    monkeypatch.setattr(settings, "organizer_key", "s3cret")
    body = {"type": "elevator_down", "target": "B"}
    assert client.post("/api/changes", json=body).status_code == 401
    assert client.post("/api/changes", json=body, headers={"X-Organizer-Key": "wrong"}).status_code == 401
    assert client.post("/api/changes", json=body, headers={"X-Organizer-Key": "s3cret"}).status_code == 201
    assert client.get("/api/organizer/summary").status_code == 401
    assert client.get("/api/venue").status_code == 200  # attendee reads stay open


def test_cors_allows_the_web_app_and_nothing_else(client):
    ok = client.options(
        "/api/search",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"},
    )
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:3000"
    bad = client.options(
        "/api/search",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in bad.headers
