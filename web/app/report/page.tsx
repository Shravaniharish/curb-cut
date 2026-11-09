"use client";

/**
 * Screen 11: report a problem. Three steps, choices only, no typing, and nothing about the person.
 *
 * What this demo really does is stated on the screen: the report is kept on this device. The real app sends
 * {problem, location, device token} and acts only when a second device reports the same thing, so this screen
 * never claims a report was sent, confirmed or acted on.
 */
import { useState } from "react";
import { BigChoiceList } from "@/components/BigChoiceList";
import { PageHeading, PrimaryButton, SecondaryButton } from "@/components/ui";
import { WaitForState } from "@/components/WaitForState";
import { CONFIRMATIONS_NEEDED, PROBLEM_CHOICES, deviceToken, elevatorForLocation, locationLabel, locationsFor, problemLabel } from "@/lib/reports";
import { ROUTES } from "@/lib/routes";
import { useApp } from "@/lib/store";
import type { ReportProblem } from "@/lib/types";

function ReportProblemFlow() {
  const { graph, state, recordReport, setElevatorStatus } = useApp();
  const [problem, setProblem] = useState<ReportProblem | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const elevator = locationId ? elevatorForLocation(locationId) : null;
  const alreadyDown = elevator ? state.elevatorStatus[elevator] === "out_of_service" : false;

  function send(place: string) {
    setLocationId(place);
    if (!problem) return;
    recordReport({ problem, locationId: place, deviceToken: deviceToken() ?? "unavailable" });
    setSent(true);
  }

  /** The demo stand-in for a second device reporting the same thing: it marks the elevator not working. */
  function simulateConfirmation() {
    if (!elevator) return;
    setElevatorStatus(elevator, "out_of_service");
  }

  function startOver() {
    setProblem(null);
    setLocationId(null);
    setSent(false);
  }

  if (sent && problem && locationId) {
    return (
      <div className="stack">
        <PageHeading>Thank you</PageHeading>
        <div className="card" role="status">
          <h2 style={{ fontSize: "1.125rem" }}>
            {problemLabel(problem)} · {locationLabel(locationId, graph)}
          </h2>
          <p>When someone else confirms it, we&apos;ll reroute everyone affected.</p>
          <p className="small muted" style={{ marginBottom: 0 }}>
            We don&apos;t send your name or needs. {CONFIRMATIONS_NEEDED} separate reports of the same problem in the
            same place are what change anyone&apos;s route.
          </p>
        </div>
        <p className="status-note">
          In this demo your report is saved on this phone only. Nothing was sent: there is no server behind this
          screen yet.
        </p>
        {elevator && !alreadyDown && (
          <details className="collapse">
            <summary>Demo: act as the second report</summary>
            <p className="small muted">
              This stands in for another attendee reporting the same thing. It marks Elevator {elevator} as not
              working on this device and raises the change alert in your own alert style.
            </p>
            <SecondaryButton onClick={simulateConfirmation}>
              Simulate a second report for Elevator {elevator}
            </SecondaryButton>
          </details>
        )}
        {elevator && alreadyDown && (
          <p className="status-note" role="status">
            Elevator {elevator} is already marked not working on this device, so your routes already leave it out.
          </p>
        )}
        <PrimaryButton href={ROUTES.plan}>Done</PrimaryButton>
        <SecondaryButton onClick={startOver}>Report something else</SecondaryButton>
      </div>
    );
  }

  if (problem) {
    return (
      <div className="stack">
        <PageHeading>Where?</PageHeading>
        <p className="muted">{problemLabel(problem)}. Pick the place from the list. There is nothing to type.</p>
        <BigChoiceList
          legend="Where is the problem?"
          choices={locationsFor(problem, graph).map((place) => ({ value: place.id, label: place.label }))}
          onChoose={send}
        />
        <SecondaryButton onClick={() => setProblem(null)}>Back</SecondaryButton>
      </div>
    );
  }

  return (
    <div className="stack">
      <PageHeading>What&apos;s wrong?</PageHeading>
      <p className="muted">Two taps. We never ask who you are or why it matters to you.</p>
      <BigChoiceList
        legend="What's wrong?"
        choices={PROBLEM_CHOICES.map((c) => ({ value: c.problem, label: c.label, detail: c.detail, icon: c.icon }))}
        onChoose={setProblem}
      />
      {state.reports.length > 0 && (
        <p className="small muted">
          You have reported {state.reports.length === 1 ? "1 problem" : `${state.reports.length} problems`} on this
          device. They stay on this device.
        </p>
      )}
      <SecondaryButton href={ROUTES.plan}>Back to my plan</SecondaryButton>
    </div>
  );
}

export default function Page() {
  return (
    <WaitForState>
      <ReportProblemFlow />
    </WaitForState>
  );
}
