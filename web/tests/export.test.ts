import { describe, expect, it } from "vitest";
import { EmptyAgendaError, csvField, exportAgenda, exportTalk, foldLine, icsEscape } from "@/lib/export";
import { DEMO_TALKS } from "@/lib/fixtures/talks";
import type { AgendaItem } from "@/lib/types";

const now = new Date("2026-11-09T18:00:00Z");
const talkItems: AgendaItem[] = [
  { kind: "talk", talkId: "talk-supply-chain", order: 0, userAdded: false, isBackup: false },
  { kind: "talk", talkId: "talk-observability", order: 1, userAdded: false, isBackup: false },
];
const breakItem: AgendaItem = { kind: "break", breakKind: "quiet", roomId: "quiet-room-2", start: "2026-11-09T21:44:00.000Z", end: "2026-11-09T21:56:00.000Z", order: 2, userAdded: false };

describe("ics", () => {
  const f = exportAgenda(talkItems, DEMO_TALKS, "ics", { now });
  it("is a valid calendar with CRLF line endings and correct UTC times for Denver 2 PM", () => {
    expect(f.content.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(f.content.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(f.content).toContain("DTSTART:20261109T210000Z");
    expect(f.content).toContain("DTEND:20261109T214000Z");
    expect(f.content).toContain("DTSTAMP:20261109T180000Z");
    expect(f.content.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(f.content).not.toMatch(/[^\r]\n/);
  });
  it("escapes text and folds long lines at 75 octets", () => {
    expect(icsEscape("a,b;c\\d\nz")).toBe("a\\,b\;c\\\\d\\nz");
    const folded = foldLine("X:" + "é".repeat(80));
    for (const line of folded.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(folded.split("\r\n").map((l, i) => (i ? l.slice(1) : l)).join("")).toBe("X:" + "é".repeat(80));
  });
  it("has a useful filename and mime type", () => {
    expect(f.filename).toBe("curb-cut-plan-2026-11-09.ics");
    expect(f.mime).toContain("text/calendar");
  });
  it("includes public access facts and says the data is a demo", () => {
    expect(f.content).toContain("Live captioner");
    expect(f.content).toContain("Demo schedule");
  });
});

describe("csv and txt", () => {
  it("quotes fields and neutralises spreadsheet formulas", () => {
    expect(csvField('He said "hi", ok')).toBe('"He said ""hi"", ok"');
    expect(csvField("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvField("@x")).toBe("'@x");
    expect(csvField("plain")).toBe("plain");
  });
  it("writes a header and one row per talk with conference-local times", () => {
    const f = exportAgenda(talkItems, DEMO_TALKS, "csv", { now });
    const lines = f.content.trimEnd().split("\r\n");
    expect(lines[0]).toBe("Title,Date,Start,End,Location,Details");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("2026-11-09,2:00 PM,2:40 PM,\"Room 355, Floor 3\"");
    expect(f.filename).toBe("curb-cut-plan-2026-11-09.csv");
  });
  it("writes readable plain text", () => {
    const f = exportAgenda(talkItems, DEMO_TALKS, "txt", { now });
    expect(f.content).toContain("Monday, November 9, 2026");
    expect(f.content).toContain("2:00 PM - 2:40 PM  Securing Your Supply Chain Without Slowing Down");
  });
});

describe("privacy and edge cases", () => {
  it("leaves quiet breaks out unless explicitly requested", () => {
    const items = [...talkItems, breakItem];
    expect(exportAgenda(items, DEMO_TALKS, "ics", { now }).content).not.toContain("Quiet break");
    expect(exportAgenda(items, DEMO_TALKS, "ics", { now, includeBreaks: true }).content).toContain("Quiet break");
  });
  it("rejects an empty agenda with a clear error", () => {
    expect(() => exportAgenda([], DEMO_TALKS, "ics")).toThrow(EmptyAgendaError);
    expect(() => exportAgenda([breakItem], DEMO_TALKS, "ics")).toThrow("Your plan is empty");
  });
  it("exports one talk for 'Add to calendar'", () => {
    const f = exportTalk(DEMO_TALKS[1], "ics", { now });
    expect(f.filename).toBe("curb-cut-observability-for-beginners.ics");
    expect(f.content.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });
});
