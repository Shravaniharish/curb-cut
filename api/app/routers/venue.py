from __future__ import annotations

from fastapi import APIRouter, Depends

from app.data.talks import TALK_BY_ID
from app.data.venue import PROVENANCE
from app.deps import get_store
from app.planner.agenda import route_for
from app.planner.graph import Route
from app.schemas import RouteRequest, RouteResponse, TalkOut, VenueOut
from app.services.present import route_out, talk_out, venue_out
from app.services.store import Store
from app.telemetry import span

router = APIRouter(prefix="/api", tags=["venue"])


@router.get("/venue", response_model=VenueOut)
def get_venue(store: Store = Depends(get_store)) -> VenueOut:
    with span("venue"):
        return venue_out(store.graph(), PROVENANCE)


@router.get("/talks", response_model=list[TalkOut])
def list_talks(store: Store = Depends(get_store)) -> list[TalkOut]:
    with span("talks.list", count=len(TALK_BY_ID)):
        return [talk_out(t) for t in store.talks()]


@router.get("/talks/{talk_id}", response_model=TalkOut)
def get_talk(talk_id: str, store: Store = Depends(get_store)) -> TalkOut:
    from fastapi import HTTPException

    with span("talks.get"):
        talk = store.talk(talk_id)
        if talk is None:
            raise HTTPException(404, "That talk is not in the schedule.")
        return talk_out(talk)


@router.post("/route", response_model=RouteResponse)
def post_route(body: RouteRequest, store: Store = Depends(get_store)) -> RouteResponse:
    """A route that never goes through anything that is down, and never uses stairs for a step-free need."""
    with span("route", step_free=body.profile.required.step_free_routing) as s:
        result = route_for(store.graph(), body.profile, body.from_id, body.to_id)
        s.set_attribute("ok", isinstance(result, Route))
        if isinstance(result, Route):
            return RouteResponse(ok=True, route=route_out(result))
        return RouteResponse(ok=False, reason=result.reason)  # type: ignore[arg-type]
