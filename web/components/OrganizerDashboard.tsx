"use client";

/**
 * Screen 12: organizer dashboard (laptop). Venue status, change buttons, the live result of a change, reports and
 * access gaps. Announcing "Elevator down" or "Mark as fixed" writes the shared elevator status, so every attendee
 * tab in this browser re-plans through Part B's ChangeWatcher, exactly as a real broadcast would trigger it.
 */
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { PageHeading, PrimaryButton, SecondaryButton } from "./ui";
import { DEMO_PERSONAS } from "@/lib/fixtures/personas";
import { ELEVATOR_IDS, STATUS_WORDS, accessGaps, elevatorDownImpact, venueStatus } from "@/lib/organizer";
import type { ReplanCount } from "@/lib/organizer";
import { CONFIRMATIONS_NEEDED, elevatorForLocation, locationLabel, problemLabel } from "@/lib/reports";
import { ROUTES } from "@/lib/routes";
import { useApp } from "@/lib/store";
import { formatTime } from "@/lib/time";
import { withSpan } from "@/lib/telemetry";
import type { ElevatorId, ReportProblem } from "@/lib/types";

type Action = "down" | "fixed";
interface Result {
  action: Action;
  elevatorId: ElevatorId;
  at: string;
  impact: ReplanCount | null;
}

/** Changes the planner cannot apply yet. Shown so the access team knows they exist, never faked. */
const NOT_YET = ["Talk moved", "Talk delayed", "Room full", "Path blocked"];

