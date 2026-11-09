/**
 * Live mode: the real API and the web app together. Skipped unless the API is running (freshly started: it keeps
 * state in memory) and the web app was started with NEXT_PUBLIC_API_URL and NEXT_PUBLIC_API_MODE=live:
 *
 *   (cd api && uvicorn app.main:app --port 8000)
 *   NEXT_PUBLIC_API_URL=http://localhost:8000 NEXT_PUBLIC_API_MODE=live LIVE_E2E=1 npx playwright test e2e/live.spec.ts
 */
import { expect, test } from "@playwright/test";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
test.skip(!process.env.LIVE_E2E, "needs the API running and the web app in live mode");

test("organizer announces Elevator B down; Marcus gets the new route; the organizer sees an anonymous count", async ({ browser, request }) => {
  // A clean venue: the API starts with Elevator B already out of service.
  await request.post(`${API}/api/changes`, { data: { type: "elevator_fixed", target: "B" } });

  const attendeeContext = await browser.newContext();
  const attendee = await attendeeContext.newPage();
  await attendee.goto("/");
  await attendee.getByText("Demo attendees (for demonstrations)").click();
  await attendee.getByRole("button", { name: "Use Marcus's demo needs" }).click();
  await expect(attendee.getByRole("heading", { level: 1, name: "Your plan" })).toBeVisible();

  const organizerContext = await browser.newContext();
  const organizer = await organizerContext.newPage();
  await organizer.goto("/organizer");
  await expect(organizer.getByText(/From the Curb Cut API/)).toBeVisible();
  await organizer.getByRole("button", { name: "Elevator down" }).click();
  await organizer.getByLabel("Which elevator?").selectOption("B");
  await organizer.getByRole("button", { name: "Announce change" }).click();

  const alert = attendee.getByRole("dialog", { name: "Plan changed" });
  await expect(alert).toBeVisible({ timeout: 15_000 });
  await expect(alert.getByText("Elevator B is not working.")).toBeVisible();
  // With Elevator B working, Marcus's plan starts in Ballroom E (closest step-free Security talk), so the API
  // re-plans that trip around B. The exact wording comes from the API's planner, which has its own tests.
  await expect(alert.getByText("Your talk is still at 2:00 PM in Ballroom E.")).toBeVisible();
  await expect(alert.getByText(/^Use Elevator A\. Leave by 1:47 PM\. 7 minutes, step-free\.$/)).toBeVisible();
  await expect(alert.getByText(/Simulated demo condition/)).toHaveCount(0); // this one came from the API

  await expect(organizer.getByText(/Elevator B down · 1 affected · 1 re-planned/)).toBeVisible({ timeout: 15_000 });

  await alert.getByRole("link", { name: "Show new route" }).click();
  await expect(attendee).toHaveURL(/\/route\/ballroom-e$/);
  await expect(attendee.getByRole("list", { name: "Directions" })).not.toContainText("Elevator B");

  await request.post(`${API}/api/changes`, { data: { type: "elevator_fixed", target: "B" } });
  await attendeeContext.close();
  await organizerContext.close();
});

test("two reports from different phones mark the elevator down; one phone alone does not", async ({ request }) => {
  await request.post(`${API}/api/changes`, { data: { type: "elevator_fixed", target: "C" } });
  const body = (device: string) => ({ problem: "elevator_not_working", location_id: "elevator-C", device_token: device });
  const first = await (await request.post(`${API}/api/reports`, { data: body("e2e-device-0001") })).json();
  expect(first.confirmed).toBe(false);
  const second = await (await request.post(`${API}/api/reports`, { data: body("e2e-device-0002") })).json();
  expect(second.confirmed).toBe(true);
  const venue = await (await request.get(`${API}/api/venue`)).json();
  expect(venue.elevators.C).toBe("out_of_service");
  await request.post(`${API}/api/changes`, { data: { type: "elevator_fixed", target: "C" } });
});
