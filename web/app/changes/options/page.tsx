"use client";

/** Screen 9: other talks that fit, reached from any change alert. */
import { useMemo } from "react";
import { OtherOptionsList } from "@/components/OtherOptionsList";
import { PageHeading, SecondaryButton } from "@/components/ui";
import { WaitForState } from "@/components/WaitForState";
import { otherOptions } from "@/lib/changes";
import { ROUTES } from "@/lib/routes";
import { useApp } from "@/lib/store";
import { usePlanContext } from "@/lib/usePlanContext";

function Options() {
  const { state } = useApp();
  const ctx = usePlanContext();
  // The talk the latest alert already points at is not offered again as an alternative.
  const latestTalkId = state.alerts[state.alerts.length - 1]?.talkId ?? null;
  const options = useMemo(() => otherOptions(ctx, latestTalkId ? [latestTalkId] : []), [ctx, latestTalkId]);

  return (
    <div className="stack">
      <PageHeading>Other talks that fit you</PageHeading>
      <p className="muted">
        Each one confirms the needs you chose and can be reached from where you are now before it starts.
      </p>
      <OtherOptionsList options={options} />
      <SecondaryButton href={ROUTES.plan}>Back to my plan</SecondaryButton>
    </div>
  );
}

export default function Page() {
  return (
    <WaitForState>
      <Options />
    </WaitForState>
  );
}
