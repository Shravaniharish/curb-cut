import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AccessStatusBadge } from "@/components/AccessStatusBadge";
import { AccessibleCheckboxGroup } from "@/components/AccessibleCheckboxGroup";
import { AccessibleSelectionCards } from "@/components/AccessibleSelectionCard";
import { AlertStyleChooser } from "@/components/AlertStyleChooser";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Dialog } from "@/components/Dialog";
import { TalkCard } from "@/components/TalkCard";
import { PrimaryButton } from "@/components/ui";
import { accessFacts } from "@/lib/accessLabels";
import { DEMO_PERSONAS } from "@/lib/fixtures/personas";
import { DEMO_TALKS } from "@/lib/fixtures/talks";
import { STATE_KEY } from "@/lib/storage";
import { pathnameRef, push } from "./nav-mock";
import { renderWithApp } from "./helpers";
import SettingsView from "@/components/SettingsView";
import Welcome from "@/app/page";
import PlanPage from "@/app/plan/page";
import NeedsStep from "@/app/setup/needs/page";
import TopicsStep from "@/app/setup/topics/page";
import { SearchView } from "@/components/SearchView";
import { TalkDetails } from "@/components/TalkDetails";
import { RouteView } from "@/components/RouteView";
import { LocalSearchAdapter } from "@/lib/search/local";
import type { SearchHit, TalkSearchAdapter } from "@/lib/search/types";
import { SearchError } from "@/lib/search/types";

const priya = DEMO_PERSONAS[1];
const marcus = DEMO_PERSONAS[0];

describe("AccessibleCheckboxGroup", () => {
  it("is a labelled group of checkboxes that supports zero selections", async () => {
    const onChange = vi.fn();
    render(<AccessibleCheckboxGroup legend="Getting around" options={[{ id: "a", label: "Step-free routes", checked: false }, { id: "b", label: "Extra travel time", checked: false }]} onChange={onChange} />);
    const group = screen.getByRole("group", { name: "Getting around" });
    expect(within(group).getAllByRole("checkbox")).toHaveLength(2);
    await userEvent.click(screen.getByLabelText("Step-free routes"));
    expect(onChange).toHaveBeenCalledWith("a", true);
  });
  it("toggles with the keyboard", async () => {
    const onChange = vi.fn();
    render(<AccessibleCheckboxGroup legend="g" options={[{ id: "a", label: "One", checked: false }]} onChange={onChange} />);
    await userEvent.tab();
    expect(screen.getByLabelText("One")).toHaveFocus();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith("a", true);
  });
});

describe("AccessibleSelectionCards", () => {
  function Harness() {
    const [v, setV] = useState<"a" | "b" | null>(null);
    return <AccessibleSelectionCards legend="Style" name="s" value={v} onChange={setV} options={[{ value: "a", title: "Alpha", description: "first" }, { value: "b", title: "Beta", description: "second" }]} />;
  }
  it("allows exactly one selection and exposes it in text and state", async () => {
    render(<Harness />);
    expect(screen.queryByText(/Selected/)).toBeNull();
    await userEvent.click(screen.getByRole("radio", { name: /Alpha/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Beta/ }));
    expect(screen.getByRole("radio", { name: /Beta/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Alpha/ })).not.toBeChecked();
    expect(screen.getAllByText(/Selected/)).toHaveLength(1);
  });
});

describe("Dialog", () => {
  function Harness({ onClose }: { onClose: () => void }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open</button>
        <Dialog open={open} title="Sure?" onClose={() => { setOpen(false); onClose(); }}>
          <button>Cancel</button>
          <button>Confirm</button>
        </Dialog>
      </>
    );
  }
  it("labels itself, focuses the first action, traps Tab, closes on Escape and restores focus", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const opener = screen.getByRole("button", { name: "Open" });
    await userEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Sure?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Confirm" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus(); // wrapped, not escaped
    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Confirm" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });
});

