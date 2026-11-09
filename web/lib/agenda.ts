/**
 * Deterministic, explainable agenda selection.
 *
 * Order of authority: (1) required needs are hard filters, (2) schedule feasibility, (3) topic relevance and
 * optional preferences only rank what is left. A better score can never override an unmet required need.
 */
import { calculateRoute } from "./routing";
import { addMinutes, computeLeaveBy, minutesBetween } from "./time";
import type {
  AgendaItem,
  AgendaOverrides,
  AttendeePreferences,
  NavigationGraph,
  RouteResult,
  Talk,
} from "./types";

export const DEFAULT_BUFFER_MIN = 2;
export const EXTRA_BUFFER_MIN = 6;
export const MIN_QUIET_BREAK_MIN = 10;
export const BACK_TO_BACK_EXTRA_GAP_MIN = 15;
/** Used only when a talk has no end time. */
export const ASSUMED_DURATION_MIN = 60;

export function bufferMinutes(prefs: AttendeePreferences): number {
  return prefs.extraTravelTime ? EXTRA_BUFFER_MIN : DEFAULT_BUFFER_MIN;
}

// ---- Requirements -------------------------------------------------------------------------------------

export interface RequirementCheck {
  eligible: boolean;
  /** Plain-language reasons a required need is not confirmed. */
  unmet: string[];
  /** Plain-language confirmations of required needs. */
  met: string[];
}

export function checkRequirements(talk: Talk, prefs: AttendeePreferences): RequirementCheck {
  const unmet: string[] = [];
  const met: string[] = [];
  if (prefs.required.stepFreeRouting) {
    const s = talk.access.stepFreeEntrance;
    if (s === "confirmed") met.push("Step-free entrance confirmed");
    else if (s === "unavailable") unmet.push("No step-free entrance");
    else unmet.push("Step-free entrance not confirmed");
  }
  if (prefs.required.captions) {
    const c = talk.access.captions;
    if (c === "live_captioner") met.push("Live captioner");
    else if (c === "automatic") met.push("Auto captions");
    else if (c === "none") unmet.push("No captions");
    else unmet.push("Captions not confirmed");
  }
  return { eligible: unmet.length === 0, unmet, met };
}

// ---- Scoring and explanation ---------------------------------------------------------------------------

export function matchingTopics(talk: Talk, prefs: AttendeePreferences): string[] {
  return talk.topics.filter((t) => prefs.topics.includes(t));
}

export function score(talk: Talk, prefs: AttendeePreferences, travelMinutes: number | null): number {
  let s = matchingTopics(talk, prefs).length * 3;
  const a = talk.access;
  if (prefs.preferences.frontSeating && a.frontSeating === "available") s += 1;
  if (prefs.preferences.interpreter && a.interpreter === "available") s += 1;
  if (prefs.preferences.slidesInAdvance && a.slidesAheadHours !== null) s += 0.5;
  if (prefs.preferences.lowSensory) {
    if (a.sensory.crowd === "high") s -= 1;
    if (a.sensory.noise === "high") s -= 1;
    if (a.sensory.lighting === "bright") s -= 0.5;
  }
  if (travelMinutes !== null) s -= travelMinutes * 0.1;
  return Math.round(s * 100) / 100;
}

/** Short, truthful reasons this talk fits. Only states facts that are known; unknown is never claimed as a match. */
export function whyFits(talk: Talk, prefs: AttendeePreferences): string[] {
  const reasons: string[] = [];
  const topics = matchingTopics(talk, prefs);
  if (topics.length) reasons.push(`Matches your interests: ${topics.join(", ")}`);
  reasons.push(...checkRequirements(talk, prefs).met);
  const a = talk.access;
  if (prefs.preferences.frontSeating && a.frontSeating === "available") reasons.push("Front seating available");
  if (prefs.preferences.interpreter && a.interpreter === "available") reasons.push("Interpreter available");
  if (prefs.preferences.slidesInAdvance && a.slidesAheadHours !== null)
    reasons.push(`Slides shared ${a.slidesAheadHours} hours ahead`);
  if (prefs.preferences.lowSensory && a.sensory.crowd !== "unknown" && a.sensory.crowd !== "high" && a.sensory.noise !== "high")
    reasons.push("Lower crowd and noise (sample data)");
  if (prefs.preferences.quietBreaks && a.quietRoom.status === "known") reasons.push("Quiet room nearby");
  return reasons;
}

