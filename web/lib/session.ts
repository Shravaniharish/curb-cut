/**
 * Part C session companion logic. Pure functions: the transcript is replayed against the app clock, and questions
 * the presenter has read out are merged into it at the moment they were read. Nothing here is sent anywhere.
 */
import type { TranscriptChunk, WrittenQuestion } from "./types";

/** How far "Back 30 seconds" moves. */
export const JUMP_BACK_SEC = 30;
/** "Catch me up" looks at this much of the talk, ending now. */
export const CATCH_UP_WINDOW_SEC = 60;
export const CATCH_UP_MAX_BULLETS = 3;

export interface FeedLine {
  key: string;
  offsetSec: number;
  kind: "speech" | "question";
  speaker: string;
  text: string;
}

/** Whole seconds since the talk started. Negative before it starts. */
export function elapsedSec(talkStartIso: string, nowIso: string): number {
  return Math.floor((new Date(nowIso).getTime() - new Date(talkStartIso).getTime()) / 1000);
}

/** Transcript lines plus questions read out by the presenter, in time order. */
export function buildFeed(chunks: TranscriptChunk[], questions: WrittenQuestion[], talkStartIso: string): FeedLine[] {
  const speech: FeedLine[] = chunks.map((c, i) => ({ key: `c${i}`, offsetSec: c.offsetSec, kind: "speech", speaker: c.speaker, text: c.text }));
  const read: FeedLine[] = questions
    .filter((q) => q.readOutAt)
    .map((q) => ({
      key: q.id,
      offsetSec: Math.max(0, elapsedSec(talkStartIso, q.readOutAt as string)),
      kind: "question",
      speaker: "Question read out",
      text: q.text,
    }));
  // Stable sort keeps speech before a question read out in the same second.
  return [...speech, ...read].sort((a, b) => a.offsetSec - b.offsetSec);
}

/** Lines that have been said by `atSec` seconds into the talk. */
export function linesAt(feed: FeedLine[], atSec: number): FeedLine[] {
  return feed.filter((l) => l.offsetSec <= atSec);
}

/** "Back 30 seconds": never before the start of the talk. */
export function jumpBack(atSec: number, by: number = JUMP_BACK_SEC): number {
  return Math.max(0, atSec - by);
}

/**
 * "Catch me up" without a language model: the last few lines from the past minute, each with its time, so the
 * attendee can jump back to it. This is the same fallback the API uses when no LLM key is set.
 */
export function catchUp(feed: FeedLine[], atSec: number, windowSec: number = CATCH_UP_WINDOW_SEC, max: number = CATCH_UP_MAX_BULLETS): FeedLine[] {
  return linesAt(feed, atSec)
    .filter((l) => l.offsetSec > atSec - windowSec)
    .slice(-max);
}

/** "4:05" for 245 seconds into the talk. */
export function formatElapsed(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "4 minutes 5 seconds", for screen readers. */
export function spokenElapsed(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  const parts = [];
  if (m) parts.push(`${m} ${m === 1 ? "minute" : "minutes"}`);
  if (r || !m) parts.push(`${r} ${r === 1 ? "second" : "seconds"}`);
  return parts.join(" ");
}
