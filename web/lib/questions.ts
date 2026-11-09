"use client";

/**
 * Written questions for the presenter (Part C). They are venue content, not attendee data: a question carries no
 * person or device id. They live under their own "curbcut." key so Reset still clears them, and they sync between
 * tabs so the presenter console and the session companion can run side by side in the demo.
 *
 * shortcut: browser storage stands in for `GET/POST /api/sessions/{id}/questions`, so questions only reach tabs in
 * this browser. Swap load/save for the API once Part C's backend (M2) exists.
 */
import { useCallback, useSyncExternalStore } from "react";
import { KEY_PREFIX } from "./storage";
import { newId } from "./store";
import type { WrittenQuestion } from "./types";

export const QUESTIONS_KEY = `${KEY_PREFIX}v1.questions`;
/** Longest question accepted, so one paste cannot fill the presenter's screen. */
export const QUESTION_MAX_LENGTH = 300;
const LOCAL_EVENT = "curbcut:questions";
const EMPTY: WrittenQuestion[] = [];

const isIso = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(new Date(v).getTime());

/** Stored data is untrusted: keep only well-formed questions. */
export function sanitizeQuestions(input: unknown): WrittenQuestion[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((q): WrittenQuestion[] => {
    if (typeof q !== "object" || q === null) return [];
    const r = q as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.talkId !== "string" || typeof r.text !== "string" || !isIso(r.askedAt)) return [];
    const text = r.text.trim().slice(0, QUESTION_MAX_LENGTH);
    if (!text) return [];
    return [{ id: r.id, talkId: r.talkId, text, askedAt: r.askedAt, readOutAt: isIso(r.readOutAt) ? r.readOutAt : null }];
  });
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(QUESTIONS_KEY);
  } catch {
    return null;
  }
}

let cache: { raw: string | null; value: WrittenQuestion[] } = { raw: null, value: EMPTY };
function snapshot(): WrittenQuestion[] {
  const raw = readRaw();
  if (raw === cache.raw) return cache.value;
  let value = EMPTY;
  try {
    value = raw ? sanitizeQuestions(JSON.parse(raw)) : EMPTY;
  } catch {
    value = EMPTY; // corrupt JSON: start fresh
  }
  cache = { raw, value };
  return value;
}

/** Returns false when storage is blocked or full, so the screen can say the question was not saved. */
function write(change: (all: WrittenQuestion[]) => WrittenQuestion[]): boolean {
  try {
    // Re-read first, so a question added in another tab is not overwritten.
    window.localStorage.setItem(QUESTIONS_KEY, JSON.stringify(change(snapshot())));
    window.dispatchEvent(new Event(LOCAL_EVENT));
    return true;
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === QUESTIONS_KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(LOCAL_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LOCAL_EVENT, onChange);
  };
}

export interface QuestionsApi {
  questions: WrittenQuestion[];
  ask(text: string, nowIso: string): boolean;
  markReadOut(id: string, nowIso: string): boolean;
}

/** Questions for one talk, oldest first. */
export function useQuestions(talkId: string): QuestionsApi {
  const all = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const questions = all.filter((q) => q.talkId === talkId).sort((a, b) => a.askedAt.localeCompare(b.askedAt));
  const ask = useCallback(
    (text: string, nowIso: string) => {
      const clean = text.trim().slice(0, QUESTION_MAX_LENGTH);
      if (!clean) return false;
      return write((qs) => [...qs, { id: `q-${newId()}`, talkId, text: clean, askedAt: nowIso, readOutAt: null }]);
    },
    [talkId],
  );
  const markReadOut = useCallback(
    (id: string, nowIso: string) => write((qs) => qs.map((q) => (q.id === id && !q.readOutAt ? { ...q, readOutAt: nowIso } : q))),
    [],
  );
  return { questions, ask, markReadOut };
}
