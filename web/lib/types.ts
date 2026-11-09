/**
 * Shared domain types for Curb Cut. Part A owns this file; Parts B and C import from it and must not copy
 * Part A logic. Unknown is always a real state ("unknown"), never collapsed into false.
 */

export const TOPICS = [
  "Security",
  "Observability",
  "AI",
  "Platform engineering",
  "Networking",
  "Beginner-friendly",
] as const;
export type Topic = (typeof TOPICS)[number];

// ---- Attendee preferences --------------------------------------------------------------------------------

export type NotificationStyle = "vibrate_big_text" | "screen_reader" | "calm_step_by_step";
export type ApproachPreference = "happy_to_chat" | "only_people_i_know" | "please_dont_approach";

/** Needs that act as hard filters. A talk that cannot confirm one of these is never recommended. */
export interface RequiredNeeds {
  stepFreeRouting: boolean;
  captions: boolean;
}

/** Preferences that only influence ranking and planning. */
export interface OptionalPreferences {
  interpreter: boolean;
  frontSeating: boolean;
  screenReader: boolean;
  slidesInAdvance: boolean;
  lowSensory: boolean;
  quietBreaks: boolean;
  reducedBackToBack: boolean;
}

export interface DisplayPreferences {
  /** Multiplier applied to the root font size, 1 = 100%. */
  textScale: number;
  highContrast: boolean;
  dyslexiaFont: boolean;
  reducedMotion: boolean;
}

export interface AttendeePreferences {
  version: 1;
  required: RequiredNeeds;
  extraTravelTime: boolean;
  preferences: OptionalPreferences;
  notificationStyle: NotificationStyle | null;
  topics: Topic[];
  approach: ApproachPreference | null;
  pronouns: string;
  display: DisplayPreferences;
}

// ---- Accessibility metadata ------------------------------------------------------------------------------

export type StepFreeAccess = "confirmed" | "unavailable" | "unknown";
export type CaptionsStatus = "none" | "automatic" | "live_captioner" | "unknown";
export type SlideDescriptions = "none" | "ai_draft" | "verified" | "unknown";
export type FrontSeating = "available" | "unavailable" | "unknown";
export type QuietRoomProximity =
  | { status: "known"; roomId: string; walkMinutes: number }
  | { status: "unknown" };
export type Level = "high" | "medium" | "low" | "unknown";

export interface AccessibilityMetadata {
  stepFreeEntrance: StepFreeAccess;
  captions: CaptionsStatus;
  slideDescriptions: SlideDescriptions;
  frontSeating: FrontSeating;
  quietRoom: QuietRoomProximity;
  interpreter: "available" | "unavailable" | "unknown";
  slidesAheadHours: number | null;
  sensory: { noise: Level; crowd: Level; lighting: "bright" | "normal" | "dim" | "unknown" };
}

export type ProvenanceKind = "demo_fixture" | "verified" | "elasticsearch";
export interface Provenance {
  kind: ProvenanceKind;
  source: string;
  /** Names of fields whose values are sample values rather than published facts. */
  sampleFields: string[];
}

export interface Talk {
  id: string;
  title: string;
  speaker: string | null;
  description: string | null;
  /** UTC instant, ISO 8601 with Z. Display always converts to the conference time zone. */
  start: string;
  end: string | null;
  roomId: string;
  floor: number;
  topics: Topic[];
  access: AccessibilityMetadata;
  sensoryNotes: { text: string | null; provenance: ProvenanceKind };
  backupTalkIds: string[];
  provenance: Provenance;
  lastUpdated: string | null;
}

// ---- Agenda ----------------------------------------------------------------------------------------------

export type AgendaItem =
  | { kind: "talk"; talkId: string; order: number; userAdded: boolean; isBackup: false }
  | { kind: "break"; breakKind: "quiet"; roomId: string; start: string; end: string; order: number; userAdded: false };

export interface AgendaOverrides {
  added: string[];
  removed: string[];
}

// ---- Navigation graph ------------------------------------------------------------------------------------

export type ElevatorId = "A" | "B" | "C";
export type ElevatorStatus = "working" | "out_of_service" | "unknown";
export type NodeKind = "room" | "corridor" | "elevator" | "quiet_room";

export interface GraphNode {
  id: string;
  label: string;
  floor: number;
  kind: NodeKind;
  elevatorId?: ElevatorId;
}

export type EdgeKind = "walk" | "elevator" | "stairs";
export interface GraphEdge {
  from: string;
  to: string;
  kind: EdgeKind;
  minutes: number;
  /** Only "confirmed" edges may be used for step-free routes. */
  stepFree: StepFreeAccess;
  elevatorId?: ElevatorId;
  instruction: string;
  reverseInstruction?: string;
}

