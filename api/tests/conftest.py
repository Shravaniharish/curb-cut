from __future__ import annotations

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.deps import get_store
from app.main import app
from app.services.store import Store

# Mountain time in November is UTC-7, so 13:30 MST is 20:30Z.
NOW = "2026-11-09T20:30:00Z"

MARCUS = {
    "required": {"stepFreeRouting": True, "captions": False},
    "extraTravelTime": True,
    "preferences": {"screenReader": True},
    "notificationStyle": "screen_reader",
    "topics": ["Security", "Observability"],
    "display": {"textScale": 1.2},  # ignored by the API
}
PRIYA = {
    "required": {"captions": True},
    "preferences": {"frontSeating": True},
    "notificationStyle": "vibrate_big_text",
    "topics": [],
}
SAM = {
    "preferences": {"lowSensory": True, "quietBreaks": True},
    "notificationStyle": "calm_step_by_step",
    "topics": [],
}


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 9, 20, 30, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now


@pytest.fixture
def clock() -> Clock:
    return Clock()


@pytest.fixture
def store(clock: Clock) -> Store:
    s = Store(clock=clock)
    s.elevators = {"A": "working", "B": "working", "C": "working"}  # a clean venue; the demo starts with B down
    app.dependency_overrides[get_store] = lambda: s
    yield s
    app.dependency_overrides.clear()


@pytest.fixture
def client(store: Store) -> TestClient:
    return TestClient(app)


def plan_state(talk_ids: list[str], location: str = "room-251", now: str = NOW) -> dict:
    return {"talk_ids": talk_ids, "current_location_id": location, "now": now}
