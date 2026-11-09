"""The API contract. Every request and response body is defined here, and routers import from here.

Change this file first, in its own small PR (see CLAUDE.md).

Privacy rules that the shapes enforce:
- ``Profile`` is accepted only as a request body for ranking and planning. No router stores or logs it.
- There is no attendee id anywhere. ``device_token`` on a report is a random string made by the app.
- Venue changes, reports, questions and acks carry no name, no needs and no profile.

Naming: the profile is the browser's own ``AttendeePreferences`` JSON (camelCase), so the app sends it unchanged.
Everything else is snake_case.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

# ---- Shared vocabulary -----------------------------------------------------------------------------------

ElevatorId = Literal["A", "B", "C"]
ElevatorStatus = Literal["working", "out_of_service", "unknown"]
StepFree = Literal["confirmed", "unavailable", "unknown"]
Captions = Literal["none", "automatic", "live_captioner", "unknown"]
SlideDescriptions = Literal["none", "ai_draft", "verified", "unknown"]
Topic = Literal[
    "Security", "Observability", "AI", "Platform engineering", "Networking", "Beginner-friendly"
]
NotificationStyle = Literal["vibrate_big_text", "screen_reader", "calm_step_by_step"]
ChangeType = Literal[
    "elevator_down", "elevator_fixed", "path_blocked", "path_cleared", "room_full", "talk_moved"
]
AlertKind = Literal[
    "elevator_down",
    "elevator_fixed",
    "path_blocked",
    "path_cleared",
    "room_full",
    "talk_moved",
    "running_late",
    "missed_talk",
    "break_now",
]
ReportProblem = Literal["elevator_not_working", "path_blocked", "too_loud", "no_captions"]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


# ---- Profile (request only, never stored) ----------------------------------------------------------------


class _CamelIn(BaseModel):
    """Reads the browser's camelCase JSON. Unknown keys (display settings, pronouns...) are ignored."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")


class RequiredNeeds(_CamelIn):
    step_free_routing: bool = False
    captions: bool = False


class OptionalPreferences(_CamelIn):
    interpreter: bool = False
    front_seating: bool = False
    screen_reader: bool = False
    slides_in_advance: bool = False
    low_sensory: bool = False
    quiet_breaks: bool = False
    reduced_back_to_back: bool = False


class Profile(_CamelIn):
    required: RequiredNeeds = Field(default_factory=RequiredNeeds)
    extra_travel_time: bool = False
    preferences: OptionalPreferences = Field(default_factory=OptionalPreferences)
    notification_style: NotificationStyle | None = None
    topics: list[Topic] = Field(default_factory=list, max_length=6)


# ---- Venue and talks -------------------------------------------------------------------------------------


class RoomOut(Strict):
    id: str
    label: str
    floor: int
    kind: Literal["room", "corridor", "elevator", "quiet_room"]
    elevator_id: ElevatorId | None = None


class ConnectorOut(Strict):
    id: str
    kind: Literal["walk", "elevator", "stairs"]
    from_id: str
    to_id: str
    minutes: int
    step_free: StepFree
    elevator_id: ElevatorId | None = None
    blocked: bool = False


class VenueOut(Strict):
    rooms: list[RoomOut]
    connectors: list[ConnectorOut]
    elevators: dict[ElevatorId, ElevatorStatus]
    blocked_floors: list[int]
    provenance: str


class AccessOut(Strict):
    step_free_entrance: StepFree
    captions: Captions
    slide_descriptions: SlideDescriptions
    front_seating: Literal["available", "unavailable", "unknown"]
    interpreter: Literal["available", "unavailable", "unknown"]
    quiet_room_id: str | None
    quiet_room_walk_minutes: int | None


class TalkOut(Strict):
    id: str
    title: str
    start: datetime
    end: datetime
    room_id: str
    floor: int
    topics: list[Topic]
    access: AccessOut
    backup_talk_ids: list[str]
    full: bool = False


# ---- Search ----------------------------------------------------------------------------------------------


class SearchRequest(Strict):
    """Only the query text is sent. Needs are applied on the device afterwards."""

    q: Annotated[str, Field(min_length=1, max_length=200)]


class SearchHit(Strict):
    id: str
    score: float
    why: str | None = None


class SearchResponse(Strict):
    hits: list[SearchHit]
    backend: Literal["local"] = "local"


# ---- Routes, plan, replan --------------------------------------------------------------------------------


class RouteStepOut(Strict):
    index: int
    text: str
    minutes: int
    kind: Literal["walk", "elevator", "stairs"]


