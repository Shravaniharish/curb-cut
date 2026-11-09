/**
 * Browser storage for the attendee's own state. Everything lives under the "curbcut." prefix so a reset can remove
 * exactly this app's keys and nothing else. All access is guarded: storage can be missing, blocked or full.
 */
import { sanitizeState } from "./preferences";
import type { PersistedState } from "./types";

export const KEY_PREFIX = "curbcut.";
export const STATE_KEY = "curbcut.v1.state";
export const SEARCH_KEY = "curbcut.v1.search";

type Kind = "localStorage" | "sessionStorage";

function getStorage(kind: Kind): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const s = window[kind];
    const probe = `${KEY_PREFIX}probe`;
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function storageAvailable(): boolean {
  return getStorage("localStorage") !== null;
}

export function loadState(realNowMs: number = Date.now()): { state: PersistedState | null; available: boolean } {
  const s = getStorage("localStorage");
  if (!s) return { state: null, available: false };
  try {
    const raw = s.getItem(STATE_KEY);
    if (!raw) return { state: null, available: true };
    return { state: sanitizeState(JSON.parse(raw), realNowMs), available: true };
  } catch {
    return { state: null, available: true }; // corrupt JSON: ignore and start fresh
  }
}

export function saveState(state: PersistedState): boolean {
  const s = getStorage("localStorage");
  if (!s) return false;
  try {
    s.setItem(STATE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function loadSearchQuery(): string {
  try {
    return getStorage("sessionStorage")?.getItem(SEARCH_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveSearchQuery(query: string): void {
  try {
    const s = getStorage("sessionStorage");
    if (!s) return;
    if (query) s.setItem(SEARCH_KEY, query);
    else s.removeItem(SEARCH_KEY);
  } catch {
    /* ignore: the query simply is not remembered */
  }
}

/** Remove only this app's keys from both storages. Returns the number of keys removed. */
export function clearAllCurbCutData(): number {
  let removed = 0;
  for (const kind of ["localStorage", "sessionStorage"] as Kind[]) {
    const s = getStorage(kind);
    if (!s) continue;
    try {
      const keys: string[] = [];
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k && k.startsWith(KEY_PREFIX)) keys.push(k);
      }
      for (const k of keys) {
        s.removeItem(k);
        removed++;
      }
    } catch {
      /* ignore */
    }
  }
  return removed;
}
