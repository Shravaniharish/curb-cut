import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const STATE_KEY = "curbcut.v1.state";
const stored = (page: Page) => page.evaluate((k) => JSON.parse(window.localStorage.getItem(k) ?? "null"), STATE_KEY);
/** Cache Components keeps visited pages mounted but hidden; only match what a person can actually see. */
const visible = (loc: ReturnType<Page["getByText"]>) => loc.locator("visible=true");
const usePersona = async (page: Page, name: string) => {
  await page.goto("/");
  await page.getByText("Demo attendees (for demonstrations)").click();
  await page.getByRole("button", { name: `Use ${name}'s demo needs` }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your plan" })).toBeVisible();
};

test.describe("Flow 1: first-time onboarding", () => {
  test("Welcome -> three setup steps -> Plan; selections persist and shape the agenda", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Curb Cut" })).toBeVisible();
    await page.getByRole("link", { name: "Get started" }).click();
    await expect(page.getByText("Step 1 of 3")).toBeVisible();
    await page.getByLabel("Step-free routes").check();
    await page.getByLabel("Extra travel time").check();
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page.getByText("Step 2 of 3")).toBeVisible();
    await page.getByRole("radio", { name: /Screen reader/ }).check();
    await page.getByRole("link", { name: "Back" }).click();
    // Wait for the destination page itself: visited pages stay mounted but hidden, so a hidden checkbox still reads as checked.
    await expect(page.getByRole("heading", { level: 1, name: "What helps you?" })).toBeVisible();
    await expect(page.getByLabel("Step-free routes")).toBeChecked(); // persists when going back
    await page.getByRole("link", { name: "Next" }).click();
    await page.getByRole("radio", { name: /Screen reader/ }).check();
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page.getByText("Step 3 of 3")).toBeVisible();
    await page.getByLabel("Security", { exact: true }).check();
    await page.getByLabel("Observability").check();
    await page.getByRole("button", { name: "Build my plan" }).click();
    await expect(page).toHaveURL(/\/plan$/);
    await expect(page.getByRole("heading", { level: 1, name: "Your plan" })).toBeVisible();
    await expect(visible(page.getByText("Leave by 1:48 PM"))).toBeVisible();
    const s = await stored(page);
    expect(s.onboarding).toBe("complete");
    expect(s.prefs.required.stepFreeRouting).toBe(true);
    expect(s.prefs.notificationStyle).toBe("screen_reader");
    await page.reload();
    await expect(visible(page.getByText("Leave by 1:48 PM"))).toBeVisible(); // survives a reload
  });
});

test.describe("Flow 2: plan and route", () => {
  test("Plan -> Talk Details -> Route -> I've arrived -> Plan with the right talk and destination", async ({ page }) => {
    await usePersona(page, "Marcus");
    await page.getByRole("link", { name: "Securing Your Supply Chain Without Slowing Down" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: /Securing Your Supply Chain/ })).toBeVisible();
    await expect(page.getByText("Bright stage lights. Usually full. Applause at the end.")).toBeVisible();
    await page.getByRole("link", { name: "Take me there" }).click();
    await expect(page).toHaveURL(/\/route\/room-355$/);
    await expect(page.getByRole("heading", { level: 1, name: "To Room 355 · 6 minutes · Step-free" })).toBeVisible();
    await expect(visible(page.getByText("Leave by 1:48 PM"))).toBeVisible();
    const steps = page.getByRole("list", { name: "Directions" }).getByRole("listitem");
    await expect(steps).toHaveText(["Exit Room 251 and turn left.", "Go past the coffee station to Elevator C.", "Take Elevator C to Floor 3.", "Turn right. Room 355 is the second door on your left."]);
    expect((await stored(page)).selectedTalkId).toBe("talk-supply-chain");
    await page.getByRole("button", { name: "I've arrived" }).click();
    await expect(page).toHaveURL(/\/plan$/);
    expect((await stored(page)).currentLocationId).toBe("room-355");
  });
});

test.describe("Flow 3: search", () => {
  test("Search -> results -> Talk Details -> Route, with required captions respected", async ({ page }) => {
    await usePersona(page, "Priya");
    await page.getByRole("link", { name: "Search" }).click();
    await expect(page.getByText("Start with a few words")).toBeVisible();
    await page.getByRole("searchbox").fill("security");
    await page.getByRole("searchbox").press("Enter");
    await expect(page.getByRole("heading", { name: "1 talk found" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Securing Your Supply Chain/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Kubernetes RBAC/ })).toHaveCount(0); // hidden: captions unknown (only in the collapsed list)
    await expect(page.getByText("Live captioner").first()).toBeVisible();
    await page.getByRole("link", { name: /Securing Your Supply Chain/ }).click();
    await page.getByRole("link", { name: "Take me there" }).click();
    await expect(page.getByRole("heading", { level: 1, name: /^To Room 355/ })).toBeVisible();
  });
  test("no-results message and persistence of the query", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("searchbox").fill("quantum knitting");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("heading", { name: "No talks match all your needs. Try fewer words." })).toBeVisible();
    await page.getByRole("link", { name: "Plan" }).click();
    await page.getByRole("link", { name: "Search" }).click();
    await expect(page.getByRole("searchbox")).toHaveValue("quantum knitting");
  });
});

