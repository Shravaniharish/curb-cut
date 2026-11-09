/** Step-free routing over the typed venue graph (Dijkstra). Pure functions; no I/O. */
import type { ElevatorId, GraphEdge, NavigationGraph, RouteResult, RouteStep } from "./types";

export const NO_ACCESSIBLE_ROUTE_MESSAGE = "An accessible route could not be confirmed.";

export interface RouteOptions {
  /** When true, only edges confirmed step-free, and only working or unknown-status elevators, may be used. */
  stepFreeRequired: boolean;
}

/** Whether an edge may be used under the options. Unconfirmed step-free edges are never used for step-free trips. */
export function edgeAllowed(edge: GraphEdge, graph: NavigationGraph, opts: RouteOptions): boolean {
  if (edge.elevatorId && graph.elevators[edge.elevatorId] === "out_of_service") return false;
  if (opts.stepFreeRequired) {
    if (edge.kind === "stairs") return false;
    if (edge.stepFree !== "confirmed") return false;
  }
  return true;
}

function elevatorsOutOfService(graph: NavigationGraph): ElevatorId[] {
  return (Object.keys(graph.elevators) as ElevatorId[]).filter((id) => graph.elevators[id] === "out_of_service");
}

export function calculateRoute(
  graph: NavigationGraph,
  fromId: string,
  toId: string,
  opts: RouteOptions,
): RouteResult {
  const ids = new Set(graph.nodes.map((n) => n.id));
  if (!ids.has(fromId) || !ids.has(toId)) {
    return { ok: false, reason: "unknown_location", message: "That location is not in the venue data." };
  }
  const warnings: string[] = [];
  if (fromId === toId) {
    return {
      ok: true,
      fromId,
      toId,
      minutes: 0,
      stepFree: opts.stepFreeRequired,
      steps: [],
      path: [fromId],
      avoidedElevators: elevatorsOutOfService(graph),
      warnings,
      provenance: graph.provenance,
    };
  }

  // Adjacency over allowed edges (undirected). Each entry remembers the direction it is traversed in.
  const adj = new Map<string, { to: string; edge: GraphEdge; forward: boolean }[]>();
  const push = (a: string, entry: { to: string; edge: GraphEdge; forward: boolean }) => {
    const list = adj.get(a) ?? [];
    list.push(entry);
    adj.set(a, list);
  };
  for (const edge of graph.edges) {
    if (!edgeAllowed(edge, graph, opts)) continue;
    push(edge.from, { to: edge.to, edge, forward: true });
    push(edge.to, { to: edge.from, edge, forward: false });
  }

  const dist = new Map<string, number>([[fromId, 0]]);
  const prev = new Map<string, { node: string; edge: GraphEdge; forward: boolean }>();
  const done = new Set<string>();
  while (true) {
    // Pick the unvisited node with the smallest distance. Ties break on id so results are deterministic.
    let current: string | null = null;
    for (const [id, d] of dist) {
      if (done.has(id)) continue;
      if (current === null || d < dist.get(current)! || (d === dist.get(current) && id < current)) current = id;
    }
    if (current === null || current === toId) break;
    done.add(current);
    for (const { to, edge, forward } of adj.get(current) ?? []) {
      const nd = dist.get(current)! + edge.minutes;
      const known = dist.get(to);
      if (known === undefined || nd < known) {
        dist.set(to, nd);
        prev.set(to, { node: current, edge, forward });
      }
    }
  }

  if (!dist.has(toId)) {
    return opts.stepFreeRequired
      ? { ok: false, reason: "no_accessible_route", message: NO_ACCESSIBLE_ROUTE_MESSAGE }
      : { ok: false, reason: "no_route", message: "No route could be found between those places." };
  }

  const reversed: { edge: GraphEdge; forward: boolean }[] = [];
  const reversedPath: string[] = [toId];
  for (let at = toId; at !== fromId; ) {
    const p = prev.get(at)!;
    reversed.push({ edge: p.edge, forward: p.forward });
    reversedPath.push(p.node);
    at = p.node;
  }
  const steps: RouteStep[] = reversed.reverse().map(({ edge, forward }, i) => ({
    index: i + 1,
    text: forward ? edge.instruction : (edge.reverseInstruction ?? edge.instruction),
    minutes: edge.minutes,
    kind: edge.kind,
  }));
  const unknownElevators = (Object.keys(graph.elevators) as ElevatorId[]).filter(
    (id) => graph.elevators[id] === "unknown" && reversed.some((r) => r.edge.elevatorId === id),
  );
  for (const id of unknownElevators) warnings.push(`Elevator ${id} status is unknown. Check it before you go.`);

  return {
    ok: true,
    fromId,
    toId,
    minutes: dist.get(toId)!,
    stepFree: opts.stepFreeRequired,
    steps,
    path: reversedPath.reverse(),
    avoidedElevators: elevatorsOutOfService(graph),
    warnings,
    provenance: graph.provenance,
  };
}
