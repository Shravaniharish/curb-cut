"use client";

import { useId } from "react";

export interface CheckboxOption {
  id: string;
  label: string;
  checked: boolean;
  hint?: string;
}

/** A labelled group of native checkboxes. Zero selections is always valid. */
export function AccessibleCheckboxGroup({
  legend,
  options,
  onChange,
}: {
  legend: string;
  options: CheckboxOption[];
  onChange: (id: string, checked: boolean) => void;
}) {
  const uid = useId();
  return (
    <fieldset>
      <legend>{legend}</legend>
      {options.map((o) => (
        <div key={o.id}>
          <label className="check">
            <input
              type="checkbox"
              checked={o.checked}
              aria-describedby={o.hint ? `${uid}-${o.id}-hint` : undefined}
              onChange={(e) => onChange(o.id, e.target.checked)}
            />
            <span>{o.label}</span>
          </label>
          {o.hint && (
            <p id={`${uid}-${o.id}-hint`} className="small muted" style={{ marginLeft: "2.25rem" }}>
              {o.hint}
            </p>
          )}
        </div>
      ))}
    </fieldset>
  );
}
