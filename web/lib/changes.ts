/**
 * Part B domain logic: turning a change into the three parts of an alert, and finding other talks that still fit.
 *
 * Pure functions only. Every sentence is built from the same planner Part A uses (`lib/routing`, `lib/agenda`), so
 * an alert can never promise a route or a time the planner would not give. Nothing here reads or writes storage,
 * and nothing here is sent anywhere: the whole decision happens on the device.
 */
import { bufferMinutes, checkRequirements, matchingTopics, talkEnd, whyFits } from "./agenda";
import { roomFloor, roomLabel } from "./fixtures/venue";
import { calculateRoute } from "./routing";
import { addMinutes, formatTime, minutesBetween } from "./time";
import type { AlertDraft } from "./store";
import type {
  AttendeePreferences,
  ElevatorId,
  NavigationGraph,
  RouteResult,
  Talk,
} from "./types";

/** Length of a quiet break added by "I need a break now". */
export const BREAK_MINUTES = 20;
/** How much of a talk has to be left for joining late to still be worth it. */
export const MIN_USEFUL_REMAINING_MINUTES = 10;
/** The choices offered on "About how late?". The last one means "15 minutes or more". */
export const LATE_CHOICES = [5, 10, 15] as const;
export type LateChoice = (typeof LATE_CHOICES)[number];
/** How many alternatives "Other options" shows. */
export const MAX_OTHER_OPTIONS = 3;

export interface PlanContext {
  prefs: AttendeePreferences;
  /** Every talk in the demo schedule. */
  talks: Talk[];
  graph: NavigationGraph;
  /** The talks in this attendee's plan, in time order. */
  plan: Talk[];
  nowIso: string;
  currentLocationId: string;
}

// ---- Small shared pieces ---------------------------------------------------------------------------------

function stepFreeRequired(prefs: AttendeePreferences): boolean {
  return prefs.required.stepFreeRouting;
}

export function routeTo(ctx: PlanContext, toId: string): RouteResult {
  return calculateRoute(ctx.graph, ctx.currentLocationId, toId, { stepFreeRequired: stepFreeRequired(ctx.prefs) });
}

/** "6 minutes, step-free" or "6 minutes". Always words, never an icon on its own. */
export function tripWords(route: Extract<RouteResult, { ok: true }>): string {
  const minutes = `${route.minutes} ${route.minutes === 1 ? "minute" : "minutes"}`;
  return route.stepFree ? `${minutes}, step-free` : minutes;
}

export function placeWords(id: string, graph: NavigationGraph): string {
  const floor = roomFloor(id, graph);
  const label = roomLabel(id, graph);
  return floor === null || /floor/i.test(label) ? label : `${label} (Floor ${floor})`;
}

/** Elevators the route rides, in order. Used to say "Use Elevator C" in words. */
export function elevatorsUsed(route: Extract<RouteResult, { ok: true }>, graph: NavigationGraph): ElevatorId[] {
  const out: ElevatorId[] = [];
  for (let i = 1; i < route.path.length; i++) {
    const node = graph.nodes.find((n) => n.id === route.path[i]);
    if (node?.kind === "elevator" && node.elevatorId && !out.includes(node.elevatorId)) {
      const previous = graph.nodes.find((n) => n.id === route.path[i - 1]);
      if (previous?.elevatorId === node.elevatorId) out.push(node.elevatorId);
    }
  }
  return out;
}

export function leaveByFor(route: Extract<RouteResult, { ok: true }>, talk: Talk, prefs: AttendeePreferences): string {
  return addMinutes(talk.start, -(route.minutes + bufferMinutes(prefs)));
}

/** The talk the attendee is heading to: the next one that has not started, otherwise the one in progress. */
export function talkInFocus(ctx: PlanContext): Talk | null {
  const now = new Date(ctx.nowIso).getTime();
  const upcoming = ctx.plan.find((t) => new Date(t.start).getTime() > now);
  if (upcoming) return upcoming;
  return ctx.plan.find((t) => new Date(t.start).getTime() <= now && now < new Date(talkEnd(t)).getTime()) ?? null;
}

/** The talk most likely to have been missed: the latest one that has already started. */
export function talkJustMissed(ctx: PlanContext): Talk | null {
  const now = new Date(ctx.nowIso).getTime();
  const started = ctx.plan.filter((t) => new Date(t.start).getTime() <= now);
  return started.length > 0 ? started[started.length - 1] : (ctx.plan[0] ?? null);
}

