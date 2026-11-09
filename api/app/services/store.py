"""In-memory venue state. This is *public* information, like a PA announcement: which elevator is down, which
talk is full, what was reported, what was asked on stage. It is never about a person.

There is deliberately no profile, attendee or user table here, and nothing in this module accepts a profile.
State resets when the process restarts; the Elasticsearch ``changes`` / ``reports`` indices are not wired yet.
"""

from __future__ import annotations

import asyncio
import statistics
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field, replace
from datetime import UTC, datetime, timedelta

from app.data.talks import TALK_BY_ID, TALKS, Talk, at
from app.data.venue import DEFAULT_ELEVATORS
from app.planner.graph import Graph
from app.schemas import (
    AckCounts,
    AckIn,
    ChangeCreate,
    ChangeOut,
    ReportCreate,
    ReportResult,
    ReportSummary,
)

CONFIRMATIONS_NEEDED = 2
CONFIRMATION_WINDOW = timedelta(minutes=10)
ELEVATORS = ("A", "B", "C")
FLOORS = (1, 2, 3)


class ChangeError(ValueError):
    """The announcement does not name something that exists. The message is safe to show."""


@dataclass
class Report:
    problem: str
    location_id: str
    device_token: str
    created_at: datetime


@dataclass
class Question:
    id: str
    talk_id: str
    text: str
    asked_at: datetime
    read_out_at: datetime | None = None


