"""DEMO DATA. The four sample talks, the same ones the web app uses. Not a real conference programme.

Times are the conference's local time (America/Denver), Monday 9 November 2026.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

CONFERENCE_TZ = ZoneInfo("America/Denver")
CONFERENCE_DATE = (2026, 11, 9)


def at(hour: int, minute: int = 0) -> datetime:
    y, m, d = CONFERENCE_DATE
    return datetime(y, m, d, hour, minute, tzinfo=CONFERENCE_TZ)


@dataclass(frozen=True)
class Access:
    step_free_entrance: str = "unknown"
    captions: str = "unknown"
    slide_descriptions: str = "unknown"
    front_seating: str = "unknown"
    interpreter: str = "unknown"
    quiet_room_id: str | None = None
    quiet_room_walk_minutes: int | None = None
    noise: str = "unknown"
    crowd: str = "unknown"


@dataclass(frozen=True)
class Talk:
    id: str
    title: str
    start: datetime
    end: datetime
    room_id: str
    floor: int
    topics: tuple[str, ...]
    access: Access
    backup_talk_ids: tuple[str, ...] = field(default_factory=tuple)
    abstract: str = ""
    full: bool = False


TALKS: list[Talk] = [
    Talk(
        "talk-supply-chain", "Securing Your Supply Chain Without Slowing Down",
        at(14), at(14, 40), "room-355", 3, ("Security",),
        Access("confirmed", "live_captioner", "verified", "available", "unavailable", "quiet-room-3", 2, "medium", "high"),
        ("talk-rbac",),
        "How to know what is inside your container images and prove where they came from, step by step, without a slow pipeline.",
    ),
    Talk(
        "talk-observability", "Observability for Beginners",
        at(15), at(15, 40), "room-251", 2, ("Observability", "Beginner-friendly"),
        Access("confirmed", "automatic", "ai_draft", "unknown", "unknown", "quiet-room-2", 2, "low", "medium"),
        ("talk-qa",),
        "Logs, metrics and traces explained in plain words, with one slow request followed from start to finish.",
    ),
    Talk(
        "talk-rbac", "Kubernetes RBAC in Plain English",
        at(14), at(14, 40), "ballroom-e", 1, ("Security", "Platform engineering", "Beginner-friendly"),
        Access("confirmed", "unknown", "unknown", "available", "unknown", "quiet-room-1", 3, "high", "high"),
        ("talk-supply-chain",),
        "Who can do what, and where: roles and bindings read line by line in everyday language.",
    ),
    Talk(
        "talk-qa", "Supply Chain Security Q&A",
        at(15, 30), at(16), "room-251", 2, ("Security",),
        Access("unknown", "none", "none", "unavailable", "unknown", "quiet-room-2", 2, "medium", "medium"),
        (),
        "Open written and spoken questions on supply chain security. Written questions are taken first.",
    ),
]


def _load_generated() -> list[Talk]:
    """The synthetic programme from ``data/generate.py``. Missing file means demo talks only."""
    path = Path(__file__).with_name("talks_generated.json")
    if not path.exists():
        return []
    out = []
    for r in json.loads(path.read_text()):
        hh, mm = (int(x) for x in r["start"].split(":"))
        eh, em = (int(x) for x in r["end"].split(":"))
        out.append(
            Talk(
                r["id"], r["title"], at(hh, mm), at(eh, em), r["room_id"], r["floor"], tuple(r["topics"]),
                Access(**r["access"]), tuple(r["backup_talk_ids"]), r["abstract"],
            )
        )  # fmt: skip
    return out


TALKS += _load_generated()
TALK_BY_ID = {t.id: t for t in TALKS}
