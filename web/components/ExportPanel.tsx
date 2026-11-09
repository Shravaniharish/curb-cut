"use client";

import { useId, useState } from "react";
import { EmptyAgendaError, downloadFile, exportAgenda } from "@/lib/export";
import type { ExportFormat } from "@/lib/export";
import { agendaTalks } from "@/lib/agenda";
import { useApp } from "@/lib/store";
import { SecondaryButton } from "./ui";

const FORMATS: { id: ExportFormat; label: string }[] = [
  { id: "ics", label: "Calendar (.ics)" },
  { id: "csv", label: "Spreadsheet (.csv)" },
  { id: "txt", label: "Plain text (.txt)" },
];

export function ExportPanel() {
  const uid = useId();
  const { agenda, talks } = useApp();
  const [includeBreaks, setIncludeBreaks] = useState(false);
  const [message, setMessage] = useState("");
  const empty = agendaTalks(agenda.items, talks).length === 0;
  const hasBreaks = agenda.items.some((i) => i.kind === "break");

  function run(format: ExportFormat) {
    try {
      const file = exportAgenda(agenda.items, talks, format, { includeBreaks });
      downloadFile(file);
      setMessage(`Downloaded ${file.filename}.`);
    } catch (e) {
      setMessage(e instanceof EmptyAgendaError ? e.message : "The file could not be created.");
    }
  }

  return (
    <section aria-labelledby={`${uid}-export-heading`} className="card stack">
      <h2 id={`${uid}-export-heading`}>Export plan</h2>
      <p className="small muted">Files list talk times and rooms only. Your needs and preferences are never included.</p>
      {hasBreaks && (
        <label className="check">
          <input type="checkbox" checked={includeBreaks} onChange={(e) => setIncludeBreaks(e.target.checked)} />
          <span>Include my quiet breaks (this shows a personal preference to anyone you share the file with)</span>
        </label>
      )}
      <div className="row">
        {FORMATS.map((f) => (
          <SecondaryButton key={f.id} disabled={empty} onClick={() => run(f.id)}>
            {f.label}
          </SecondaryButton>
        ))}
      </div>
      {empty && <p className="small">Your plan is empty. Add a talk before exporting.</p>}
      <div role="status" aria-live="polite">
        {message}
      </div>
    </section>
  );
}
