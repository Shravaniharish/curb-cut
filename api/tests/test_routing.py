from app.planner.graph import Graph, NoRoute, Route, default_graph, find_route


def test_marcus_route_avoids_elevator_b_when_it_is_down():
    g = default_graph({"A": "working", "B": "out_of_service", "C": "working"})
    r = find_route(g, "room-251", "room-355", step_free=True)
    assert isinstance(r, Route)
    assert r.minutes == 6
    assert [s.text for s in r.steps] == [
        "Exit Room 251 and turn left.",
        "Go past the coffee station to Elevator C.",
        "Take Elevator C to Floor 3.",
        "Turn right. Room 355 is the second door on your left.",
    ]
    assert r.elevators_used == ["C"]


def test_route_uses_elevator_b_when_it_works():
    g = default_graph({"A": "working", "B": "working", "C": "working"})
    r = find_route(g, "room-251", "room-355", step_free=True)
    assert isinstance(r, Route) and r.elevators_used == ["B"] and r.minutes == 3


def test_stairs_are_never_used_for_step_free_even_when_every_elevator_is_down():
    g = default_graph({"A": "out_of_service", "B": "out_of_service", "C": "out_of_service"})
    r = find_route(g, "room-251", "room-355", step_free=True)
    assert isinstance(r, NoRoute) and r.reason == "no_accessible_route"
    # Without a step-free need the staircase is a fair answer.
    walk = find_route(g, "room-251", "room-355", step_free=False)
    assert isinstance(walk, Route) and any(s.kind == "stairs" for s in walk.steps)


def test_blocked_floor_cuts_walking_edges_on_that_floor():
    g = Graph({"A": "working", "B": "working", "C": "working"}, frozenset({3}))
    r = find_route(g, "room-251", "room-355", step_free=True)
    assert isinstance(r, NoRoute)


def test_unknown_place():
    r = find_route(default_graph(), "room-251", "nowhere", step_free=True)
    assert isinstance(r, NoRoute) and r.reason == "unknown_location"
