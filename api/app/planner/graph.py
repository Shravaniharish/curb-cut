"""Step-free routing over the venue graph (Dijkstra). Pure functions: no I/O, no profile storage.

Same rules as ``web/lib/routing.ts`` so the browser and the API give the same route:
- an elevator that is out of service is never used;
- a step-free route uses only edges confirmed step-free, and never stairs;
- ties are broken by node id so results are deterministic.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.data.venue import EDGES, NODE_BY_ID, NODES, Edge

NO_ACCESSIBLE_ROUTE = "An accessible route could not be confirmed."


@dataclass(frozen=True)
class Graph:
    elevators: dict[str, str]
    blocked_floors: frozenset[int] = field(default_factory=frozenset)

    def with_elevator(self, elevator_id: str, status: str) -> Graph:
        return Graph({**self.elevators, elevator_id: status}, self.blocked_floors)

    def with_floor_blocked(self, floor: int, blocked: bool) -> Graph:
        floors = set(self.blocked_floors)
        (floors.add if blocked else floors.discard)(floor)
        return Graph(self.elevators, frozenset(floors))

    def edge_blocked(self, edge: Edge) -> bool:
        if edge.elevator_id and self.elevators.get(edge.elevator_id) == "out_of_service":
            return True
        if edge.kind == "walk":
            a, b = NODE_BY_ID[edge.from_id], NODE_BY_ID[edge.to_id]
            return a.floor == b.floor and a.floor in self.blocked_floors
        return False


@dataclass(frozen=True)
class Step:
    index: int
    text: str
    minutes: int
    kind: str


@dataclass(frozen=True)
class Route:
    from_id: str
    to_id: str
    minutes: int
    step_free: bool
    steps: tuple[Step, ...]
    path: tuple[str, ...]

    @property
    def elevators_used(self) -> list[str]:
        """Elevators ridden, in order, from the path: a ride is two consecutive nodes of one elevator."""
        used: list[str] = []
        for a, b in zip(self.path, self.path[1:], strict=False):
            na, nb = NODE_BY_ID[a], NODE_BY_ID[b]
            if na.elevator_id and na.elevator_id == nb.elevator_id and na.elevator_id not in used:
                used.append(na.elevator_id)
        return used


@dataclass(frozen=True)
class NoRoute:
    reason: str  # no_accessible_route | no_route | unknown_location
    message: str


def find_route(graph: Graph, from_id: str, to_id: str, *, step_free: bool) -> Route | NoRoute:
    if from_id not in NODE_BY_ID or to_id not in NODE_BY_ID:
        return NoRoute("unknown_location", "That location is not in the venue data.")
    if from_id == to_id:
        return Route(from_id, to_id, 0, step_free, (), (from_id,))

    adj: dict[str, list[tuple[str, Edge, bool]]] = {}
    for edge in EDGES:
        if graph.edge_blocked(edge):
            continue
        if step_free and (edge.kind == "stairs" or edge.step_free != "confirmed"):
            continue
        adj.setdefault(edge.from_id, []).append((edge.to_id, edge, True))
        adj.setdefault(edge.to_id, []).append((edge.from_id, edge, False))

    dist = {from_id: 0}
    prev: dict[str, tuple[str, Edge, bool]] = {}
    done: set[str] = set()
    while True:
        current = None
        for node_id, d in dist.items():
            if node_id in done:
                continue
            if current is None or d < dist[current] or (d == dist[current] and node_id < current):
                current = node_id
        if current is None or current == to_id:
            break
        done.add(current)
        for nxt, edge, forward in adj.get(current, []):
            nd = dist[current] + edge.minutes
            if nxt not in dist or nd < dist[nxt]:
                dist[nxt] = nd
                prev[nxt] = (current, edge, forward)

    if to_id not in dist:
        if step_free:
            return NoRoute("no_accessible_route", NO_ACCESSIBLE_ROUTE)
        return NoRoute("no_route", "No route could be found between those places.")

    hops: list[tuple[Edge, bool]] = []
    path = [to_id]
    at = to_id
    while at != from_id:
        node, edge, forward = prev[at]
        hops.append((edge, forward))
        path.append(node)
        at = node
    hops.reverse()
    path.reverse()
    steps = tuple(
        Step(
            i + 1,
            e.instruction if fwd else (e.reverse_instruction or e.instruction),
            e.minutes,
            e.kind,
        )
        for i, (e, fwd) in enumerate(hops)
    )
    return Route(from_id, to_id, dist[to_id], step_free, steps, tuple(path))


def default_graph(elevators: dict[str, str] | None = None) -> Graph:
    from app.data.venue import DEFAULT_ELEVATORS

    return Graph(dict(elevators or DEFAULT_ELEVATORS))


ALL_NODE_IDS = [n.id for n in NODES]
