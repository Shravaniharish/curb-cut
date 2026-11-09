/** Conference-local time handling. All stored instants are UTC; display and wall-clock input use America/Denver. */
import type { DemoClockState } from "./types";

export const CONFERENCE_TZ = "America/Denver";
export const CONFERENCE_DATE = "2026-11-09";

/** Offset of `tz` from UTC in minutes at the given instant (negative west of Greenwich). */
export function tzOffsetMinutes(instantMs: number, tz: string = CONFERENCE_TZ): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instantMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(instantMs / 1000) * 1000) / 60000);
}

/** Convert a wall-clock time in `tz` to a UTC ISO string. `date` is YYYY-MM-DD and `time` is HH:MM. */
export function zonedToUtcIso(date: string, time: string, tz: string = CONFERENCE_TZ): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let result = guess - tzOffsetMinutes(guess, tz) * 60000;
  // Re-check once so times near a DST change use the offset that applies at the result.
  result = guess - tzOffsetMinutes(result, tz) * 60000;
  return new Date(result).toISOString();
}

export function formatTime(iso: string, tz: string = CONFERENCE_TZ): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function formatDateLong(iso: string, tz: string = CONFERENCE_TZ): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatTimeRange(startIso: string, endIso: string | null): string {
  return endIso ? `${formatTime(startIso)} – ${formatTime(endIso)}` : formatTime(startIso);
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}

export function minutesBetween(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000;
}

/**
 * leaveBy = talkStart - estimatedTravelTime - additionalTravelBuffer. Returns a UTC ISO string.
 * Throws on invalid input so a wrong time is never shown silently.
 */
export function computeLeaveBy(talkStartIso: string, travelMinutes: number, bufferMinutes: number): string {
  if (Number.isNaN(new Date(talkStartIso).getTime())) throw new RangeError("Invalid talk start time.");
  if (!Number.isFinite(travelMinutes) || travelMinutes < 0) throw new RangeError("Invalid travel time.");
  if (!Number.isFinite(bufferMinutes) || bufferMinutes < 0) throw new RangeError("Invalid travel buffer.");
  return addMinutes(talkStartIso, -(travelMinutes + bufferMinutes));
}

// ---- Clock ----------------------------------------------------------------------------------------------

/** Demo instants offered in the demo-clock control. The production clock is never overridden unless chosen. */
export const DEMO_CLOCK_PRESETS: { id: string; label: string; time: string }[] = [
  { id: "before", label: "1:30 PM (before the 2:00 PM talks)", time: "13:30" },
  { id: "near-leave", label: "1:44 PM (close to leave-by)", time: "13:44" },
  { id: "during", label: "2:02 PM (2:00 PM talks under way)", time: "14:02" },
  { id: "between", label: "2:50 PM (between talks)", time: "14:50" },
];

export function demoClockAt(time: string, realNowMs: number = Date.now()): DemoClockState {
  return { mode: "demo", anchorDemo: zonedToUtcIso(CONFERENCE_DATE, time), anchorReal: realNowMs };
}

export const DEFAULT_DEMO_CLOCK_TIME = "13:30";

/** Current instant (epoch ms) according to the clock state. Demo time advances with real time. */
export function clockNowMs(clock: DemoClockState, realNowMs: number = Date.now()): number {
  if (clock.mode === "live") return realNowMs;
  return new Date(clock.anchorDemo).getTime() + (realNowMs - clock.anchorReal);
}

export function clockNowIso(clock: DemoClockState, realNowMs: number = Date.now()): string {
  return new Date(clockNowMs(clock, realNowMs)).toISOString();
}