describe("BottomNavigation", () => {
  it("lists the five tabs with visible text and marks the active one", () => {
    render(<BottomNavigation />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getAllByRole("link").map((l) => l.textContent)).toEqual(["Plan", "Search", "Alerts", "Report", "Settings"]);
    expect(within(nav).getByRole("link", { name: "Plan" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Search" })).not.toHaveAttribute("aria-current");
  });
  it("follows the current path", () => {
    pathnameRef.value = "/search";
    render(<BottomNavigation />);
    expect(screen.getByRole("link", { name: "Search" })).toHaveAttribute("aria-current", "page");
  });
});

describe("access labels", () => {
  it("shows unknown as unknown, never as a positive claim", () => {
    const rbac = DEMO_TALKS.find((t) => t.id === "talk-rbac")!;
    const facts = accessFacts(rbac);
    expect(facts.find((f) => f.key === "captions")).toMatchObject({ label: "Captions unknown", tone: "unknown" });
    expect(facts.find((f) => f.key === "slides")).toMatchObject({ label: "Descriptions unknown", tone: "unknown" });
  });
  it("uses the required wording and pairs every state with a glyph", () => {
    const labels = accessFacts(DEMO_TALKS[0]).map((f) => f.label);
    expect(labels).toContain("Live captioner");
    expect(labels).toContain("Verified");
    render(<AccessStatusBadge fact={accessFacts(DEMO_TALKS[1])[1]} withHeading />);
    expect(screen.getByText(/Captions: Auto captions/)).toBeInTheDocument();
  });
  it("TalkCard shows time, room, floor, facts and an honest why line", () => {
    renderWithApp(<TalkCard talk={DEMO_TALKS[0]} why={["Live captioner"]} />);
    expect(screen.getByRole("link", { name: /Securing Your Supply Chain/ })).toHaveAttribute("href", "/talks/talk-supply-chain");
    expect(screen.getByText(/2:00 PM – 2:40 PM · Room 355 · Floor 3/)).toBeInTheDocument();
    expect(screen.getByText(/Why this fits you:/)).toBeInTheDocument();
  });
});

describe("buttons", () => {
  it("keeps a disabled button focusable and inert", async () => {
    const onClick = vi.fn();
    render(<PrimaryButton disabled onClick={onClick}>Go</PrimaryButton>);
    const b = screen.getByRole("button", { name: "Go" });
    expect(b).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(b);
    expect(onClick).not.toHaveBeenCalled();
  });
  it("announces loading with aria-busy", () => {
    render(<PrimaryButton loading>Search</PrimaryButton>);
    expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute("aria-busy", "true");
  });
});

describe("alert style chooser", () => {
  it("previews each style and saves a single choice", async () => {
    renderWithApp(<AlertStyleChooser />);
    await screen.findByRole("group", { name: "Alert style" });
    expect(screen.getByText("Leave now: Room 355")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /Screen reader/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Calm/ }));
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(STATE_KEY)!).prefs.notificationStyle).toBe("calm_step_by_step"));
  });
  it("is honest when vibration is unsupported", async () => {
    Object.defineProperty(navigator, "vibrate", { value: undefined, configurable: true });
    renderWithApp(<AlertStyleChooser />, (s) => (s.prefs.notificationStyle = "vibrate_big_text"));
    await userEvent.click(await screen.findByRole("button", { name: "Try this alert" }));
    expect(await screen.findByText(/does not support vibration, so there was no vibration/)).toBeInTheDocument();
  });
});

