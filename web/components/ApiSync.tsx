"use client";

/**
 * Live mode only. Listens for venue changes from the API and turns each one into this attendee's own alert.
 *
 *   organizer announces -> API saves it and pushes it here (public venue info, like a PA announcement)
 *   -> this device sends its own profile and plan to POST /api/replan and gets back {affected, alert}
 *   -> if affected, the alert is shown in the attendee's alert style and saved in their history
 *   -> an anonymous ack {affected, replan_ms} lets the organizer count, without learning who or why.
 *
 * It also copies the server's elevator status into the local venue, so routes drawn on this device agree with it.
 * Renders nothing. If the API cannot be reached the app keeps working on the device, as it does with live mode off.
 */
import { useEffect, useRef } from "react";
import { LIVE, ackChange, alertFromApi, getVenue, replanForChange, subscribeToChanges } from "@/lib/api";
import type { ApiChange, ApiVenue } from "@/lib/api";
import { publishAlert } from "@/lib/alertBus";
import { useApp } from "@/lib/store";
import { withSpan } from "@/lib/telemetry";
import { usePlanContext } from "@/lib/usePlanContext";
import type { ElevatorId } from "@/lib/types";

const ELEVATORS: ElevatorId[] = ["A", "B", "C"];

export function ApiSync() {
  const { ready, setElevatorStatus, state } = useApp();
  const ctx = usePlanContext();
  // Always the latest values, read inside the long-lived stream handler without re-subscribing every clock tick.
  const latest = useRef({ ctx, prefs: state.prefs, setElevatorStatus });
  useEffect(() => {
    latest.current = { ctx, prefs: state.prefs, setElevatorStatus };
  }, [ctx, state.prefs, setElevatorStatus]);

  useEffect(() => {
    if (!LIVE || !ready) return;
    let stopped = false;

    const applyVenue = (venue: ApiVenue) => {
      for (const id of ELEVATORS) latest.current.setElevatorStatus(id, venue.elevators[id]);
    };
    getVenue().then((v) => !stopped && applyVenue(v)).catch(() => {});

    const unsubscribe = subscribeToChanges(async (change: ApiChange) => {
      const started = performance.now();
      const { ctx: c, prefs } = latest.current;
      try {
        const result = await withSpan("replan.client", { change_type: change.type }, () =>
          replanForChange(prefs, { talkIds: c.plan.map((t) => t.id), currentLocationId: c.currentLocationId, nowIso: c.nowIso }, change.id),
        );
        if (stopped) return;
        getVenue().then((v) => !stopped && applyVenue(v)).catch(() => {});
        if (result.affected && result.alert) publishAlert(alertFromApi(result.alert));
        await ackChange(change.id, result.affected, performance.now() - started).catch(() => {});
      } catch {
        // The API could not re-plan. Nothing is shown rather than something wrong; the device keeps its last plan.
      }
    });
    return () => {
      stopped = true;
      unsubscribe();
    };
  }, [ready]);

  return null;
}
