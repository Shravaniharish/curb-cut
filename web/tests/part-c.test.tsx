import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { OrganizerDashboard } from "@/components/OrganizerDashboard";
import { PresenterConsole } from "@/components/PresenterConsole";
import { SessionCompanion } from "@/components/SessionCompanion";
import { QUESTIONS_KEY, sanitizeQuestions } from "@/lib/questions";
import { defaultState } from "@/lib/preferences";
import { STATE_KEY } from "@/lib/storage";
import { demoClockAt } from "@/lib/time";
import { renderWithApp } from "./helpers";
import type { PersistedState, WrittenQuestion } from "@/lib/types";

/** Two minutes into the 2:00 PM supply chain talk. */
const during = (s: PersistedState) => {
  s.demoClock = demoClockAt("14:02");
};

const seedQuestions = (qs: WrittenQuestion[]) => window.localStorage.setItem(QUESTIONS_KEY, JSON.stringify(qs));

describe("Session companion", () => {
  it("shows the transcript so far, pauses, and jumps back 30 seconds", async () => {
    const user = userEvent.setup();
    renderWithApp(<SessionCompanion talkId="talk-supply-chain" />, during);
    const log = await screen.findByRole("log");
    expect(within(log).getAllByRole("listitem").length).toBeGreaterThanOrEqual(6);
    expect(screen.getByText("Captions: Live captioner")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back 30 seconds" }));
    expect(screen.getByText(/^Paused at 1:3\d\./)).toBeInTheDocument();
    expect(screen.getByText(/new lines? waiting/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.queryByText(/^Paused at/)).not.toBeInTheDocument();
  });

  it("catches up with timestamped lines from the last minute", async () => {
    const user = userEvent.setup();
    renderWithApp(<SessionCompanion talkId="talk-supply-chain" />, during);
    await user.click(await screen.findByRole("button", { name: "Catch me up" }));
    const dialog = screen.getByRole("dialog", { name: "Catch me up" });
    const jumps = within(dialog).getAllByRole("button", { name: /^Jump back to/ });
    expect(jumps.length).toBeGreaterThan(0);
    expect(jumps.length).toBeLessThanOrEqual(3);
    await user.click(jumps[0]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/^Paused at/)).toBeInTheDocument();
  });

  it("sends a written question without a name", async () => {
    const user = userEvent.setup();
    renderWithApp(<SessionCompanion talkId="talk-supply-chain" />, during);
    await user.type(await screen.findByLabelText("Your question"), "How do we sign container images?");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByText(/Sent to the presenter/)).toBeInTheDocument();
    const stored = sanitizeQuestions(JSON.parse(window.localStorage.getItem(QUESTIONS_KEY) ?? "[]"));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ talkId: "talk-supply-chain", text: "How do we sign container images?", readOutAt: null });
    expect(Object.keys(stored[0]).sort()).toEqual(["askedAt", "id", "readOutAt", "talkId", "text"]);
  });

  it("shows a question inline once the presenter has read it out", async () => {
    seedQuestions([
      { id: "q1", talkId: "talk-supply-chain", text: "Do small teams need this?", askedAt: "2026-11-09T21:00:30.000Z", readOutAt: "2026-11-09T21:01:00.000Z" },
    ]);
    renderWithApp(<SessionCompanion talkId="talk-supply-chain" />, during);
    const log = await screen.findByRole("log");
    expect(within(log).getByText("Question read out:")).toBeInTheDocument();
    expect(within(log).getByText(/Do small teams need this\?/)).toBeInTheDocument();
  });

  it("says when the talk has not started yet", async () => {
    renderWithApp(<SessionCompanion talkId="talk-observability" />, during);
    expect(await screen.findByText(/This talk starts at 3:00 PM/)).toBeInTheDocument();
  });
});

