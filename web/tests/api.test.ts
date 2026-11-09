import { describe, expect, it, vi } from "vitest";
import { ApiError, alertFromApi, apiFetch, toProfilePayload } from "@/lib/api";
import { DEMO_PERSONAS } from "@/lib/fixtures/personas";
import { sanitizeAlerts } from "@/lib/preferences";

const marcus = DEMO_PERSONAS[0].prefs;

describe("toProfilePayload", () => {
  it("sends only the fields the planner needs", () => {
    const withExtras = { ...marcus, pronouns: "they/them", approach: "please_dont_approach" as const };
    const payload = toProfilePayload(withExtras);
    expect(Object.keys(payload).sort()).toEqual(["extraTravelTime", "notificationStyle", "preferences", "required", "topics"]);
    const text = JSON.stringify(payload);
    expect(text).not.toContain("they/them");
    expect(text).not.toContain("please_dont_approach");
    expect(text).not.toContain("textScale");
  });
});

describe("apiFetch", () => {
  const ok = (body: unknown, status = 200) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

  it("returns JSON and sets the JSON header only when there is a body", async () => {
    const fetchImpl = ok({ hello: "world" });
    expect(await apiFetch("/x", { method: "POST", body: "{}" }, fetchImpl)).toEqual({ hello: "world" });
    const headers = new Headers((fetchImpl.mock.calls[0][1] as RequestInit).headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.has("Cookie")).toBe(false);
  });

  it("turns an API error into its plain message", async () => {
    const err = (await apiFetch("/x", {}, ok({ detail: "Pick Elevator A, B or C." }, 422)).catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("Pick Elevator A, B or C.");
    expect(err.status).toBe(422);
  });

  it("says the service could not be reached instead of leaking a network error", async () => {
    const err = (await apiFetch("/x", {}, vi.fn().mockRejectedValue(new TypeError("fetch failed"))).catch((e: unknown) => e)) as ApiError;
    expect(err.message).toBe("The Curb Cut service could not be reached.");
    expect(err.status).toBeNull();
  });

  it("handles 204 with no body", async () => {
    expect(await apiFetch("/x", {}, vi.fn().mockResolvedValue(new Response(null, { status: 204 })))).toBeUndefined();
  });
});

describe("alertFromApi", () => {
  const apiAlert = {
    kind: "elevator_down" as const,
    origin: "event" as const,
    what_changed: "Elevator B is not working.",
    what_stays: "Your talk is still at 2:00 PM in Room 355.",
    do_now: "Use Elevator C. Leave by 1:48 PM. 6 minutes, step-free.",
    destination_room_id: "room-355",
    leave_by: "2026-11-09T13:48:00-07:00",
    talk_id: "talk-supply-chain",
    transcript_talk_id: null,
  };

  it("keeps all three parts and normalises the leave-by time to UTC", () => {
    const draft = alertFromApi(apiAlert);
    expect(draft).toMatchObject({ whatChanged: apiAlert.what_changed, whatStays: apiAlert.what_stays, doNow: apiAlert.do_now });
    expect(draft.leaveByIso).toBe("2026-11-09T20:48:00.000Z");
    expect(draft.simulated).toBe(false);
  });

  it("produces a draft the alert history accepts", () => {
    const stored = { ...alertFromApi(apiAlert), id: "a1", createdAt: "2026-11-09T20:30:00.000Z", acknowledgedAt: null };
    expect(sanitizeAlerts([stored])).toHaveLength(1);
    expect(sanitizeAlerts([{ ...stored, kind: "path_cleared" }])).toHaveLength(1);
  });
});
