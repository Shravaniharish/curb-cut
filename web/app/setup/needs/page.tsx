"use client";

import { useRouter } from "next/navigation";
import { NeedsGroups } from "@/components/SetupNeeds";
import { PageHeading, PrimaryButton, SecondaryButton } from "@/components/ui";
import { WaitForState } from "@/components/WaitForState";
import { ROUTES } from "@/lib/routes";
import { useApp } from "@/lib/store";

function Step() {
  const router = useRouter();
  const { setOnboarding } = useApp();
  return (
    <div className="stack">
      <p className="progress">Step 1 of 3</p>
      <PageHeading>What helps you?</PageHeading>
      <p>Choose anything that helps. You never need to tell us why.</p>
      <NeedsGroups />
      <PrimaryButton href={ROUTES.setupAlerts}>Next</PrimaryButton>
      <div className="row">
        <SecondaryButton href={ROUTES.welcome}>Back</SecondaryButton>
        <SecondaryButton
          onClick={() => {
            setOnboarding("guest");
            router.push(ROUTES.plan);
          }}
        >
          Skip
        </SecondaryButton>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <WaitForState>
      <Step />
    </WaitForState>
  );
}
