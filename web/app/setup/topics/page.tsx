"use client";

import { useId } from "react";
import { useRouter } from "next/navigation";
import { TopicChooser } from "@/components/TopicChooser";
import { PageHeading, PrimaryButton, SecondaryButton } from "@/components/ui";
import { WaitForState } from "@/components/WaitForState";
import { ROUTES } from "@/lib/routes";
import { useApp } from "@/lib/store";
import type { ApproachPreference } from "@/lib/types";

const APPROACH: { value: ApproachPreference; label: string }[] = [
  { value: "happy_to_chat", label: "Happy to chat" },
  { value: "only_people_i_know", label: "Only people I know" },
  { value: "please_dont_approach", label: "Please don't approach" },
];

function Step() {
  const uid = useId();
  const router = useRouter();
  const { state, updatePrefs, setOnboarding } = useApp();
  return (
    <div className="stack">
      <p className="progress">Step 3 of 3</p>
      <PageHeading>What are you curious about?</PageHeading>
      <p>Choosing two or three works well, but you can choose none or more.</p>
      <TopicChooser legend="Topics" />
      <details className="collapse">
        <summary>Optional: how you like to connect</summary>
        <fieldset style={{ marginTop: "0.5rem" }}>
          <legend>Approach (optional)</legend>
          {APPROACH.map((a) => (
            <label key={a.value} className="choice">
              <input type="radio" name="approach" checked={state.prefs.approach === a.value} onChange={() => updatePrefs((p) => (p.approach = a.value))} />
              <span>{a.label}</span>
            </label>
          ))}
          {state.prefs.approach && (
            <button type="button" className="btn btn-secondary" onClick={() => updatePrefs((p) => (p.approach = null))}>
              Clear this choice
            </button>
          )}
        </fieldset>
        <div style={{ marginTop: "0.75rem" }}>
          <label className="field" htmlFor={`${uid}-pronouns`}>
            Pronouns (optional)
          </label>
          <input id={`${uid}-pronouns`} type="text" maxLength={40} value={state.prefs.pronouns} onChange={(e) => updatePrefs((p) => (p.pronouns = e.target.value))} />
        </div>
      </details>
      <PrimaryButton
        onClick={() => {
          setOnboarding("complete");
          router.push(ROUTES.plan);
        }}
      >
        Build my plan
      </PrimaryButton>
      <SecondaryButton href={ROUTES.setupAlerts}>Back</SecondaryButton>
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