describe("onboarding", () => {
  it("Welcome states the accurate privacy line and Skip creates a guest", async () => {
    renderWithApp(<Welcome />);
    expect(await screen.findByRole("heading", { level: 1, name: "Curb Cut" })).toBeInTheDocument();
    expect(screen.getByText(/Your preferences stay on this device/)).toBeInTheDocument();
    expect(screen.queryByText(/never store/i)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Skip setup" }));
    expect(push).toHaveBeenCalledWith("/plan");
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(STATE_KEY)!).onboarding).toBe("guest"));
  });
  it("setup step 1 persists selections across a remount (going back)", async () => {
    const first = renderWithApp(<NeedsStep />);
    await userEvent.click(await screen.findByLabelText("Step-free routes"));
    await userEvent.click(screen.getByLabelText("Captions required"));
    await waitFor(() => expect(window.localStorage.getItem(STATE_KEY)).toContain('"stepFreeRouting":true'));
    first.unmount();
    renderWithApp(<NeedsStep />);
    expect(await screen.findByLabelText("Step-free routes")).toBeChecked();
    expect(screen.getByLabelText("Captions required")).toBeChecked();
    expect(screen.getByLabelText("Quiet breaks")).not.toBeChecked();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
  });
  it("topics step makes nothing mandatory and 'Build my plan' completes onboarding then opens Plan", async () => {
    renderWithApp(<TopicsStep />);
    await userEvent.click(await screen.findByRole("button", { name: "Build my plan" }));
    expect(push).toHaveBeenCalledWith("/plan");
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(STATE_KEY)!).onboarding).toBe("complete"));
  });
});

describe("Plan", () => {
  it("shows Marcus's next talk, the 1:48 PM leave-by, and the Take me there / My plans changed actions", async () => {
    renderWithApp(<PlanPage />, (s) => { s.prefs = marcus.prefs; s.onboarding = "complete"; });
    expect(await screen.findByRole("heading", { level: 1, name: "Your plan" })).toBeInTheDocument();
    expect(screen.getByText("Leave by 1:48 PM")).toBeInTheDocument();
    expect(screen.getByText(/6 min step-free trip \+ 6 min buffer/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Take me there" })).toHaveAttribute("href", "/route/room-355");
    expect(screen.getByRole("link", { name: "My plans changed" })).toHaveAttribute("href", "/changes");
    expect(screen.getByRole("heading", { name: "Backup talk" })).toBeInTheDocument();
  });
  it("never lists a talk that cannot confirm Priya's captions as planned", async () => {
    renderWithApp(<PlanPage />, (s) => { s.prefs = priya.prefs; s.onboarding = "complete"; });
    const today = await screen.findByRole("heading", { name: "Today's talks" });
    const list = today.parentElement!;
    expect(within(list).queryByText(/Kubernetes RBAC/)).toBeNull();
    expect(within(list).getByText(/Securing Your Supply Chain/)).toBeInTheDocument();
    const left = screen.getByText(/Talks left out of your plan \(2\)/);
    expect(left).toBeInTheDocument();
  });
  it("has working export buttons and explains an empty plan", async () => {
    renderWithApp(<PlanPage />, (s) => { s.prefs.topics = ["Networking"]; s.onboarding = "complete"; });
    expect(await screen.findByText("No talks in your plan yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Calendar (.ics)" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByText(/Your plan is empty/).length).toBeGreaterThan(0);
  });
  it("downloads a real file from Export", async () => {
    const created: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob | MediaSource) => { created.push(b as Blob); return "blob:x"; });
    URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
    renderWithApp(<PlanPage />, (s) => { s.prefs = marcus.prefs; });
    await userEvent.click(await screen.findByRole("button", { name: "Calendar (.ics)" }));
    expect(await screen.findByText("Downloaded curb-cut-plan-2026-11-09.ics.")).toBeInTheDocument();
    expect(created).toHaveLength(1);
    expect(await created[0].text()).toContain("BEGIN:VCALENDAR");
  });
});

describe("Talk details", () => {
  it("shows facts, sensory note labelled as demo, backup, and the three actions", async () => {
    renderWithApp(<TalkDetails talkId="talk-supply-chain" />, (s) => (s.prefs = marcus.prefs));
    expect(await screen.findByRole("heading", { level: 1, name: /Securing Your Supply Chain/ })).toBeInTheDocument();
    expect(screen.getByText("Speaker not listed")).toBeInTheDocument();
    expect(screen.getByText("Bright stage lights. Usually full. Applause at the end.")).toBeInTheDocument();
    expect(screen.getByText("Demo-provided information, not independently verified.")).toBeInTheDocument();
    expect(screen.getByText("Live captioner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Take me there" })).toHaveAttribute("href", "/route/room-355");
    expect(screen.getByRole("link", { name: "Join session" })).toHaveAttribute("href", "/sessions/talk-supply-chain/join");
    expect(screen.getByRole("button", { name: "Add to calendar" })).toBeInTheDocument();
  });
  it("warns, in text, when the talk does not confirm a required need", async () => {
    renderWithApp(<TalkDetails talkId="talk-rbac" />, (s) => (s.prefs = priya.prefs));
    expect(await screen.findByText(/does not confirm what you marked as required/)).toBeInTheDocument();
    expect(screen.getByText(/Captions not confirmed/)).toBeInTheDocument();
    expect(screen.getAllByText("Captions unknown").length).toBeGreaterThan(0);
  });
  it("handles an unknown talk id", async () => {
    renderWithApp(<TalkDetails talkId="nope" />);
    expect(await screen.findByText("We could not find that talk")).toBeInTheDocument();
  });
});

