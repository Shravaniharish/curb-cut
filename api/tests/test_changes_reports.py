from __future__ import annotations

import asyncio
from datetime import timedelta

from conftest import MARCUS

from app.schemas import AckIn, ChangeCreate


def test_a_change_reaches_every_subscriber_exactly_once(store):
    first, second = store.subscribe(), store.subscribe()
    change = store.apply_change(ChangeCreate(type="elevator_down", target="B"))
    for q in (first, second):
        assert q.qsize() == 1
        assert asyncio.run(q.get()).id == change.id
        assert q.empty()


def test_a_stuck_client_is_dropped_without_stalling_the_others(store):
    healthy = store.subscribe()
    stuck = store.subscribe()
    for _ in range(stuck.maxsize):
        stuck.put_nowait(None)  # type: ignore[arg-type]
    store.apply_change(ChangeCreate(type="elevator_down", target="A"))
    assert stuck not in store.subscribers
    assert healthy.qsize() == 1


def test_announcements_are_validated(client):
    assert client.post("/api/changes", json={"type": "elevator_down", "target": "Z"}).status_code == 422
    assert client.post("/api/changes", json={"type": "room_full", "target": "nope"}).status_code == 422
    assert client.post("/api/changes", json={"type": "talk_moved", "target": "talk-qa"}).status_code == 422
    assert client.post("/api/changes", json={"type": "path_blocked", "target": "path-floor-9"}).status_code == 422


def test_fixing_restores_the_venue_and_is_announced(client, store):
    cid = client.post("/api/changes", json={"type": "elevator_down", "target": "C"}).json()["id"]
    assert store.elevators["C"] == "out_of_service"
    client.post(f"/api/changes/{cid}/fix")
    assert store.elevators["C"] == "working"
    assert [c["type"] for c in client.get("/api/changes").json()] == ["elevator_down", "elevator_fixed"]


def test_ack_keeps_two_numbers_and_nothing_else(client, store):
    cid = client.post("/api/changes", json={"type": "elevator_down", "target": "B"}).json()["id"]
    assert client.post(f"/api/changes/{cid}/ack", json={"affected": True, "replan_ms": 840}).status_code == 204
    assert set(AckIn.model_fields) == {"affected", "replan_ms"}
    assert store.acks[0].model_dump() == {"affected": True, "replan_ms": 840}
    # Anything that could identify someone is refused outright.
    for extra in ({"device_token": "abcdefgh"}, {"profile": MARCUS}, {"user": "x"}):
        r = client.post(f"/api/changes/{cid}/ack", json={"affected": True, "replan_ms": 1, **extra})
        assert r.status_code == 422
    assert len(store.acks) == 1


def test_organizer_summary_counts_acks_without_naming_anyone(client):
    cid = client.post("/api/changes", json={"type": "elevator_down", "target": "B"}).json()["id"]
    for ms in (400, 900, 600):
        client.post(f"/api/changes/{cid}/ack", json={"affected": True, "replan_ms": ms})
    client.post(f"/api/changes/{cid}/ack", json={"affected": False, "replan_ms": 100})
    s = client.get("/api/organizer/summary").json()
    assert s["acks"] == {"received": 4, "affected": 3, "replanned": 3, "median_replan_ms": 600, "max_replan_ms": 900}
    assert s["venue"]["elevators"]["B"] == "out_of_service"
    assert {g["id"] for g in s["gaps"]} == {
        "no_captions", "slides_not_verified", "room_not_step_free", "interpreter_not_step_free",
    }  # fmt: skip


def report(client, device, problem="elevator_not_working", loc="elevator-B"):
    return client.post("/api/reports", json={"problem": problem, "location_id": loc, "device_token": device}).json()


def test_two_matching_reports_from_different_devices_mark_the_elevator_down(client, store):
    first = report(client, "device-aaaa1111")
    assert first["confirmed"] is False and store.elevators["B"] == "working"
    second = report(client, "device-bbbb2222")
    assert second["confirmed"] is True and second["change_id"]
    assert store.elevators["B"] == "out_of_service"
    assert [c.type for c in store.changes] == ["elevator_down"]
    # A third report does not announce the same change again.
    report(client, "device-cccc3333")
    assert len(store.changes) == 1


def test_the_same_device_twice_is_not_a_confirmation(client, store):
    report(client, "device-aaaa1111")
    again = report(client, "device-aaaa1111")
    assert again["confirmed"] is False and not store.changes


def test_reports_more_than_ten_minutes_apart_do_not_confirm(client, store, clock):
    report(client, "device-aaaa1111")
    clock.now += timedelta(minutes=11)
    assert report(client, "device-bbbb2222")["confirmed"] is False
    clock.now += timedelta(minutes=5)
    assert report(client, "device-cccc3333")["confirmed"] is True


def test_a_confirmed_loud_room_is_shown_to_staff_but_does_not_reroute_anyone(client, store):
    report(client, "device-aaaa1111", "too_loud", "room-355")
    result = report(client, "device-bbbb2222", "too_loud", "room-355")
    assert result["confirmed"] is True and result["change_id"] is None and not store.changes
    summary = client.get("/api/organizer/summary").json()["reports"][0]
    assert summary["problem"] == "too_loud" and summary["devices"] == 2 and summary["confirmed"] is True


def test_a_confirmed_blocked_floor_path_reroutes(client, store):
    report(client, "device-aaaa1111", "path_blocked", "path-floor-3")
    report(client, "device-bbbb2222", "path_blocked", "path-floor-3")
    assert store.blocked_floors == {3}


def test_report_shape_has_no_room_for_a_name_or_needs(client):
    bad = {"problem": "too_loud", "location_id": "room-355", "device_token": "device-aaaa1111"}
    assert client.post("/api/reports", json={**bad, "name": "Sam"}).status_code == 422
    assert client.post("/api/reports", json={**bad, "profile": MARCUS}).status_code == 422
    assert client.post("/api/reports", json={**bad, "device_token": "has spaces!"}).status_code == 422