class RouteOut(Strict):
    from_id: str
    to_id: str
    minutes: int
    step_free: bool
    steps: list[RouteStepOut]
    path: list[str]
    elevators_used: list[ElevatorId]


class RouteRequest(Strict):
    profile: Profile
    from_id: str
    to_id: str


class RouteResponse(Strict):
    ok: bool
    route: RouteOut | None = None
    reason: Literal["no_accessible_route", "no_route", "unknown_location"] | None = None


class PlanState(Strict):
    """Where the attendee is and what they hold. Sent on every call; the server forgets it."""

    talk_ids: list[str] = Field(max_length=20)
    current_location_id: str
    now: datetime


class PlanSlot(Strict):
    talk: TalkOut
    backup: TalkOut | None = None
    route: RouteOut | None = None
    leave_by: datetime | None = None
    why: list[str]


class PlanRequest(Strict):
    profile: Profile
    current_location_id: str
    now: datetime
    talk_ids: list[str] | None = Field(default=None, max_length=20)


class PlanResponse(Strict):
    slots: list[PlanSlot]
    breaks: list[QuietBreak] = Field(default_factory=list)


class QuietBreak(Strict):
    room_id: str
    start: datetime
    end: datetime


class PersonalChange(Strict):
    type: Literal["late", "missed", "break_now"]
    minutes: Literal[5, 10, 15] | None = None
    talk_id: str | None = None


class ReplanRequest(Strict):
    profile: Profile
    plan: PlanState
    change_id: str | None = None
    personal: PersonalChange | None = None


class AlertOut(Strict):
    kind: AlertKind
    origin: Literal["event", "personal"]
    what_changed: str
    what_stays: str
    do_now: str
    destination_room_id: str | None = None
    leave_by: datetime | None = None
    talk_id: str | None = None
    transcript_talk_id: str | None = None
    route: RouteOut | None = None


class OptionOut(Strict):
    talk: TalkOut
    walk_minutes: int
    step_free: bool
    why: list[str]


class ReplanResponse(Strict):
    affected: bool
    alert: AlertOut | None = None
    plan: list[str]
    options: list[OptionOut] = Field(default_factory=list)


# ---- Changes ---------------------------------------------------------------------------------------------


class ChangeCreate(Strict):
    """What the organizer announces. ``target`` is an elevator id, a floor path id, a talk id or a room id."""

    type: ChangeType
    target: Annotated[str, Field(min_length=1, max_length=60)]
    details: dict[str, str] = Field(default_factory=dict, max_length=6)


class ChangeOut(Strict):
    id: str
    type: ChangeType
    target: str
    details: dict[str, str]
    created_at: datetime
    fixed_at: datetime | None = None


class AckIn(Strict):
    """Anonymous: two numbers, nothing else."""

    affected: bool
    replan_ms: Annotated[int, Field(ge=0, le=600_000)]


class OrganizerSummary(Strict):
    venue: VenueOut
    changes: list[ChangeOut]
    reports: list[ReportSummary]
    acks: AckCounts
    gaps: list[AccessGapOut]


class AckCounts(Strict):
    received: int
    affected: int
    replanned: int
    median_replan_ms: int | None
    max_replan_ms: int | None


class ReportSummary(Strict):
    problem: ReportProblem
    location_id: str
    count: int
    devices: int
    confirmed: bool
    latest: datetime


class AccessGapOut(Strict):
    id: Literal["no_captions", "slides_not_verified", "room_not_step_free", "interpreter_not_step_free"]
    summary: str
    talk_ids: list[str]


# ---- Reports ---------------------------------------------------------------------------------------------


class ReportCreate(Strict):
    problem: ReportProblem
    location_id: Annotated[str, Field(min_length=1, max_length=60)]
    device_token: Annotated[str, Field(min_length=8, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")]


class ReportResult(Strict):
    accepted: bool
    confirmed: bool
    change_id: str | None = None
    needed: int


# ---- Sessions: transcript and written questions ----------------------------------------------------------


class TranscriptChunkOut(Strict):
    talk_id: str
    offset_sec: int
    speaker: str
    text: str


class QuestionCreate(Strict):
    text: Annotated[str, Field(min_length=1, max_length=280)]
    asked_at: datetime | None = None


class QuestionOut(Strict):
    id: str
    talk_id: str
    text: str
    asked_at: datetime
    read_out_at: datetime | None = None


class CatchUpOut(Strict):
    talk_id: str
    at_sec: int
    bullets: list[TranscriptChunkOut]
    method: Literal["recent_lines"]


# Forward references (QuietBreak, AckCounts, ...) are resolved here, after every model exists.
for _model in (PlanResponse, OrganizerSummary):
    _model.model_rebuild()
