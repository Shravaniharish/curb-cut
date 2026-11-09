import { describe, expect, it } from "vitest";
import {
  BREAK_MINUTES,
  buildBreakNowAlert,
  buildElevatorDownAlert,
  buildElevatorFixedAlert,
  buildMissedTalkAlert,
  buildRunningLateAlert,
  elevatorsUsed,
  nearestQuietRoom,
  originTag,
  otherOptions,
  routeTo,
  talkInFocus,
  talkJustMissed,
} from "@/lib/changes";
import type { PlanContext } from "@/lib/changes";
import { agendaTalks, buildAgenda, checkRequirements } from "@/lib/agenda";
import { DEMO_PERSONAS } from "@/lib/fixtures/personas";
import { DEMO_TALKS } from "@/lib/fixtures/talks";
import { DEMO_ELEVATOR_STATUS, createDemoVenue } from "@/lib/fixtures/venue";
import { CONFERENCE_DATE, zonedToUtcIso } from "@/lib/time";
import { locationsFor, elevatorForLocation, locationLabel } from "@/lib/reports";
import type { AttendeePreferences, ElevatorId, ElevatorStatus } from "@/lib/types";

const prefsOf = (id: "marcus" | "priya" | "sam"): AttendeePreferences => DEMO_PERSONAS.find((p) => p.id === id)!.prefs;
const ALL_WORKING: Record<ElevatorId, ElevatorStatus> = { A: "working", B: "working", C: "working" };

function context(
  persona: "marcus" | "priya" | "sam",
  time: string,
  elevators: Partial<Record<ElevatorId, ElevatorStatus>> = {},
  currentLocationId = "room-251",
): PlanContext {
  const prefs = prefsOf(persona);
  const graph = createDemoVenue({ ...ALL_WORKING, ...elevators });
  // The plan is the one the app shows at the start of the demo (Elevator B out of service), so a test about a
  // change starts from the same plan the attendee was holding when the change arrived.
  const planGraph = createDemoVenue(DEMO_ELEVATOR_STATUS);
  const agenda = buildAgenda({ prefs, talks: DEMO_TALKS, graph: planGraph, startLocationId: currentLocationId });
  return {
    prefs,
    talks: DEMO_TALKS,
    graph,
    plan: agendaTalks(agenda.items, DEMO_TALKS),
    nowIso: zonedToUtcIso(CONFERENCE_DATE, time),
    currentLocationId,
  };
}

describe("plan context helpers", () => {
  it("puts the next unstarted talk in focus, and the last started one as the one just missed", () => {
    const before = context("marcus", "13:30");
    expect(talkInFocus(before)?.id).toBe("talk-supply-chain");
    const between = context("marcus", "14:50");
    expect(talkInFocus(between)?.id).toBe("talk-observability");
    expect(talkJustMissed(between)?.id).toBe("talk-supply-chain");
  });

  it("names the elevators a route actually rides", () => {
    const withB = context("marcus", "13:30");
    const route = routeTo(withB, "room-355");
    expect(route.ok && elevatorsUsed(route, withB.graph)).toEqual(["B"]);
    const withoutB = context("marcus", "13:30", { B: "out_of_service" });
    const rerouted = routeTo(withoutB, "room-355");
    expect(rerouted.ok && elevatorsUsed(rerouted, withoutB.graph)).toEqual(["C"]);
  });
});

describe("event change: an elevator stops working", () => {
  it("gives Marcus the replacement elevator, the new leave-by time and a step-free trip in words", () => {
    const ctx = context("marcus", "13:30", { B: "out_of_service" });
    const alert = buildElevatorDownAlert(ctx, "B");
    expect(alert.origin).toBe("event");
    expect(alert.whatChanged).toBe("Elevator B is not working.");
    expect(alert.whatStays).toBe("Your talk is still at 2:00 PM in Room 355.");
    expect(alert.doNow).toBe("Use Elevator C. Leave by 1:48 PM. 6 minutes, step-free.");
    expect(alert.destinationRoomId).toBe("room-355");
    expect(alert.simulated).toBe(true);
  });

  it("never offers a route when no step-free route is left, and says so instead", () => {
    const ctx = context("marcus", "13:30", { A: "out_of_service", B: "out_of_service", C: "out_of_service" });
    const alert = buildElevatorDownAlert(ctx, "C");
    expect(alert.doNow).toContain("cannot confirm a route");
    expect(alert.doNow).not.toMatch(/Leave by/);
    expect(alert.leaveByIso).toBeNull();
    // What stays the same is still answered, even when there is no route.
    expect(alert.whatStays).toBe("Your talk is still at 2:00 PM in Room 355.");
  });

  it("tells Marcus when an elevator on his route is working again", () => {
    const ctx = context("marcus", "13:30");
    const alert = buildElevatorFixedAlert(ctx, "B");
    expect(alert.kind).toBe("elevator_fixed");
    expect(alert.whatChanged).toBe("Elevator B is working again.");
    expect(alert.doNow).toContain("You can use Elevator B again.");
  });
});

