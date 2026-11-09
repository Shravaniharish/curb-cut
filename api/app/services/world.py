"""Turns a request into a planner Context. The only place that mixes the public venue state with a request."""

from __future__ import annotations

from datetime import datetime

from app.data.talks import Talk
from app.planner.agenda import build_agenda
from app.planner.graph import Graph
from app.planner.replan import Context
from app.schemas import PlanState, Profile
from app.services.store import Store


def context_for(
    store: Store,
    profile: Profile,
    plan: PlanState,
    graph: Graph | None = None,
    plan_talks: list[Talk] | None = None,
) -> Context:
    talks = store.talks()
    by_id = {t.id: t for t in talks}
    held = plan_talks if plan_talks is not None else [by_id[i] for i in plan.talk_ids if i in by_id]
    held = sorted(held, key=lambda t: (t.start, t.id))
    return Context(profile, talks, graph or store.graph(), held, plan.now, plan.current_location_id)


def default_plan(store: Store, profile: Profile, location_id: str, now: datetime) -> list[Talk]:
    return build_agenda(profile, store.talks(), store.graph(), location_id)
