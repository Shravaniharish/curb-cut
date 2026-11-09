"""Re-planning: what changed, what stays the same, what to do now. Port of ``web/lib/changes.ts``.

Stateless: everything needed arrives in the call (the profile, the plan, where the attendee is, the time) plus the
public venue state. Nothing is stored and nothing about the attendee is logged. Every alert has all three parts.
Wording is the same as the browser's own planner, so the two never disagree.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from app.data.talks import Talk
from app.data.venue import NODES
from app.planner.agenda import (
    backup_for,
    buffer_minutes,
    check_requirements,
    fmt_time,
    leave_by,
    matching_topics,
    route_for,
    why_fits,
)
from app.planner.graph import Graph, NoRoute, Route
from app.schemas import AlertOut, Profile

BREAK_MINUTES = 20
MIN_USEFUL_REMAINING_MINUTES = 10
MAX_OTHER_OPTIONS = 3
ROOM_LABELS = {n.id: n.label for n in NODES}
ROOM_FLOORS = {n.id: n.floor for n in NODES}
QUIET_ROOMS = [n.id for n in NODES if n.kind == "quiet_room"]


@dataclass(frozen=True)
class Context:
    profile: Profile
    talks: list[Talk]
    graph: Graph
    plan: list[Talk]
    now: datetime
    location: str

    def route(self, to_id: str, graph: Graph | None = None) -> Route | NoRoute:
        return route_for(graph or self.graph, self.profile, self.location, to_id)


@dataclass(frozen=True)
class Option:
    talk: Talk
    walk_minutes: int
    step_free: bool
    why: list[str]


@dataclass(frozen=True)
class Outcome:
    affected: bool
    alert: AlertOut | None = None


def room(room_id: str) -> str:
    return ROOM_LABELS.get(room_id, room_id)


def trip_words(route: Route) -> str:
    unit = "minute" if route.minutes == 1 else "minutes"
    return f"{route.minutes} {unit}, step-free" if route.step_free else f"{route.minutes} {unit}"


def route_out(route: Route | NoRoute) -> Route | None:
    return route if isinstance(route, Route) else None


# ---- Focus ------------------------------------------------------------------------------------------------


def talk_in_focus(ctx: Context) -> Talk | None:
    upcoming = next((t for t in ctx.plan if t.start > ctx.now), None)
    if upcoming:
        return upcoming
    return next((t for t in ctx.plan if t.start <= ctx.now < t.end), None)


def talk_just_missed(ctx: Context) -> Talk | None:
    started = [t for t in ctx.plan if t.start <= ctx.now]
    return started[-1] if started else (ctx.plan[0] if ctx.plan else None)


def _whats_stays_after(ctx: Context, talk: Talk | None) -> str:
    later = next((t for t in ctx.plan if talk and t.id != talk.id and t.start > talk.start), None)
    return f"Your {fmt_time(later.start)} talk is unchanged." if later else "The rest of your afternoon is unchanged."


def _reachable_in_time(ctx: Context, talk: Talk, from_time: datetime | None = None) -> bool:
    r = ctx.route(talk.room_id)
    if not isinstance(r, Route):
        return False
    arrival = (from_time or ctx.now) + timedelta(minutes=r.minutes + buffer_minutes(ctx.profile))
    return arrival <= talk.start


# ---- Other options ----------------------------------------------------------------------------------------


def other_options(ctx: Context, exclude: list[str] | None = None) -> list[Option]:
    """Up to three later talks that confirm the required needs and can be reached in time."""
    found: list[tuple[int, datetime, Option]] = []
    for talk in ctx.talks:
        if talk.id in (exclude or []) or talk.start <= ctx.now or talk.full:
            continue
        if not check_requirements(talk, ctx.profile).eligible:
            continue
        r = ctx.route(talk.room_id)
        if not isinstance(r, Route) or not _reachable_in_time(ctx, talk):
            continue
        option = Option(talk, r.minutes, r.step_free, why_fits(talk, ctx.profile))
        found.append((len(matching_topics(talk, ctx.profile)), talk.start, option))
    found.sort(key=lambda x: (-x[0], x[1], x[2].talk.id))
    return [o for _, _, o in found[:MAX_OTHER_OPTIONS]]


def later_talk_on_same_topic(ctx: Context, missed: Talk) -> Talk | None:
    options = other_options(ctx, [missed.id])
    same = next((o for o in options if set(o.talk.topics) & set(missed.topics)), None)
    pick = same or (options[0] if options else None)
    return pick.talk if pick else None


# ---- Event changes ----------------------------------------------------------------------------------------


def _no_route_text(talk: Talk) -> str:
    return f"We cannot confirm a route to {room(talk.room_id)} that meets your needs. See other options."


def _route_alert(ctx: Context, kind: str, what_changed: str, ok_prefix: str) -> AlertOut:
    """An alert about the route to the talk in focus. ``ok_prefix`` leads the do-now sentence."""
    talk = talk_in_focus(ctx)
    stays = (
        f"Your talk is still at {fmt_time(talk.start)} in {room(talk.room_id)}."
        if talk
        else "Nothing else in your plan has changed."
    )
    if not talk:
        return AlertOut(
            kind=kind, origin="event", what_changed=what_changed, what_stays=stays,
            do_now="Nothing to do now. Your later routes already take this into account.",
        )  # fmt: skip
    route = ctx.route(talk.room_id)
    if not isinstance(route, Route):
        return AlertOut(
            kind=kind, origin="event", what_changed=what_changed, what_stays=stays,
            do_now=_no_route_text(talk), talk_id=talk.id,
        )  # fmt: skip
    leave = leave_by(route, talk, ctx.profile)
    lifts = route.elevators_used
    lead = ok_prefix.format(
        lifts=" then ".join(f"Elevator {e}" for e in lifts) if lifts else "no elevator"
    )
    return AlertOut(
        kind=kind, origin="event", what_changed=what_changed, what_stays=stays,
        do_now=f"{lead} Leave by {fmt_time(leave)}. {trip_words(route)}.",
        destination_room_id=talk.room_id, leave_by=leave, talk_id=talk.id,
    )  # fmt: skip


def route_changed(ctx_after: Context, graph_before: Graph) -> bool:
    """Would the route to the talk in focus differ if this change had not happened?"""
    talk = talk_in_focus(ctx_after)
    if not talk:
        return False
    before = ctx_after.route(talk.room_id, graph_before)
    after = ctx_after.route(talk.room_id)
    if isinstance(before, Route) and isinstance(after, Route):
        return before.path != after.path
    return isinstance(before, Route) != isinstance(after, Route)


def elevator_alert(ctx: Context, elevator: str, *, down: bool) -> AlertOut:
    if down:
        route = None
        talk = talk_in_focus(ctx)
        route = ctx.route(talk.room_id) if talk else None
        prefix = (
            "Use {lifts}." if isinstance(route, Route) and route.elevators_used else "Your new route uses {lifts}."
        )
        return _route_alert(ctx, "elevator_down", f"Elevator {elevator} is not working.", prefix)
    return _route_alert(
        ctx, "elevator_fixed", f"Elevator {elevator} is working again.", f"You can use Elevator {elevator} again."
    )


def path_alert(ctx: Context, floor: int, *, blocked: bool) -> AlertOut:
    if blocked:
        return _route_alert(
            ctx, "path_blocked", f"The path on Floor {floor} is blocked.", "Your new route avoids it."
        )
    return _route_alert(ctx, "path_cleared", f"The path on Floor {floor} is open again.", "Your usual route works.")


def room_full_alert(ctx: Context, full: Talk) -> AlertOut:
    stays = f"Your {fmt_time(nxt.start)} talk is unchanged." if (nxt := _after(ctx, full)) else (
        "The rest of your afternoon is unchanged."
    )
    alt = backup_for(full, ctx.talks, ctx.profile, [t.id for t in ctx.plan])
    if alt is None:
        opts = [o for o in other_options(ctx, [full.id]) if abs((o.talk.start - full.start).total_seconds()) < 3600]
        alt = opts[0].talk if opts else None
    if alt is None:
        return AlertOut(
            kind="room_full", origin="event", what_changed=f"{full.title} is full.",
            what_stays=stays, do_now="No other talk fits your needs in time. See other options.",
            talk_id=full.id,
        )  # fmt: skip
    r = ctx.route(alt.room_id)
    where = f"{room(alt.room_id)}"
    if isinstance(r, Route):
        leave = leave_by(r, alt, ctx.profile)
        return AlertOut(
            kind="room_full", origin="event", what_changed=f"{full.title} is full.", what_stays=stays,
            do_now=(
                f'Go to "{alt.title}" at {fmt_time(alt.start)} in {where}. '
                f"Leave by {fmt_time(leave)}. {trip_words(r)}."
            ),
            destination_room_id=alt.room_id, leave_by=leave, talk_id=alt.id,
        )  # fmt: skip
    return AlertOut(
        kind="room_full", origin="event", what_changed=f"{full.title} is full.", what_stays=stays,
        do_now=_no_route_text(alt), talk_id=alt.id,
    )  # fmt: skip


def talk_moved_alert(ctx: Context, moved: Talk) -> AlertOut:
    r = ctx.route(moved.room_id)
    stays = "Your other talks are unchanged."
    changed = f"{moved.title} moved to {fmt_time(moved.start)} in {room(moved.room_id)}."
    if isinstance(r, Route):
        leave = leave_by(r, moved, ctx.profile)
        return AlertOut(
            kind="talk_moved", origin="event", what_changed=changed, what_stays=stays,
            do_now=f"Leave by {fmt_time(leave)}. {trip_words(r)}.",
            destination_room_id=moved.room_id, leave_by=leave, talk_id=moved.id,
        )  # fmt: skip
    return AlertOut(
        kind="talk_moved", origin="event", what_changed=changed, what_stays=stays,
        do_now=_no_route_text(moved), talk_id=moved.id,
    )  # fmt: skip


def _after(ctx: Context, talk: Talk) -> Talk | None:
    return next((t for t in ctx.plan if t.id != talk.id and t.start > talk.start), None)


# ---- Personal changes -------------------------------------------------------------------------------------


def running_late_alert(ctx: Context, late_minutes: int) -> AlertOut:
    talk = talk_in_focus(ctx)
    words = "15 minutes or more" if late_minutes >= 15 else f"{late_minutes} minutes"
    if not talk:
        return AlertOut(
            kind="running_late", origin="personal",
            what_changed=f"You told us you are running {words} late.",
            what_stays="You have no talk to get to right now, so nothing changes.",
            do_now="Take your time. Your plan is unchanged.",
        )  # fmt: skip
    route = ctx.route(talk.room_id)
    started = talk.start <= ctx.now
    arrival = None
    if isinstance(route, Route):
        arrival = (
            ctx.now + timedelta(minutes=late_minutes + route.minutes)
            if started
            else talk.start + timedelta(minutes=late_minutes)
        )
    remaining = (talk.end - arrival).total_seconds() / 60 if arrival else None
    can_join = remaining is not None and remaining >= MIN_USEFUL_REMAINING_MINUTES
    later = None if can_join else later_talk_on_same_topic(ctx, talk)
    changed = (
        f"You will be {words} late to {talk.title}, which has already started."
        if started
        else f"You'll arrive {words} late to {talk.title}."
    )
    if not isinstance(route, Route):
        do_now = _no_route_text(talk)
    elif can_join:
        do_now = f"You can still join. Leave now. {trip_words(route)}. Or see a later talk on the same topic."
    elif later:
        do_now = (
            f'Most of {talk.title} would be over. Go to "{later.title}" at {fmt_time(later.start)} '
            f"in {room(later.room_id)} instead."
        )
    else:
        do_now = f"Most of {talk.title} would be over. See other options for a talk you can still reach."
    return AlertOut(
        kind="running_late", origin="personal", what_changed=changed,
        what_stays=_whats_stays_after(ctx, talk), do_now=do_now,
        destination_room_id=(later or talk).room_id, talk_id=(later or talk).id,
    )  # fmt: skip


def missed_talk_alert(ctx: Context, missed_id: str | None) -> AlertOut:
    missed = next((t for t in ctx.talks if t.id == missed_id), None) or talk_just_missed(ctx)
    if not missed:
        return AlertOut(
            kind="missed_talk", origin="personal", what_changed="You told us you missed a talk.",
            what_stays="Your plan has no talk recorded for that time, so nothing changes.",
            do_now="See other options for a talk you can still reach.",
        )  # fmt: skip
    later = later_talk_on_same_topic(ctx, missed)
    if later:
        do_now = (
            f'Go to "{later.title}" at {fmt_time(later.start)} in {room(later.room_id)}. '
            "A transcript of what you missed is also available."
        )
    else:
        do_now = (
            "Nothing later today fits your needs and can be reached in time. "
            "A transcript of what you missed is available."
        )
    return AlertOut(
        kind="missed_talk", origin="personal", what_changed=f"You missed {missed.title}.",
        what_stays=_whats_stays_after(ctx, missed), do_now=do_now,
        destination_room_id=later.room_id if later else None, talk_id=later.id if later else None,
        transcript_talk_id=missed.id,
    )  # fmt: skip


def break_now_alert(ctx: Context) -> AlertOut:
    best: tuple[int, str, Route] | None = None
    for qid in QUIET_ROOMS:
        r = ctx.route(qid)
        if isinstance(r, Route) and (best is None or r.minutes < best[0]):
            best = (r.minutes, qid, r)
    if best is None:
        return AlertOut(
            kind="break_now", origin="personal", what_changed="We could not add a quiet break.",
            what_stays="Your plan is unchanged.",
            do_now=(
                "No quiet room has a route that meets your needs from where you are. "
                "Quiet rooms are on every floor."
            ),
        )  # fmt: skip
    minutes, qid, route = best
    end = ctx.now + timedelta(minutes=minutes + BREAK_MINUTES)
    nxt = talk_in_focus(ctx)
    keeps = nxt if nxt and _reachable_in_time(ctx, nxt, end) else None
    alt = None
    if not keeps:
        alt = next(
            iter(
                sorted(
                    (
                        t for t in ctx.talks
                        if (not nxt or t.id != nxt.id) and not t.full
                        and check_requirements(t, ctx.profile).eligible and _reachable_in_time(ctx, t, end)
                    ),
                    key=lambda t: t.start,
                )
            ),
            None,
        )  # fmt: skip
    if keeps:
        stays = f"You still see {keeps.title} at {fmt_time(keeps.start)}."
        tail = f" Your next talk, {keeps.title}, still starts at {fmt_time(keeps.start)}."
    elif nxt and alt:
        stays = "Everything after the break stays in your plan."
        tail = f" You would miss the start of {nxt.title}. {alt.title} at {fmt_time(alt.start)} also fits you."
    elif nxt:
        stays = "Everything after the break stays in your plan."
        tail = f" You would miss the start of {nxt.title}. See other options for a later talk."
    else:
        stays = "Your plan is unchanged."
        tail = " You have no talk to get back to."
    unit = "minute" if minutes == 1 else "minutes"
    label = room(qid)
    where = label if "floor" in label.lower() else f"{label} (Floor {ROOM_FLOORS[qid]})"
    head = f"Head to the quiet room, {minutes} {unit}{', step-free' if route.step_free else ''}."
    return AlertOut(
        kind="break_now", origin="personal",
        what_changed=f"Quiet break added now, {where}, {BREAK_MINUTES} minutes.",
        what_stays=stays, do_now=head + tail, destination_room_id=qid,
        talk_id=(keeps or alt).id if (keeps or alt) else None,
    )  # fmt: skip
