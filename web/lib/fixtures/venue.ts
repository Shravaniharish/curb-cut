/**
 * DEMO FIXTURE. A small invented venue graph used to exercise routing. It is NOT the real Salt Palace floor plan,
 * and the elevator status below is simulated, not live telemetry. Never present a route from this graph as
 * physically verified.
 */
import type { ElevatorId, ElevatorStatus, GraphEdge, GraphNode, NavigationGraph, Provenance } from "../types";

export const VENUE_PROVENANCE: Provenance = {
  kind: "demo_fixture",
  source: "Curb Cut demo venue (invented for the hackathon; not a real floor plan)",
  sampleFields: ["nodes", "edges", "elevators"],
};

export const DEMO_START_LOCATION_ID = "room-251";

/** Simulated scenario: Elevator B is not working. Real status would come from Part B. */
export const DEMO_ELEVATOR_STATUS: Record<ElevatorId, ElevatorStatus> = {
  A: "working",
  B: "out_of_service",
  C: "working",
};

const nodes: GraphNode[] = [
  { id: "room-251", label: "Room 251", floor: 2, kind: "room" },
  { id: "coffee-2", label: "Coffee station (Floor 2)", floor: 2, kind: "corridor" },
  { id: "quiet-room-2", label: "Quiet room (Floor 2)", floor: 2, kind: "quiet_room" },
  { id: "elev-a-2", label: "Elevator A (Floor 2)", floor: 2, kind: "elevator", elevatorId: "A" },
  { id: "elev-b-2", label: "Elevator B (Floor 2)", floor: 2, kind: "elevator", elevatorId: "B" },
  { id: "elev-c-2", label: "Elevator C (Floor 2)", floor: 2, kind: "elevator", elevatorId: "C" },
  { id: "room-355", label: "Room 355", floor: 3, kind: "room" },
  { id: "quiet-room-3", label: "Quiet room (Floor 3)", floor: 3, kind: "quiet_room" },
  { id: "elev-a-3", label: "Elevator A (Floor 3)", floor: 3, kind: "elevator", elevatorId: "A" },
  { id: "elev-b-3", label: "Elevator B (Floor 3)", floor: 3, kind: "elevator", elevatorId: "B" },
  { id: "elev-c-3", label: "Elevator C (Floor 3)", floor: 3, kind: "elevator", elevatorId: "C" },
  { id: "ballroom-e", label: "Ballroom E", floor: 1, kind: "room" },
  { id: "quiet-room-1", label: "Quiet room (Floor 1)", floor: 1, kind: "quiet_room" },
  { id: "elev-a-1", label: "Elevator A (Floor 1)", floor: 1, kind: "elevator", elevatorId: "A" },
  { id: "elev-b-1", label: "Elevator B (Floor 1)", floor: 1, kind: "elevator", elevatorId: "B" },
];

const walk = (
  from: string,
  to: string,
  minutes: number,
  instruction: string,
  reverseInstruction?: string,
): GraphEdge => ({ from, to, kind: "walk", minutes, stepFree: "confirmed", instruction, reverseInstruction });

const ride = (from: string, to: string, elevatorId: ElevatorId, floor: number): GraphEdge => ({
  from,
  to,
  kind: "elevator",
  minutes: 1,
  stepFree: "confirmed",
  elevatorId,
  instruction: `Take Elevator ${elevatorId} to Floor ${floor}.`,
  reverseInstruction: `Take Elevator ${elevatorId} to Floor ${floor === 3 ? 2 : floor === 2 ? 1 : floor}.`,
});

const edges: GraphEdge[] = [
  // Floor 2
  walk("room-251", "coffee-2", 2, "Exit Room 251 and turn left.", "Enter the corridor and head to Room 251."),
  walk("coffee-2", "elev-c-2", 1, "Go past the coffee station to Elevator C.", "Leave Elevator C and go past the coffee station."),
  walk("coffee-2", "elev-a-2", 2, "Go past the coffee station to Elevator A.", "Leave Elevator A and go past the coffee station."),
  walk("room-251", "elev-b-2", 1, "Exit Room 251 and turn right to Elevator B.", "Leave Elevator B and turn left to Room 251."),
  walk("room-251", "quiet-room-2", 2, "Exit Room 251 and follow the signs to the quiet room.", "Leave the quiet room and follow the signs to Room 251."),
  // Floor 3
  walk("elev-c-3", "room-355", 2, "Turn right. Room 355 is the second door on your left.", "Leave Room 355 and go to Elevator C."),
  walk("elev-b-3", "room-355", 1, "Room 355 is directly ahead of Elevator B.", "Leave Room 355 and go to Elevator B."),
  walk("elev-a-3", "elev-c-3", 3, "Walk along the corridor to Elevator C's lobby.", "Walk along the corridor to Elevator A's lobby."),
  walk("room-355", "quiet-room-3", 2, "Leave Room 355 and follow the signs to the quiet room.", "Leave the quiet room and follow the signs to Room 355."),
  // Floor 1
  walk("ballroom-e", "elev-a-1", 2, "Leave Ballroom E and go to Elevator A.", "Leave Elevator A and go to Ballroom E."),
  walk("ballroom-e", "elev-b-1", 1, "Leave Ballroom E and go to Elevator B.", "Leave Elevator B and go to Ballroom E."),
  walk("ballroom-e", "quiet-room-1", 3, "Leave Ballroom E and follow the signs to the quiet room.", "Leave the quiet room and follow the signs to Ballroom E."),
  // Elevator rides
  ride("elev-a-1", "elev-a-2", "A", 2),
  ride("elev-a-2", "elev-a-3", "A", 3),
  ride("elev-b-1", "elev-b-2", "B", 2),
  ride("elev-b-2", "elev-b-3", "B", 3),
  ride("elev-c-2", "elev-c-3", "C", 3),
  // A staircase shortcut. It is never used for step-free routing.
  {
    from: "room-251",
    to: "room-355",
    kind: "stairs",
    minutes: 2,
    stepFree: "unavailable",
    instruction: "Take the stairs up one floor to Room 355.",
    reverseInstruction: "Take the stairs down one floor to Room 251.",
  },
];

export function createDemoVenue(
  elevators: Record<ElevatorId, ElevatorStatus> = DEMO_ELEVATOR_STATUS,
): NavigationGraph {
  return { nodes, edges, elevators: { ...elevators }, provenance: VENUE_PROVENANCE };
}

export function roomLabel(id: string, graph: NavigationGraph = createDemoVenue()): string {
  return graph.nodes.find((n) => n.id === id)?.label ?? id;
}

export function roomFloor(id: string, graph: NavigationGraph = createDemoVenue()): number | null {
  return graph.nodes.find((n) => n.id === id)?.floor ?? null;
}

/** Places a person can navigate to (rooms and quiet rooms). */
export function destinations(graph: NavigationGraph = createDemoVenue()): GraphNode[] {
  return graph.nodes.filter((n) => n.kind === "room" || n.kind === "quiet_room");
}
