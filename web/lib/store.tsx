"use client";

/**
 * AppStateProvider: the single source of truth for Part A state. Parts B and C read it through `useApp()` instead of
 * keeping their own copies of the preferences, agenda, selected talk, route or reminder.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { buildAgenda } from "./agenda";
import type { AgendaResult } from "./agenda";
import { DEMO_TALKS } from "./fixtures/talks";
import { createDemoVenue } from "./fixtures/venue";
import { defaultState } from "./preferences";
import { clearAllCurbCutData, loadSearchQuery, loadState, saveSearchQuery, saveState } from "./storage";
import { clockNowIso } from "./time";
import { withSpan } from "./telemetry";
import type {
  AttendeePreferences,
  DemoClockState,
  ElevatorId,
  ElevatorStatus,
  NavigationGraph,
  Onboarding,
  PersistedState,
  Reminder,
  Talk,
} from "./types";

export interface ReminderNotice {
  talkTitle: string;
  leaveByIso: string;
}

export interface AppContextValue {
  /** False until stored state has been read in the browser. Screens that depend on state wait for it. */
  ready: boolean;
  storageOk: boolean;
  state: PersistedState;
  talks: Talk[];
  graph: NavigationGraph;
  agenda: AgendaResult;
  nowIso: string;
  searchQuery: string;
  reminderNotice: ReminderNotice | null;
  dismissReminderNotice(): void;
  updatePrefs(change: (draft: AttendeePreferences) => void): void;
  setOnboarding(value: Onboarding): void;
  loadPreferences(prefs: AttendeePreferences, onboarding: Onboarding): void;
  addToPlan(talkId: string): void;
  removeFromPlan(talkId: string): void;
  setCurrentLocation(roomId: string): void;
  selectTalk(talkId: string | null): void;
  setCurrentRoute(route: PersistedState["currentRoute"]): void;
  setReminder(reminder: Reminder | null): void;
  setElevatorStatus(id: ElevatorId, status: ElevatorStatus): void;
  setDemoClock(clock: DemoClockState): void;
  setSearchQuery(query: string): void;
  resetAll(): void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppStateProvider>.");
  return ctx;
}

const TICK_MS = 5000;

function applyDisplay(prefs: AttendeePreferences) {
  const root = document.documentElement;
  root.style.fontSize = `${Math.round(prefs.display.textScale * 100)}%`;
  if (prefs.display.highContrast) root.dataset.contrast = "high";
  else delete root.dataset.contrast;
  root.dataset.font = prefs.display.dyslexiaFont ? "dyslexia" : "default";
  root.dataset.motion = prefs.display.reducedMotion ? "reduced" : "system";
}

