import { describe, expect, it } from "vitest";
import { clockNowMs, computeLeaveBy, demoClockAt, formatTime, tzOffsetMinutes, zonedToUtcIso } from "@/lib/time";

describe("conference time (America/Denver)", () => {
  it("converts Denver wall time to UTC using MST on conference day", () => {
    expect(zonedToUtcIso("2026-11-09", "14:00")).toBe("2026-11-09T21:00:00.000Z");
  });
  it("uses MDT in summer and respects the November DST change", () => {
    expect(zonedToUtcIso("2026-07-01", "14:00")).toBe("2026-07-01T20:00:00.000Z");
    expect(zonedToUtcIso("2026-10-31", "12:00")).toBe("2026-10-31T18:00:00.000Z");
    expect(zonedToUtcIso("2026-11-01", "12:00")).toBe("2026-11-01T19:00:00.000Z");
  });
  it("reports the offset for a given instant", () => {
    expect(tzOffsetMinutes(Date.parse("2026-11-09T21:00:00Z"))).toBe(-420);
    expect(tzOffsetMinutes(Date.parse("2026-07-01T20:00:00Z"))).toBe(-360);
  });
  it("formats in conference time regardless of the machine zone", () => {
    expect(formatTime("2026-11-09T21:00:00.000Z")).toBe("2:00 PM");
  });
});

describe("leave-by", () => {
  it("matches the demo: 2:00 PM talk, 6 min trip, 6 min buffer -> 1:48 PM", () => {
    const leave = computeLeaveBy(zonedToUtcIso("2026-11-09", "14:00"), 6, 6);
    expect(formatTime(leave)).toBe("1:48 PM");
  });
  it("rejects invalid input instead of showing a wrong time", () => {
    expect(() => computeLeaveBy("not a date", 6, 6)).toThrow(RangeError);
    expect(() => computeLeaveBy("2026-11-09T21:00:00Z", -1, 6)).toThrow(RangeError);
    expect(() => computeLeaveBy("2026-11-09T21:00:00Z", 6, Number.NaN)).toThrow(RangeError);
  });
});

describe("demo clock", () => {
  it("starts at the chosen time and advances with real time", () => {
    const clock = demoClockAt("13:30", 1_000_000);
    expect(formatTime(new Date(clockNowMs(clock, 1_000_000)).toISOString())).toBe("1:30 PM");
    expect(formatTime(new Date(clockNowMs(clock, 1_000_000 + 15 * 60000)).toISOString())).toBe("1:45 PM");
  });
  it("live mode returns the real time untouched", () => {
    expect(clockNowMs({ mode: "live" }, 12345)).toBe(12345);
  });
});
