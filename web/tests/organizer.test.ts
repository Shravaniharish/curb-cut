import { describe, expect, it } from "vitest";
import { accessGaps, elevatorDownImpact, venueStatus } from "@/lib/organizer";
import { DEMO_PERSONAS } from "@/lib/fixtures/personas";
import { DEMO_TALKS } from "@/lib/fixtures/talks";
import { createDemoVenue, DEMO_START_LOCATION_ID } from "@/lib/fixtures/venue";
import { zonedToUtcIso, CONFERENCE_DATE } from "@/lib/time";

const NOW = zonedToUtcIso(CONFERENCE_DATE, "13:30");

describe("venue status", () => {
  it("lists each floor top first with the elevators that stop there", () => {
    const floors = venueStatus(createDemoVenue({ A: "working", B: "out_of_service", C: "working" }));
    expect(floors.map((f) => f.floor)).toEqual([3, 2, 1]);
    expect(floors[0].elevators).toContainEqual({ id: "B", status: "out_of_service" });
  });
});

describe("access gaps", () => {
  it("counts unknown as a gap", () => {
    const gaps = Object.fromEntries(accessGaps(DEMO_TALKS).map((g) => [g.id, g.talks.map((t) => t.id)]));
    expect(gaps.no_captions).toEqual(["talk-rbac", "talk-qa"]);
    expect(gaps.room_not_step_free).toEqual(["talk-qa"]);
    expect(gaps.slides_not_verified).not.toContain("talk-supply-chain");
    expect(gaps.interpreter_not_step_free).toEqual([]);
  });

  it("writes the count into a plain sentence", () => {
    const [captions] = accessGaps(DEMO_TALKS);
    expect(captions.summary).toBe("2 talks have no confirmed captions");
  });
});

describe("elevator down impact", () => {
  const allWorking = createDemoVenue({ A: "working", B: "working", C: "working" });

  it("finds the demo attendees whose route used Elevator B and re-plans each one", () => {
    const r = elevatorDownImpact(DEMO_PERSONAS, DEMO_TALKS, allWorking, "B", NOW, DEMO_START_LOCATION_ID);
    expect(r.checked).toBe(3);
    expect(r.affected).toBeGreaterThanOrEqual(1);
    expect(r.replanned).toBe(r.affected);
  });

  it("affects nobody when the elevator was already down", () => {
    const bDown = createDemoVenue({ A: "working", B: "out_of_service", C: "working" });
    expect(elevatorDownImpact(DEMO_PERSONAS, DEMO_TALKS, bDown, "B", NOW, DEMO_START_LOCATION_ID).affected).toBe(0);
  });
});
