/**
 * DEMO FIXTURE. The four talks supplied for the hackathon demo. They are not verified KubeCon schedule or venue
 * accessibility records. Values the brief did not supply are null or "unknown"; values marked as sample in
 * `provenance.sampleFields` were chosen only so the demo can exercise scheduling and filtering.
 */
import { zonedToUtcIso, CONFERENCE_DATE } from "../time";
import type { AccessibilityMetadata, Provenance, Talk } from "../types";

const provenance = (sampleFields: string[]): Provenance => ({
  kind: "demo_fixture",
  source: "Curb Cut demo schedule (supplied sample, not the real conference program)",
  sampleFields,
});

const at = (time: string) => zonedToUtcIso(CONFERENCE_DATE, time);

const unknownAccess: AccessibilityMetadata = {
  stepFreeEntrance: "unknown",
  captions: "unknown",
  slideDescriptions: "unknown",
  frontSeating: "unknown",
  quietRoom: { status: "unknown" },
  interpreter: "unknown",
  slidesAheadHours: null,
  sensory: { noise: "unknown", crowd: "unknown", lighting: "unknown" },
};

export const DEMO_TALKS: Talk[] = [
  {
    id: "talk-supply-chain",
    title: "Securing Your Supply Chain Without Slowing Down",
    speaker: null,
    description: null,
    start: at("14:00"),
    end: at("14:40"),
    roomId: "room-355",
    floor: 3,
    topics: ["Security"],
    access: {
      ...unknownAccess,
      stepFreeEntrance: "confirmed",
      captions: "live_captioner",
      slideDescriptions: "verified",
      frontSeating: "available",
      quietRoom: { status: "known", roomId: "quiet-room-3", walkMinutes: 2 },
      interpreter: "unavailable",
      slidesAheadHours: 24,
      sensory: { noise: "medium", crowd: "high", lighting: "bright" },
    },
    sensoryNotes: { text: "Bright stage lights. Usually full. Applause at the end.", provenance: "demo_fixture" },
    backupTalkIds: ["talk-rbac"],
    provenance: provenance(["end", "topics", "access", "sensoryNotes"]),
    lastUpdated: null,
  },
  {
    id: "talk-observability",
    title: "Observability for Beginners",
    speaker: null,
    description: null,
    start: at("15:00"),
    end: at("15:40"),
    roomId: "room-251",
    floor: 2,
    topics: ["Observability", "Beginner-friendly"],
    access: {
      ...unknownAccess,
      stepFreeEntrance: "confirmed",
      captions: "automatic",
      slideDescriptions: "ai_draft",
      frontSeating: "unknown",
      quietRoom: { status: "known", roomId: "quiet-room-2", walkMinutes: 2 },
      slidesAheadHours: null,
      sensory: { noise: "low", crowd: "medium", lighting: "normal" },
    },
    sensoryNotes: { text: null, provenance: "demo_fixture" },
    backupTalkIds: ["talk-qa"],
    provenance: provenance(["end", "topics", "access"]),
    lastUpdated: null,
  },
  {
    id: "talk-rbac",
    title: "Kubernetes RBAC in Plain English",
    speaker: null,
    description: null,
    start: at("14:00"),
    end: at("14:40"),
    roomId: "ballroom-e",
    floor: 1,
    topics: ["Security", "Platform engineering", "Beginner-friendly"],
    access: {
      ...unknownAccess,
      stepFreeEntrance: "confirmed",
      captions: "unknown",
      slideDescriptions: "unknown",
      frontSeating: "available",
      quietRoom: { status: "known", roomId: "quiet-room-1", walkMinutes: 3 },
      sensory: { noise: "high", crowd: "high", lighting: "bright" },
    },
    sensoryNotes: { text: null, provenance: "demo_fixture" },
    backupTalkIds: ["talk-supply-chain"],
    provenance: provenance(["end", "topics", "access"]),
    lastUpdated: null,
  },
  {
    id: "talk-qa",
    title: "Supply Chain Security Q&A",
    speaker: null,
    description: null,
    start: at("15:30"),
    end: at("16:00"),
    roomId: "room-251",
    floor: 2,
    topics: ["Security"],
    access: {
      ...unknownAccess,
      stepFreeEntrance: "unknown",
      captions: "none",
      slideDescriptions: "none",
      frontSeating: "unavailable",
      quietRoom: { status: "known", roomId: "quiet-room-2", walkMinutes: 2 },
      sensory: { noise: "medium", crowd: "medium", lighting: "normal" },
    },
    sensoryNotes: { text: null, provenance: "demo_fixture" },
    backupTalkIds: [],
    provenance: provenance(["end", "topics", "access"]),
    lastUpdated: null,
  },
];
