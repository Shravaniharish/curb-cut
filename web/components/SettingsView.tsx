"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { AlertStyleChooser } from "@/components/AlertStyleChooser";
import { AccessibleCheckboxGroup } from "@/components/AccessibleCheckboxGroup";
import { DemoControls } from "@/components/DemoControls";
import { Dialog } from "@/components/Dialog";
import { NeedsGroups } from "@/components/SetupNeeds";
import { TopicChooser } from "@/components/TopicChooser";
import { DangerButton, PageHeading, PrimaryButton, SecondaryButton } from "@/components/ui";
import { WaitForState } from "@/components/WaitForState";
import { TEXT_SCALE_MAX, TEXT_SCALE_MIN, TEXT_SCALE_STEP } from "@/lib/preferences";
import { ROUTES } from "@/lib/routes";
import { useApp } from "@/lib/store";

function Settings() {
  const uid = useId();
  const router = useRouter();
  const { state, updatePrefs, resetAll, storageOk } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const d = state.prefs.display;
  const percent = Math.round(d.textScale * 100);

  return (
    <div className="stack">
      <PageHeading>Settings</PageHeading>
      <p className="muted">Changes save as you make them.</p>

      <section aria-labelledby={`${uid}-needs-h`} className="stack">
        <h2 id={`${uid}-needs-h`}>My needs</h2>
        <NeedsGroups />
      </section>

      <section aria-labelledby={`${uid}-alerts-h`} className="stack">
        <h2 id={`${uid}-alerts-h`}>Alert style</h2>
        <AlertStyleChooser legend="Choose how we alert you" />
      </section>

      <section aria-labelledby={`${uid}-topics-h`} className="stack">
        <h2 id={`${uid}-topics-h`}>Topics</h2>
        <TopicChooser legend="Topics you are curious about" />
      </section>

      <section aria-labelledby={`${uid}-display-h`} className="stack">
        <h2 id={`${uid}-display-h`}>Display</h2>
        <div className="card">
          <label className="field" htmlFor={`${uid}-text-size`}>
            Text size: <output htmlFor={`${uid}-text-size`}>{percent}%</output>
          </label>
          <input
            id={`${uid}-text-size`}
            type="range"
            min={TEXT_SCALE_MIN}
            max={TEXT_SCALE_MAX}
            step={TEXT_SCALE_STEP}
            value={d.textScale}
            onChange={(e) => updatePrefs((p) => (p.display.textScale = Number(e.target.value)))}
            aria-valuetext={`${percent} percent`}
          />
          <p data-testid="text-preview">
            Preview: Leave by 1:48 PM for Room 355. The text on every screen is now {percent}% of its normal size.
          </p>
        </div>
        <AccessibleCheckboxGroup
          legend="Display options"
          options={[
            { id: "contrast", label: "High contrast", checked: d.highContrast },
            { id: "font", label: "Dyslexia-friendly font (OpenDyslexic)", checked: d.dyslexiaFont, hint: "Some people find this font easier to read. It does not suit everyone, so try it and keep what works for you." },
            { id: "motion", label: "Reduced motion", checked: d.reducedMotion, hint: "Curb Cut also follows your device's reduced-motion setting." },
          ]}
          onChange={(id, v) =>
            updatePrefs((p) => {
              if (id === "contrast") p.display.highContrast = v;
              if (id === "font") p.display.dyslexiaFont = v;
              if (id === "motion") p.display.reducedMotion = v;
            })
          }
        />
      </section>

      <section aria-labelledby={`${uid}-privacy-h`} className="stack">
        <h2 id={`${uid}-privacy-h`}>Privacy</h2>
        <div className="card">
          <p>
            Your needs, preferences, plan changes and reminders are saved in this browser, on this device. We do not store them in a user-profile server.
          </p>
          <p>
            With demo search, nothing you type leaves this device. If Elasticsearch search is turned on, only the words you type are sent. Your needs are never sent with them.
          </p>
          <p className="small muted" style={{ marginBottom: 0 }}>
            {storageOk ? "Saving to this browser is working." : "Your browser is blocking storage, so your choices will be forgotten when you close this page."}
          </p>
        </div>
        <DangerButton onClick={() => setConfirmOpen(true)}>Clear all my data</DangerButton>
      </section>

      <section aria-labelledby={`${uid}-demo-h`} className="stack">
        <h2 id={`${uid}-demo-h`}>Demo controls</h2>
        <details className="collapse">
          <summary>Simulated conditions</summary>
          <DemoControls />
        </details>
      </section>

      <PrimaryButton href={ROUTES.plan}>Back to my plan</PrimaryButton>

      <Dialog open={confirmOpen} title="Clear all your data?" onClose={() => setConfirmOpen(false)}>
        <p>This removes your needs, alert style, topics, plan changes, reminder and search from this browser, and returns you to the start. It cannot be undone.</p>
        <div className="stack">
          <SecondaryButton onClick={() => setConfirmOpen(false)}>Cancel</SecondaryButton>
          <DangerButton
            onClick={() => {
              resetAll();
              setConfirmOpen(false);
              router.push(ROUTES.welcome);
            }}
          >
            Yes, clear everything
          </DangerButton>
        </div>
      </Dialog>
    </div>
  );
}

export default function SettingsView() {
  return (
    <WaitForState>
      <Settings />
    </WaitForState>
  );
}
