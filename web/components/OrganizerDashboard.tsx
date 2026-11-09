"use client";

/**
 * Screen 12: organizer dashboard (laptop). Venue status, change buttons, the live result of a change, reports and
 * access gaps. Announcing "Elevator down" or "Mark as fixed" writes the shared elevator status, so every attendee
 * tab in this browser re-plans through Part B's ChangeWatcher, exactly as a real broadcast would trigger it.
 */
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { LIVE, announceChange, getSummary, setOrganizerKey } from "@/lib/api";
import type { ApiSummary } from "@/lib/api";
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

type Action = "down" | "fixed" | "path_blocked" | "room_full";
interface Result {
  action: Action;
  /** Elevator id, floor path id or talk id, depending on the action. */
  target: string;
  at: string;
  impact: ReplanCount | null;
}

/** Changes that are not built. Shown so the access team knows they exist, never faked. */
const NOT_YET = LIVE ? ["Talk moved", "Talk delayed"] : ["Talk moved", "Talk delayed", "Room full", "Path blocked"];
const FLOOR_PATHS = [1, 2, 3].map((n) => ({ id: `path-floor-${n}`, label: `Floor ${n} path` }));
const POLL_MS = 3000;

/** The live API summary, refreshed every few seconds. Null when live mode is off or the API cannot be reached. */
function useSummary(): { summary: ApiSummary | null; error: string | null; refresh: () => void } {
  const [summary, setSummary] = useState<ApiSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    if (!LIVE) return;
    getSummary()
      .then((s) => {
        setSummary(s);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!LIVE) return;
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);
  return { summary, error, refresh };
}