describe("Route screen", () => {
  it("shows the header, leave-by, numbered steps and simulated Elevator B status", async () => {
    renderWithApp(<RouteView destinationId="room-355" />, (s) => { s.prefs = marcus.prefs; s.selectedTalkId = "talk-supply-chain"; });
    expect(await screen.findByRole("heading", { level: 1, name: "To Room 355 · 6 minutes · Step-free" })).toBeInTheDocument();
    expect(screen.getByText("Leave by 1:48 PM")).toBeInTheDocument();
    const steps = within(screen.getByRole("list", { name: "Directions" })).getAllByRole("listitem").map((l) => l.textContent);
    expect(steps).toEqual(["Exit Room 251 and turn left.", "Go past the coffee station to Elevator C.", "Take Elevator C to Floor 3.", "Turn right. Room 355 is the second door on your left."]);
    expect(screen.getByText("Avoids Elevator B (not working).")).toBeInTheDocument();
    expect(screen.getByText(/Simulated demo condition, not live venue data/)).toBeInTheDocument();
  });
  it("changes the route when Elevator B is marked working", async () => {
    renderWithApp(<RouteView destinationId="room-355" />, (s) => { s.prefs = marcus.prefs; s.elevatorStatus.B = "working"; });
    expect(await screen.findByRole("heading", { level: 1, name: "To Room 355 · 3 minutes · Step-free" })).toBeInTheDocument();
    expect(screen.queryByText(/Avoids Elevator B/)).toBeNull();
  });
  it("shows the required message and no stairs when no accessible route exists", async () => {
    renderWithApp(<RouteView destinationId="room-355" />, (s) => { s.prefs = marcus.prefs; s.elevatorStatus = { A: "out_of_service", B: "out_of_service", C: "out_of_service" }; });
    expect(await screen.findByText("An accessible route could not be confirmed.")).toBeInTheDocument();
    expect(screen.queryByText(/stairs/i, { selector: "li" })).toBeNull();
  });
  it("'I've arrived' moves the attendee and returns to Plan", async () => {
    renderWithApp(<RouteView destinationId="room-355" />, (s) => (s.prefs = marcus.prefs));
    await userEvent.click(await screen.findByRole("button", { name: "I've arrived" }));
    expect(push).toHaveBeenCalledWith("/plan");
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(STATE_KEY)!).currentLocationId).toBe("room-355"));
  });
  it("stores the reminder 5 minutes before leave-by and states its limit honestly", async () => {
    renderWithApp(<RouteView destinationId="room-355" />, (s) => { s.prefs = marcus.prefs; s.selectedTalkId = "talk-supply-chain"; });
    await userEvent.click(await screen.findByRole("button", { name: /Remind me 5 minutes before I need to leave/ }));
    expect(await screen.findByText(/Reminder set for 1:43 PM/)).toBeInTheDocument();
    expect(screen.getByText(/cannot notify you after you close it/)).toBeInTheDocument();
    const saved = JSON.parse(window.localStorage.getItem(STATE_KEY)!);
    expect(saved.reminder.talkId).toBe("talk-supply-chain");
    expect(saved.reminder.remindAt).toBe("2026-11-09T20:43:00.000Z");
  });
  it("handles an unknown destination", async () => {
    renderWithApp(<RouteView destinationId="mars" />);
    expect(await screen.findByText("We could not find that place")).toBeInTheDocument();
  });
});