function talkAfter(ctx: PlanContext, talk: Talk): Talk | null {
  return ctx.plan.find((t) => t.id !== talk.id && new Date(t.start).getTime() > new Date(talk.start).getTime()) ?? null;
}

function whatStaysAfter(ctx: PlanContext, talk: Talk | null): string {
  const later = talk ? talkAfter(ctx, talk) : null;
  if (later) return `Your ${formatTime(later.start)} talk is unchanged.`;
  return "The rest of your afternoon is unchanged.";
}

/** Can this talk be reached from where the attendee is now, with the travel buffer, before it starts? */
function reachableInTime(ctx: PlanContext, talk: Talk, fromIso: string = ctx.nowIso): boolean {
  const route = routeTo(ctx, talk.roomId);
  if (!route.ok) return false;
  const arrival = addMinutes(fromIso, route.minutes + bufferMinutes(ctx.prefs));
  return new Date(arrival).getTime() <= new Date(talk.start).getTime();
}

// ---- Other options ---------------------------------------------------------------------------------------

export interface TalkOption {
  talk: Talk;
  walkMinutes: number;
  stepFree: boolean;
  why: string[];
}

/**
 * Up to three later talks that still confirm the attendee's required needs and can be reached in time.
 * Topic matches come first; a talk whose required needs cannot be confirmed is never offered.
 */
export function otherOptions(ctx: PlanContext, excludeTalkIds: string[] = []): TalkOption[] {
  const now = new Date(ctx.nowIso).getTime();
  const scored: { option: TalkOption; topics: number; start: number }[] = [];
  for (const talk of ctx.talks) {
    if (excludeTalkIds.includes(talk.id)) continue;
    if (new Date(talk.start).getTime() <= now) continue;
    if (!checkRequirements(talk, ctx.prefs).eligible) continue;
    const route = routeTo(ctx, talk.roomId);
    if (!route.ok) continue;
    if (!reachableInTime(ctx, talk)) continue;
    scored.push({
      option: { talk, walkMinutes: route.minutes, stepFree: route.stepFree, why: whyFits(talk, ctx.prefs) },
      topics: matchingTopics(talk, ctx.prefs).length,
      start: new Date(talk.start).getTime(),
    });
  }
  scored.sort((a, b) => b.topics - a.topics || a.start - b.start || a.option.talk.id.localeCompare(b.option.talk.id));
  return scored.slice(0, MAX_OTHER_OPTIONS).map((s) => s.option);
}

/** The next talk on a topic the missed talk covered, reachable in time. Falls back to any option that fits. */
export function laterTalkOnSameTopic(ctx: PlanContext, missed: Talk): Talk | null {
  const options = otherOptions(ctx, [missed.id]);
  const sameTopic = options.find((o) => o.talk.topics.some((t) => missed.topics.includes(t)));
  return (sameTopic ?? options[0])?.talk ?? null;
}

// ---- Event changes ---------------------------------------------------------------------------------------

/**
 * Elevator out of service. The graph passed in must already carry the new status, so the route in "what to do now"
 * is the replacement route rather than the broken one.
 */
export function buildElevatorDownAlert(
  ctx: PlanContext,
  elevatorId: ElevatorId,
  options: { simulated?: boolean } = {},
): AlertDraft {
  const talk = talkInFocus(ctx);
  const route = talk ? routeTo(ctx, talk.roomId) : null;
  const whatChanged = `Elevator ${elevatorId} is not working.`;
  const whatStays = talk
    ? `Your talk is still at ${formatTime(talk.start)} in ${roomLabel(talk.roomId, ctx.graph)}.`
    : "Nothing else in your plan has changed.";
  let doNow: string;
  let leaveByIso: string | null = null;
  if (!talk) {
    doNow = `Nothing to do now. If you travel later, Elevator ${elevatorId} will be left out of your route.`;
  } else if (route?.ok) {
    leaveByIso = leaveByFor(route, talk, ctx.prefs);
    const lifts = elevatorsUsed(route, ctx.graph);
    const first = lifts.length > 0 ? `Use Elevator ${lifts.join(" then ")}. ` : "Your new route uses no elevator. ";
    doNow = `${first}Leave by ${formatTime(leaveByIso)}. ${tripWords(route)}.`;
  } else {
    doNow = `We cannot confirm a route to ${roomLabel(talk.roomId, ctx.graph)} that meets your needs. See other options.`;
  }
  return {
    origin: "event",
    kind: "elevator_down",
    whatChanged,
    whatStays,
    doNow,
    destinationRoomId: talk?.roomId ?? null,
    leaveByIso,
    talkId: talk?.id ?? null,
    transcriptTalkId: null,
    simulated: options.simulated ?? true,
  };
}

