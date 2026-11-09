/** DEMO FIXTURE. Illustrative composite personas for demos. They do not speak for any community. */
import { defaultPreferences } from "../preferences";
import type { AttendeePreferences } from "../types";

export interface DemoPersona {
  id: "marcus" | "priya" | "sam";
  name: string;
  summary: string;
  prefs: AttendeePreferences;
}

function build(patch: (p: AttendeePreferences) => void): AttendeePreferences {
  const p = defaultPreferences();
  patch(p);
  return p;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "marcus",
    name: "Marcus",
    summary: "Step-free routes, extra travel time, Security and Observability, screen reader alerts",
    prefs: build((p) => {
      p.required.stepFreeRouting = true;
      p.extraTravelTime = true;
      p.preferences.screenReader = true;
      p.topics = ["Security", "Observability"];
      p.notificationStyle = "screen_reader";
    }),
  },
  {
    id: "priya",
    name: "Priya",
    summary: "Captions required, front seating, vibrate and big text alerts",
    prefs: build((p) => {
      p.required.captions = true;
      p.preferences.frontSeating = true;
      p.notificationStyle = "vibrate_big_text";
    }),
  },
  {
    id: "sam",
    name: "Sam",
    summary: "Low-sensory spaces, quiet breaks, calm step-by-step alerts",
    prefs: build((p) => {
      p.preferences.lowSensory = true;
      p.preferences.quietBreaks = true;
      p.notificationStyle = "calm_step_by_step";
    }),
  },
];