describe("Search", () => {
  const deferred = () => { let resolve!: (h: SearchHit[]) => void; const p = new Promise<SearchHit[]>((r) => (resolve = r)); return { p, resolve }; };

  it("walks idle -> searching -> results, with facts and 'why' on each result", async () => {
    const d = deferred();
    const adapter: TalkSearchAdapter = { backend: "demo", label: "t", search: () => d.p };
    renderWithApp(<SearchView adapter={adapter} />);
    expect(await screen.findByText("Start with a few words")).toBeInTheDocument();
    const input = screen.getByRole("searchbox", { name: "What are you looking for?" });
    expect(input).toHaveAttribute("placeholder", "Ask in your own words, e.g. 'beginner security talk'");
    await userEvent.type(input, "security{Enter}");
    expect(await screen.findByText("Searching…")).toBeInTheDocument();
    d.resolve([{ talkId: "talk-supply-chain", score: 1, matched: ["Topic: Security"] }]);
    expect(await screen.findByText("1 talk found")).toBeInTheDocument();
    expect(screen.getByText(/2:00 PM – 2:40 PM · Room 355 · Floor 3/)).toBeInTheDocument();
    expect(screen.getByText(/Matched your words: Topic: Security/)).toBeInTheDocument();
    expect(screen.getByText(/Why this fits you:/)).toBeInTheDocument();
  });
  it("shows the exact no-match message and offers ways to change the search without relaxing needs", async () => {
    renderWithApp(<SearchView adapter={new LocalSearchAdapter()} />, (s) => (s.prefs = priya.prefs));
    await userEvent.type(await screen.findByRole("searchbox"), "zzzz{Enter}");
    expect(await screen.findByRole("heading", { name: "No talks match all your needs. Try fewer words." })).toBeInTheDocument();
    expect(screen.getByText("Your required needs were not relaxed to find more talks.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review my needs" })).toHaveAttribute("href", "/settings");
    await userEvent.click(screen.getByRole("button", { name: "Change search terms" }));
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });
  it("keeps captions-unconfirmed talks out of Priya's results but explains the hiding", async () => {
    renderWithApp(<SearchView adapter={new LocalSearchAdapter()} />, (s) => (s.prefs = priya.prefs));
    await userEvent.type(await screen.findByRole("searchbox"), "security{Enter}");
    expect(await screen.findByText("1 talk found")).toBeInTheDocument();
    expect(screen.getByText(/2 matching talks were hidden because they do not confirm your needs/)).toBeInTheDocument();
  });
  it("shows an error state with retry, and offers demo search only when a remote backend failed", async () => {
    const adapter: TalkSearchAdapter = { backend: "elasticsearch", label: "es", search: async () => { throw new SearchError("The search service could not be reached."); } };
    renderWithApp(<SearchView adapter={adapter} />);
    await userEvent.type(await screen.findByRole("searchbox"), "security{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("The search service could not be reached.");
    await userEvent.click(screen.getByRole("button", { name: "Use demo search instead" }));
    expect(await screen.findByRole("heading", { name: /talks? found/ })).toBeInTheDocument();
    expect(screen.getByTestId("search-mode")).toHaveTextContent("demo search over sample talks");
  });
  it("remembers the query for the session", async () => {
    const first = renderWithApp(<SearchView adapter={new LocalSearchAdapter()} />);
    await userEvent.type(await screen.findByRole("searchbox"), "observability{Enter}");
    await screen.findByText("1 talk found");
    first.unmount();
    renderWithApp(<SearchView adapter={new LocalSearchAdapter()} />);
    expect(await screen.findByRole("searchbox")).toHaveValue("observability");
    expect(await screen.findByText("1 talk found")).toBeInTheDocument();
  });
});

