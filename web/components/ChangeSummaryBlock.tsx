import type { ReactNode } from "react";

/** Amber "something changed" block. Shared with Part B; the label keeps simulated conditions honest. */
export function ChangeSummaryBlock({ title, children, simulated = false }: { title: string; children: ReactNode; simulated?: boolean }) {
  return (
    <section className="card changed" aria-label={title}>
      <h2 style={{ fontSize: "1.125rem" }}>
        <span aria-hidden="true">⚠ </span>
        {title}
      </h2>
      {children}
      {simulated && <p className="small muted">Simulated demo condition, not live venue data.</p>}
    </section>
  );
}
