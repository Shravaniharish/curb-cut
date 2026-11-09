import { describe, expect, it } from "vitest";
import { backupFor, buildAgenda, checkRequirements, leaveByForTalk, nowAndNext, whyFits } from "@/lib/agenda";
import { DEMO_PERSONAS } from "@/lib/fixtures/personas";
import { DEMO_TALKS } from "@/lib/fixtures/talks";
import { createDemoVenue } from "@/lib/fixtures/venue";
import { defaultPreferences } from "@/lib/preferences";
import { formatTime, zonedToUtcIso } from "@/lib/time";

const persona = (id: string) => DEMO_PERSONAS.find((p) => p.id === id)!.prefs;
const graph = createDemoVenue();
const run = (prefs = defaultPreferences(), overrides?: { added: string[]; removed: string[] }) =>
  buildAgenda({ prefs, talks: DEMO_TALKS, graph, startLocationId: "room-251", overrides });
const ids = (r: ReturnType<typeof run>) => r.items.flatMap((i) => (i.kind === "talk" ? [i.talkId] : []));

describe("required needs", () => {
  it("does not treat unknown or absent captions as satisfying 'Captions required'", () => {
    const priya = persona("priya");
    const rbac = DEMO_TALKS.find((t) => t.id === "talk-rbac")!;
    const qa = DEMO_TALKS.find((t) => t.id === "talk-qa")!;
    expect(checkRequirements(rbac, priya)).toEqual({ eligible: false, unmet: ["Captions not confirmed"], met: [] });
    expect(checkRequirements(qa, priya).unmet).toEqual(["No captions"]);
  });
  it("accepts live and automatic captions and reports which", () => {
    const priya = persona("priya");
    expect(checkRequirements(DEMO_TALKS[0], priya).met).toEqual(["Live captioner"]);
    expect(checkRequirements(DEMO_TALKS[1], priya).met).toEqual(["Auto captions"]);
  });
  it("does not treat unknown step-free entrance as satisfying 'Step-free routes'", () => {
    const qa = DEMO_TALKS.find((t) => t.id === "talk-qa")!;
    expect(checkRequirements(qa, persona("marcus")).unmet).toEqual(["Step-free entrance not confirmed"]);
  });
  it("lets a perfect topic score never override an unmet required need", () => {
    const prefs = defaultPreferences();
    prefs.required.captions = true;
    prefs.topics = ["Beginner-friendly", "Security", "Platform engineering"]; // RBAC matches all three
    expect(ids(run(prefs))).not.toContain("talk-rbac");
  });
});

describe("agenda selection", () => {
  it("builds Marcus's plan deterministically: supply chain at 2 PM then observability at 3 PM", () => {
    const a = run(persona("marcus"));
    expect(ids(a)).toEqual(["talk-supply-chain", "talk-observability"]);
    expect(a.excluded.find((e) => e.talkId === "talk-qa")?.reasons).toEqual(["Step-free entrance not confirmed"]);
    expect(JSON.stringify(run(persona("marcus")))).toBe(JSON.stringify(a)); // same input, same output
  });
  it("builds Priya's plan from talks that confirm captions only", () => {
    expect(ids(run(persona("priya")))).toEqual(["talk-supply-chain", "talk-observability"]);
  });
  it("resolves the 2 PM clash between two talks by rank, never double-booking", () => {
    const a = run(defaultPreferences());
    expect(ids(a).filter((id) => id === "talk-supply-chain" || id === "talk-rbac")).toHaveLength(1);
  });
  it("drops talks that do not match chosen topics, and includes all eligible when none are chosen", () => {
    const p = defaultPreferences();
    p.topics = ["Networking"];
    expect(ids(run(p))).toEqual([]);
    expect(ids(run(defaultPreferences())).length).toBeGreaterThan(0);
  });
  it("honours user overrides: removed talks vanish and added talks are marked", () => {
    const base = persona("marcus");
    expect(ids(run(base, { added: [], removed: ["talk-supply-chain"] }))).not.toContain("talk-supply-chain");
    const withAdd = run(base, { added: ["talk-qa"], removed: [] });
    const item = withAdd.items.find((i) => i.kind === "talk" && i.talkId === "talk-qa");
    expect(item).toMatchObject({ userAdded: true });
  });
  it("reduces back-to-back sessions when asked", () => {
    const p = persona("marcus");
    p.preferences.reducedBackToBack = true;
    expect(ids(run(p))).toEqual(["talk-observability"]); // 20 min gap is not enough for 7 min travel + 6 buffer + 15
  });
});

describe("quiet breaks", () => {
  it("inserts a quiet break between talks when there is room and the attendee asked for one", () => {
    const sam = run(persona("sam"));
    const brk = sam.items.find((i) => i.kind === "break");
    expect(brk).toMatchObject({ kind: "break", breakKind: "quiet" });
    if (brk?.kind === "break") {
      expect(new Date(brk.end).getTime() - new Date(brk.start).getTime()).toBeGreaterThanOrEqual(10 * 60000);
    }
  });
  it("adds no break when not requested, or when travel leaves no room", () => {
    expect(run(persona("priya")).items.some((i) => i.kind === "break")).toBe(false);
    const p = persona("marcus");
    p.preferences.quietBreaks = true; // step-free + extra time leaves under 10 minutes
    expect(run(p).items.some((i) => i.kind === "break")).toBe(false);
  });
});

describe("leave-by for the next talk", () => {
  it("gives Marcus 'leave by 1:48 PM' for the 2:00 PM talk in Room 355", () => {
    const talk = DEMO_TALKS[0];
    const l = leaveByForTalk(graph, persona("marcus"), "room-251", talk);
    expect(l.travelMinutes).toBe(6);
    expect(l.bufferMinutes).toBe(6);
    expect(formatTime(l.leaveByIso!)).toBe("1:48 PM");
  });
  it("returns no leave-by when step-free is required but no accessible route exists", () => {
    const g = createDemoVenue({ A: "out_of_service", B: "out_of_service", C: "out_of_service" });
    const l = leaveByForTalk(g, persona("marcus"), "room-251", DEMO_TALKS[0]);
    expect(l.leaveByIso).toBeNull();
    expect(l.route.ok).toBe(false);
  });
});

describe("now / next, backup, explanations", () => {
  const plan = run(persona("marcus")).items;
  it("finds the next talk before it starts and the current one while it runs", () => {
    expect(nowAndNext(plan, DEMO_TALKS, zonedToUtcIso("2026-11-09", "13:30")).next?.id).toBe("talk-supply-chain");
    expect(nowAndNext(plan, DEMO_TALKS, zonedToUtcIso("2026-11-09", "14:10")).now?.id).toBe("talk-supply-chain");
    expect(nowAndNext(plan, DEMO_TALKS, zonedToUtcIso("2026-11-09", "16:30"))).toEqual({ now: null, next: null });
  });
  it("offers a backup only if it also meets required needs", () => {
    const supply = DEMO_TALKS[0];
    expect(backupFor(supply, DEMO_TALKS, persona("marcus"), ["talk-supply-chain"])?.id).toBe("talk-rbac");
    expect(backupFor(supply, DEMO_TALKS, persona("priya"), ["talk-supply-chain"])).toBeNull(); // RBAC captions unknown
  });
  it("explains with facts only; unknown values are never listed as matches", () => {
    const why = whyFits(DEMO_TALKS[2], persona("priya")); // RBAC: captions unknown
    expect(why.join(" ")).not.toMatch(/caption/i);
    expect(whyFits(DEMO_TALKS[0], persona("marcus"))).toContain("Matches your interests: Security");
  });
});