export function OrganizerDashboard() {
  const uid = useId();
  const { state, talks, graph, nowIso, setElevatorStatus } = useApp();
  const [action, setAction] = useState<Action | null>(null);
  const [picked, setPicked] = useState<ElevatorId>("B");
  const [result, setResult] = useState<Result | null>(null);
  const floors = useMemo(() => venueStatus(graph), [graph]);
  const gaps = useMemo(() => accessGaps(talks), [talks]);

  const reportGroups = useMemo(() => {
    const groups = new Map<string, { problem: ReportProblem; locationId: string; count: number; latest: string }>();
    for (const r of state.reports) {
      const key = `${r.problem}|${r.locationId}`;
      const g = groups.get(key) ?? { problem: r.problem, locationId: r.locationId, count: 0, latest: r.createdAt };
      g.count++;
      if (r.createdAt > g.latest) g.latest = r.createdAt;
      groups.set(key, g);
    }
    return [...groups.values()].sort((a, b) => b.latest.localeCompare(a.latest));
  }, [state.reports]);

  const announce = (act: Action, id: ElevatorId) =>
    withSpan("organizer.change", { change_type: act === "down" ? "elevator_down" : "elevator_fixed" }, () => {
      const impact = act === "down" ? elevatorDownImpact(DEMO_PERSONAS, talks, graph, id, nowIso, state.currentLocationId) : null;
      setElevatorStatus(id, act === "down" ? "out_of_service" : "working");
      setResult({ action: act, elevatorId: id, at: nowIso, impact });
      setAction(null);
    });

  const current = graph.elevators[picked];
  const blocked = action === "down" ? current === "out_of_service" : current === "working";

  return (
    <div className="staff-screen stack">
      <p className="small muted">Curb Cut · Access team</p>
      <PageHeading>Organizer dashboard</PageHeading>

      <div className="dashboard-grid">
        <section aria-labelledby={`${uid}-venue`} className="card">
          <h2 id={`${uid}-venue`}>Venue status</h2>
          {floors.map((f) => (
            <div key={f.floor}>
              <h3>Floor {f.floor}</h3>
              <ul className="plain-list">
                {f.elevators.map((e) => {
                  const w = STATUS_WORDS[e.status];
                  return (
                    <li key={e.id}>
                      <span className="badge" data-tone={w.tone}>
                        <span aria-hidden="true">{w.icon}</span>
                        <span>
                          Elevator {e.id}: {w.label}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <p className="small muted">Simulated demo status, not a live elevator feed.</p>
        </section>

        <section aria-labelledby={`${uid}-change`} className="card">
          <h2 id={`${uid}-change`}>Announce a change</h2>
          <div className="stack">
            <PrimaryButton onClick={() => setAction("down")}>Elevator down</PrimaryButton>
            <SecondaryButton onClick={() => setAction("fixed")}>Mark as fixed</SecondaryButton>
            {NOT_YET.map((label) => (
              <SecondaryButton key={label} disabled aria-describedby={`${uid}-notyet`}>
                {label}
              </SecondaryButton>
            ))}
            <p id={`${uid}-notyet`} className="small muted">
              Talk moved, Talk delayed, Room full and Path blocked need the Curb Cut API, which is not built yet.
            </p>
          </div>

          {action && (
            <form
              className="card stack"
              aria-label={action === "down" ? "Announce elevator down" : "Mark elevator as fixed"}
              onSubmit={(e) => {
                e.preventDefault();
                if (!blocked) announce(action, picked);
              }}
            >
              <label className="field" htmlFor={`${uid}-elev`}>
                Which elevator?
              </label>
              <select id={`${uid}-elev`} value={picked} onChange={(e) => setPicked(e.target.value as ElevatorId)}>
                {ELEVATOR_IDS.map((id) => (
                  <option key={id} value={id}>
                    Elevator {id} (now: {STATUS_WORDS[graph.elevators[id]].label})
                  </option>
                ))}
              </select>
              {blocked && (
                <p role="status">
                  Elevator {picked} is already {action === "down" ? "marked Not working" : "OK"}.
                </p>
              )}
              <div className="row">
                <SecondaryButton onClick={() => setAction(null)}>Cancel</SecondaryButton>
                <PrimaryButton type="submit" disabled={blocked}>
                  Announce change
                </PrimaryButton>
              </div>
            </form>
          )}

          <div role="status" aria-live="polite">
            {result && (
              <div className="card changed">
                {result.action === "down" ? (
                  <p className="big-result">
                    Elevator {result.elevatorId} down · {result.impact?.affected ?? 0} affected · {result.impact?.replanned ?? 0} re-planned
                  </p>
                ) : (
                  <p className="big-result">Elevator {result.elevatorId} fixed · attendees&apos; routes use it again</p>
                )}
                <p className="small">Announced at {formatTime(result.at)}.</p>
                {result.impact && (
                  <p className="small">
                    Simulated: counted from {result.impact.checked} demo attendees on this device. Live counts come from anonymous acks once the API exists.
                  </p>
                )}
                <p className="small">Counts are anonymous. We never see anyone&apos;s needs.</p>
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby={`${uid}-reports`} className="card">
          <h2 id={`${uid}-reports`}>Reports from attendees</h2>
          {reportGroups.length === 0 ? (
            <p>No reports yet.</p>
          ) : (
            <ul className="card-list">
              {reportGroups.map((g) => {
                const elevator = g.problem === "elevator_not_working" ? elevatorForLocation(g.locationId) : null;
                const confirmed = g.count >= CONFIRMATIONS_NEEDED;
                return (
                  <li key={`${g.problem}|${g.locationId}`} className={confirmed ? "card changed" : "card"}>
                    <p>
                      <strong>{problemLabel(g.problem)}</strong> · {locationLabel(g.locationId, graph)}
                    </p>
                    <p className="small">
                      {g.count} {g.count === 1 ? "report" : "reports"} · latest {formatTime(g.latest)}
                    </p>
                    {confirmed && elevator && graph.elevators[elevator] !== "out_of_service" && (
                      <>
                        <p>
                          <span aria-hidden="true">! </span>
                          {g.count} matching reports. Announce as change?
                        </p>
                        <PrimaryButton onClick={() => announce("down", elevator)}>Announce Elevator {elevator} down</PrimaryButton>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="small muted">Demo: reports made on this device only. Nothing is sent to a server yet.</p>
        </section>
      </div>

      <section aria-labelledby={`${uid}-gaps`} className="card">
        <h2 id={`${uid}-gaps`}>Access gaps</h2>
        <ul className="card-list">
          {gaps.map((g) => (
            <li key={g.id}>
              <details className="collapse">
                <summary>{g.summary}</summary>
                {g.talks.length === 0 ? (
                  <p>None.</p>
                ) : (
                  <ul>
                    {g.talks.map((t) => (
                      <li key={t.id}>
                        <Link href={ROUTES.talk(t.id)}>{t.title}</Link> · {formatTime(t.start)}
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </li>
          ))}
        </ul>
        <p className="small muted">From the demo schedule. Unknown counts as a gap, because nobody can rely on it.</p>
      </section>
    </div>
  );
}
