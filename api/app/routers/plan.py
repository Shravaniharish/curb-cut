from __future__ import annotations

from fastapi import APIRouter, Depends

from app.deps import get_store
from app.planner.agenda import (
    backup_for,
    build_agenda,
    leave_by,
    quiet_break_between,
    route_for,
    why_fits,
)
from app.planner.graph import Route
from app.planner.replan import QUIET_ROOMS
from app.schemas import PlanRequest, PlanResponse, PlanSlot, QuietBreak
from app.services.present import route_out, talk_out
from app.services.store import Store
from app.telemetry import span

router = APIRouter(prefix="/api", tags=["plan"])


@router.post("/plan", response_model=PlanResponse)
def plan(body: PlanRequest, store: Store = Depends(get_store)) -> PlanResponse:
    """A day plan from the profile: required needs filter, topics rank, one backup per slot that also fits."""
    with span("plan") as s:
        talks, graph, profile = store.talks(), store.graph(), body.profile
        chosen = build_agenda(profile, talks, graph, body.current_location_id, pinned=body.talk_ids)
        ids = [t.id for t in chosen]
        slots: list[PlanSlot] = []
        for t in chosen:
            r = route_for(graph, profile, body.current_location_id, t.room_id)
            backup = backup_for(t, talks, profile, ids)
            slots.append(
                PlanSlot(
                    talk=talk_out(t),
                    backup=talk_out(backup) if backup else None,
                    route=route_out(r) if isinstance(r, Route) else None,
                    leave_by=leave_by(r, t, profile) if isinstance(r, Route) else None,
                    why=why_fits(t, profile),
                )
            )
        breaks: list[QuietBreak] = []
        if profile.preferences.quiet_breaks:
            for a, b in zip(chosen, chosen[1:], strict=False):
                found = quiet_break_between(a, b, graph, profile, QUIET_ROOMS)
                if found:
                    breaks.append(QuietBreak(room_id=found[0], start=found[1], end=found[2]))
        s.set_attribute("slot_count", len(slots))
        return PlanResponse(slots=slots, breaks=breaks)