/** An elevator is working again and the attendee's own route is shorter because of it. */
export function buildElevatorFixedAlert(
  ctx: PlanContext,
  elevatorId: ElevatorId,
  options: { simulated?: boolean } = {},
): AlertDraft {
  const talk = talkInFocus(ctx);
  const route = talk ? routeTo(ctx, talk.roomId) : null;
  let doNow = `Nothing to do now. Elevator ${elevatorId} is back in your routes.`;
  let leaveByIso: string | null = null;
  if (talk && route?.ok) {
    leaveByIso = leaveByFor(route, talk, ctx.prefs);
    doNow = `You can use Elevator ${elevatorId} again. Leave by ${formatTime(leaveByIso)}. ${tripWords(route)}.`;
  }
  return {
    origin: "event",
    kind: "elevator_fixed",
    whatChanged: `Elevator ${elevatorId} is working again.`,
    whatStays: talk
      ? `Your talk is still at ${formatTime(talk.start)} in ${roomLabel(talk.roomId, ctx.graph)}.`
      : "Nothing else in your plan has changed.",
    doNow,
    destinationRoomId: talk?.roomId ?? null,
    leaveByIso,
    talkId: talk?.id ?? null,
    transcriptTalkId: null,
    simulated: options.simulated ?? true,
  };
}

// ---- Changes the attendee reports ("My plans changed") -----------------------------------------------------

/** "I'm running late". No reason is asked for and none is stored. */
export function buildRunningLateAlert(ctx: PlanContext, lateMinutes: LateChoice): AlertDraft {
  const talk = talkInFocus(ctx);
  const lateWords = lateMinutes >= 15 ? "15 minutes or more" : `${lateMinutes} minutes`;
  if (!talk) {
    return {
      origin: "personal",
      kind: "running_late",
      whatChanged: `You told us you are running ${lateWords} late.`,
      whatStays: "You have no talk to get to right now, so nothing changes.",
      doNow: "Take your time. Your plan is unchanged.",
      destinationRoomId: null,
      leaveByIso: null,
      talkId: null,
      transcriptTalkId: null,
      simulated: false,
    };
  }
  const route = routeTo(ctx, talk.roomId);
  const started = new Date(talk.start).getTime() <= new Date(ctx.nowIso).getTime();
  // Late means "later than the start time" for a talk still to come, and "from now" for one already under way.
  const arrival = route.ok ? (started ? addMinutes(ctx.nowIso, lateMinutes + route.minutes) : addMinutes(talk.start, lateMinutes)) : null;
  const remaining = arrival ? minutesBetween(arrival, talkEnd(talk)) : null;
  const canStillJoin = remaining !== null && remaining >= MIN_USEFUL_REMAINING_MINUTES;
  const later = canStillJoin ? null : laterTalkOnSameTopic(ctx, talk);

  const whatChanged = started
    ? `You will be ${lateWords} late to ${talk.title}, which has already started.`
    : `You'll arrive ${lateWords} late to ${talk.title}.`;
  let doNow: string;
  if (!route.ok) {
    doNow = `We cannot confirm a route to ${roomLabel(talk.roomId, ctx.graph)} that meets your needs. See other options.`;
  } else if (canStillJoin) {
    doNow = `You can still join. Leave now. ${tripWords(route)}. Or see a later talk on the same topic.`;
  } else if (later) {
    doNow = `Most of ${talk.title} would be over. Go to "${later.title}" at ${formatTime(later.start)} in ${roomLabel(later.roomId, ctx.graph)} instead.`;
  } else {
    doNow = `Most of ${talk.title} would be over. See other options for a talk you can still reach.`;
  }
  return {
    origin: "personal",
    kind: "running_late",
    whatChanged,
    whatStays: whatStaysAfter(ctx, talk),
    doNow,
    destinationRoomId: later?.roomId ?? talk.roomId,
    leaveByIso: null,
    talkId: later?.id ?? talk.id,
    transcriptTalkId: null,
    simulated: false,
  };
}