export interface NavigationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  elevators: Record<ElevatorId, ElevatorStatus>;
  provenance: Provenance;
}

export interface RouteStep {
  index: number;
  text: string;
  minutes: number;
  kind: EdgeKind;
}

export type RouteResult =
  | {
      ok: true;
      fromId: string;
      toId: string;
      minutes: number;
      stepFree: boolean;
      steps: RouteStep[];
      /** Node ids from start to destination, in order. */
      path: string[];
      avoidedElevators: ElevatorId[];
      warnings: string[];
      provenance: Provenance;
    }
  | { ok: false; reason: "no_accessible_route" | "no_route" | "unknown_location"; message: string };

// ---- Cross-module state (Part B / C read these) -------------------------------------------------------------

export interface Reminder {
  talkId: string;
  /** UTC instant to remind at. */
  remindAt: string;
  leaveBy: string;
  createdAt: string;
  firedAt: string | null;
}

// ---- Changes and alerts (Part B) ---------------------------------------------------------------------------

/** Where a change came from. "event" is the venue or the programme; "personal" is something the attendee told us. */
export type AlertOrigin = "event" | "personal";

export type ChangeKind =
  | "elevator_down"
  | "elevator_fixed"
  | "path_blocked"
  | "path_cleared"
  | "room_full"
  | "talk_moved"
  | "running_late"
  | "missed_talk"
  | "break_now";

/**
 * One entry in the alert history. Every alert carries all three parts: what changed, what stays the same and what
 * to do now. The history lives only on this device.
 */
export interface AlertRecord {
  id: string;
  /** UTC instant the alert was created, taken from the app clock. */
  createdAt: string;
  origin: AlertOrigin;
  kind: ChangeKind;
  whatChanged: string;
  whatStays: string;
  doNow: string;
  /** Destination for "Show new route", when the alert has one. */
  destinationRoomId: string | null;
  leaveByIso: string | null;
  /** The talk the alert is about, when there is one. */
  talkId: string | null;
  /** Talk whose transcript covers what was missed (Part C), when there is one. */
  transcriptTalkId: string | null;
  /** True when the condition behind the alert is a simulated demo condition rather than live venue data. */
  simulated: boolean;
  acknowledgedAt: string | null;
}

export type ReportProblem = "elevator_not_working" | "path_blocked" | "too_loud" | "no_captions";

export interface ReportRecord {
  id: string;
  createdAt: string;
  problem: ReportProblem;
  /** A place id from the venue graph, or a floor path id such as "path-floor-2". */
  locationId: string;
  /** Random per-device string. It is not tied to a person, and this demo sends it nowhere. */
  deviceToken: string;
}

export type DemoClockState =
  | { mode: "live" }
  | { mode: "demo"; /** demo instant at the anchor */ anchorDemo: string; /** real epoch ms at the anchor */ anchorReal: number };

export type Onboarding = "none" | "guest" | "complete";

export interface PersistedState {
  version: 1;
  onboarding: Onboarding;
  prefs: AttendeePreferences;
  agendaOverrides: AgendaOverrides;
  currentLocationId: string;
  selectedTalkId: string | null;
  currentRoute: { fromId: string; toId: string; talkId: string | null } | null;
  reminder: Reminder | null;
  elevatorStatus: Record<ElevatorId, ElevatorStatus>;
  demoClock: DemoClockState;
  /** Part B: alert history, oldest first. Capped at ALERT_HISTORY_LIMIT entries. */
  alerts: AlertRecord[];
  /** Part B: problem reports made on this device. */
  reports: ReportRecord[];
  /** Part B: when the Alerts tab was last opened, so "while you were away" can count what is new. */
  alertsSeenAt: string | null;
}

// ---- Session companion, presenter console (Part C) ---------------------------------------------------------

/** One line of a canned demo transcript. `offsetSec` is seconds after the talk's start. */
export interface TranscriptChunk {
  talkId: string;
  offsetSec: number;
  speaker: string;
  text: string;
}

/**
 * A written question sent from the session companion to the presenter. It carries no attendee id: it is venue
 * content, like a card passed to the stage.
 */
export interface WrittenQuestion {
  id: string;
  talkId: string;
  text: string;
  /** UTC instant from the app clock. */
  askedAt: string;
  /** UTC instant the presenter read it out, or null while it waits in the queue. */
  readOutAt: string | null;
}