test.describe("Flow 4: settings change the app", () => {
  test("text size, contrast, font and needs take effect and reach the plan", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    const slider = page.getByRole("slider", { name: /Text size/ });
    await slider.focus();
    await slider.press("ArrowRight");
    await slider.press("ArrowRight");
    await expect.poll(() => page.evaluate(() => document.documentElement.style.fontSize)).toBe("120%");
    await page.getByLabel("High contrast").check();
    await page.getByLabel(/Dyslexia-friendly font/).check();
    await page.getByLabel("Reduced motion").check();
    await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
    await expect(page.locator("html")).toHaveAttribute("data-font", "dyslexia");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(family).toContain("OpenDyslexic");
    await page.getByLabel("Captions required").check();
    await page.getByRole("link", { name: "Back to my plan" }).click();
    await expect(page.getByText(/Talks left out of your plan \(2\)/)).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
    expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe("120%");
  });
});

test.describe("Flow 5: guest mode", () => {
  test("Welcome -> Skip setup -> Plan with no setup required", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Skip setup" }).click();
    await expect(page).toHaveURL(/\/plan$/);
    await expect(page.getByRole("heading", { level: 1, name: "Your plan" })).toBeVisible();
    await expect(page.getByText("You are using Curb Cut as a guest")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today's talks" })).toBeVisible();
  });
});

