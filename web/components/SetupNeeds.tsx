"use client";

import { AccessibleCheckboxGroup } from "@/components/AccessibleCheckboxGroup";
import type { CheckboxOption } from "@/components/AccessibleCheckboxGroup";
import type { AttendeePreferences } from "@/lib/types";
import { useApp } from "@/lib/store";

type Setter = (p: AttendeePreferences, v: boolean) => void;

const GROUPS: { legend: string; items: { id: string; label: string; get: (p: AttendeePreferences) => boolean; set: Setter }[] }[] = [
  {
    legend: "Getting around",
    items: [
      { id: "stepFree", label: "Step-free routes", get: (p) => p.required.stepFreeRouting, set: (p, v) => (p.required.stepFreeRouting = v) },
      { id: "extraTime", label: "Extra travel time", get: (p) => p.extraTravelTime, set: (p, v) => (p.extraTravelTime = v) },
    ],
  },
  {
    legend: "Hearing and seeing",
    items: [
      { id: "captions", label: "Captions required", get: (p) => p.required.captions, set: (p, v) => (p.required.captions = v) },
      { id: "interpreter", label: "Interpreter preferred", get: (p) => p.preferences.interpreter, set: (p, v) => (p.preferences.interpreter = v) },
      { id: "front", label: "Front seat", get: (p) => p.preferences.frontSeating, set: (p, v) => (p.preferences.frontSeating = v) },
      { id: "screenReader", label: "I use a screen reader", get: (p) => p.preferences.screenReader, set: (p, v) => (p.preferences.screenReader = v) },
      { id: "slides", label: "Slides ahead of time", get: (p) => p.preferences.slidesInAdvance, set: (p, v) => (p.preferences.slidesInAdvance = v) },
    ],
  },
  {
    legend: "Energy and senses",
    items: [
      { id: "lowSensory", label: "Low-sensory spaces", get: (p) => p.preferences.lowSensory, set: (p, v) => (p.preferences.lowSensory = v) },
      { id: "quietBreaks", label: "Quiet breaks", get: (p) => p.preferences.quietBreaks, set: (p, v) => (p.preferences.quietBreaks = v) },
      { id: "backToBack", label: "Fewer back-to-back sessions", get: (p) => p.preferences.reducedBackToBack, set: (p, v) => (p.preferences.reducedBackToBack = v) },
    ],
  },
];

/** The three "what helps you" groups. Used by setup step 1 and by Settings > My needs. */
export function NeedsGroups() {
  const { state, updatePrefs } = useApp();
  return (
    <div className="stack">
      {GROUPS.map((g) => {
        const options: CheckboxOption[] = g.items.map((i) => ({ id: i.id, label: i.label, checked: i.get(state.prefs) }));
        return (
          <AccessibleCheckboxGroup
            key={g.legend}
            legend={g.legend}
            options={options}
            onChange={(id, checked) => {
              const item = g.items.find((i) => i.id === id);
              if (item) updatePrefs((p) => item.set(p, checked));
            }}
          />
        );
      })}
    </div>
  );
}
