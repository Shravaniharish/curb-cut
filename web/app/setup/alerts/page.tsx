"use client";

import { AlertStyleChooser } from "@/components/AlertStyleChooser";
import { PageHeading, PrimaryButton, SecondaryButton } from "@/components/ui";
import { WaitForState } from "@/components/WaitForState";
import { ROUTES } from "@/lib/routes";

export default function Page() {
  return (
    <WaitForState>
      <div className="stack">
        <p className="progress">Step 2 of 3</p>
        <PageHeading>How should we alert you?</PageHeading>
        <p>Pick one. You can change it any time in Settings.</p>
        <AlertStyleChooser legend="Alert style" />
        <PrimaryButton href={ROUTES.setupTopics}>Next</PrimaryButton>
        <SecondaryButton href={ROUTES.setupNeeds}>Back</SecondaryButton>
      </div>
    </WaitForState>
  );
}