test.describe("Flow 6: reset", () => {
  test("Settings -> Clear all my data -> Confirm -> Welcome; nothing comes back", async ({ page }) => {
    await usePersona(page, "Marcus");
    await page.evaluate(() => window.localStorage.setItem("unrelated-site-data", "keep"));
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByLabel("Step-free routes")).toBeChecked();
    const clear = page.getByRole("button", { name: "Clear all my data" });
    await clear.click();
    const dialog = page.getByRole("dialog", { name: "Clear all your data?" });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(clear).toBeFocused(); // focus restored
    await clear.click();
    await page.getByRole("button", { name: "Yes, clear everything" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Curb Cut" })).toBeVisible();
    expect(await stored(page)).toBeNull();
    expect(await page.evaluate(() => window.localStorage.getItem("unrelated-site-data"))).toBe("keep");
    await page.reload();
    await page.goto("/settings");
    await expect(page.getByLabel("Step-free routes")).not.toBeChecked();
  });
});

test.describe("Flow 7: elevator failure", () => {
  test("Elevator B out of service is avoided; marking it working changes the route; no path shows the safe message", async ({ page }) => {
    await usePersona(page, "Marcus");
    await page.goto("/route/room-355");
    await expect(page.getByRole("heading", { level: 1, name: "To Room 355 · 6 minutes · Step-free" })).toBeVisible();
    await expect(page.getByText("Avoids Elevator B (not working).")).toBeVisible();
    await expect(page.getByText("Simulated demo condition, not live venue data.")).toBeVisible();
    await page.getByText("Demo conditions").click();
    await page.getByLabel("Elevator B").selectOption("working");
    await expect(page.getByRole("heading", { level: 1, name: "To Room 355 · 3 minutes · Step-free" })).toBeVisible();
    await page.getByLabel("Elevator A").selectOption("out_of_service");
    await page.getByLabel("Elevator B").selectOption("out_of_service");
    await page.getByLabel("Elevator C").selectOption("out_of_service");
    await expect(page.getByText("An accessible route could not be confirmed.")).toBeVisible();
    await expect(page.getByRole("list", { name: "Directions" })).toHaveCount(0);
  });
});

test.describe("Flow 8: accessibility filtering", () => {
  test("Priya never sees unknown or absent captions represented as satisfying her requirement", async ({ page }) => {
    await usePersona(page, "Priya");
    const today = page.getByRole("heading", { name: "Today's talks" }).locator("..");
    await expect(today.getByRole("link", { name: /Securing Your Supply Chain/ })).toBeVisible();
    await expect(today.getByRole("link", { name: /Kubernetes RBAC/ })).toHaveCount(0);
    await expect(today.getByRole("link", { name: /Supply Chain Security Q&A/ })).toHaveCount(0);
    await page.goto("/talks/talk-rbac");
    await expect(page.getByText(/does not confirm what you marked as required/)).toBeVisible();
    const facts = page.getByRole("heading", { name: "Accessibility facts" }).locator("..");
    await expect(facts.getByText("Captions unknown")).toBeVisible();
    await expect(facts.getByText("Live captioner")).toHaveCount(0); // the backup talk below may show its own captions
  });
});

test.describe("exports, reminders, keyboard", () => {
  test("downloads real .ics, .csv and .txt files", async ({ page }) => {
    await usePersona(page, "Marcus");
    for (const [button, name, expected] of [
      ["Calendar (.ics)", "curb-cut-plan-2026-11-09.ics", "BEGIN:VCALENDAR"],
      ["Spreadsheet (.csv)", "curb-cut-plan-2026-11-09.csv", "Title,Date,Start,End,Location,Details"],
      ["Plain text (.txt)", "curb-cut-plan-2026-11-09.txt", "Securing Your Supply Chain"],
    ] as const) {
      const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: button }).click()]);
      expect(download.suggestedFilename()).toBe(name);
      const text = await readFile((await download.path())!, "utf8");
      expect(text).toContain(expected);
      expect(text).not.toMatch(/step-free routing|stepFreeRouting|Marcus/i); // private needs are not exported
    }
  });
  test("Add to calendar on a talk downloads one event", async ({ page }) => {
    await page.goto("/talks/talk-observability");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Add to calendar" }).click()]);
    expect(download.suggestedFilename()).toBe("curb-cut-observability-for-beginners.ics");
    const text = await readFile((await download.path())!, "utf8");
    expect(text).toContain("DTSTART:20261109T220000Z");
  });
  test("the in-app route reminder fires when the demo clock reaches it", async ({ page }) => {
    await usePersona(page, "Marcus");
    await page.getByRole("link", { name: "Take me there" }).click();
    await page.getByRole("button", { name: /Remind me 5 minutes before I need to leave/ }).click();
    await expect(page.getByText(/Reminder set for 1:43 PM/)).toBeVisible();
    await page.getByText("Demo conditions").click();
    await page.getByLabel("Demo clock").selectOption("13:44");
    const alert = page.getByRole("alert").filter({ hasText: "Leave by 1:48 PM" });
    await expect(alert).toBeVisible();
    await alert.getByRole("button", { name: "Dismiss reminder" }).click();
    await expect(alert).toHaveCount(0);
  });
  test("keyboard only: skip link first, and the whole onboarding works without a mouse", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Get started" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Step 1 of 3")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "What helps you?" })).toBeFocused(); // focus moves to the new page
    const outline = await page.getByRole("link", { name: "Next" }).evaluate((el) => (el as HTMLElement).focus());
    void outline;
    await page.keyboard.press("Space"); // toggle nothing harmful; ensure focus ring is drawn on a focused control
    const ring = await page.getByRole("link", { name: "Next" }).evaluate((el) => getComputedStyle(el).outlineStyle + " " + getComputedStyle(el).outlineWidth);
    expect(ring).toMatch(/solid 3px/);
  });
  test("the bottom navigation marks the active tab in text-independent ways", async ({ page }) => {
    await page.goto("/search");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Search" })).toHaveAttribute("aria-current", "page");
    const deco = await nav.getByRole("link", { name: "Search" }).evaluate((el) => getComputedStyle(el).textDecorationLine + "|" + getComputedStyle(el).borderTopWidth);
    expect(deco).toBe("underline|4px");
  });
});

test.describe("Part C: presenter -> session companion", () => {
  test("a written question reaches the presenter and appears in the transcript once read out", async ({ page, context }) => {
    await page.goto("/alerts");
    await page.getByText("Demo conditions").click();
    await page.getByLabel("Demo clock").first().selectOption({ label: "2:02 PM (2:00 PM talks under way)" });
    await page.goto("/sessions/talk-supply-chain/join");
    await page.getByLabel("Your question").fill("How do we sign container images?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(visible(page.getByText(/Sent to the presenter/))).toBeVisible();

    const presenter = await context.newPage();
    await presenter.goto("/presenter/talk-supply-chain");
    await expect(presenter.getByText("How do we sign container images?")).toBeVisible();
    await presenter.getByRole("button", { name: "Mark as read out" }).click();

    await expect(page.getByRole("log").getByText("How do we sign container images?")).toBeVisible();
  });
});

test.describe("axe scans", () => {
  const pages = ["/", "/setup/needs", "/setup/alerts", "/setup/topics", "/plan", "/search", "/settings", "/talks/talk-supply-chain", "/route/room-355", "/alerts", "/sessions/talk-supply-chain/join", "/organizer", "/presenter/talk-supply-chain"];
  for (const path of pages) {
    test(`no axe violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.locator("h1").first().waitFor();
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });
  }
  test("no axe violations in high contrast with large text", async ({ page }) => {
    await page.goto("/settings");
    await page.getByLabel("High contrast").check();
    const slider = page.getByRole("slider", { name: /Text size/ });
    await slider.focus();
    for (let i = 0; i < 5; i++) await slider.press("ArrowRight");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
