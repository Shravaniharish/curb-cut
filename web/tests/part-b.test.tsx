import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChangeAlert } from "@/components/ChangeAlert";
import { OtherOptionsList } from "@/components/OtherOptionsList";
import AlertsPage from "@/app/alerts/page";
import ReportPage from "@/app/report/page";
import ChangesPage from "@/app/changes/page";
import { renderWithApp } from "./helpers";
import { sanitizeAlerts } from "@/lib/preferences";
import { DEMO_PERSONAS } from "@/lib/fixtures/personas";
import type { AlertRecord } from "@/lib/types";

const alert: AlertRecord = {
  id: "a1",
  createdAt: "2026-11-09T20:30:00.000Z",
  origin: "event",
  kind: "elevator_down",
  whatChanged: "Elevator B is not working.",
  whatStays: "Your talk is still at 2:00 PM in Room 355.",
  doNow: "Use Elevator C. Leave by 1:48 PM. 6 minutes, step-free.",
  destinationRoomId: "room-355",
  leaveByIso: "2026-11-09T20:48:00.000Z",
  talkId: "talk-supply-chain",
  transcriptTalkId: null,
  simulated: true,
  acknowledgedAt: null,
};

describe("ChangeAlert styles", () => {
  it("vibrate + big text: amber banner, three labelled parts, one vibration", () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
    renderWithApp(<ChangeAlert alert={alert} style="vibrate_big_text" />);
    expect(screen.getByText(/Plan changed/)).toBeInTheDocument();
    for (const l of ["What changed", "What stays the same", "What to do now"]) expect(screen.getByText(l)).toBeInTheDocument();
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Show new route" })).toHaveAttribute("href", "/route/room-355");
    expect(screen.getByRole("link", { name: "See other options" })).toHaveAttribute("href", "/changes/options");
  });

  it("screen reader: assertive live region and the read-aloud note", () => {
    renderWithApp(<ChangeAlert alert={alert} style="screen_reader" />);
    const region = screen.getByRole("alert");
    expect(within(region).getByText("Elevator B is not working.")).toBeInTheDocument();
    expect(screen.getByText("Read aloud automatically.")).toBeInTheDocument();
  });

  it("calm: one part at a time, a counter, Next, and the route button only on the last step", async () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
    renderWithApp(<ChangeAlert alert={alert} style="calm_step_by_step" />);
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.queryByText(alert.whatStays)).toBeNull();
    expect(screen.queryByRole("link", { name: "Show new route" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
    expect(screen.getByText(alert.doNow)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Show new route" })).toBeInTheDocument();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("shows the transcript button only when there is a transcript", () => {
    renderWithApp(<ChangeAlert alert={{ ...alert, transcriptTalkId: "talk-supply-chain" }} style={null} />);
    expect(screen.getByRole("link", { name: "View transcript of what I missed" })).toHaveAttribute("href", "/sessions/talk-supply-chain/join");
  });
});

describe("Alerts tab", () => {
  it("shows the empty state", async () => {
    renderWithApp(<AlertsPage />);
    expect(await screen.findByText("No changes yet")).toBeInTheDocument();
    expect(screen.getByText("We'll tell you the moment anything affects your plan.")).toBeInTheDocument();
  });

  it("lists newest first with a tag and a View link", async () => {
    const older = { ...alert, id: "a0", origin: "personal" as const, whatChanged: "You missed a talk.", createdAt: "2026-11-09T19:00:00.000Z" };
    renderWithApp(<AlertsPage />, (s) => {
      s.alerts = [older, alert];
    });
    const list = await screen.findByRole("list", { name: /Change history/ });
    const rows = within(list).getAllByRole("article");
    expect(rows[0]).toHaveTextContent("Elevator B is not working.");
    expect(rows[0]).toHaveTextContent("Event change");
    expect(rows[1]).toHaveTextContent("Your change");
    expect(within(rows[0]).getByRole("link", { name: "View" })).toHaveAttribute("href", "/alerts/a1");
  });

  it("drops stored alerts that are missing a part", () => {
    expect(sanitizeAlerts([{ ...alert, doNow: "" }, alert])).toHaveLength(1);
  });
});

describe("My plans changed", () => {
  it("asks nothing about why and goes straight to the result for Missed it", async () => {
    renderWithApp(<ChangesPage />, (s) => {
      s.prefs = DEMO_PERSONAS[0].prefs;
      s.demoClock = { mode: "live" };
    });
    expect(await screen.findByRole("heading", { level: 1, name: "What happened?" })).toBeInTheDocument();
    expect(screen.getByText("No need to explain. We'll fix your plan.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /I'm running late/ }));
    expect(screen.getByRole("heading", { level: 1, name: "About how late?" })).toBeInTheDocument();
    for (const l of ["5 min", "10 min", "15 min or more"]) expect(screen.getByRole("button", { name: l })).toBeInTheDocument();
  });
});

describe("Report a problem", () => {
  it("runs What's wrong -> Where -> Thank you without free text, and stores no name or needs", async () => {
    renderWithApp(<ReportPage />);
    expect(await screen.findByRole("heading", { level: 1, name: "What's wrong?" })).toBeInTheDocument();
    expect(document.querySelector("input[type=text], textarea")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Elevator not working/ }));
    expect(screen.getByRole("heading", { level: 1, name: "Where?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Elevator B" }));
    expect(screen.getByRole("heading", { level: 1, name: "Thank you" })).toBeInTheDocument();
    expect(screen.getByText(/When someone else confirms it, we'll reroute everyone affected\./)).toBeInTheDocument();
    expect(screen.getByText(/We don't send your name or needs\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Done" })).toHaveAttribute("href", "/plan");
    expect(screen.getByText(/Nothing was sent/)).toBeInTheDocument();
  });
});

describe("Other options", () => {
  it("says so plainly when nothing fits", () => {
    renderWithApp(<OtherOptionsList options={[]} />);
    expect(screen.getByText("Nothing else today fits")).toBeInTheDocument();
  });
});