export function AppStateProvider({ children, talks = DEMO_TALKS }: { children: ReactNode; talks?: Talk[] }) {
  const [state, setState] = useState<PersistedState>(() => defaultState(0));
  const [ready, setReady] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [nowIso, setNowIso] = useState(() => new Date(0).toISOString());
  const [searchQuery, setSearchQueryState] = useState("");
  const [reminderNotice, setReminderNotice] = useState<ReminderNotice | null>(null);
  // Nothing is written to storage until the attendee changes something, and a reset leaves no keys behind.
  const dirtyRef = useRef(false);
  const patch = useCallback((change: (s: PersistedState) => PersistedState) => {
    dirtyRef.current = true;
    setState((s) => change(s));
  }, []);

  // Read stored state once, in the browser.
  useEffect(() => {
    const { state: stored, available } = loadState();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from browser storage
    setState(stored ?? defaultState());
    setStorageOk(available);
    setSearchQueryState(loadSearchQuery());
    setReady(true);
  }, []);

  // Save on every change after the first read.
  useEffect(() => {
    if (!ready || !dirtyRef.current) return;
    setStorageOk(saveState(state));
  }, [ready, state]);

  // Display settings are applied to the document so every setting has a visible effect.
  useEffect(() => {
    if (ready) applyDisplay(state.prefs);
  }, [ready, state.prefs]);

  // Clock tick.
  useEffect(() => {
    if (!ready) return;
    const update = () => setNowIso(clockNowIso(state.demoClock));
    update();
    const id = setInterval(update, TICK_MS);
    return () => clearInterval(id);
  }, [ready, state.demoClock]);

  // In-app reminder: fires while the app is open. No background or push notification is scheduled.
  useEffect(() => {
    const r = state.reminder;
    if (!ready || !r || r.firedAt) return;
    if (new Date(nowIso).getTime() < new Date(r.remindAt).getTime()) return;
    const talk = talks.find((t) => t.id === r.talkId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the clock reaching the reminder time
    setReminderNotice({ talkTitle: talk?.title ?? "your next talk", leaveByIso: r.leaveBy });
    patch((s) => (s.reminder ? { ...s, reminder: { ...s.reminder, firedAt: nowIso } } : s));
    if (state.prefs.notificationStyle === "vibrate_big_text" && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(200);
    }
  }, [ready, nowIso, state.reminder, state.prefs.notificationStyle, talks, patch]);

  const graph = useMemo(() => createDemoVenue(state.elevatorStatus), [state.elevatorStatus]);

  const agenda = useMemo(
    () =>
      withSpan("agenda.generate", { talk_count: talks.length }, () =>
        buildAgenda({
          prefs: state.prefs,
          talks,
          graph,
          overrides: state.agendaOverrides,
          startLocationId: state.currentLocationId,
        }),
      ),
    [state.prefs, state.agendaOverrides, state.currentLocationId, talks, graph],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      storageOk,
      state,
      talks,
      graph,
      agenda,
      nowIso,
      searchQuery,
      reminderNotice,
      dismissReminderNotice: () => setReminderNotice(null),
      updatePrefs: (change) =>
        patch((s) => {
          const draft = structuredClone(s.prefs);
          change(draft);
          return { ...s, prefs: draft };
        }),
      setOnboarding: (onboarding) => patch((s) => ({ ...s, onboarding })),
      loadPreferences: (prefs, onboarding) =>
        patch((s) => ({ ...s, prefs: structuredClone(prefs), onboarding, agendaOverrides: { added: [], removed: [] } })),
      addToPlan: (talkId) =>
        patch((s) => ({
          ...s,
          agendaOverrides: {
            added: s.agendaOverrides.added.includes(talkId) ? s.agendaOverrides.added : [...s.agendaOverrides.added, talkId],
            removed: s.agendaOverrides.removed.filter((id) => id !== talkId),
          },
        })),
      removeFromPlan: (talkId) =>
        patch((s) => ({
          ...s,
          agendaOverrides: {
            added: s.agendaOverrides.added.filter((id) => id !== talkId),
            removed: s.agendaOverrides.removed.includes(talkId) ? s.agendaOverrides.removed : [...s.agendaOverrides.removed, talkId],
          },
        })),
      setCurrentLocation: (roomId) => patch((s) => ({ ...s, currentLocationId: roomId })),
      selectTalk: (talkId) => patch((s) => ({ ...s, selectedTalkId: talkId })),
      setCurrentRoute: (currentRoute) => patch((s) => ({ ...s, currentRoute })),
      setReminder: (reminder) => patch((s) => ({ ...s, reminder })),
      setElevatorStatus: (id, status) => patch((s) => ({ ...s, elevatorStatus: { ...s.elevatorStatus, [id]: status } })),
      setDemoClock: (demoClock) => patch((s) => ({ ...s, demoClock })),
      setSearchQuery: (query) => {
        setSearchQueryState(query);
        saveSearchQuery(query);
      },
      resetAll: () => {
        clearAllCurbCutData();
        dirtyRef.current = false;
        const fresh = defaultState();
        setState(fresh);
        setSearchQueryState("");
        setReminderNotice(null);
        applyDisplay(fresh.prefs);
      },
    }),
    [ready, storageOk, state, talks, graph, agenda, nowIso, searchQuery, reminderNotice, patch],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