describe("my plans changed: running late", () => {
  it("keeps the talk when enough of it is left", () => {
    const alert = buildRunningLateAlert(context("marcus", "13:30", { B: "out_of_service" }), 10);
    expect(alert.origin).toBe("personal");
    expect(alert.whatChanged).toBe("You'll arrive 10 minutes late to Securing Your Supply Chain Without Slowing Down.");
    expect(alert.whatStays).toBe("Your 3:00 PM talk is unchanged.");
    expect(alert.doNow).toBe("You can still join. Leave now. 6 minutes, step-free. Or see a later talk on the same topic.");
  });

  it("offers something else when almost nothing would be left of the talk", () => {
    // The first talk now ends at 2:10 PM; arriving at 2:15 PM would leave nothing, so it is not worth the trip.
    const base = context("marcus", "13:30", { B: "out_of_service" });
    const short = base.talks.map((t) => (t.id === "talk-supply-chain" ? { ...t, end: zonedToUtcIso(CONFERENCE_DATE, "14:10") } : t));
    const ctx = { ...base, talks: short, plan: base.plan.map((t) => short.find((x) => x.id === t.id)!) };
    const alert = buildRunningLateAlert(ctx, 15);
    expect(alert.whatChanged).toContain("15 minutes or more");
    expect(alert.doNow).toMatch(/Most of .* would be over\./);
  });

  it("says 15 minutes or more rather than inventing a number", () => {
    const alert = buildRunningLateAlert(context("marcus", "13:30"), 15);
    expect(alert.whatChanged).toContain("15 minutes or more late");
  });
});

describe("my plans changed: missed it", () => {
  it("offers a later talk and keeps the transcript of what was missed", () => {
    const ctx = context("marcus", "14:50");
    const alert = buildMissedTalkAlert(ctx);
    expect(alert.whatChanged).toBe("You missed Securing Your Supply Chain Without Slowing Down.");
    expect(alert.transcriptTalkId).toBe("talk-supply-chain");
    expect(alert.doNow).toContain("A transcript of what you missed is also available.");
    expect(alert.talkId).toBe("talk-observability");
  });

  it("never sends Priya to a talk with no captions", () => {
    const ctx = context("priya", "14:50");
    const alert = buildMissedTalkAlert(ctx, "talk-supply-chain");
    expect(alert.doNow).not.toContain("Supply Chain Security Q&A"); // that one has no captions
    if (alert.talkId) {
      const talk = DEMO_TALKS.find((t) => t.id === alert.talkId)!;
      expect(checkRequirements(talk, ctx.prefs).eligible).toBe(true);
    }
  });
});

describe("my plans changed: I need a break now", () => {
  it("adds a 20 minute quiet break at the nearest quiet room and says what still fits", () => {
    const ctx = context("sam", "13:30");
    const alert = buildBreakNowAlert(ctx);
    expect(alert.kind).toBe("break_now");
    expect(alert.whatChanged).toBe(`Quiet break added now, Quiet room (Floor 2), ${BREAK_MINUTES} minutes.`);
    expect(alert.destinationRoomId).toBe("quiet-room-2");
    expect(alert.doNow).toContain("Head to the quiet room, 2 minutes");
    expect(alert.whatStays).toMatch(/You still see .* at 2:00 PM\.|Everything after the break stays in your plan\./);
  });

  it("picks the quiet room that can be reached step-free from where the attendee is", () => {
    const quiet = nearestQuietRoom(context("marcus", "13:30", {}, "ballroom-e"));
    expect(quiet?.roomId).toBe("quiet-room-1");
    expect(quiet?.stepFree).toBe(true);
    expect(quiet?.walkMinutes).toBe(3);
  });
});

describe("other options", () => {
  it("only offers talks that confirm the required needs and can be reached in time", () => {
    const ctx = context("priya", "13:30");
    const options = otherOptions(ctx);
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(checkRequirements(option.talk, ctx.prefs).eligible).toBe(true);
      expect(new Date(option.talk.start).getTime()).toBeGreaterThan(new Date(ctx.nowIso).getTime());
      expect(option.why.length).toBeGreaterThan(0);
    }
    expect(options.map((o) => o.talk.id)).not.toContain("talk-qa"); // no captions
  });

  it("leaves out a talk the alert already points at, and never more than three", () => {
    const ctx = context("sam", "13:30");
    const options = otherOptions(ctx, ["talk-supply-chain"]);
    expect(options.map((o) => o.talk.id)).not.toContain("talk-supply-chain");
    expect(options.length).toBeLessThanOrEqual(3);
  });

  it("returns nothing once everything has started", () => {
    expect(otherOptions(context("marcus", "16:30"))).toEqual([]);
  });
});

describe("wording and report choices", () => {
  it("tags where a change came from in words", () => {
    expect(originTag("event")).toBe("Event change");
    expect(originTag("personal")).toBe("Your change");
  });

  it("offers elevators for an elevator report and rooms for a captions report, with no free text", () => {
    expect(locationsFor("elevator_not_working").map((l) => l.label)).toEqual(["Elevator A", "Elevator B", "Elevator C"]);
    expect(locationsFor("no_captions").map((l) => l.label)).toContain("Room 355");
    expect(locationsFor("path_blocked").map((l) => l.id)).toContain("path-floor-2");
    expect(elevatorForLocation("elevator-C")).toBe("C");
    expect(elevatorForLocation("room-251")).toBeNull();
    expect(locationLabel("path-floor-3")).toBe("Floor 3 path");
  });
});
