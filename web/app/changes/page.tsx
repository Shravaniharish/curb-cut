"use client";

/**
 * Screen 5f: "My plans changed". For changes the attendee causes, not the event.
 *
 * Nobody is asked why. The three choices lead straight to a result built from the same planner the plan uses, and
 * the result is stored in the alert history tagged "Your change".
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BigChoiceList } from "@/components/BigChoiceList";
import { ChangeAlert } from "@/components/ChangeAlert";
import { PageHeading, SecondaryButton } from "@/components/ui";
import { WaitForState } from "@/components/WaitForState";
import { LIVE, alertFromApi, replanPersonal } from "@/lib/api";
import { LATE_CHOICES, buildBreakNowAlert, buildMissedTalkAlert, buildRunningLateAlert } from "@/lib/changes";
import type { LateChoice } from "@/lib/changes";
import { ROUTES } from "@/lib/routes";
import { useApp } from "@/lib/store";
import { usePlanContext } from "@/lib/usePlanContext";
import type { AlertRecord } from "@/lib/types";

type What = "late" | "missed" | "break";

const CHOICES = [
  { value: "late" as What, label: "I'm running late", detail: "We'll check if you can still make it.", icon: "⏱" },
  { value: "missed" as What, label: "I missed it", detail: "We'll find a later talk on the same topic.", icon: "↷" },
  { value: "break" as What, label: "I need a break now", detail: "We'll add a quiet break and move things back.", icon: "☾" },
];

const LATE_LABELS: Record<LateChoice, string> = { 5: "5 min", 10: "10 min", 15: "15 min or more" };

function MyPlansChanged() {
  const router = useRouter();
  const { state, recordAlert, acknowledgeAlert } = useApp();
  const ctx = usePlanContext();
  const [what, setWhat] = useState<What | null>(null);
  const [result, setResult] = useState<AlertRecord | null>(null);
  const [onDevice, setOnDevice] = useState(false);

  function finish(alertId: string) {
    acknowledgeAlert(alertId);
    router.push(ROUTES.plan);
  }

  /**
   * Live mode asks the API to re-plan and falls back to the same planner on this device if it cannot be reached, and
   * says so. Demo mode always works on the device. Either way no reason is asked for and none is sent.
   */
  async function resolve(
    personal: Parameters<typeof replanPersonal>[2],
    local: () => ReturnType<typeof buildMissedTalkAlert>,
  ) {
    if (LIVE) {
      try {
        const plan = { talkIds: ctx.plan.map((t) => t.id), currentLocationId: ctx.currentLocationId, nowIso: ctx.nowIso };
        const res = await replanPersonal(state.prefs, plan, personal);
        if (res.alert) {
          setOnDevice(false);
          setResult(recordAlert(alertFromApi(res.alert)));
          return;
        }
      } catch {
        /* fall through to the device */
      }
      setOnDevice(true);
    }
    setResult(recordAlert(local()));
  }

  function choose(value: What) {
    setWhat(value);
    if (value === "missed") void resolve({ type: "missed" }, () => buildMissedTalkAlert(ctx));
    else if (value === "break") void resolve({ type: "break_now" }, () => buildBreakNowAlert(ctx));
  }

  function startOver() {
    setWhat(null);
    setResult(null);
    setOnDevice(false);
  }

  if (result) {
    return (
      <div className="stack">
        <PageHeading>Your plan is updated</PageHeading>
        <p className="muted">Saved to your alerts on this device as &ldquo;Your change&rdquo;.</p>
        {onDevice && <p className="status-note">The Curb Cut service could not be reached, so this was worked out on this device.</p>}
        <ChangeAlert alert={result} style={state.prefs.notificationStyle} okLabel="OK" onOk={() => finish(result.id)} withHeading={false} />
        <SecondaryButton onClick={startOver}>Something else happened</SecondaryButton>
      </div>
    );
  }

  if (what === "late") {
    return (
      <div className="stack">
        <PageHeading>About how late?</PageHeading>
        <p className="muted">A rough answer is enough. You can change it afterwards.</p>
        <BigChoiceList
          legend="About how late?"
          choices={LATE_CHOICES.map((minutes) => ({ value: String(minutes) as `${LateChoice}`, label: LATE_LABELS[minutes] }))}
          onChoose={(value) => {
            const minutes = Number(value) as LateChoice;
            void resolve({ type: "late", minutes }, () => buildRunningLateAlert(ctx, minutes));
          }}
        />
        <SecondaryButton onClick={startOver}>Back</SecondaryButton>
      </div>
    );
  }

  return (
    <div className="stack">
      <PageHeading>What happened?</PageHeading>
      <p>No need to explain. We&apos;ll fix your plan.</p>
      <BigChoiceList legend="What happened?" choices={CHOICES} onChoose={choose} />
      <p className="small muted">
        Nothing here asks why, and nothing is sent anywhere: your plan is worked out on this device.
      </p>
      <SecondaryButton href={ROUTES.plan}>Back to my plan</SecondaryButton>
    </div>
  );
}

export default function Page() {
  return (
    <WaitForState>
      <MyPlansChanged />
    </WaitForState>
  );
}