/** "I missed it". Offers the next talk on the same topic, and the transcript of what was missed (Part C). */
export function buildMissedTalkAlert(ctx: PlanContext, missedTalkId?: string): AlertDraft {
  const missed = (missedTalkId ? ctx.talks.find((t) => t.id === missedTalkId) : null) ?? talkJustMissed(ctx);
  if (!missed) {
    return {
      origin: "personal",
      kind: "missed_talk",
      whatChanged: "You told us you missed a talk.",
      whatStays: "Your plan has no talk recorded for that time, so nothing changes.",
      doNow: "See other options for a talk you can still reach.",
      destinationRoomId: null,
      leaveByIso: null,
      talkId: null,
      transcriptTalkId: null,
      simulated: false,
    };
  }
  const later = laterTalkOnSameTopic(ctx, missed);
  const doNow = later
    ? `Go to "${later.title}" at ${formatTime(later.start)} in ${roomLabel(later.roomId, ctx.graph)}. A transcript of what you missed is also available.`
    : "Nothing later today fits your needs and can be reached in time. A transcript of what you missed is available.";
  return {
    origin: "personal",
    kind: "missed_talk",
    whatChanged: `You missed ${missed.title}.`,
    whatStays: whatStaysAfter(ctx, missed),
    doNow,
    destinationRoomId: later?.roomId ?? null,
    leaveByIso: null,
    talkId: later?.id ?? null,
    transcriptTalkId: missed.id,
    simulated: false,
  };
}

export interface QuietBreakPlan {
  roomId: string;
  walkMinutes: number;
  stepFree: boolean;
  startIso: string;
  endIso: string;
}

/** The closest quiet room that can be reached under the attendee's own routing needs. */
export function nearestQuietRoom(ctx: PlanContext): QuietBreakPlan | null {
  let best: QuietBreakPlan | null = null;
  for (const node of ctx.graph.nodes.filter((n) => n.kind === "quiet_room")) {
    const route = routeTo(ctx, node.id);
    if (!route.ok) continue;
    if (best && route.minutes >= best.walkMinutes) continue;
    const startIso = addMinutes(ctx.nowIso, route.minutes);
    best = {
      roomId: node.id,
      walkMinutes: route.minutes,
      stepFree: route.stepFree,
      startIso,
      endIso: addMinutes(startIso, BREAK_MINUTES),
    };
  }
  return best;
}

/** "I need a break now". Adds a quiet break and says truthfully which talks still fit around it. */
export function buildBreakNowAlert(ctx: PlanContext): AlertDraft {
  const quiet = nearestQuietRoom(ctx);
  if (!quiet) {
    return {
      origin: "personal",
      kind: "break_now",
      whatChanged: "We could not add a quiet break.",
      whatStays: "Your plan is unchanged.",
      doNow: "No quiet room has a route that meets your needs from where you are. Quiet rooms are on every floor.",
      destinationRoomId: null,
      leaveByIso: null,
      talkId: null,
      transcriptTalkId: null,
      simulated: false,
    };
  }
  const next = talkInFocus(ctx);
  const keeps = next && reachableInTime(ctx, next, quiet.endIso) ? next : null;
  const alternative = keeps
    ? null
    : ctx.talks
        .filter((t) => t.id !== next?.id && checkRequirements(t, ctx.prefs).eligible && reachableInTime(ctx, t, quiet.endIso))
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0] ?? null;

  const whatStays = keeps
    ? `You still see ${keeps.title} at ${formatTime(keeps.start)}.`
    : next
      ? "Everything after the break stays in your plan."
      : "Your plan is unchanged.";
  const head = `Head to the quiet room, ${quiet.walkMinutes} ${quiet.walkMinutes === 1 ? "minute" : "minutes"}${quiet.stepFree ? ", step-free" : ""}.`;
  let tail: string;
  if (keeps) tail = ` Your next talk, ${keeps.title}, still starts at ${formatTime(keeps.start)}.`;
  else if (next && alternative)
    tail = ` You would miss the start of ${next.title}. ${alternative.title} at ${formatTime(alternative.start)} also fits you.`;
  else if (next) tail = ` You would miss the start of ${next.title}. See other options for a later talk.`;
  else tail = " You have no talk to get back to.";

  return {
    origin: "personal",
    kind: "break_now",
    whatChanged: `Quiet break added now, ${placeWords(quiet.roomId, ctx.graph)}, ${BREAK_MINUTES} minutes.`,
    whatStays,
    doNow: head + tail,
    destinationRoomId: quiet.roomId,
    leaveByIso: null,
    talkId: keeps?.id ?? alternative?.id ?? null,
    transcriptTalkId: null,
    simulated: false,
  };
}

// ---- Wording shared by the Alerts tab and the alert screen -------------------------------------------------

export function originTag(origin: "event" | "personal"): string {
  return origin === "event" ? "Event change" : "Your change";
}
