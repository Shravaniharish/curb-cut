"use client";

import { useId } from "react";
import { DEMO_CLOCK_PRESETS, demoClockAt, formatTime } from "@/lib/time";
import { destinations } from "@/lib/fixtures/venue";
import { useApp } from "@/lib/store";
import type { ElevatorId, ElevatorStatus } from "@/lib/types";

const ELEVATORS: ElevatorId[] = ["A", "B", "C"];

/** Controls for the simulated demo conditions. Real status for Part B would replace these inputs. */
export function DemoControls({ show = ["clock", "elevators", "location"] }: { show?: ("clock" | "elevators" | "location")[] }) {
  const uid = useId();
  const { state, graph, setDemoClock, setElevatorStatus, setCurrentLocation, nowIso } = useApp();
  const clock = state.demoClock;
  return (
    <div className="stack">
      {show.includes("clock") && (
        <div>
          <label className="field" htmlFor={`${uid}-demo-clock`}>
            Demo clock
          </label>
          <select
            id={`${uid}-demo-clock`}
            value={clock.mode === "live" ? "live" : ""}
            onChange={(e) => {
              if (e.target.value === "live") setDemoClock({ mode: "live" });
              else if (e.target.value) setDemoClock(demoClockAt(e.target.value));
            }}
          >
            <option value="" disabled>
              Choose a demo time…
            </option>
            {DEMO_CLOCK_PRESETS.map((p) => (
              <option key={p.id} value={p.time}>
                {p.label}
              </option>
            ))}
            <option value="live">Use the real time</option>
          </select>
          <p className="small muted">
            {clock.mode === "live" ? "Using the real time" : "Using demo time (it keeps moving)"}: it is now {formatTime(nowIso)} in Salt Lake City.
          </p>
        </div>
      )}
      {show.includes("elevators") && (
        <fieldset>
          <legend>Simulated elevator status</legend>
          {ELEVATORS.map((id) => (
            <div key={id} style={{ marginBottom: "0.5rem" }}>
              <label className="field" htmlFor={`${uid}-elev-${id}`}>
                Elevator {id}
              </label>
              <select id={`${uid}-elev-${id}`} value={graph.elevators[id]} onChange={(e) => setElevatorStatus(id, e.target.value as ElevatorStatus)}>
                <option value="working">Working</option>
                <option value="out_of_service">Not working</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          ))}
          <p className="small muted">These are demo values, not live elevator data.</p>
        </fieldset>
      )}
      {show.includes("location") && (
        <div>
          <label className="field" htmlFor={`${uid}-demo-location`}>
            Where you are now
          </label>
          <select id={`${uid}-demo-location`} value={state.currentLocationId} onChange={(e) => setCurrentLocation(e.target.value)}>
            {destinations(graph).map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