export function OrganizerDashboard() {
  const uid = useId();
  const { state, talks, graph, nowIso, setElevatorStatus } = useApp();
  const [action, setAction] = useState<Action | null>(null);
  const [picked, setPicked] = useState<string>("B");
  const [result, setResult] = useState<Result | null>(null);
  const [announceError, setAnnounceError] = useState<string | null>(null);
  const { summary, error: summaryError, refresh } = useSummary();
  // In live mode the venue the API holds is the truth; otherwise it is this device's simulated venue.
  const shownGraph = useMemo(() => (summary ? { ...graph, elevators: summary.venue.elevators } : graph), [graph, summary]);
  const floors = useMemo(() => venueStatus(shownGraph), [shownGraph]);
  const gaps = useMemo(() => accessGaps(talks), [talks]);

  const reportGroups = useMemo(() => {
    if (summary) {
      return summary.reports
        .map((r) => ({ problem: r.problem, locationId: r.location_id, count: r.devices, latest: r.latest }))
        .sort((a, b) => b.latest.localeCompare(a.latest));
    }
    const groups = new Map<string, { problem: ReportProblem; locationId: string; count: number; latest: string }>();
    for (const r of state.reports) {
      const key = `${r.problem}|${r.locationId}`;
      const g = groups.get(key) ?? { problem: r.problem, locationId: r.locationId, count: 0, latest: r.createdAt };
      g.count++;
      if (r.createdAt > g.latest) g.latest = r.createdAt;
      groups.set(key, g);
    }
    return [...groups.values()].sort((a, b) => b.latest.localeCompare(a.latest));
  }, [state.reports, summary]);

  const announce = (act: Action, target: string) => {
    if (LIVE) {
      const type = act === "down" ? "elevator_down" : act === "fixed" ? "elevator_fixed" : act;
      setAnnounceError(null);
      withSpan("organizer.change", { change_type: type }, () => announceChange(type, target))
        .then(() => {
          setResult({ action: act, target, at: nowIso, impact: null });
          setAction(null);
          refresh();
        })
        .catch((e: Error) => setAnnounceError(e.message));
      return;
    }
    if (act !== "down" && act !== "fixed") return;
    const id = target as ElevatorId;
    withSpan("organizer.change", { change_type: act === "down" ? "elevator_down" : "elevator_fixed" }, () => {
      const impact = act === "down" ? elevatorDownImpact(DEMO_PERSONAS, talks, graph, id, nowIso, state.currentLocationId) : null;
      setElevatorStatus(id, act === "down" ? "out_of_service" : "working");
      setResult({ action: act, target, at: nowIso, impact });
      setAction(null);
    });
  };

  const targetOptions: { id: string; label: string }[] =
    action === "path_blocked"
      ? FLOOR_PATHS
      : action === "room_full"
        ? talks.map((t) => ({ id: t.id, label: t.title }))
        : ELEVATOR_IDS.map((id) => ({ id, label: `Elevator ${id} (now: ${STATUS_WORDS[shownGraph.elevators[id]].label})` }));
  const choose = (next: Action) => {
    setAction(next);
    setAnnounceError(null);
    setPicked(next === "path_blocked" ? FLOOR_PATHS[0].id : next === "room_full" ? (talks[0]?.id ?? "") : "B");
  };
  const current = shownGraph.elevators[picked as ElevatorId];
  const blocked = action === "down" ? current === "out_of_service" : action === "fixed" ? current === "working" : false;
  const noun = action === "path_blocked" ? "Which path?" : action === "room_full" ? "Which talk?" : "Which elevator?";
  const formName = {
    down: "Announce elevator down",
    fixed: "Mark elevator as fixed",
    path_blocked: "Announce path blocked",
    room_full: "Announce room full",
  };

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
          <p className="small muted">
            {summary ? "From the Curb Cut API. Demo venue, not a live elevator feed." : "Simulated demo status, not a live elevator feed."}
          </p>
        </section>

        <section aria-labelledby={`${uid}-change`} className="card">
          <h2 id={`${uid}-change`}>Announce a change</h2>
          <div className="stack">
            <PrimaryButton onClick={() => choose("down")}>Elevator down</PrimaryButton>
            <SecondaryButton onClick={() => choose("fixed")}>Mark as fixed</SecondaryButton>
            {LIVE && <SecondaryButton onClick={() => choose("room_full")}>Room full</SecondaryButton>}
            {LIVE && <SecondaryButton onClick={() => choose("path_blocked")}>Path blocked</SecondaryButton>}
            {NOT_YET.map((label) => (
              <SecondaryButton key={label} disabled aria-describedby={`${uid}-notyet`}>
                {label}
              </SecondaryButton>
            ))}
            <p id={`${uid}-notyet`} className="small muted">
              {LIVE
                ? "Talk moved and Talk delayed are not built in the screen yet. The API already accepts talk_moved."
                : "Talk moved, Talk delayed, Room full and Path blocked need the Curb Cut API. Turn on live mode to use Room full and Path blocked."}
            </p>
            {LIVE && (
              <div>
                <label className="field" htmlFor={`${uid}-key`}>
                  Organizer key (only if the API is locked)
                </label>
                <input id={`${uid}-key`} type="password" autoComplete="off" onChange={(e) => setOrganizerKey(e.target.value)} />
                <p className="small muted">Kept in memory on this page only.</p>
              </div>
            )}
          </div>

          {action && (
            <form
              className="card stack"
              aria-label={formName[action]}
              onSubmit={(e) => {
                e.preventDefault();
                if (!blocked) announce(action, picked);
              }}
            >
              <label className="field" htmlFor={`${uid}-elev`}>
                {noun}
              </label>
              <select id={`${uid}-elev`} value={picked} onChange={(e) => setPicked(e.target.value)}>
                {targetOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              {blocked && (
                <p role="status">
                  Elevator {picked} is already {action === "down" ? "marked Not working" : "OK"}.
                </p>
              )}
              {announceError && <p role="alert">{announceError}</p>}
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
                    Elevator {result.target} down · {(LIVE ? summary?.acks.affected : result.impact?.affected) ?? 0} affected ·{" "}
                    {(LIVE ? summary?.acks.replanned : result.impact?.replanned) ?? 0} re-planned
                  </p>
                ) : result.action === "fixed" ? (
                  <p className="big-result">Elevator {result.target} fixed · attendees&apos; routes use it again</p>
                ) : result.action === "path_blocked" ? (
                  <p className="big-result">{FLOOR_PATHS.find((p) => p.id === result.target)?.label ?? result.target} blocked</p>
                ) : (
                  <p className="big-result">{talks.find((t) => t.id === result.target)?.title ?? result.target} is full</p>
                )}
                <p className="small">Announced at {formatTime(result.at)}.</p>
                {LIVE && summary && (
                  <p className="small">
                    Live: {summary.acks.received} anonymous {summary.acks.received === 1 ? "reply" : "replies"} so far
                    {summary.acks.median_replan_ms !== null && `, median ${summary.acks.median_replan_ms} ms to re-plan`}. Counts cover every change
                    announced since the API started.
                  </p>
                )}
                {result.impact && (
                  <p className="small">
                    Simulated: counted from {result.impact.checked} demo attendees on this device. Turn on live mode for counts from anonymous replies.
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
                      <strong>{problemLabel(g.problem)}</strong> · {locationLabel(g.locationId, shownGraph)}
                    </p>
                    <p className="small">
                      {g.count} {g.count === 1 ? "report" : "reports"}{summary ? " from different devices" : ""} · latest {formatTime(g.latest)}
                    </p>
                    {confirmed && elevator && shownGraph.elevators[elevator] !== "out_of_service" && (
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
          <p className="small muted">
            {summary
              ? `Live: ${CONFIRMATIONS_NEEDED} matching reports from different devices within 10 minutes reroute people automatically.`
              : "Demo: reports made on this device only. Nothing is sent to a server."}
          </p>
          {LIVE && summaryError && <p role="alert">Live data is not reachable: {summaryError}</p>}
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
