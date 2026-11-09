"use client";

import { useId } from "react";
import { useRouter } from "next/navigation";
import { PageHeading, PrimaryButton, SecondaryButton } from "@/components/ui";
import { WaitForState } from "@/components/WaitForState";
import { DEMO_PERSONAS } from "@/lib/fixtures/personas";
import { ROUTES } from "@/lib/routes";
import { useApp } from "@/lib/store";
import { storageAvailable } from "@/lib/storage";

function Welcome() {
  const uid = useId();
  const router = useRouter();
  const { setOnboarding, loadPreferences, storageOk } = useApp();
  return (
    <div className="stack">
      <PageHeading>Curb Cut</PageHeading>
      <p>Find the right talk, get there, and know what to do when plans change.</p>
      <p className="small muted" id={`${uid}-privacy-note`}>
        {storageOk && storageAvailable()
          ? "Your preferences stay on this device, saved in this browser. We do not store them in a user-profile server."
          : "Your preferences stay in this page only. Your browser is blocking storage, so they will be forgotten when you close it. We do not store them in a user-profile server."}
        {" "}Talk searches are sent only as words, without your needs.
      </p>
      <PrimaryButton href={ROUTES.setupNeeds} onClick={() => setOnboarding("none")} aria-describedby={`${uid}-privacy-note`}>
        Get started
      </PrimaryButton>
      <SecondaryButton
        onClick={() => {
          setOnboarding("guest");
          router.push(ROUTES.plan);
        }}
      >
        Skip setup
      </SecondaryButton>
      <details className="collapse">
        <summary>Demo attendees (for demonstrations)</summary>
        <p className="small muted">Illustrative composites for the demo. They are not real people and do not speak for any community.</p>
        <ul className="card-list" style={{ listStyle: "none", padding: 0 }}>
          {DEMO_PERSONAS.map((p) => (
            <li key={p.id}>
              <SecondaryButton
                onClick={() => {
                  loadPreferences(p.prefs, "complete");
                  router.push(ROUTES.plan);
                }}
              >
                {`Use ${p.name}'s demo needs`}
              </SecondaryButton>
              <p className="small muted">{p.summary}</p>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export default function Page() {
  return (
    <WaitForState>
      <Welcome />
    </WaitForState>
  );
}
