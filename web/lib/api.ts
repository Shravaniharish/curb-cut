/**
 * Client for the Curb Cut API (FastAPI). Off by default: the app works on its own on the device, which is what the
 * demo, the unit tests and the e2e tests use. Set both of these to turn the live backend on:
 *
 *   NEXT_PUBLIC_API_URL=http://localhost:8000
 *   NEXT_PUBLIC_API_MODE=live
 *
 * Privacy: the profile is sent only to ranking and planning calls, and only the fields the planner needs (no
 * pronouns, no approach preference, no display settings). Search sends the query text and nothing else. Reports and
 * acks carry no profile. Nothing here sets a cookie or an attendee id.
 */
import type { AlertDraft } from "./store";
import type {
  AlertRecord,
  AttendeePreferences,
  ChangeKind,
  ElevatorId,
  ElevatorStatus,
  Level,
  ReportProblem,
  Talk,
  WrittenQuestion,
} from "./types";

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const LIVE = process.env.NEXT_PUBLIC_API_MODE === "live" && API_BASE !== "";
const TIMEOUT_MS = 8000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// The organizer key is typed on the dashboard and kept only in memory, never in storage.
let organizerKey = "";
export function setOrganizerKey(key: string): void {
  organizerKey = key;
}

type FetchLike = typeof fetch;

export async function apiFetch<T>(path: string, init: RequestInit = {}, fetchImpl: FetchLike = (...a) => fetch(...a)): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (organizerKey) headers.set("X-Organizer-Key", organizerKey);
  let res: Response;
  try {
    res = await fetchImpl(`${API_BASE}${path}`, { ...init, headers, signal: init.signal ?? AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError("The Curb Cut service could not be reached.", null);
  }
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      /* no JSON body */
    }
    throw new ApiError(detail || `The Curb Cut service returned an error (${res.status}).`, res.status);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const post = <T>(path: string, body: unknown) => apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });

// ---- Profile: only what the planner needs -----------------------------------------------------------------

export interface ProfilePayload {
  required: AttendeePreferences["required"];
  extraTravelTime: boolean;
  preferences: AttendeePreferences["preferences"];
  notificationStyle: AttendeePreferences["notificationStyle"];
  topics: AttendeePreferences["topics"];
}

export function toProfilePayload(prefs: AttendeePreferences): ProfilePayload {
  return {
    required: prefs.required,
    extraTravelTime: prefs.extraTravelTime,
    preferences: prefs.preferences,
    notificationStyle: prefs.notificationStyle,
    topics: prefs.topics,
  };
}

// ---- Shapes the API returns (see api/app/schemas.py) -------------------------------------------------------

export interface ApiAlert {
  kind: ChangeKind;
  origin: "event" | "personal";
  what_changed: string;
  what_stays: string;
  do_now: string;
  destination_room_id: string | null;
  leave_by: string | null;
  talk_id: string | null;
  transcript_talk_id: string | null;
}
export interface ApiTalkRef {
  id: string;
}
export interface ApiOption {
  talk: ApiTalkRef;
  walk_minutes: number;
  step_free: boolean;
  why: string[];
}
export interface ReplanResponse {
  affected: boolean;
  alert: ApiAlert | null;
  plan: string[];
  options: ApiOption[];
}
export interface ApiChange {
  id: string;
  type: "elevator_down" | "elevator_fixed" | "path_blocked" | "path_cleared" | "room_full" | "talk_moved";
  target: string;
  details: Record<string, string>;
  created_at: string;
  fixed_at: string | null;
}
export interface ApiVenue {
  elevators: Record<ElevatorId, ElevatorStatus>;
  blocked_floors: number[];
}
export interface ApiSummary {
  venue: ApiVenue;
  changes: ApiChange[];
  reports: { problem: ReportProblem; location_id: string; count: number; devices: number; confirmed: boolean; latest: string }[];
  acks: { received: number; affected: number; replanned: number; median_replan_ms: number | null; max_replan_ms: number | null };
  gaps: { id: string; summary: string; talk_ids: string[] }[];
}
export interface ReportResult {
  accepted: boolean;
  confirmed: boolean;
  change_id: string | null;
  needed: number;
}
interface ApiQuestion {
  id: string;
  talk_id: string;
  text: string;
  asked_at: string;
  read_out_at: string | null;
}

export interface PlanBody {
  talkIds: string[];
  currentLocationId: string;
  nowIso: string;
}
const planState = (p: PlanBody) => ({ talk_ids: p.talkIds, current_location_id: p.currentLocationId, now: p.nowIso });

// ---- Calls -------------------------------------------------------------------------------------------------

export const replanForChange = (prefs: AttendeePreferences, plan: PlanBody, changeId: string) =>
  post<ReplanResponse>("/api/replan", { profile: toProfilePayload(prefs), plan: planState(plan), change_id: changeId });

export const replanPersonal = (
  prefs: AttendeePreferences,
  plan: PlanBody,
  personal: { type: "late"; minutes: 5 | 10 | 15 } | { type: "missed"; talk_id?: string } | { type: "break_now" },
) => post<ReplanResponse>("/api/replan", { profile: toProfilePayload(prefs), plan: planState(plan), personal });

