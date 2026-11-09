/**
 * Agenda export. Files contain public talk information only. Quiet breaks reveal a personal preference, so they
 * are included only when the caller explicitly asks for them.
 */
import { accessFacts } from "./accessLabels";
import { roomLabel } from "./fixtures/venue";
import { CONFERENCE_TZ, formatDateLong, formatTime } from "./time";
import type { AgendaItem, Talk } from "./types";
import { talkEnd } from "./agenda";

export type ExportFormat = "ics" | "csv" | "txt";

export interface ExportOptions {
  includeBreaks?: boolean;
  /** Fixed value for tests; defaults to now. */
  now?: Date;
}

export interface ExportFile {
  filename: string;
  mime: string;
  content: string;
}

const CONFERENCE_NAME = "KubeCon (demo schedule)";
const FILE_DATE_RE = /^\d{4}-\d{2}-\d{2}/;

interface Entry {
  uid: string;
  title: string;
  startIso: string;
  endIso: string;
  location: string;
  description: string;
}

function accessLines(talk: Talk): string[] {
  return accessFacts(talk).map((f) => (f.key === "stepFree" || f.key === "frontSeating" || f.key === "quietRoom" ? f.label : `${f.heading}: ${f.label}`));
}

function entries(items: AgendaItem[], talks: Talk[], opts: ExportOptions): Entry[] {
  const byId = new Map(talks.map((t) => [t.id, t]));
  const out: Entry[] = [];
  for (const item of items) {
    if (item.kind === "talk") {
      const t = byId.get(item.talkId);
      if (!t) continue;
      out.push({
        uid: `${t.id}@curb-cut.demo`,
        title: t.title,
        startIso: t.start,
        endIso: talkEnd(t),
        location: `${roomLabel(t.roomId)}, Floor ${t.floor}`,
        description: [...(t.speaker ? [`Speaker: ${t.speaker}`] : []), ...accessLines(t), "Demo schedule: sample data, not the real program."].join("\n"),
      });
    } else if (opts.includeBreaks) {
      out.push({
        uid: `quiet-break-${item.start}@curb-cut.demo`,
        title: "Quiet break",
        startIso: item.start,
        endIso: item.end,
        location: roomLabel(item.roomId),
        description: "Quiet break",
      });
    }
  }
  return out;
}

// ---- iCalendar (RFC 5545) --------------------------------------------------------------------------------

export function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold a content line to 75 octets, continuing with a single space, without splitting a UTF-8 character. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
      limit = 74;
    }
    current += ch;
    bytes += n;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildIcs(list: Entry[], now: Date): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Curb Cut//Demo Plan//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const e of list) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${icsDate(now.toISOString())}`,
      `DTSTART:${icsDate(e.startIso)}`,
      `DTEND:${icsDate(e.endIso)}`,
      `SUMMARY:${icsEscape(e.title)}`,
      `LOCATION:${icsEscape(e.location)}`,
      `DESCRIPTION:${icsEscape(e.description)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

// ---- CSV (RFC 4180) --------------------------------------------------------------------------------------

/** Quote a field, and neutralise spreadsheet formulas by prefixing a single quote. */
export function csvField(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function buildCsv(list: Entry[]): string {
  const header = ["Title", "Date", "Start", "End", "Location", "Details"];
  const rows = list.map((e) => [
    e.title,
    new Intl.DateTimeFormat("en-CA", { timeZone: CONFERENCE_TZ }).format(new Date(e.startIso)),
    formatTime(e.startIso),
    formatTime(e.endIso),
    e.location,
    e.description.replace(/\n/g, "; "),
  ]);
  return [header, ...rows].map((r) => r.map(csvField).join(",")).join("\r\n") + "\r\n";
}

// ---- Plain text ------------------------------------------------------------------------------------------

function buildTxt(list: Entry[]): string {
  const head = [`${CONFERENCE_NAME} - my plan`, list.length ? formatDateLong(list[0].startIso) : "", ""];
  const body = list.flatMap((e) => [
    `${formatTime(e.startIso)} - ${formatTime(e.endIso)}  ${e.title}`,
    `  ${e.location}`,
    ...e.description.split("\n").map((l) => `  ${l}`),
    "",
  ]);
  return [...head, ...body].join("\n").trimEnd() + "\n";
}

export class EmptyAgendaError extends Error {
  constructor() {
    super("Your plan is empty. Add a talk before exporting.");
    this.name = "EmptyAgendaError";
  }
}

export function filenameFor(list: { startIso: string }[], format: ExportFormat, single?: string): string {
  const day = list.length ? new Intl.DateTimeFormat("en-CA", { timeZone: CONFERENCE_TZ }).format(new Date(list[0].startIso)) : "plan";
  const base = single ? `curb-cut-${single.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}` : `curb-cut-plan-${day}`;
  if (!FILE_DATE_RE.test(day) && day !== "plan") throw new RangeError("Invalid date for filename.");
  return `${base}.${format}`;
}

const MIME: Record<ExportFormat, string> = {
  ics: "text/calendar;charset=utf-8",
  csv: "text/csv;charset=utf-8",
  txt: "text/plain;charset=utf-8",
};

export function exportAgenda(items: AgendaItem[], talks: Talk[], format: ExportFormat, opts: ExportOptions = {}): ExportFile {
  const list = entries(items, talks, opts);
  if (list.length === 0) throw new EmptyAgendaError();
  const content = format === "ics" ? buildIcs(list, opts.now ?? new Date()) : format === "csv" ? buildCsv(list) : buildTxt(list);
  return { filename: filenameFor(list, format), mime: MIME[format], content };
}

export function exportTalk(talk: Talk, format: ExportFormat = "ics", opts: ExportOptions = {}): ExportFile {
  const item: AgendaItem = { kind: "talk", talkId: talk.id, order: 0, userAdded: false, isBackup: false };
  const list = entries([item], [talk], opts);
  const content = format === "ics" ? buildIcs(list, opts.now ?? new Date()) : format === "csv" ? buildCsv(list) : buildTxt(list);
  return { filename: filenameFor(list, format, talk.title), mime: MIME[format], content };
}

/** Browser-only: trigger a download. A UTF-8 BOM is added to CSV so spreadsheet apps read accents correctly. */
export function downloadFile(file: ExportFile): void {
  const bom = file.mime.startsWith("text/csv") ? "\uFEFF" : "";
  const url = URL.createObjectURL(new Blob([bom + file.content], { type: file.mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = file.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
