import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultPreferences, defaultState, sanitizePreferences, sanitizeState } from "@/lib/preferences";
import { STATE_KEY, clearAllCurbCutData, loadSearchQuery, loadState, saveSearchQuery, saveState, storageAvailable } from "@/lib/storage";

afterEach(() => vi.restoreAllMocks());

describe("preferences", () => {
  it("separates required needs from optional preferences", () => {
    const p = defaultPreferences();
    expect(Object.keys(p.required).sort()).toEqual(["captions", "stepFreeRouting"]);
    expect(p.preferences.frontSeating).toBe(false);
  });
  it("sanitises garbage without throwing", () => {
    expect(sanitizePreferences("nope")).toEqual(defaultPreferences());
    const p = sanitizePreferences({ required: { captions: "yes" }, topics: ["Security", "Hacking", 3], notificationStyle: "loud", display: { textScale: 99 }, pronouns: "x".repeat(100) });
    expect(p.required.captions).toBe(false);
    expect(p.topics).toEqual(["Security"]);
    expect(p.notificationStyle).toBeNull();
    expect(p.display.textScale).toBe(1.5);
    expect(p.pronouns).toHaveLength(40);
  });
  it("rebuilds state from invalid stored data", () => {
    expect(sanitizeState({ version: 2 }).onboarding).toBe("none");
    const s = sanitizeState({ version: 1, onboarding: "complete", elevatorStatus: { B: "nonsense", A: "out_of_service" }, reminder: { talkId: 1 }, demoClock: { mode: "demo", anchorDemo: "bad", anchorReal: 1 } });
    expect(s.onboarding).toBe("complete");
    expect(s.elevatorStatus).toMatchObject({ A: "out_of_service", B: "out_of_service" }); // B keeps its demo default
    expect(s.reminder).toBeNull();
    expect(s.demoClock.mode).toBe("demo");
  });
});

describe("storage", () => {
  it("round-trips state and survives corrupt JSON", () => {
    const s = defaultState(1000);
    s.prefs.required.captions = true;
    expect(saveState(s)).toBe(true);
    expect(loadState(1000).state?.prefs.required.captions).toBe(true);
    window.localStorage.setItem(STATE_KEY, "{not json");
    expect(loadState()).toEqual({ state: null, available: true });
  });
  it("clears only this app's keys", () => {
    saveState(defaultState());
    saveSearchQuery("security");
    window.localStorage.setItem("someone.else", "keep");
    window.sessionStorage.setItem("other", "keep");
    expect(clearAllCurbCutData()).toBe(2);
    expect(window.localStorage.getItem(STATE_KEY)).toBeNull();
    expect(loadSearchQuery()).toBe("");
    expect(window.localStorage.getItem("someone.else")).toBe("keep");
    expect(window.sessionStorage.getItem("other")).toBe("keep");
  });
  it("degrades gracefully when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(storageAvailable()).toBe(false);
    expect(saveState(defaultState())).toBe(false);
    expect(loadState()).toEqual({ state: null, available: false });
    expect(() => saveSearchQuery("x")).not.toThrow();
    expect(clearAllCurbCutData()).toBe(0);
  });
});
