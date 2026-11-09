/** One place for access-fact wording so cards, details and exports always say the same thing. */
import { roomLabel } from "./fixtures/venue";
import type { Talk } from "./types";

export type Tone = "good" | "warn" | "bad" | "unknown";
export interface AccessFact {
  key: "stepFree" | "captions" | "slides" | "frontSeating" | "quietRoom";
  heading: string;
  label: string;
  tone: Tone;
  /** Text glyph paired with the label; never the only signal. */
  icon: string;
}

export const CAPTION_LABELS = {
  none: "No captions",
  automatic: "Auto captions",
  live_captioner: "Live captioner",
  unknown: "Captions unknown",
} as const;

export const SLIDE_LABELS = {
  none: "No descriptions",
  ai_draft: "AI draft",
  verified: "Verified",
  unknown: "Descriptions unknown",
} as const;

export function accessFacts(talk: Talk): AccessFact[] {
  const a = talk.access;
  const step =
    a.stepFreeEntrance === "confirmed"
      ? { label: "Step-free entrance", tone: "good" as Tone, icon: "✓" }
      : a.stepFreeEntrance === "unavailable"
        ? { label: "No step-free entrance", tone: "bad" as Tone, icon: "✕" }
        : { label: "Step-free entrance unknown", tone: "unknown" as Tone, icon: "?" };
  const captions = {
    live_captioner: { tone: "good" as Tone, icon: "✓" },
    automatic: { tone: "warn" as Tone, icon: "~" },
    none: { tone: "bad" as Tone, icon: "✕" },
    unknown: { tone: "unknown" as Tone, icon: "?" },
  }[a.captions];
  const slides = {
    verified: { tone: "good" as Tone, icon: "✓" },
    ai_draft: { tone: "warn" as Tone, icon: "~" },
    none: { tone: "bad" as Tone, icon: "✕" },
    unknown: { tone: "unknown" as Tone, icon: "?" },
  }[a.slideDescriptions];
  const seating =
    a.frontSeating === "available"
      ? { label: "Front seating available", tone: "good" as Tone, icon: "✓" }
      : a.frontSeating === "unavailable"
        ? { label: "No front seating", tone: "bad" as Tone, icon: "✕" }
        : { label: "Front seating unknown", tone: "unknown" as Tone, icon: "?" };
  const quiet =
    a.quietRoom.status === "known"
      ? { label: `Quiet room nearby (${a.quietRoom.walkMinutes} min, ${roomLabel(a.quietRoom.roomId)})`, tone: "good" as Tone, icon: "✓" }
      : { label: "Quiet room unknown", tone: "unknown" as Tone, icon: "?" };
  return [
    { key: "stepFree", heading: "Step-free entrance", ...step },
    { key: "captions", heading: "Captions", label: CAPTION_LABELS[a.captions], ...captions },
    { key: "slides", heading: "Slide descriptions", label: SLIDE_LABELS[a.slideDescriptions], ...slides },
    { key: "frontSeating", heading: "Front seating", ...seating },
    { key: "quietRoom", heading: "Nearby quiet room", ...quiet },
  ];
}
