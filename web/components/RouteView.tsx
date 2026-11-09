"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo } from "react";
import { ChangeSummaryBlock } from "@/components/ChangeSummaryBlock";
import { DemoControls } from "@/components/DemoControls";
import { LeaveByIndicator } from "@/components/LeaveByIndicator";
import { ErrorState, PageHeading, PrimaryButton, SecondaryButton } from "@/components/ui";
import { WaitForState } from "@/components/WaitForState";
import { agendaTalks, bufferMinutes } from "@/lib/agenda";
import { roomLabel } from "@/lib/fixtures/venue";
import { calculateRoute } from "@/lib/routing";
import { ROUTES } from "@/lib/routes";
import { useApp } from "@/lib/store";
import { addMinutes, computeLeaveBy, formatTime } from "@/lib/time";
import { withSpan } from "@/lib/telemetry";
import type { NavigationGraph, RouteResult, Talk } from "@/lib/types";

export const REMINDER_LEAD_MINUTES = 5;

function Schematic({ route, graph }: { route: Extract<RouteResult, { ok: true }>; graph: NavigationGraph }) {
  return (
    <div className="card" role="group" aria-label="Schematic map">
      <p className="small muted">Schematic only: not to scale, not a floor plan, and not a verified path.</p>
      <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {[3, 2, 1].map((floor) => {
          const stops = route.path.map((id) => graph.nodes.find((n) => n.id === id)).filter((n) => n && n.floor === floor);
          return (
            <li key={floor} style={{ padding: "0.5rem 0", borderTop: "1px solid var(--border)" }}>
              <strong>Floor {floor}:</strong> {stops.length ? stops.map((n) => n!.label).join(" → ") : "Not on this route"}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function View({ destinationId }: { destinationId: string }) {
  const uid = useId();
  const router = useRouter();
  const { state, graph, agenda, talks, nowIso, setCurrentLocation, setCurrentRoute, setReminder } = useApp();
  const prefs = state.prefs;
  const dest = graph.nodes.find((n) => n.id === destinationId);

  const talk: Talk | null = useMemo(() => {
    const planned = agendaTalks(agenda.items, talks);
    const selected = state.selectedTalkId ? talks.find((t) => t.id === state.selectedTalkId) : undefined;
    if (selected && selected.roomId === destinationId) return selected;
    return planned.find((t) => t.roomId === destinationId && new Date(t.start) > new Date(nowIso)) ?? null;
  }, [agenda.items, talks, state.selectedTalkId, destinationId, nowIso]);

  const route = useMemo(
    () => withSpan("route.calculate", { stepFree: prefs.required.stepFreeRouting }, () => calculateRoute(graph, state.currentLocationId, destinationId, { stepFreeRequired: prefs.required.stepFreeRouting })),
    [graph, state.currentLocationId, destinationId, prefs.required.stepFreeRouting],
  );

  if (!dest) {
    return (
      <div className="stack">
        <PageHeading>Place not found</PageHeading>
        <ErrorState title="We could not find that place">
          <p>The link may be wrong.</p>
        </ErrorState>
        <PrimaryButton href={ROUTES.plan}>Back to my plan</PrimaryButton>
      </div>
    );
  }

  const buffer = bufferMinutes(prefs);
  const leaveBy = route.ok && talk ? computeLeaveBy(talk.start, route.minutes, buffer) : null;
  const reminder = state.reminder && talk && state.reminder.talkId === talk.id ? state.reminder : null;

  function setReminderForTalk() {
    if (!talk || !leaveBy) return;
    setReminder({
      talkId: talk.id,
      leaveBy,
      remindAt: addMinutes(leaveBy, -REMINDER_LEAD_MINUTES),
      createdAt: nowIso,
      firedAt: null,
    });
  }

  function arrived() {
    setCurrentLocation(destinationId);
    setCurrentRoute(null);
    router.push(ROUTES.plan);
  }

  const title = route.ok
    ? `To ${dest.label} · ${route.minutes} ${route.minutes === 1 ? "minute" : "minutes"}${route.stepFree ? " · Step-free" : route.steps.some((s) => s.kind === "stairs") ? " · Includes stairs" : " · No stairs"}`
    : `To ${dest.label}`;

  return (
    <div className="stack">
      <PageHeading>{title}</PageHeading>
      <p className="muted">
        From {roomLabel(state.currentLocationId, graph)}. Directions come from a demo venue model, not a surveyed floor plan.
      </p>

      {!route.ok ? (
        <ErrorState title={route.message}>
          {route.reason === "no_accessible_route" && (
            <p>We will not show a route with stairs when you have chosen step-free routes. Check the demo conditions below, or head back to your plan.</p>
          )}
        </ErrorState>
      ) : (
        <>
          {leaveBy && talk && (
            <section className="card" aria-label="Leave-by time">
              <LeaveByIndicator leaveByIso={leaveBy} travelMinutes={route.minutes} bufferMinutes={buffer} stepFree={route.stepFree} />
              <p className="small muted" style={{ marginBottom: 0 }}>For {talk.title}, starting {formatTime(talk.start)}.</p>
            </section>
          )}
          {route.steps.length === 0 ? (
            <p>You are already at {dest.label}.</p>
          ) : (
            <ol className="steps card" aria-label="Directions">
              {route.steps.map((s) => (
                <li key={s.index}>{s.text}</li>
              ))}
            </ol>
          )}
          {route.avoidedElevators.length > 0 && (
            <ChangeSummaryBlock title="Route status" simulated>
              {route.avoidedElevators.map((id) => (
                <p key={id} style={{ marginBottom: 0 }}>Avoids Elevator {id} (not working).</p>
              ))}
            </ChangeSummaryBlock>
          )}
          {route.warnings.map((w) => (
            <p key={w} className="status-note">{w}</p>
          ))}
          <details className="collapse">
            <summary>Optional schematic map</summary>
            <Schematic route={route} graph={graph} />
          </details>
        </>
      )}

      <div className="stack">
        <PrimaryButton onClick={arrived}>I&apos;ve arrived</PrimaryButton>
        {reminder ? (
          <div className="card" role="status">
            <p>
              Reminder set for {formatTime(reminder.remindAt)}
              {reminder.firedAt ? " (already shown)" : ""}. It appears only while this page is open in your browser. This demo cannot notify you after you close it.
            </p>
            <SecondaryButton onClick={() => setReminder(null)}>Cancel reminder</SecondaryButton>
          </div>
        ) : (
          <>
            <SecondaryButton disabled={!leaveBy} onClick={setReminderForTalk} aria-describedby={`${uid}-reminder-help`}>
              Remind me {REMINDER_LEAD_MINUTES} minutes before I need to leave
            </SecondaryButton>
            <p id={`${uid}-reminder-help`} className="small muted">
              {leaveBy
                ? "The reminder shows in this app while it is open. It cannot notify you after you close the browser."
                : "A reminder needs a talk in this room to count back from."}
            </p>
          </>
        )}
        <SecondaryButton href={ROUTES.plan}>Back to my plan</SecondaryButton>
      </div>

      <details className="collapse">
        <summary>Demo conditions</summary>
        <DemoControls show={["elevators", "location", "clock"]} />
      </details>
    </div>
  );
}

export function RouteView({ destinationId }: { destinationId: string }) {
  return (
    <WaitForState>
      <View destinationId={destinationId} />
    </WaitForState>
  );
}
