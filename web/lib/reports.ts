/**
 * Part B: reporting a problem. Choices only, no typing, and nothing that identifies the person.
 *
 * This demo keeps reports on the device. The real app would POST {problem, location, deviceToken} and act only
 * when a second device reports the same thing, so a report screen must never claim it was sent or confirmed.
 */
import { createDemoVenue } from "./fixtures/venue";
import type { ElevatorId, NavigationGraph, ReportProblem } from "./types";

export const DEVICE_TOKEN_KEY = "curbcut.v1.device";
/** How many separate reports of the same problem and place the real app waits for before it reroutes anyone. */
export const CONFIRMATIONS_NEEDED = 2;

export interface ProblemChoice {
  problem: ReportProblem;
  label: string;
  /** Plain line under the label. No medical words, no reason asked for. */
  detail: string;
  icon: string;
}

export const PROBLEM_CHOICES: ProblemChoice[] = [
  { problem: "elevator_not_working", label: "Elevator not working", detail: "An elevator is out of service or stuck.", icon: "⇅" },
  { problem: "path_blocked", label: "Path blocked", detail: "A corridor or ramp is blocked.", icon: "⛌" },
  { problem: "too_loud", label: "Too loud", detail: "A room or area is much louder than expected.", icon: "))" },
  { problem: "no_captions", label: "No captions", detail: "Captions were promised but are not running.", icon: "CC" },
];

export function problemLabel(problem: ReportProblem): string {
  return PROBLEM_CHOICES.find((c) => c.problem === problem)?.label ?? problem;
}

export interface ReportLocation {
  id: string;
  label: string;
  /** Set when the place is an elevator, so a confirmed report can change that elevator's status. */
  elevatorId?: ElevatorId;
}

export const FLOOR_PATHS: ReportLocation[] = [1, 2, 3].map((floor) => ({
  id: `path-floor-${floor}`,
  label: `Floor ${floor} path`,
}));

export function elevatorLocations(graph: NavigationGraph = createDemoVenue()): ReportLocation[] {
  return (Object.keys(graph.elevators) as ElevatorId[])
    .sort()
    .map((id) => ({ id: `elevator-${id}`, label: `Elevator ${id}`, elevatorId: id }));
}

export function roomLocations(graph: NavigationGraph = createDemoVenue()): ReportLocation[] {
  return graph.nodes
    .filter((n) => n.kind === "room" || n.kind === "quiet_room")
    .map((n) => ({ id: n.id, label: n.label }));
}

/** The places worth offering for this problem, so the list stays short and nobody has to type. */
export function locationsFor(problem: ReportProblem, graph: NavigationGraph = createDemoVenue()): ReportLocation[] {
  switch (problem) {
    case "elevator_not_working":
      return elevatorLocations(graph);
    case "path_blocked":
      return [...FLOOR_PATHS, ...elevatorLocations(graph)];
    case "too_loud":
    case "no_captions":
      return roomLocations(graph);
  }
}

export function locationLabel(locationId: string, graph: NavigationGraph = createDemoVenue()): string {
  const all = [...elevatorLocations(graph), ...FLOOR_PATHS, ...roomLocations(graph)];
  return all.find((l) => l.id === locationId)?.label ?? locationId;
}

export function elevatorForLocation(locationId: string): ElevatorId | null {
  const match = /^elevator-([ABC])$/.exec(locationId);
  return match ? (match[1] as ElevatorId) : null;
}

/**
 * A random string kept on this device so the real backend could count two separate reports without knowing who
 * sent either. It is not derived from anything about the person. Returns null when storage is unavailable.
 */
export function deviceToken(): string | null {
  try {
    if (typeof window === "undefined") return null;
    const existing = window.localStorage.getItem(DEVICE_TOKEN_KEY);
    if (existing) return existing;
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    window.localStorage.setItem(DEVICE_TOKEN_KEY, token);
    return token;
  } catch {
    return null;
  }
}
