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
}