describe("Presenter console", () => {
  it("shows the empty state", async () => {
    renderWithApp(<PresenterConsole talkId="talk-supply-chain" />, during);
    expect(await screen.findByText("No written questions yet.")).toBeInTheDocument();
  });

  it("lists questions oldest first and moves one to Read out", async () => {
    const user = userEvent.setup();
    seedQuestions([
      { id: "q2", talkId: "talk-supply-chain", text: "Second question", askedAt: "2026-11-09T21:01:00.000Z", readOutAt: null },
      { id: "q1", talkId: "talk-supply-chain", text: "First question", askedAt: "2026-11-09T21:00:30.000Z", readOutAt: null },
      { id: "q3", talkId: "talk-rbac", text: "Other talk", askedAt: "2026-11-09T21:00:10.000Z", readOutAt: null },
    ]);
    renderWithApp(<PresenterConsole talkId="talk-supply-chain" />, during);
    const marks = await screen.findAllByRole("button", { name: "Mark as read out" });
    expect(marks).toHaveLength(2);
    expect(screen.queryByText("Other talk")).not.toBeInTheDocument();
    const items = screen.getAllByText(/question$/);
    expect(items.map((n) => n.textContent)).toEqual(["First question", "Second question"]);

    await user.click(marks[0]);
    expect(screen.getByRole("heading", { name: "Read out" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Mark as read out" })).toHaveLength(1);
    const stored = sanitizeQuestions(JSON.parse(window.localStorage.getItem(QUESTIONS_KEY) ?? "[]"));
    expect(stored.find((q) => q.id === "q1")?.readOutAt).not.toBeNull();
  });
});

describe("Organizer dashboard", () => {
  it("announces Elevator B down in words and counts the demo attendees it affects", async () => {
    const user = userEvent.setup();
    renderWithApp(<OrganizerDashboard />, (s) => {
      s.elevatorStatus = { A: "working", B: "working", C: "working" };
    });
    expect(await screen.findAllByText("Elevator B: OK")).not.toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Elevator down" }));
    await user.selectOptions(screen.getByLabelText("Which elevator?"), "B");
    await user.click(screen.getByRole("button", { name: "Announce change" }));
    expect(screen.getAllByText("Elevator B: Not working").length).toBeGreaterThan(0);
    expect(screen.getByText(/Elevator B down · \d+ affected · \d+ re-planned/)).toBeInTheDocument();
    expect(screen.getByText("Counts are anonymous. We never see anyone's needs.")).toBeInTheDocument();
  });

  it("won't announce an elevator down twice", async () => {
    const user = userEvent.setup();
    renderWithApp(<OrganizerDashboard />, (s) => {
      s.elevatorStatus = { A: "working", B: "out_of_service", C: "working" };
    });
    await user.click(await screen.findByRole("button", { name: "Elevator down" }));
    expect(screen.getByText("Elevator B is already marked Not working.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Announce change" })).toHaveAttribute("aria-disabled", "true");
  });

  it("offers to announce once two matching elevator reports arrive", async () => {
    const user = userEvent.setup();
    renderWithApp(<OrganizerDashboard />, (s) => {
      s.elevatorStatus = { A: "working", B: "working", C: "working" };
      s.reports = [1, 2].map((i) => ({
        id: `r${i}`,
        createdAt: `2026-11-09T20:3${i}:00.000Z`,
        problem: "elevator_not_working" as const,
        locationId: "elevator-B",
        deviceToken: `d${i}`,
      }));
    });
    expect(await screen.findByText("2 matching reports. Announce as change?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Announce Elevator B down" }));
    expect(screen.getAllByText("Elevator B: Not working").length).toBeGreaterThan(0);
  });

  it("shows access gaps and marks the changes that need the API as unavailable", async () => {
    renderWithApp(<OrganizerDashboard />);
    expect(await screen.findByText("2 talks have no confirmed captions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Room full" })).toHaveAttribute("aria-disabled", "true");
  });
});

describe("Cross-tab sync", () => {
  it("adopts an elevator change written by another tab, such as the organizer dashboard", async () => {
    renderWithApp(<OrganizerDashboard />, (s) => {
      s.elevatorStatus = { A: "working", B: "working", C: "working" };
    });
    expect(await screen.findAllByText("Elevator C: OK")).not.toHaveLength(0);
    const other = defaultState();
    other.elevatorStatus = { A: "working", B: "working", C: "out_of_service" };
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: STATE_KEY, newValue: JSON.stringify(other) }));
    });
    expect(screen.getAllByText("Elevator C: Not working").length).toBeGreaterThan(0);
  });
});
