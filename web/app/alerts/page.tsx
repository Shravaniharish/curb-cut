"use client";

/**
 * Screen 5c: the Alerts tab. Every change this device has been told about, newest first, kept on the device only.
 */
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { DemoControls } from "@/components/DemoControls";
import { EmptyState, DangerButton, PageHeading, SecondaryButton } from "@/components/ui";
import { WaitForState } from "@/components/WaitForState";
import { originTag } from "@/lib/changes";
import { ROUTES } from "@/lib/routes";
import { useApp } from "@/lib/store";
import { formatTime } from "@/lib/time";

function Alerts() {
  const { state, markAlertsSeen, clearAlerts } = useApp();
  const newest = useMemo(() => [...state.alerts].reverse(), [state.alerts]);
  const seenAt = state.alertsSeenAt;
  const unseen = useMemo(
    () => (seenAt ? newest.filter((a) => new Date(a.createdAt).getTime() > new Date(seenAt).getTime()).length : newest.length),
    [newest, seenAt],
  );

  // Opening the tab marks the history as seen, so "new since you last looked" counts only what arrived after.
  useEffect(() => {
    markAlertsSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per visit, not on every store update
  }, []);

  return (
    <div className="stack">
      <PageHeading>Alerts</PageHeading>
      <p className="muted">
        Changes that affected your plan. This list is kept on this device and is never sent anywhere.
      </p>

      {newest.length === 0 ? (
        <EmptyState title="No changes yet">
          <p>We&apos;ll tell you the moment anything affects your plan.</p>
        </EmptyState>
      ) : (
        <>
          {unseen > 0 && (
            <p className="status-note" role="status">
              {unseen === 1 ? "1 change" : `${unseen} changes`} since you last looked at this tab.
            </p>
          )}
          <ul className="card-list" aria-label="Change history, newest first">
            {newest.map((alert) => (
              <li key={alert.id}>
                <article className="card">
                  <p className="progress" style={{ marginBottom: "0.25rem" }}>{formatTime(alert.createdAt)}</p>
                  <h2 style={{ fontSize: "1.125rem" }}>
                    <Link href={ROUTES.alert(alert.id)}>{alert.whatChanged}</Link>
                  </h2>
                  <ul className="badges" aria-label="Where this change came from">
                    <li>
                      <span className="badge" data-tone={alert.origin === "event" ? "warn" : "unknown"}>
                        <span aria-hidden="true">{alert.origin === "event" ? "⚠" : "•"}</span>
                        <span>{originTag(alert.origin)}</span>
                      </span>
                    </li>
                    {alert.acknowledgedAt && (
                      <li>
                        <span className="badge" data-tone="good">
                          <span aria-hidden="true">✓</span>
                          <span>Read</span>
                        </span>
                      </li>
                    )}
                  </ul>
                  <p className="small" style={{ marginTop: "0.5rem", marginBottom: "0.75rem" }}>
                    <strong>What to do now:</strong> {alert.doNow}
                  </p>
                  <SecondaryButton href={ROUTES.alert(alert.id)}>View</SecondaryButton>
                </article>
              </li>
            ))}
          </ul>
          <DangerButton onClick={clearAlerts}>Clear this history</DangerButton>
        </>
      )}

      <SecondaryButton href={ROUTES.changes}>My plans changed</SecondaryButton>

      <details className="collapse">
        <summary>Demo conditions</summary>
        <p className="small muted">
          There is no live venue feed in this demo. Changing a simulated elevator below raises a real alert in your
          own alert style, exactly as a venue change would.
        </p>
        <DemoControls show={["elevators", "clock"]} />
      </details>
    </div>
  );
}

export default function Page() {
  return (
    <WaitForState>
      <Alerts />
    </WaitForState>
  );
}