// ---- Travel --------------------------------------------------------------------------------------------

export function travelMinutes(graph: NavigationGraph, fromId: string, toId: string, stepFree: boolean): number | null {
  const r = calculateRoute(graph, fromId, toId, { stepFreeRequired: stepFree });
  return r.ok ? r.minutes : null;
}

export function talkEnd(talk: Talk): string {
  return talk.end ?? addMinutes(talk.start, ASSUMED_DURATION_MIN);
}

/** Whether `later` can be attended after `earlier`, including travel, buffer and a back-to-back allowance. */
export function canAttendBoth(a: Talk, b: Talk, graph: NavigationGraph, prefs: AttendeePreferences): boolean {
  const [first, second] = new Date(a.start) <= new Date(b.start) ? [a, b] : [b, a];
  const gap = minutesBetween(talkEnd(first), second.start);
  if (gap < 0) return false;
  const t = first.roomId === second.roomId ? 0 : travelMinutes(graph, first.roomId, second.roomId, prefs.required.stepFreeRouting);
  if (t === null) return false;
  const extra = prefs.preferences.reducedBackToBack ? BACK_TO_BACK_EXTRA_GAP_MIN : 0;
  return gap >= t + bufferMinutes(prefs) + extra;
}

// ---- Agenda --------------------------------------------------------------------------------------------

export interface AgendaInput {
  prefs: AttendeePreferences;
  talks: Talk[];
  graph: NavigationGraph;
  overrides?: AgendaOverrides;
  startLocationId: string;
}

export interface ExcludedTalk {
  talkId: string;
  reasons: string[];
}

export interface AgendaResult {
  items: AgendaItem[];
  excluded: ExcludedTalk[];
  scores: Record<string, number>;
}

export function buildAgenda(input: AgendaInput): AgendaResult {
  const { prefs, talks, graph, startLocationId } = input;
  const overrides = input.overrides ?? { added: [], removed: [] };
  const byId = new Map(talks.map((t) => [t.id, t]));
  const excluded: ExcludedTalk[] = [];
  const scores: Record<string, number> = {};
  const stepFree = prefs.required.stepFreeRouting;

  const ranked: Talk[] = [];
  for (const talk of talks) {
    if (overrides.removed.includes(talk.id)) continue;
    const req = checkRequirements(talk, prefs);
    if (!req.eligible) {
      excluded.push({ talkId: talk.id, reasons: req.unmet });
      continue;
    }
    if (prefs.topics.length > 0 && matchingTopics(talk, prefs).length === 0) {
      excluded.push({ talkId: talk.id, reasons: ["Does not match your selected topics"] });
      continue;
    }
    scores[talk.id] = score(talk, prefs, travelMinutes(graph, startLocationId, talk.roomId, stepFree));
    ranked.push(talk);
  }
  ranked.sort(
    (a, b) =>
      scores[b.id] - scores[a.id] || new Date(a.start).getTime() - new Date(b.start).getTime() || a.id.localeCompare(b.id),
  );

  const selected: Talk[] = [];
  const userAdded = new Set<string>();
  for (const id of overrides.added) {
    const talk = byId.get(id);
    if (talk && !selected.includes(talk)) {
      selected.push(talk);
      userAdded.add(id);
    }
  }
  for (const talk of ranked) {
    if (selected.includes(talk)) continue;
    if (selected.every((s) => canAttendBoth(s, talk, graph, prefs))) selected.push(talk);
    else excluded.push({ talkId: talk.id, reasons: ["Conflicts with a higher-ranked talk or has no confirmed route in time"] });
  }
  selected.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime() || a.id.localeCompare(b.id));

  const items: AgendaItem[] = [];
  let order = 0;
  selected.forEach((talk, i) => {
    items.push({ kind: "talk", talkId: talk.id, order: order++, userAdded: userAdded.has(talk.id), isBackup: false });
    const next = selected[i + 1];
    if (next && prefs.preferences.quietBreaks) {
      const brk = planQuietBreak(talk, next, graph, prefs);
      if (brk) items.push({ ...brk, order: order++ });
    }
  });
  return { items, excluded, scores };
}

