"""DEMO DATA. A small invented venue, the same one the web app uses. Not the real Salt Palace floor plan.

Ids match ``web/lib/fixtures/venue.ts`` so the browser and the API talk about the same places.
"""

from __future__ import annotations

from dataclasses import dataclass

PROVENANCE = "Curb Cut demo venue (invented for the hackathon; not a real floor plan)"
DEFAULT_ELEVATORS = {"A": "working", "B": "out_of_service", "C": "working"}


@dataclass(frozen=True)
class Node:
    id: str
    label: str
    floor: int
    kind: str
    elevator_id: str | None = None


@dataclass(frozen=True)
class Edge:
    from_id: str
    to_id: str
    kind: str  # walk | elevator | stairs
    minutes: int
    step_free: str  # confirmed | unavailable | unknown
    instruction: str
    reverse_instruction: str | None = None
    elevator_id: str | None = None

    @property
    def id(self) -> str:
        return f"{self.from_id}--{self.to_id}"


NODES: list[Node] = [
    Node("room-251", "Room 251", 2, "room"),
    Node("coffee-2", "Coffee station (Floor 2)", 2, "corridor"),
    Node("quiet-room-2", "Quiet room (Floor 2)", 2, "quiet_room"),
    Node("elev-a-2", "Elevator A (Floor 2)", 2, "elevator", "A"),
    Node("elev-b-2", "Elevator B (Floor 2)", 2, "elevator", "B"),
    Node("elev-c-2", "Elevator C (Floor 2)", 2, "elevator", "C"),
    Node("room-355", "Room 355", 3, "room"),
    Node("quiet-room-3", "Quiet room (Floor 3)", 3, "quiet_room"),
    Node("elev-a-3", "Elevator A (Floor 3)", 3, "elevator", "A"),
    Node("elev-b-3", "Elevator B (Floor 3)", 3, "elevator", "B"),
    Node("elev-c-3", "Elevator C (Floor 3)", 3, "elevator", "C"),
    Node("ballroom-e", "Ballroom E", 1, "room"),
    Node("quiet-room-1", "Quiet room (Floor 1)", 1, "quiet_room"),
    Node("elev-a-1", "Elevator A (Floor 1)", 1, "elevator", "A"),
    Node("elev-b-1", "Elevator B (Floor 1)", 1, "elevator", "B"),
]


def _walk(a: str, b: str, minutes: int, ins: str, rev: str) -> Edge:
    return Edge(a, b, "walk", minutes, "confirmed", ins, rev)


def _ride(a: str, b: str, elevator: str, floor: int) -> Edge:
    back = 2 if floor == 3 else 1 if floor == 2 else floor
    return Edge(
        a, b, "elevator", 1, "confirmed",
        f"Take Elevator {elevator} to Floor {floor}.",
        f"Take Elevator {elevator} to Floor {back}.",
        elevator,
    )  # fmt: skip


EDGES: list[Edge] = [
    _walk("room-251", "coffee-2", 2, "Exit Room 251 and turn left.", "Enter the corridor and head to Room 251."),
    _walk("coffee-2", "elev-c-2", 1, "Go past the coffee station to Elevator C.", "Leave Elevator C and go past the coffee station."),
    _walk("coffee-2", "elev-a-2", 2, "Go past the coffee station to Elevator A.", "Leave Elevator A and go past the coffee station."),
    _walk("room-251", "elev-b-2", 1, "Exit Room 251 and turn right to Elevator B.", "Leave Elevator B and turn left to Room 251."),
    _walk("room-251", "quiet-room-2", 2, "Exit Room 251 and follow the signs to the quiet room.", "Leave the quiet room and follow the signs to Room 251."),
    _walk("elev-c-3", "room-355", 2, "Turn right. Room 355 is the second door on your left.", "Leave Room 355 and go to Elevator C."),
    _walk("elev-b-3", "room-355", 1, "Room 355 is directly ahead of Elevator B.", "Leave Room 355 and go to Elevator B."),
    _walk("elev-a-3", "elev-c-3", 3, "Walk along the corridor to Elevator C's lobby.", "Walk along the corridor to Elevator A's lobby."),
    _walk("room-355", "quiet-room-3", 2, "Leave Room 355 and follow the signs to the quiet room.", "Leave the quiet room and follow the signs to Room 355."),
    _walk("ballroom-e", "elev-a-1", 2, "Leave Ballroom E and go to Elevator A.", "Leave Elevator A and go to Ballroom E."),
    _walk("ballroom-e", "elev-b-1", 1, "Leave Ballroom E and go to Elevator B.", "Leave Elevator B and go to Ballroom E."),
    _walk("ballroom-e", "quiet-room-1", 3, "Leave Ballroom E and follow the signs to the quiet room.", "Leave the quiet room and follow the signs to Ballroom E."),
    _ride("elev-a-1", "elev-a-2", "A", 2),
    _ride("elev-a-2", "elev-a-3", "A", 3),
    _ride("elev-b-1", "elev-b-2", "B", 2),
    _ride("elev-b-2", "elev-b-3", "B", 3),
    _ride("elev-c-2", "elev-c-3", "C", 3),
    # A staircase shortcut. It is never used for step-free routing.
    Edge(
        "room-251", "room-355", "stairs", 2, "unavailable",
        "Take the stairs up one floor to Room 355.",
        "Take the stairs down one floor to Room 251.",
    ),  # fmt: skip
]

NODE_BY_ID = {n.id: n for n in NODES}