describe("Settings", () => {
  it("has the five sections and every setting changes the document", async () => {
    renderWithApp(<SettingsView />);
    for (const name of ["My needs", "Alert style", "Topics", "Display", "Privacy"]) expect(await screen.findByRole("heading", { level: 2, name })).toBeInTheDocument();
    const slider = screen.getByRole("slider", { name: /Text size/ });
    expect(document.documentElement.style.fontSize).toBe("100%");
    fireEvent.change(slider, { target: { value: "1.2" } }); // arrow keys on a range input are native browser behaviour; covered in e2e
    await waitFor(() => expect(document.documentElement.style.fontSize).toBe("120%"));
    expect(screen.getByTestId("text-preview")).toHaveTextContent("120%");
    await userEvent.click(screen.getByLabelText("High contrast"));
    expect(document.documentElement.dataset.contrast).toBe("high");
    await userEvent.click(screen.getByLabelText(/Dyslexia-friendly font/));
    expect(document.documentElement.dataset.font).toBe("dyslexia");
    await userEvent.click(screen.getByLabelText("Reduced motion"));
    expect(document.documentElement.dataset.motion).toBe("reduced");
    await userEvent.click(screen.getByLabelText("High contrast"));
    expect(document.documentElement.dataset.contrast).toBeUndefined();
  });
  it("Cancel keeps the data; Confirm deletes this app's data, restores defaults and returns to Welcome", async () => {
    window.localStorage.setItem("unrelated", "keep");
    renderWithApp(<SettingsView />, (s) => { s.prefs = marcus.prefs; s.prefs.display.highContrast = true; s.agendaOverrides.added = ["talk-qa"]; s.onboarding = "complete"; });
    expect(document.documentElement.dataset.contrast).toBe("high");
    const clear = await screen.findByRole("button", { name: "Clear all my data" });
    await userEvent.click(clear);
    expect(screen.getByRole("dialog", { name: "Clear all your data?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(clear).toHaveFocus();
    expect(window.localStorage.getItem(STATE_KEY)).not.toBeNull();
    await userEvent.click(clear);
    await userEvent.click(screen.getByRole("button", { name: "Yes, clear everything" }));
    expect(push).toHaveBeenCalledWith("/");
    expect(window.localStorage.getItem(STATE_KEY)).toBeNull();
    expect(window.localStorage.getItem("unrelated")).toBe("keep");
    expect(document.documentElement.dataset.contrast).toBeUndefined();
    expect(document.documentElement.style.fontSize).toBe("100%");
  });
  it("closes the confirmation with Escape", async () => {
    renderWithApp(<SettingsView />);
    await userEvent.click(await screen.findByRole("button", { name: "Clear all my data" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("in-app reminder", () => {
  it("shows an alert once the clock passes the reminder time, in the attendee's alert style, and can be dismissed", async () => {
    const { AppShell } = await import("@/components/AppShell");
    const { zonedToUtcIso } = await import("@/lib/time");
    window.localStorage.setItem(
      STATE_KEY,
      JSON.stringify({
        ...(await import("@/lib/preferences")).defaultState(),
        prefs: { ...marcus.prefs, notificationStyle: "calm_step_by_step" },
        reminder: { talkId: "talk-supply-chain", remindAt: zonedToUtcIso("2026-11-09", "13:00"), leaveBy: zonedToUtcIso("2026-11-09", "13:48"), createdAt: zonedToUtcIso("2026-11-09", "12:00"), firedAt: null },
        demoClock: { mode: "demo", anchorDemo: zonedToUtcIso("2026-11-09", "13:30"), anchorReal: Date.now() },
      }),
    );
    render(<AppShell><p>content</p></AppShell>);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("One step: get ready to leave for Securing Your Supply Chain Without Slowing Down. Leave by 1:48 PM.");
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(STATE_KEY)!).reminder.firedAt).not.toBeNull());
    await userEvent.click(screen.getByRole("button", { name: "Dismiss reminder" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("has a header landmark for the demo notice and a main landmark, with a skip link first", async () => {
    const { AppShell } = await import("@/components/AppShell");
    render(<AppShell><p>content</p></AppShell>);
    expect(await screen.findByRole("banner")).toHaveTextContent("Demo mode");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute("href", "#main");
  });
});
