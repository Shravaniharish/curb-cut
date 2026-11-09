"use client";

/**
 * A short list of large choices, one per line: icon, label and one plain line underneath. Used by "My plans changed"
 * and by the report screen, so both feel the same. Real buttons, so Tab and Enter work with no extra ARIA.
 */
import type { ReactNode } from "react";

export interface BigChoice<T extends string> {
  value: T;
  label: string;
  detail?: string;
  /** Text glyph. Always next to the words, never on its own. */
  icon?: string;
}

export function BigChoiceList<T extends string>({
  legend,
  choices,
  onChoose,
  selected,
  footer,
}: {
  legend: string;
  choices: BigChoice<T>[];
  onChoose: (value: T) => void;
  /** Marks the current choice in words as well as in style. */
  selected?: T | null;
  footer?: ReactNode;
}) {
  return (
    <div role="group" aria-label={legend} className="stack">
      <ul className="card-list">
        {choices.map((choice) => (
          <li key={choice.value}>
            <button type="button" className="big-choice" onClick={() => onChoose(choice.value)} aria-pressed={selected !== undefined ? selected === choice.value : undefined}>
              <span className="big-choice-label">
                {choice.icon && (
                  <span aria-hidden="true" className="big-choice-icon">
                    {choice.icon}
                  </span>
                )}
                <span>
                  <strong>{choice.label}</strong>
                  {selected === choice.value && <span className="selection-state"> · Chosen</span>}
                  {choice.detail && (
                    <span className="small muted" style={{ display: "block" }}>
                      {choice.detail}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {footer}
    </div>
  );
}
