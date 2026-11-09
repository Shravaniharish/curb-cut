"use client";

/** Screen 8 for one stored alert, reached from the Alerts tab. Shown in the attendee's own alert style. */
import { useRouter } from "next/navigation";
import { ChangeAlert } from "@/components/ChangeAlert";
import { ErrorState, PageHeading, SecondaryButton } from "@/components/ui";
import { WaitForState } from "@/components/WaitForState";
import { originTag } from "@/lib/changes";
import { ROUTES } from "@/lib/routes";
import { useApp } from "@/lib/store";
import { formatTime } from "@/lib/time";

function Detail({ alertId }: { alertId: string }) {
  const router = useRouter();
  const { state, acknowledgeAlert } = useApp();
  const alert = state.alerts.find((a) => a.id === alertId);

  if (!alert) {
    return (
      <div className="stack">
        <PageHeading>Alert not found</PageHeading>
        <ErrorState title="We could not find that alert">
          <p>It may have been cleared from this device&apos;s history.</p>
        </ErrorState>
        <SecondaryButton href={ROUTES.alerts}>Back to alerts</SecondaryButton>
      </div>
    );
  }

  return (
    <div className="stack">
      <PageHeading>Your plan changed</PageHeading>
      <p className="muted">
        {originTag(alert.origin)} · {formatTime(alert.createdAt)}
      </p>
      <ChangeAlert
        alert={alert}
        style={state.prefs.notificationStyle}
        okLabel="OK"
        onOk={() => {
          acknowledgeAlert(alert.id);
          router.push(ROUTES.plan);
        }}
        withHeading={false}
      />
      <SecondaryButton href={ROUTES.alerts}>Back to alerts</SecondaryButton>
    </div>
  );
}

export function AlertDetail({ alertId }: { alertId: string }) {
  return (
    <WaitForState>
      <Detail alertId={alertId} />
    </WaitForState>
  );
}
