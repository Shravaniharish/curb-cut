"use client";

/**
 * Screen 8: the change alert. One alert, three presentations, chosen by the attendee's own alert style:
 *
 * - `vibrate_big_text`: an amber "Plan changed" banner, extra-large text and a short vibration if the device has one.
 * - `screen_reader`: short sentences in an assertive live region, plainest possible layout, nothing decorative.
 * - `calm_step_by_step`: one part per screen with a counter and a Next button. No banner, no vibration, no motion.
 * - no style chosen yet: the plain three-part block in a polite live region.
 *
 * The wording is built in `lib/changes.ts` from the same planner Part A uses, so the alert cannot promise a route
 * the planner would not give.
 */
import { useEffect, useRef, useState } from "react";
import { ThreePartChangeBlock, ThreePartStep } from "./ThreePartChangeBlock";
import { PrimaryButton, SecondaryButton } from "./ui";
import { ROUTES } from "@/lib/routes";
import { useApp } from "@/lib/store";
import { formatTime } from "@/lib/time";
import type { AlertRecord, NotificationStyle } from "@/lib/types";

export const VIBRATION_PATTERN = [200, 100, 200];

type Mode = NotificationStyle | "standard";

export function alertMode(style: NotificationStyle | null): Mode {
  return style ?? "standard";
}

function Actions({
  alert,
  onOk,
  onLeave,
  okLabel,
  showRouteFirst = true,
}: {
  alert: AlertRecord;
  onOk?: () => void;
  /** Called when a button navigates away, so an alert shown over another screen can close itself. */
  onLeave?: () => void;
  okLabel: string;
  showRouteFirst?: boolean;
}) {
  const { state, selectTalk, setCurrentRoute } = useApp();
  const destination = alert.destinationRoomId;
  const takeRoute = () => {
    if (!destination) return;
    if (alert.talkId) selectTalk(alert.talkId);
    setCurrentRoute({ fromId: state.currentLocationId, toId: destination, talkId: alert.talkId });
    onLeave?.();
  };
  return (
    <div className="stack">
      {destination && showRouteFirst && (
        <PrimaryButton href={ROUTES.route(destination)} onClick={takeRoute}>
          Show new route
        </PrimaryButton>
      )}
      {destination ? (
        <SecondaryButton href={ROUTES.options} onClick={onLeave}>
          See other options
        </SecondaryButton>
      ) : (
        <PrimaryButton href={ROUTES.options} onClick={onLeave}>
          See other options
        </PrimaryButton>
      )}
      {alert.transcriptTalkId && (
        <SecondaryButton href={ROUTES.joinSession(alert.transcriptTalkId)} onClick={onLeave}>
          View transcript of what I missed
        </SecondaryButton>
      )}
      <SecondaryButton onClick={onOk} href={onOk ? undefined : ROUTES.plan}>
        {okLabel}
      </SecondaryButton>
    </div>
  );
}

function Footer({ alert }: { alert: AlertRecord }) {
  return (
    <>
      {alert.leaveByIso && (
        <p className="leave-by" style={{ marginTop: "0.75rem" }}>
          <span aria-hidden="true">🕑</span>
          <span>Leave by {formatTime(alert.leaveByIso)}</span>
        </p>
      )}
      {alert.simulated && <p className="small muted" style={{ marginBottom: 0 }}>Simulated demo condition, not live venue data.</p>}
    </>
  );
}

export function ChangeAlert({
  alert,
  style,
  onOk,
  onLeave,
  okLabel = "OK",
  /** The alert screen renders its own h1; inside a dialog the title is the dialog's. */
  withHeading = true,
}: {
  alert: AlertRecord;
  style: NotificationStyle | null;
  onOk?: () => void;
  onLeave?: () => void;
  okLabel?: string;
  withHeading?: boolean;
}) {
  const mode = alertMode(style);
  const parts = { whatChanged: alert.whatChanged, whatStays: alert.whatStays, doNow: alert.doNow };
  // The calm style keeps its step next to the alert id, so a new alert always starts at step 1 without an effect.
  const [stepState, setStepState] = useState<{ alertId: string; step: 0 | 1 | 2 }>({ alertId: alert.id, step: 0 });
  const step = stepState.alertId === alert.id ? stepState.step : 0;
  const vibrated = useRef<string | null>(null);

  // A vibration only, and only for the style that asks for it. Never audio, never a flash.
  useEffect(() => {
    if (mode !== "vibrate_big_text" || vibrated.current === alert.id) return;
    vibrated.current = alert.id;
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(VIBRATION_PATTERN);
    } catch {
      /* a device without vibration still gets the banner and the big text */
    }
  }, [mode, alert.id]);

  if (mode === "calm_step_by_step") {
    const last = step === 2;
    return (
      <div className="stack" data-testid="change-alert" data-mode="calm_step_by_step">
        {withHeading && <h2>Your plan changed</h2>}
        <div role="status" aria-live="polite" className="card calm-card">
          <ThreePartStep parts={parts} index={step} heading={withHeading ? "h3" : "h2"} />
          {last && <Footer alert={alert} />}
        </div>
        {last ? (
          <Actions alert={alert} onOk={onOk} onLeave={onLeave} okLabel={okLabel} />
        ) : (
          <PrimaryButton onClick={() => setStepState({ alertId: alert.id, step: step === 0 ? 1 : 2 })}>Next</PrimaryButton>
        )}
        <p className="small muted">One step at a time. Nothing moves on until you press Next.</p>
      </div>
    );
  }

  if (mode === "screen_reader") {
    return (
      <div className="stack" data-testid="change-alert" data-mode="screen_reader">
        {withHeading && <h2>Your plan changed</h2>}
        <div role="alert" aria-live="assertive" className="card">
          <ThreePartChangeBlock parts={parts} heading={withHeading ? "h3" : "h2"} footer={<Footer alert={alert} />} />
        </div>
        <p className="small muted">Read aloud automatically.</p>
        <Actions alert={alert} onOk={onOk} onLeave={onLeave} okLabel={okLabel} />
      </div>
    );
  }

  const big = mode === "vibrate_big_text";
  return (
    <div className="stack" data-testid="change-alert" data-mode={big ? "vibrate_big_text" : "standard"}>
      <div className="changed-banner" role={big ? "alert" : "status"} aria-live={big ? "assertive" : "polite"}>
        <p className={big ? "big-alert" : undefined} style={{ marginBottom: 0 }}>
          <span aria-hidden="true">📳 </span>Plan changed
        </p>
      </div>
      <div className="card">
        <ThreePartChangeBlock
          parts={parts}
          size={big ? "large" : "normal"}
          heading={withHeading ? "h3" : "h2"}
          footer={<Footer alert={alert} />}
        />
      </div>
      {big && <p className="small muted">Your device vibrates once when an alert arrives, if it can.</p>}
      <Actions alert={alert} onOk={onOk} onLeave={onLeave} okLabel={okLabel} />
    </div>
  );
}
