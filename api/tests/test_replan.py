from __future__ import annotations

import random

import pytest
from conftest import MARCUS, NOW, PRIYA, SAM, plan_state

from app.data.talks import TALK_BY_ID
from app.planner.agenda import check_requirements
from app.schemas import Profile

PLAN = ["talk-supply-chain", "talk-observability"]


def announce(client, type_="elevator_down", target="B", **details):
    r = client.post("/api/changes", json={"type": type_, "target": target, "details": details})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def replan(client, profile, change_id=None, personal=None, plan=None, now=NOW, location="room-251"):
    body = {"profile": profile, "plan": plan or plan_state(PLAN, location, now)}
    if change_id:
        body["change_id"] = change_id
    if personal:
        body["personal"] = personal
    return client.post("/api/replan", json=body)


def test_elevator_b_down_gives_marcus_the_new_route_in_three_parts(client):
    cid = announce(client)
    data = replan(client, MARCUS, cid).json()
    assert data["affected"] is True
    a = data["alert"]
    assert a["what_changed"] == "Elevator B is not working."
    assert a["what_stays"] == "Your talk is still at 2:00 PM in Room 355."
    assert a["do_now"] == "Use Elevator C. Leave by 1:48 PM. 6 minutes, step-free."
    assert a["destination_room_id"] == "room-355"
    assert a["leave_by"].startswith("2026-11-09T13:48")  # 1:48 PM, conference time
    assert data["plan"] == PLAN


def test_a_change_that_does_not_touch_the_plan_is_not_an_alert(client):
    cid = announce(client, target="B")
    # Standing in Room 251 with only the Room 251 talk left: no elevator is needed.
    data = replan(client, MARCUS, cid, plan=plan_state(["talk-observability"], now="2026-11-09T21:50:00Z")).json()
    assert data == {"affected": False, "alert": None, "plan": ["talk-observability"], "options": []}


def test_elevator_fixed_tells_marcus_he_can_use_it_again(client):
    cid = announce(client)
    fixed = client.post(f"/api/changes/{cid}/fix").json()
    assert fixed["fixed_at"] is not None
    follow_up = client.get("/api/changes").json()[-1]
    assert follow_up["type"] == "elevator_fixed"
    data = replan(client, MARCUS, follow_up["id"]).json()
    assert data["alert"]["what_changed"] == "Elevator B is working again."
    assert "You can use Elevator B again." in data["alert"]["do_now"]


def test_no_route_left_is_said_plainly_and_never_invented(client):
    for e in "ABC":
        announce(client, target=e)
    cid = announce(client, "elevator_down", "C")  # C is already down: still a valid announcement
    a = replan(client, MARCUS, cid).json()["alert"]
    if a:  # the route was already impossible before this one, so it is not "affected"; either way, no route text
        assert "Leave by" not in a["do_now"]
        assert a["leave_by"] is None


def test_room_full_sends_priya_to_a_backup_that_has_captions(client):
    cid = announce(client, "room_full", "talk-supply-chain")
    data = replan(client, PRIYA, cid, plan=plan_state(["talk-supply-chain"])).json()
    assert data["affected"] is True
    assert data["alert"]["what_changed"].endswith("is full.")
    talk_id = data["alert"]["talk_id"]
    if talk_id != "talk-supply-chain":
        assert check_requirements(TALK_BY_ID[talk_id], Profile(**PRIYA)).eligible


def test_talk_moved_updates_the_plan_for_people_who_hold_it(client):
    cid = announce(client, "talk_moved", "talk-supply-chain", start="14:30", room_id="room-251")
    held = replan(client, MARCUS, cid).json()
    assert held["affected"] and "moved to 2:30 PM in Room 251" in held["alert"]["what_changed"]
    other = replan(client, MARCUS, cid, plan=plan_state(["talk-observability"])).json()
    assert other["affected"] is False


def test_personal_late_missed_and_break_each_return_a_valid_three_part_alert(client):
    for personal in (
        {"type": "late", "minutes": 10},
        {"type": "missed"},
        {"type": "break_now"},
    ):
        for profile in (MARCUS, PRIYA, SAM):
            data = replan(client, profile, personal=personal, now="2026-11-09T21:50:00Z").json()
            a = data["alert"]
            assert data["affected"] is True
            assert a["origin"] == "personal"
            assert all(a[k] for k in ("what_changed", "what_stays", "do_now"))


def test_missed_keeps_a_transcript_and_never_offers_priya_a_talk_without_captions(client):
    a = replan(client, PRIYA, personal={"type": "missed", "talk_id": "talk-supply-chain"}).json()["alert"]
    assert a["transcript_talk_id"] == "talk-supply-chain"
    assert "Supply Chain Security Q&A" not in a["do_now"]  # that talk has no captions


def test_break_now_adds_a_quiet_break_and_says_what_still_fits(client):
    a = replan(client, SAM, personal={"type": "break_now"}).json()["alert"]
    assert a["what_changed"] == "Quiet break added now, Quiet room (Floor 2), 20 minutes."
    assert a["do_now"].startswith("Head to the quiet room, 2 minutes")


def test_replan_needs_a_change_or_a_personal_change(client):
    assert replan(client, MARCUS).status_code == 422
    assert replan(client, MARCUS, "chg-missing").status_code == 404


def test_other_options_all_fit_the_profile(client):
    data = replan(client, PRIYA, personal={"type": "missed"}).json()
    assert len(data["options"]) <= 3
    for o in data["options"]:
        assert check_requirements(TALK_BY_ID[o["talk"]["id"]], Profile(**PRIYA)).eligible
        assert o["why"]


def test_random_changes_never_break_a_hard_need(client, store):
    """100 random venue changes x random profiles: no step-free route uses stairs or anything that is down, and no
    suggestion fails a required need."""
    rng = random.Random(7)
    places = [n["id"] for n in client.get("/api/venue").json()["rooms"] if n["kind"] in ("room", "quiet_room")]
    for _ in range(100):
        for e in "ABC":
            store.elevators[e] = rng.choice(["working", "out_of_service"])
        store.blocked_floors = {f for f in (1, 2, 3) if rng.random() < 0.2}
        profile = {
            "required": {"stepFreeRouting": rng.random() < 0.7, "captions": rng.random() < 0.5},
            "extraTravelTime": rng.random() < 0.5,
            "topics": rng.sample(["Security", "Observability", "AI"], rng.randint(0, 2)),
        }
        here = rng.choice(places)
        ids = rng.sample(list(TALK_BY_ID), rng.randint(0, 3))
        for personal in ({"type": "late", "minutes": 10}, {"type": "missed"}, {"type": "break_now"}):
            data = replan(client, profile, personal=personal, plan=plan_state(ids, here)).json()
            for o in data["options"]:
                assert check_requirements(TALK_BY_ID[o["talk"]["id"]], Profile(**profile)).eligible
        graph = store.graph()
        r = client.post("/api/route", json={"profile": profile, "from_id": here, "to_id": rng.choice(places)}).json()
        if r["ok"] and profile["required"]["stepFreeRouting"]:
            route = r["route"]
            assert all(s["kind"] != "stairs" for s in route["steps"])
            for e in route["elevators_used"]:
                assert graph.elevators[e] != "out_of_service"


@pytest.mark.parametrize("profile", [MARCUS, PRIYA, SAM])
def test_plan_respects_required_needs(client, profile):
    body = {"profile": profile, "current_location_id": "room-251", "now": NOW}
    slots = client.post("/api/plan", json=body).json()["slots"]
    for s in slots:
        assert check_requirements(TALK_BY_ID[s["talk"]["id"]], Profile(**profile)).eligible
