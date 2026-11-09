"use client";

/**
 * Opens the change alert over whatever screen the attendee is on, the moment an event change affects them.
 *
 * Only the person's own device decides whether they are affected: it compares the route their plan needed before
 * the change with the route it needs now. A change that does not touch their plan raises no alert at all.
 *
 * Demo mode (default): event changes come from the simulated elevator controls and are worked out on the device, so
 * every alert is marked as a simulated condition. Live mode (`NEXT_PUBLIC_API_MODE=live`): the API decides, and
 * `ApiSync` hands the finished alert over through the alert bus; the local elevator check is switched off so one
 * change never raises two alerts.
 */
import { useEffect, useRef, useState } from "react";
import { LIVE } from "@/lib/api";
import { subscribeToAlerts } from "@/lib/alertBus";
import { Dialog } from "./Dialog";
import { ChangeAlert } from "./ChangeAlert";
import { buildElevatorDownAlert, buildElevatorFixedAlert, routeUsedElevator } from "@/lib/changes";
import type { PlanContext } from "@/lib/changes";
import { useApp } from "@/lib/store";
import { usePlanContext } from "@/lib/usePlanContext";
import type { AlertRecord, ElevatorId, ElevatorStatus } from "@/lib/types";

const ELEVATORS: ElevatorId[] = ["A", "B", "C"];

export function ChangeWatcher() {
  const { ready, state, graph, recordAlert, acknowledgeAlert } = useApp();
  const ctx = usePlanContext();
  const [open, setOpen] = useState<AlertRecord | null>(null);
  const seen = useRef<Record<ElevatorId, ElevatorStatus> | null>(null);
  // The latest context, so the watcher below can read it without re-running on every clock tick. Declared first,
  // so it is already up to date when the watcher runs after a status change.
  const ctxRef = useRef(ctx);
  useEffect(() => {
    ctxRef.current = ctx;
  }, [ctx]);

  useEffect(() => {
    if (!LIVE) return;
    return subscribeToAlerts((draft) => setOpen(recordAlert(draft)));
  }, [recordAlert]);

  useEffect(() => {
    if (!ready || LIVE) return;
    const previous = seen.current;
    seen.current = { ...state.elevatorStatus };
    if (!previous) return; // first read: the starting demo condition is not a change

    const now = ctxRef.current;
    for (const id of ELEVATORS) {
      const before = previous[id];
      const after = state.elevatorStatus[id];
      if (before === after) continue;
      if (after === "out_of_service") {
        // The old graph still has the elevator working, so this asks: was it on my route a moment ago?
        const old: PlanContext = { ...now, graph: { ...graph, elevators: previous } };
        if (!routeUsedElevator(old, id)) continue;
        setOpen(recordAlert(buildElevatorDownAlert(now, id, { simulated: true })));
        return;
      }
      if (before === "out_of_service" && after === "working") {
        if (!routeUsedElevator(now, id)) continue;
        setOpen(recordAlert(buildElevatorFixedAlert(now, id, { simulated: true })));
        return;
      }
    }
  }, [ready, state.elevatorStatus, graph, recordAlert]);

  if (!open) return null;
  const close = () => {
    acknowledgeAlert(open.id);
    setOpen(null);
  };
  return (
    <Dialog open title="Plan changed" onClose={close}>
      <ChangeAlert alert={open} style={state.prefs.notificationStyle} onOk={close} onLeave={close} withHeading={false} />
    </Dialog>
  );
}
