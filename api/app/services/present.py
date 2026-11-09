"""Planner objects -> API models."""

from __future__ import annotations

from app.data.talks import Talk
from app.data.venue import EDGES, NODES
from app.planner.graph import Graph, Route
from app.planner.replan import Option
from app.schemas import (
    AccessOut,
    ConnectorOut,
    OptionOut,
    RoomOut,
    RouteOut,
    RouteStepOut,
    TalkOut,
    VenueOut,
)


def talk_out(t: Talk) -> TalkOut:
    a = t.access
    return TalkOut(
        id=t.id, title=t.title, start=t.start, end=t.end, room_id=t.room_id, floor=t.floor,
        topics=list(t.topics), backup_talk_ids=list(t.backup_talk_ids), full=t.full,
        access=AccessOut(
            step_free_entrance=a.step_free_entrance, captions=a.captions,
            slide_descriptions=a.slide_descriptions, front_seating=a.front_seating,
            interpreter=a.interpreter, quiet_room_id=a.quiet_room_id,
            quiet_room_walk_minutes=a.quiet_room_walk_minutes, noise=a.noise, crowd=a.crowd,
        ),
        description=t.abstract or None,
    )  # fmt: skip


def route_out(r: Route) -> RouteOut:
    return RouteOut(
        from_id=r.from_id, to_id=r.to_id, minutes=r.minutes, step_free=r.step_free, path=list(r.path),
        steps=[RouteStepOut(index=s.index, text=s.text, minutes=s.minutes, kind=s.kind) for s in r.steps],  # type: ignore[arg-type]
        elevators_used=r.elevators_used,  # type: ignore[arg-type]
    )  # fmt: skip


def option_out(o: Option) -> OptionOut:
    return OptionOut(talk=talk_out(o.talk), walk_minutes=o.walk_minutes, step_free=o.step_free, why=o.why)


def venue_out(graph: Graph, provenance: str) -> VenueOut:
    return VenueOut(
        rooms=[
            RoomOut(id=n.id, label=n.label, floor=n.floor, kind=n.kind, elevator_id=n.elevator_id)  # type: ignore[arg-type]
            for n in NODES
        ],
        connectors=[
            ConnectorOut(
                id=e.id, kind=e.kind, from_id=e.from_id, to_id=e.to_id, minutes=e.minutes,  # type: ignore[arg-type]
                step_free=e.step_free, elevator_id=e.elevator_id, blocked=graph.edge_blocked(e),  # type: ignore[arg-type]
            )
            for e in EDGES
        ],
        elevators=dict(graph.elevators),  # type: ignore[arg-type]
        blocked_floors=sorted(graph.blocked_floors),
        provenance=provenance,
    )  # fmt: skip