@dataclass
class Store:
    clock: Callable[[], datetime] = lambda: datetime.now(UTC)
    elevators: dict[str, str] = field(default_factory=lambda: dict(DEFAULT_ELEVATORS))
    blocked_floors: set[int] = field(default_factory=set)
    full_talks: set[str] = field(default_factory=set)
    moved_talks: dict[str, Talk] = field(default_factory=dict)
    changes: list[ChangeOut] = field(default_factory=list)
    reports: list[Report] = field(default_factory=list)
    acks: list[AckIn] = field(default_factory=list)
    questions: list[Question] = field(default_factory=list)
    subscribers: set[asyncio.Queue[ChangeOut]] = field(default_factory=set)

    # ---- Read views ----------------------------------------------------------------------------------

    def graph(self) -> Graph:
        return Graph(dict(self.elevators), frozenset(self.blocked_floors))

    def talks(self) -> list[Talk]:
        out = []
        for t in TALKS:
            t = self.moved_talks.get(t.id, t)
            out.append(replace(t, full=t.id in self.full_talks))
        return out

    def talk(self, talk_id: str) -> Talk | None:
        return next((t for t in self.talks() if t.id == talk_id), None)

    # ---- Changes -------------------------------------------------------------------------------------

    def _validate(self, c: ChangeCreate) -> None:
        if c.type in ("elevator_down", "elevator_fixed") and c.target not in ELEVATORS:
            raise ChangeError("Pick Elevator A, B or C.")
        if c.type in ("path_blocked", "path_cleared"):
            if c.target in ELEVATORS and c.type == "path_blocked":
                return
            if floor_of(c.target) is None:
                raise ChangeError("Pick a floor path: path-floor-1, path-floor-2 or path-floor-3.")
        if c.type in ("room_full", "talk_moved") and c.target not in TALK_BY_ID:
            raise ChangeError("That talk is not in the schedule.")
        if c.type == "talk_moved":
            if not c.details.get("start") and not c.details.get("room_id"):
                raise ChangeError("Say where or when the talk moved to.")
            if c.details.get("room_id") and c.details["room_id"] not in {t.room_id for t in TALKS}:
                raise ChangeError("That room is not in the venue.")
            if c.details.get("start") and parse_hhmm(c.details["start"]) is None:
                raise ChangeError("Give the new start time as HH:MM.")

    def apply_change(self, c: ChangeCreate) -> ChangeOut:
        self._validate(c)
        if c.type == "elevator_down":
            self.elevators[c.target] = "out_of_service"
        elif c.type == "elevator_fixed":
            self.elevators[c.target] = "working"
        elif c.type == "path_blocked":
            if c.target in ELEVATORS:  # a blocked elevator path is the same as the elevator being out
                self.elevators[c.target] = "out_of_service"
            else:
                self.blocked_floors.add(floor_of(c.target))  # type: ignore[arg-type]
        elif c.type == "path_cleared":
            self.blocked_floors.discard(floor_of(c.target))  # type: ignore[arg-type]
        elif c.type == "room_full":
            self.full_talks.add(c.target)
        elif c.type == "talk_moved":
            self._move(c)
        change = ChangeOut(
            id=f"chg-{uuid.uuid4().hex[:10]}",
            type=c.type,
            target=c.target,
            details=c.details,
            created_at=self.clock(),
        )
        self.changes.append(change)
        self._broadcast(change)
        return change

    def _move(self, c: ChangeCreate) -> None:
        base = TALK_BY_ID[c.target]
        start, room_id = base.start, c.details.get("room_id") or base.room_id
        if hhmm := parse_hhmm(c.details.get("start", "")):
            start = at(*hhmm)
        length = base.end - base.start
        from app.data.venue import NODE_BY_ID

        self.moved_talks[base.id] = replace(
            base, start=start, end=start + length, room_id=room_id, floor=NODE_BY_ID[room_id].floor
        )

    def fix(self, change_id: str) -> ChangeOut | None:
        """Mark a change fixed and undo its effect on the venue. Announces the fix as its own change."""
        change = next((c for c in self.changes if c.id == change_id), None)
        if change is None:
            return None
        if change.fixed_at is None:
            change.fixed_at = self.clock()
            undo = {
                "elevator_down": ("elevator_fixed", change.target),
                "path_blocked": (
                    "elevator_fixed" if change.target in ELEVATORS else "path_cleared",
                    change.target,
                ),
            }.get(change.type)
            if undo:
                self.apply_change(ChangeCreate(type=undo[0], target=undo[1]))  # type: ignore[arg-type]
            elif change.type == "room_full":
                self.full_talks.discard(change.target)
            elif change.type == "talk_moved":
                self.moved_talks.pop(change.target, None)
        return change

    def change(self, change_id: str) -> ChangeOut | None:
        return next((c for c in self.changes if c.id == change_id), None)

    def _broadcast(self, change: ChangeOut) -> None:
        for q in list(self.subscribers):
            try:
                q.put_nowait(change)
            except asyncio.QueueFull:  # a stuck client must not stall the others
                self.subscribers.discard(q)

    def subscribe(self) -> asyncio.Queue[ChangeOut]:
        q: asyncio.Queue[ChangeOut] = asyncio.Queue(maxsize=100)
        self.subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[ChangeOut]) -> None:
        self.subscribers.discard(q)

    # ---- Acks (two numbers, nothing else) --------------------------------------------------------------

    def add_ack(self, ack: AckIn) -> None:
        self.acks.append(ack)

    def ack_counts(self) -> AckCounts:
        times = [a.replan_ms for a in self.acks if a.affected]
        return AckCounts(
            received=len(self.acks),
            affected=sum(1 for a in self.acks if a.affected),
            replanned=len(times),
            median_replan_ms=int(statistics.median(times)) if times else None,
            max_replan_ms=max(times) if times else None,
        )

    # ---- Reports ---------------------------------------------------------------------------------------

    def add_report(self, r: ReportCreate) -> ReportResult:
        now = self.clock()
        self.reports.append(Report(r.problem, r.location_id, r.device_token, now))
        window = [
            x
            for x in self.reports
            if x.problem == r.problem and x.location_id == r.location_id and now - x.created_at <= CONFIRMATION_WINDOW
        ]
        devices = {x.device_token for x in window}
        confirmed = len(devices) >= CONFIRMATIONS_NEEDED
        change_id = None
        if confirmed:
            spec = report_to_change(r.problem, r.location_id)
            if spec and not self._already_open(spec):
                change_id = self.apply_change(spec).id
            elif spec:
                change_id = next(c.id for c in reversed(self.changes) if (c.type, c.target) == (spec.type, spec.target))
        return ReportResult(accepted=True, confirmed=confirmed, change_id=change_id, needed=CONFIRMATIONS_NEEDED)

    def _already_open(self, spec: ChangeCreate) -> bool:
        return any((c.type, c.target) == (spec.type, spec.target) and c.fixed_at is None for c in self.changes)

    def report_summaries(self) -> list[ReportSummary]:
        groups: dict[tuple[str, str], list[Report]] = {}
        for r in self.reports:
            groups.setdefault((r.problem, r.location_id), []).append(r)
        out = []
        for (problem, loc), rs in groups.items():
            devices = {r.device_token for r in rs}
            out.append(
                ReportSummary(
                    problem=problem,  # type: ignore[arg-type]
                    location_id=loc,
                    count=len(rs),
                    devices=len(devices),
                    confirmed=len(devices) >= CONFIRMATIONS_NEEDED,
                    latest=max(r.created_at for r in rs),
                )
            )
        return sorted(out, key=lambda s: s.latest, reverse=True)

    # ---- Questions -------------------------------------------------------------------------------------

    def add_question(self, talk_id: str, text: str, asked_at: datetime | None) -> Question:
        q = Question(f"q-{uuid.uuid4().hex[:8]}", talk_id, text.strip(), asked_at or self.clock())
        self.questions.append(q)
        return q

    def read_out(self, talk_id: str, question_id: str, when: datetime | None = None) -> Question | None:
        q = next((x for x in self.questions if x.id == question_id and x.talk_id == talk_id), None)
        if q and q.read_out_at is None:
            q.read_out_at = when or self.clock()
        return q


def floor_of(target: str) -> int | None:
    if target.startswith("path-floor-") and target[-1:].isdigit() and int(target[-1]) in FLOORS:
        return int(target[-1])
    return None


def parse_hhmm(value: str) -> tuple[int, int] | None:
    try:
        h, m = value.split(":")
        h, m = int(h), int(m)
    except ValueError:
        return None
    return (h, m) if 0 <= h < 24 and 0 <= m < 60 else None


def report_to_change(problem: str, location_id: str) -> ChangeCreate | None:
    """A confirmed report becomes a venue change only when it changes routes. Loud rooms and missing captions
    are shown to the access team instead."""
    if location_id.startswith("elevator-") and problem in ("elevator_not_working", "path_blocked"):
        return ChangeCreate(type="elevator_down", target=location_id[-1])
    if problem == "path_blocked" and floor_of(location_id) is not None:
        return ChangeCreate(type="path_blocked", target=location_id)
    return None
