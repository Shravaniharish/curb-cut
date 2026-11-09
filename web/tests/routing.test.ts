import { describe, expect, it } from "vitest";
import { createDemoVenue } from "@/lib/fixtures/venue";
import { NO_ACCESSIBLE_ROUTE_MESSAGE, calculateRoute } from "@/lib/routing";
import type { ElevatorId, ElevatorStatus } from "@/lib/types";

const venue = (b: ElevatorStatus = "out_of_service", a: ElevatorStatus = "working", c: ElevatorStatus = "working") =>
  createDemoVenue({ A: a, B: b, C: c } as Record<ElevatorId, ElevatorStatus>);

describe("step-free routing", () => {
  it("gives the demo route Room 251 -> Room 355 in 6 minutes avoiding Elevator B", () => {
    const r = calculateRoute(venue(), "room-251", "room-355", { stepFreeRequired: true });
    if (!r.ok) throw new Error("expected a route");
    expect(r.minutes).toBe(6);
    expect(r.steps.map((s) => s.text)).toEqual([
      "Exit Room 251 and turn left.",
      "Go past the coffee station to Elevator C.",
      "Take Elevator C to Floor 3.",
      "Turn right. Room 355 is the second door on your left.",
    ]);
    expect(r.avoidedElevators).toEqual(["B"]);
    expect(r.path).not.toContain("elev-b-2");
  });

  it("uses Elevator B (3 minutes) when it is working, proving the failure changes the route", () => {
    const r = calculateRoute(venue("working"), "room-251", "room-355", { stepFreeRequired: true });
    if (!r.ok) throw new Error("expected a route");
    expect(r.minutes).toBe(3);
    expect(r.path).toContain("elev-b-2");
  });

  it("never uses the stairs shortcut for a step-free trip", () => {
    const r = calculateRoute(venue(), "room-251", "room-355", { stepFreeRequired: true });
    if (!r.ok) throw new Error("expected a route");
    expect(r.steps.some((s) => s.kind === "stairs")).toBe(false);
  });

  it("falls back to Elevator A when B and C are out of service", () => {
    const r = calculateRoute(venue("out_of_service", "working", "out_of_service"), "room-251", "room-355", { stepFreeRequired: true });
    if (!r.ok) throw new Error("expected a route");
    expect(r.path).toContain("elev-a-2");
    expect(r.avoidedElevators.sort()).toEqual(["B", "C"]);
  });

  it("reports no accessible route instead of substituting stairs", () => {
    const r = calculateRoute(venue("out_of_service", "out_of_service", "out_of_service"), "room-251", "room-355", { stepFreeRequired: true });
    expect(r).toEqual({ ok: false, reason: "no_accessible_route", message: NO_ACCESSIBLE_ROUTE_MESSAGE });
    expect(NO_ACCESSIBLE_ROUTE_MESSAGE).toBe("An accessible route could not be confirmed.");
  });

  it("allows the stairs only when step-free is not required", () => {
    const r = calculateRoute(venue("out_of_service", "out_of_service", "out_of_service"), "room-251", "room-355", { stepFreeRequired: false });
    if (!r.ok) throw new Error("expected a route");
    expect(r.minutes).toBe(2);
    expect(r.steps[0].kind).toBe("stairs");
  });

  it("handles unknown locations and same-place trips", () => {
    expect(calculateRoute(venue(), "room-251", "nowhere", { stepFreeRequired: true })).toMatchObject({ ok: false, reason: "unknown_location" });
    expect(calculateRoute(venue(), "room-251", "room-251", { stepFreeRequired: true })).toMatchObject({ ok: true, minutes: 0, steps: [] });
  });

  it("does not treat an edge without confirmed step-free status as usable", () => {
    const graph = venue();
    graph.edges = graph.edges.map((e) => (e.to === "elev-c-2" ? { ...e, stepFree: "unknown" as const } : e));
    const r = calculateRoute(graph, "room-251", "room-355", { stepFreeRequired: true });
    if (!r.ok) throw new Error("expected a route");
    expect(r.path).not.toContain("elev-c-2"); // forced onto the longer Elevator A route
  });

  it("warns when an elevator on the route has unknown status", () => {
    const r = calculateRoute(venue("out_of_service", "working", "unknown"), "room-251", "room-355", { stepFreeRequired: true });
    if (!r.ok) throw new Error("expected a route");
    expect(r.warnings).toEqual(["Elevator C status is unknown. Check it before you go."]);
  });

  it("routes between floors for a different pair (Ballroom E to Room 251)", () => {
    const r = calculateRoute(venue(), "ballroom-e", "room-251", { stepFreeRequired: true });
    if (!r.ok) throw new Error("expected a route");
    expect(r.steps.at(-1)?.text).toBeTruthy();
    expect(r.path[0]).toBe("ballroom-e");
    expect(r.path.at(-1)).toBe("room-251");
  });
});
