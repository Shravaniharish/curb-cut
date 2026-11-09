import { TOPICS } from "./types";
import type {
  AgendaOverrides,
  ApproachPreference,
  AttendeePreferences,
  ElevatorId,
  ElevatorStatus,
  NotificationStyle,
  PersistedState,
  Topic,
} from "./types";
import { DEMO_ELEVATOR_STATUS, DEMO_START_LOCATION_ID } from "./fixtures/venue";
import { DEFAULT_DEMO_CLOCK_TIME, demoClockAt } from "./time";

export const TEXT_SCALE_MIN = 1;
export const TEXT_SCALE_MAX = 1.5;
export const TEXT_SCALE_STEP = 0.1;

export function defaultPreferences(): AttendeePreferences {
  return {
    version: 1,
    required: { stepFreeRouting: false, captions: false },
    extraTravelTime: false,
    preferences: {
      interpreter: false,
      frontSeating: false,
      screenReader: false,
      slidesInAdvance: false,
      lowSensory: false,
      quietBreaks: false,
      reducedBackToBack: false,
    },
    notificationStyle: null,
    topics: [],
    approach: null,
    pronouns: "",
    display: { textScale: 1, highContrast: false, dyslexiaFont: false, reducedMotion: false },
  };
}

export function defaultState(realNowMs: number = Date.now()): PersistedState {
  return {
    version: 1,
    onboarding: "none",
    prefs: defaultPreferences(),
    agendaOverrides: { added: [], removed: [] },
    currentLocationId: DEMO_START_LOCATION_ID,
    selectedTalkId: null,
    currentRoute: null,
    reminder: null,
    elevatorStatus: { ...DEMO_ELEVATOR_STATUS },
    demoClock: demoClockAt(DEFAULT_DEMO_CLOCK_TIME, realNowMs),
  };
}

// ---- Validation of untrusted stored data -------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const STYLES: NotificationStyle[] = ["vibrate_big_text", "screen_reader", "calm_step_by_step"];
const APPROACHES: ApproachPreference[] = ["happy_to_chat", "only_people_i_know", "please_dont_approach"];
const ELEVATOR_STATUSES: ElevatorStatus[] = ["working", "out_of_service", "unknown"];

export function sanitizePreferences(input: unknown): AttendeePreferences {
  const d = defaultPreferences();
  if (!isObj(input)) return d;
  const req = isObj(input.required) ? input.required : {};
  const pref = isObj(input.preferences) ? input.preferences : {};
  const disp = isObj(input.display) ? input.display : {};
  const scale = typeof disp.textScale === "number" && Number.isFinite(disp.textScale) ? disp.textScale : 1;
  return {
    version: 1,
    required: {
      stepFreeRouting: bool(req.stepFreeRouting, false),
      captions: bool(req.captions, false),
    },
    extraTravelTime: bool(input.extraTravelTime, false),
    preferences: {
      interpreter: bool(pref.interpreter, false),
      frontSeating: bool(pref.frontSeating, false),
      screenReader: bool(pref.screenReader, false),
      slidesInAdvance: bool(pref.slidesInAdvance, false),
      lowSensory: bool(pref.lowSensory, false),
      quietBreaks: bool(pref.quietBreaks, false),
      reducedBackToBack: bool(pref.reducedBackToBack, false),
    },
    notificationStyle: STYLES.includes(input.notificationStyle as NotificationStyle)
      ? (input.notificationStyle as NotificationStyle)
      : null,
    topics: Array.isArray(input.topics)
      ? (input.topics.filter((t): t is Topic => (TOPICS as readonly unknown[]).includes(t)) as Topic[])
      : [],
    approach: APPROACHES.includes(input.approach as ApproachPreference) ? (input.approach as ApproachPreference) : null,
    pronouns: typeof input.pronouns === "string" ? input.pronouns.slice(0, 40) : "",
    display: {
      textScale: Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, scale)),
      highContrast: bool(disp.highContrast, false),
      dyslexiaFont: bool(disp.dyslexiaFont, false),
      reducedMotion: bool(disp.reducedMotion, false),
    },
  };
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Rebuild a full state from stored JSON. Anything invalid falls back to the default instead of throwing. */
export function sanitizeState(input: unknown, realNowMs: number = Date.now()): PersistedState {
  const d = defaultState(realNowMs);
  if (!isObj(input) || input.version !== 1) return d;
  const overrides: AgendaOverrides = isObj(input.agendaOverrides)
    ? { added: strings(input.agendaOverrides.added), removed: strings(input.agendaOverrides.removed) }
    : d.agendaOverrides;
  const elevators = { ...d.elevatorStatus };
  if (isObj(input.elevatorStatus)) {
    for (const id of ["A", "B", "C"] as ElevatorId[]) {
      const v = input.elevatorStatus[id];
      if (ELEVATOR_STATUSES.includes(v as ElevatorStatus)) elevators[id] = v as ElevatorStatus;
    }
  }
  const clock = input.demoClock;
  const demoClock =
    isObj(clock) && clock.mode === "live"
      ? ({ mode: "live" } as const)
      : isObj(clock) &&
          clock.mode === "demo" &&
          typeof clock.anchorDemo === "string" &&
          !Number.isNaN(new Date(clock.anchorDemo).getTime()) &&
          typeof clock.anchorReal === "number"
        ? ({ mode: "demo", anchorDemo: clock.anchorDemo, anchorReal: clock.anchorReal } as const)
        : d.demoClock;
  const route = input.currentRoute;
  const reminder = input.reminder;
  return {
    version: 1,
    onboarding: input.onboarding === "guest" || input.onboarding === "complete" ? input.onboarding : "none",
    prefs: sanitizePreferences(input.prefs),
    agendaOverrides: overrides,
    currentLocationId: typeof input.currentLocationId === "string" ? input.currentLocationId : d.currentLocationId,
    selectedTalkId: typeof input.selectedTalkId === "string" ? input.selectedTalkId : null,
    currentRoute:
      isObj(route) && typeof route.fromId === "string" && typeof route.toId === "string"
        ? { fromId: route.fromId, toId: route.toId, talkId: typeof route.talkId === "string" ? route.talkId : null }
        : null,
    reminder:
      isObj(reminder) &&
      typeof reminder.talkId === "string" &&
      typeof reminder.remindAt === "string" &&
      typeof reminder.leaveBy === "string" &&
      typeof reminder.createdAt === "string" &&
      !Number.isNaN(new Date(reminder.remindAt).getTime())
        ? {
            talkId: reminder.talkId,
            remindAt: reminder.remindAt,
            leaveBy: reminder.leaveBy,
            createdAt: reminder.createdAt,
            firedAt: typeof reminder.firedAt === "string" ? reminder.firedAt : null,
          }
        : null,
    elevatorStatus: elevators,
    demoClock,
  };
}
