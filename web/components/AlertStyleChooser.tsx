"use client";

import { useState } from "react";
import { AccessibleSelectionCards } from "@/components/AccessibleSelectionCard";
import type { SelectionOption } from "@/components/AccessibleSelectionCard";
import { useApp } from "@/lib/store";
import type { NotificationStyle } from "@/lib/types";

const OPTIONS: SelectionOption<NotificationStyle>[] = [
  {
    value: "vibrate_big_text",
    title: "Vibrate + big text",
    description: "A short vibration (where your device supports it) and a large message on screen.",
    preview: <p className="big-alert" style={{ margin: 0 }}>Leave now: Room 355</p>,
  },
  {
    value: "screen_reader",
    title: "Screen reader",
    description: "A plain text message announced by your screen reader. Your own screen reader does the speaking.",
    preview: <p style={{ margin: 0 }}>“Heads up: leave by 1:48 PM for Room 355. Step-free route available.”</p>,
  },
  {
    value: "calm_step_by_step",
    title: "Calm, one step at a time",
    description: "One short instruction at a time, with no flashing and no urgency wording.",
    preview: <p style={{ margin: 0 }}>Step 1 of 3: When you are ready, stand up and pack your things.</p>,
  },
];

export function AlertStyleChooser({ legend = "Alert style" }: { legend?: string }) {
  const { state, updatePrefs } = useApp();
  const [note, setNote] = useState("");
  const style = state.prefs.notificationStyle;

  function tryAlert() {
    if (style === "vibrate_big_text") {
      const vibrated = typeof navigator !== "undefined" && typeof navigator.vibrate === "function" && navigator.vibrate(200);
      setNote(
        vibrated
          ? "Big-text alert shown. A vibration was requested; your browser does not confirm whether you felt it."
          : "Big-text alert shown. This browser or device does not support vibration, so there was no vibration.",
      );
    } else if (style === "screen_reader") {
      setNote("Heads up: leave by 1:48 PM for Room 355. Step-free route available.");
    } else if (style === "calm_step_by_step") {
      setNote("Step 1 of 3: When you are ready, stand up and pack your things.");
    }
  }

  return (
    <div className="stack">
      <AccessibleSelectionCards legend={legend} name="alert-style" value={style} options={OPTIONS} onChange={(v) => updatePrefs((p) => (p.notificationStyle = v))} />
      <button type="button" className="btn btn-secondary" disabled={!style} aria-disabled={!style} onClick={tryAlert}>
        Try this alert
      </button>
      <div role="status" aria-live="polite" className={style === "vibrate_big_text" ? "big-alert" : undefined}>
        {note}
      </div>
    </div>
  );
}
