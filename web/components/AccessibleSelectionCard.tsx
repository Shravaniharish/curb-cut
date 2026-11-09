"use client";

import type { ReactNode } from "react";

export interface SelectionOption<T extends string> {
  value: T;
  title: string;
  description: string;
  preview?: ReactNode;
}

/** Single-choice cards built on native radio inputs, so arrow keys and screen-reader state work without ARIA. */
export function AccessibleSelectionCards<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T | null;
  options: SelectionOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="stack">
        {options.map((o) => (
          <label key={o.value} className="selection-card">
            <span className="choice">
              <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
              <span>
                <strong>{o.title}</strong>
                {value === o.value && <span className="selection-state"> · Selected</span>}
                <span className="small muted" style={{ display: "block" }}>
                  {o.description}
                </span>
              </span>
            </span>
            {o.preview && <div style={{ marginTop: "0.5rem" }}>{o.preview}</div>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
