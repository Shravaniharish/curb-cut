"""POST /api/replan: the heart of the app. Stateless: the request carries the profile and the plan, the server
reads the public venue state, answers, and forgets. Nothing about the attendee is stored, logged or traced."""

from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException

from app.deps import get_store
from app.planner import replan as rp
from app.planner.graph import Graph
from app.schemas import ChangeOut, ReplanRequest, ReplanResponse
from app.services.present import option_out
from app.services.store import Store, floor_of
from app.services.world import context_for
from app.telemetry import span

router = APIRouter(prefix="/api", tags=["replan"])


def _graph_before(store: Store, change: ChangeOut) -> Graph | None:
    """The venue as it was just before this change: undo it on the current state."""
    g = store.graph()
    if change.type == "elevator_down":
        return g.with_elevator(change.target, "working")
    if change.type == "elevator_fixed":
        return g.with_elevator(change.target, "out_of_service")
    if change.type == "path_blocked":
        if change.target in ("A", "B", "C"):
            return g.with_elevator(change.target, "working")
        return g.with_floor_blocked(floor_of(change.target) or 0, False)
    if change.type == "path_cleared":
        return g.with_floor_blocked(floor_of(change.target) or 0, True)
    return None


@router.post("/replan", response_model=ReplanResponse)
def replan(body: ReplanRequest, store: Store = Depends(get_store)) -> ReplanResponse:
    started = time.perf_counter()
    if body.change_id is None and body.personal is None:
        raise HTTPException(422, "Send a change_id or a personal change.")
    with span("replan") as s:
        ctx = context_for(store, body.profile, body.plan)
        held = [t.id for t in ctx.plan]
        alert = None
        affected = False

        if body.personal is not None:
            p = body.personal
            affected = True
            alert = (
                rp.running_late_alert(ctx, p.minutes or 5)
                if p.type == "late"
                else rp.missed_talk_alert(ctx, p.talk_id)
                if p.type == "missed"
                else rp.break_now_alert(ctx)
            )
        else:
            change = store.change(body.change_id or "")
            if change is None:
                raise HTTPException(404, "We could not find that change.")
            alert, affected = _event_alert(store, ctx, change)

        options = rp.other_options(ctx, [alert.talk_id] if alert and alert.talk_id else []) if affected else []
        s.set_attribute("affected", affected)
        s.set_attribute("replan_ms", int((time.perf_counter() - started) * 1000))
        return ReplanResponse(
            affected=affected,
            alert=alert if affected else None,
            plan=held,
            options=[option_out(o) for o in options],
        )


def _event_alert(store: Store, ctx: rp.Context, change: ChangeOut):
    """(alert, affected) for a venue change, judged only against this attendee's own plan."""
    t = change.type
    if t in ("elevator_down", "elevator_fixed", "path_blocked", "path_cleared"):
        before = _graph_before(store, change)
        if before is None or not rp.route_changed(ctx, before):
            return None, False
        if t in ("elevator_down", "elevator_fixed"):
            return rp.elevator_alert(ctx, change.target, down=t == "elevator_down"), True
        if change.target in ("A", "B", "C"):
            return rp.elevator_alert(ctx, change.target, down=True), True
        return rp.path_alert(ctx, floor_of(change.target) or 0, blocked=t == "path_blocked"), True
    talk = next((x for x in ctx.talks if x.id == change.target), None)
    if talk is None or talk.id not in {x.id for x in ctx.plan}:
        return None, False
    if t == "room_full":
        return rp.room_full_alert(ctx, talk), True
    if t == "talk_moved":
        return rp.talk_moved_alert(ctx, talk), True
    return None, False

