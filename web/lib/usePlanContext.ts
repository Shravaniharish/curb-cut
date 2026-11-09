"use client";

/**
 * One place where Part B reads Part A's state and turns it into a `PlanContext`. Part B keeps no copy of the
 * preferences, the agenda, the venue graph or the clock: they all come from `useApp()`.
 */
import { useMemo } from "react";
import { agendaTalks } from "./agenda";
import type { PlanContext } from "./changes";
import { useApp } from "./store";

export function usePlanContext(): PlanContext {
  const { state, talks, graph, agenda, nowIso } = useApp();
  return useMemo(
    () => ({
      prefs: state.prefs,
      talks,
      graph,
      plan: agendaTalks(agenda.items, talks),
      nowIso,
      currentLocationId: state.currentLocationId,
    }),
    [state.prefs, state.currentLocationId, talks, graph, agenda.items, nowIso],
  );
}
