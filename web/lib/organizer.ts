/**
 * Part C organizer dashboard logic. Pure functions over the same demo talks, venue graph and planner that Parts A
 * and B use, so the dashboard can never disagree with what an attendee's phone shows.
 */
import { buildAgenda, agendaTalks } from "./agenda";
import { routeTo, routeUsedElevator, talkInFocus } from "./changes";
import type { PlanContext } from "./changes";
import type { DemoPersona } from "./fixtures/personas";
import type { ElevatorId, ElevatorStatus, NavigationGraph, Talk } from "./types";

export const ELEVATOR_IDS: ElevatorId[] = ["A", "B", "C"];

/** Status words and a glyph. The colour on screen only repeats what these say. */
export const STATUS_WORDS: Record<ElevatorStatus, { label: string; icon: string; tone: "good" | "bad" | "unknown" }> = {
  working: { label: "OK", icon: "✓", tone: "good" },
  out_of_service: { label: "Not working", icon: "✕", tone: "bad" },
  unknown: { label: "Unknown", icon: "?", tone: "unknown" },
};

export interface FloorStatus {
  floor: number;
  elevators: { id: ElevatorId; status: ElevatorStatus }[];
}

/** Each floor with the elevators that stop there, top floor first. */
export function venueStatus(graph: NavigationGraph): FloorStatus[] {
  const floors = new Map<number, ElevatorId[]>();
  for (const n of graph.nodes) {
    if (n.kind !== "elevator" || !n.elevatorId) continue;
    const list = floors.get(n.floor) ?? [];
    if (!list.includes(n.elevatorId)) list.push(n.elevatorId);
    floors.set(n.floor, list);
  }
  return [...floors.entries()]
    .sort(([a], [b]) => b - a)
    .map(([floor, ids]) => ({ floor, elevators: ids.sort().map((id) => ({ id, status: graph.elevators[id] })) }));
}

export interface AccessGap {
  id: "no_captions" | "slides_not_verified" | "room_not_step_free" | "interpreter_not_step_free";
  /** Sentence with the count, e.g. "1 talk has no captions". */
  summary: string;
  talks: Talk[];
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Access gaps the access team can still fix today. Unknown counts as a gap: if nobody has confirmed captions or a
 * step-free entrance, an attendee cannot rely on it.
 */
export function accessGaps(talks: Talk[]): AccessGap[] {
  const noCaptions = talks.filter((t) => t.access.captions === "none" || t.access.captions === "unknown");
  const slides = talks.filter((t) => t.access.slideDescriptions !== "verified");
  const notStepFree = talks.filter((t) => t.access.stepFreeEntrance !== "confirmed");
  const interpreter = notStepFree.filter((t) => t.access.interpreter === "available");
  return [
    { id: "no_captions", summary: `${count(noCaptions.length, "talk has", "talks have")} no confirmed captions`, talks: noCaptions },
    { id: "slides_not_verified", summary: `${count(slides.length, "talk has", "talks have")} no verified slide descriptions`, talks: slides },
    { id: "room_not_step_free", summary: `${count(notStepFree.length, "talk is", "talks are")} in a room not confirmed step-free`, talks: notStepFree },
    {
      id: "interpreter_not_step_free",
      summary: `${count(interpreter.length, "interpreter talk is", "interpreter talks are")} in a room not confirmed step-free`,
      talks: interpreter,
    },
  ];
}

export interface ReplanCount {
  affected: number;
  replanned: number;
  /** How many demo attendees were checked. */
  checked: number;
}

/**
 * How many demo attendees an elevator going down affects, and how many still get a route that meets their needs.
 *
 * shortcut: counts the 3 demo personas on this device. The real count comes from anonymous acks
 * (`POST /api/changes/{id}/ack`) once Part C's backend exists; swap this for `GET /api/organizer/summary` then.
 */
export function elevatorDownImpact(
  personas: DemoPersona[],
  talks: Talk[],
  graphBefore: NavigationGraph,
  elevatorId: ElevatorId,
  nowIso: string,
  currentLocationId: string,
): ReplanCount {
  const graphAfter: NavigationGraph = { ...graphBefore, elevators: { ...graphBefore.elevators, [elevatorId]: "out_of_service" } };
  let affected = 0;
  let replanned = 0;
  for (const p of personas) {
    const agenda = buildAgenda({ prefs: p.prefs, talks, graph: graphBefore, startLocationId: currentLocationId });
    const before: PlanContext = { prefs: p.prefs, talks, graph: graphBefore, plan: agendaTalks(agenda.items, talks), nowIso, currentLocationId };
    if (!routeUsedElevator(before, elevatorId)) continue;
    affected++;
    const after: PlanContext = { ...before, graph: graphAfter };
    const talk = talkInFocus(after);
    if (talk && routeTo(after, talk.roomId).ok) replanned++;
  }
  return { affected, replanned, checked: personas.length };
}