function planQuietBreak(
  a: Talk,
  b: Talk,
  graph: NavigationGraph,
  prefs: AttendeePreferences,
): Extract<AgendaItem, { kind: "break" }> | null {
  const stepFree = prefs.required.stepFreeRouting;
  let best: { roomId: string; start: string; end: string; slack: number } | null = null;
  for (const node of graph.nodes.filter((n) => n.kind === "quiet_room")) {
    const there = travelMinutes(graph, a.roomId, node.id, stepFree);
    const back = travelMinutes(graph, node.id, b.roomId, stepFree);
    if (there === null || back === null) continue;
    const start = addMinutes(talkEnd(a), there);
    const end = addMinutes(b.start, -(back + bufferMinutes(prefs)));
    const length = minutesBetween(start, end);
    if (length < MIN_QUIET_BREAK_MIN) continue;
    if (!best || there + back < best.slack) best = { roomId: node.id, start, end, slack: there + back };
  }
  return best ? { kind: "break", breakKind: "quiet", roomId: best.roomId, start: best.start, end: best.end, order: 0, userAdded: false } : null;
}

// ---- Views on an agenda ------------------------------------------------------------------------------------

export function agendaTalks(items: AgendaItem[], talks: Talk[]): Talk[] {
  const byId = new Map(talks.map((t) => [t.id, t]));
  return items.flatMap((i) => (i.kind === "talk" && byId.has(i.talkId) ? [byId.get(i.talkId)!] : []));
}

export function nowAndNext(items: AgendaItem[], talks: Talk[], nowIso: string): { now: Talk | null; next: Talk | null } {
  const list = agendaTalks(items, talks);
  const now = new Date(nowIso).getTime();
  const current = list.find((t) => new Date(t.start).getTime() <= now && now < new Date(talkEnd(t)).getTime()) ?? null;
  const next = list.find((t) => new Date(t.start).getTime() > now) ?? null;
  return { now: current, next };
}

/** A same-slot alternative that also satisfies the required needs. Returns null when none qualifies. */
export function backupFor(talk: Talk, talks: Talk[], prefs: AttendeePreferences, plannedIds: string[]): Talk | null {
  for (const id of talk.backupTalkIds) {
    const candidate = talks.find((t) => t.id === id);
    if (candidate && !plannedIds.includes(id) && checkRequirements(candidate, prefs).eligible) return candidate;
  }
  return null;
}

export interface LeaveBy {
  route: RouteResult;
  leaveByIso: string | null;
  travelMinutes: number | null;
  bufferMinutes: number;
}

export function leaveByForTalk(graph: NavigationGraph, prefs: AttendeePreferences, fromId: string, talk: Talk): LeaveBy {
  const buffer = bufferMinutes(prefs);
  const route = calculateRoute(graph, fromId, talk.roomId, { stepFreeRequired: prefs.required.stepFreeRouting });
  if (!route.ok) return { route, leaveByIso: null, travelMinutes: null, bufferMinutes: buffer };
  return {
    route,
    leaveByIso: computeLeaveBy(talk.start, route.minutes, buffer),
    travelMinutes: route.minutes,
    bufferMinutes: buffer,
  };
}

/** Warnings for a talk the user added themselves that clashes with the rest of the plan. */
export function conflictsWith(talk: Talk, others: Talk[], graph: NavigationGraph, prefs: AttendeePreferences): Talk[] {
  return others.filter((o) => o.id !== talk.id && !canAttendBoth(o, talk, graph, prefs));
}
