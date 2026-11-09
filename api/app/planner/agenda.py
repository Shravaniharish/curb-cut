"""Plan building: required needs are hard filters, then feasibility, then ranking. Port of ``web/lib/agenda.ts``.

Order of authority: (1) required needs, (2) travel and buffer feasibility, (3) topics and preferences only rank
what is left. A better score can never override an unmet required need.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from app.data.talks import CONFERENCE_TZ, Talk
from app.planner.graph import Graph, NoRoute, Route, find_route
from app.schemas import Profile

DEFAULT_BUFFER_MIN = 2
EXTRA_BUFFER_MIN = 6
MIN_QUIET_BREAK_MIN = 10
BACK_TO_BACK_EXTRA_GAP_MIN = 15


def buffer_minutes(profile: Profile) -> int:
    return EXTRA_BUFFER_MIN if profile.extra_travel_time else DEFAULT_BUFFER_MIN


def fmt_time(moment: datetime) -> str:
    """'2:00 PM' in conference time."""
    local = moment.astimezone(CONFERENCE_TZ)
    return f"{local.hour % 12 or 12}:{local.minute:02d} {'AM' if local.hour < 12 else 'PM'}"


@dataclass(frozen=True)
class Requirement:
    eligible: bool
    unmet: list[str]
    met: list[str]


def check_requirements(talk: Talk, profile: Profile) -> Requirement:
    unmet: list[str] = []
    met: list[str] = []
    if profile.required.step_free_routing:
        s = talk.access.step_free_entrance
        if s == "confirmed":
            met.append("Step-free entrance confirmed")
        elif s == "unavailable":
            unmet.append("No step-free entrance")
        else:
            unmet.append("Step-free entrance not confirmed")
    if profile.required.captions:
        c = talk.access.captions
        if c == "live_captioner":
            met.append("Live captioner")
        elif c == "automatic":
            met.append("Auto captions")
        elif c == "none":
            unmet.append("No captions")
        else:
            unmet.append("Captions not confirmed")
    return Requirement(not unmet, unmet, met)


def matching_topics(talk: Talk, profile: Profile) -> list[str]:
    return [t for t in talk.topics if t in profile.topics]


def why_fits(talk: Talk, profile: Profile) -> list[str]:
    """Short, truthful reasons. Unknown is never claimed as a match."""
    reasons: list[str] = []
    topics = matching_topics(talk, profile)
    if topics:
        reasons.append(f"Matches your interests: {', '.join(topics)}")
    reasons.extend(check_requirements(talk, profile).met)
    a, p = talk.access, profile.preferences
    if p.front_seating and a.front_seating == "available":
        reasons.append("Front seating available")
    if p.interpreter and a.interpreter == "available":
        reasons.append("Interpreter available")
    if p.low_sensory and "unknown" not in (a.crowd, a.noise) and "high" not in (a.crowd, a.noise):
        reasons.append("Lower crowd and noise (sample data)")
    if p.quiet_breaks and a.quiet_room_id:
        reasons.append("Quiet room nearby")
    return reasons


def score(talk: Talk, profile: Profile, travel: int | None) -> float:
    s = len(matching_topics(talk, profile)) * 3.0
    a, p = talk.access, profile.preferences
    if p.front_seating and a.front_seating == "available":
        s += 1
    if p.interpreter and a.interpreter == "available":
        s += 1
    if p.low_sensory:
        s -= (a.crowd == "high") + (a.noise == "high")
    if travel is not None:
        s -= travel * 0.1
    return round(s, 2)


def route_for(graph: Graph, profile: Profile, from_id: str, to_id: str) -> Route | NoRoute:
    return find_route(graph, from_id, to_id, step_free=profile.required.step_free_routing)


def travel_minutes(graph: Graph, profile: Profile, from_id: str, to_id: str) -> int | None:
    r = route_for(graph, profile, from_id, to_id)
    return r.minutes if isinstance(r, Route) else None


def can_attend_both(a: Talk, b: Talk, graph: Graph, profile: Profile) -> bool:
    first, second = (a, b) if a.start <= b.start else (b, a)
    gap = (second.start - first.end).total_seconds() / 60
    if gap < 0:
        return False
    t = 0 if first.room_id == second.room_id else travel_minutes(graph, profile, first.room_id, second.room_id)
    if t is None:
        return False
    extra = BACK_TO_BACK_EXTRA_GAP_MIN if profile.preferences.reduced_back_to_back else 0
    return gap >= t + buffer_minutes(profile) + extra


def leave_by(route: Route, talk: Talk, profile: Profile) -> datetime:
    return talk.start - timedelta(minutes=route.minutes + buffer_minutes(profile))


def build_agenda(
    profile: Profile, talks: list[Talk], graph: Graph, start_location_id: str, pinned: list[str] | None = None
) -> list[Talk]:
    """Chosen talks in time order. ``pinned`` talk ids are kept first (the attendee added them)."""
    by_id = {t.id: t for t in talks}
    ranked: list[tuple[float, Talk]] = []
    for talk in talks:
        if talk.full or not check_requirements(talk, profile).eligible:
            continue
        if profile.topics and not matching_topics(talk, profile):
            continue
        ranked.append((score(talk, profile, travel_minutes(graph, profile, start_location_id, talk.room_id)), talk))
    ranked.sort(key=lambda x: (-x[0], x[1].start, x[1].id))

    selected: list[Talk] = [by_id[i] for i in (pinned or []) if i in by_id]
    for _, talk in ranked:
        if talk in selected:
            continue
        if all(can_attend_both(s, talk, graph, profile) for s in selected):
            selected.append(talk)
    selected.sort(key=lambda t: (t.start, t.id))
    return selected


def backup_for(talk: Talk, talks: list[Talk], profile: Profile, planned_ids: list[str]) -> Talk | None:
    by_id = {t.id: t for t in talks}
    for bid in talk.backup_talk_ids:
        cand = by_id.get(bid)
        if cand and bid not in planned_ids and not cand.full and check_requirements(cand, profile).eligible:
            return cand
    return None


def quiet_break_between(
    a: Talk, b: Talk, graph: Graph, profile: Profile, quiet_rooms: list[str]
) -> tuple[str, datetime, datetime] | None:
    best: tuple[int, str, datetime, datetime] | None = None
    for room in quiet_rooms:
        there = travel_minutes(graph, profile, a.room_id, room)
        back = travel_minutes(graph, profile, room, b.room_id)
        if there is None or back is None:
            continue
        start = a.end + timedelta(minutes=there)
        end = b.start - timedelta(minutes=back + buffer_minutes(profile))
        if (end - start).total_seconds() / 60 < MIN_QUIET_BREAK_MIN:
            continue
        if best is None or there + back < best[0]:
            best = (there + back, room, start, end)
    return best[1:] if best else None