export const ackChange = (changeId: string, affected: boolean, replanMs: number) =>
  post<void>(`/api/changes/${encodeURIComponent(changeId)}/ack`, { affected, replan_ms: Math.max(0, Math.round(replanMs)) });

export interface ApiTalk {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  room_id: string;
  floor: number;
  topics: Talk["topics"];
  backup_talk_ids: string[];
  access: {
    step_free_entrance: Talk["access"]["stepFreeEntrance"];
    captions: Talk["access"]["captions"];
    slide_descriptions: Talk["access"]["slideDescriptions"];
    front_seating: Talk["access"]["frontSeating"];
    interpreter: Talk["access"]["interpreter"];
    quiet_room_id: string | null;
    quiet_room_walk_minutes: number | null;
    noise: Level;
    crowd: Level;
  };
}

/** The API programme as the app's own Talk shape. The programme is public, synthetic data. */
export function talkFromApi(t: ApiTalk): Talk {
  const a = t.access;
  return {
    id: t.id,
    title: t.title,
    speaker: null,
    description: t.description,
    start: t.start,
    end: t.end,
    roomId: t.room_id,
    floor: t.floor,
    topics: t.topics,
    access: {
      stepFreeEntrance: a.step_free_entrance,
      captions: a.captions,
      slideDescriptions: a.slide_descriptions,
      frontSeating: a.front_seating,
      quietRoom:
        a.quiet_room_id && a.quiet_room_walk_minutes != null
          ? { status: "known", roomId: a.quiet_room_id, walkMinutes: a.quiet_room_walk_minutes }
          : { status: "unknown" },
      interpreter: a.interpreter,
      slidesAheadHours: null,
      sensory: { noise: a.noise, crowd: a.crowd, lighting: "unknown" },
    },
    sensoryNotes: { text: null, provenance: "elasticsearch" },
    backupTalkIds: t.backup_talk_ids,
    provenance: { kind: "elasticsearch", source: "Curb Cut API (synthetic programme)", sampleFields: [] },
    lastUpdated: null,
  };
}

export const getTalks = async () => (await apiFetch<ApiTalk[]>("/api/talks")).map(talkFromApi);
export const getVenue = () => apiFetch<ApiVenue>("/api/venue");
export const getSummary = () => apiFetch<ApiSummary>("/api/organizer/summary");
export const announceChange = (type: ApiChange["type"], target: string, details: Record<string, string> = {}) =>
  post<ApiChange>("/api/changes", { type, target, details });
export const fixChange = (changeId: string) => post<ApiChange>(`/api/changes/${encodeURIComponent(changeId)}/fix`, {});
export const sendReport = (problem: ReportProblem, locationId: string, deviceToken: string) =>
  post<ReportResult>("/api/reports", { problem, location_id: locationId, device_token: deviceToken });

const toQuestion = (q: ApiQuestion): WrittenQuestion => ({ id: q.id, talkId: q.talk_id, text: q.text, askedAt: q.asked_at, readOutAt: q.read_out_at });
export const getQuestions = async (talkId: string) =>
  (await apiFetch<ApiQuestion[]>(`/api/sessions/${encodeURIComponent(talkId)}/questions`)).map(toQuestion);
export const askQuestion = (talkId: string, text: string, askedAt: string) =>
  post<ApiQuestion>(`/api/sessions/${encodeURIComponent(talkId)}/questions`, { text, asked_at: askedAt });
export const markQuestionRead = (talkId: string, questionId: string) =>
  post<ApiQuestion>(`/api/sessions/${encodeURIComponent(talkId)}/questions/${encodeURIComponent(questionId)}/read`, {});

/** Subscribe to venue changes. Returns an unsubscribe function. EventSource reconnects by itself. */
export function subscribeToChanges(onChange: (c: ApiChange) => void, onState?: (connected: boolean) => void): () => void {
  if (typeof EventSource === "undefined") return () => {};
  const source = new EventSource(`${API_BASE}/api/changes/stream`);
  source.addEventListener("ready", () => onState?.(true));
  source.addEventListener("change", (e) => {
    try {
      onChange(JSON.parse((e as MessageEvent<string>).data) as ApiChange);
    } catch {
      /* ignore a malformed event rather than crash the app */
    }
  });
  source.onerror = () => onState?.(false);
  return () => source.close();
}

/** An API alert as an alert-history draft. Anything the API cannot fill stays null. */
export function alertFromApi(a: ApiAlert): AlertDraft {
  return {
    origin: a.origin,
    kind: a.kind,
    whatChanged: a.what_changed,
    whatStays: a.what_stays,
    doNow: a.do_now,
    destinationRoomId: a.destination_room_id,
    leaveByIso: a.leave_by ? new Date(a.leave_by).toISOString() : null,
    talkId: a.talk_id,
    transcriptTalkId: a.transcript_talk_id,
    simulated: false,
  };
}

export type { AlertRecord };
