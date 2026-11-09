/**
 * The three-part change block: what changed, what stays the same, what to do now. Every alert in Curb Cut uses it,
 * so nobody has to work out what is still true. "What to do now" is the largest of the three.
 */
import type { ReactNode } from "react";

export interface ThreeParts {
  whatChanged: string;
  whatStays: string;
  doNow: string;
}

const PART_LABELS = ["What changed", "What stays the same", "What to do now"] as const;

export function ThreePartChangeBlock({
  parts,
  size = "normal",
  heading = "h3",
  footer,
}: {
  parts: ThreeParts;
  /** "large" is used for the vibrate-and-big-text alert style. */
  size?: "normal" | "large";
  heading?: "h2" | "h3";
  footer?: ReactNode;
}) {
  const H = heading;
  const values = [parts.whatChanged, parts.whatStays, parts.doNow];
  return (
    <div className="three-part" data-size={size}>
      {PART_LABELS.map((label, i) => (
        <section key={label} className="three-part-section" data-part={i === 2 ? "do-now" : undefined}>
          <H className="three-part-label">{label}</H>
          <p className="three-part-text">{values[i]}</p>
        </section>
      ))}
      {footer}
    </div>
  );
}

/** One part on its own, for the calm "one step at a time" style. */
export function ThreePartStep({
  parts,
  index,
  heading = "h2",
}: {
  parts: ThreeParts;
  /** 0, 1 or 2. */
  index: 0 | 1 | 2;
  heading?: "h2" | "h3";
}) {
  const H = heading;
  const values = [parts.whatChanged, parts.whatStays, parts.doNow];
  return (
    <div className="three-part calm">
      <p className="progress">Step {index + 1} of {PART_LABELS.length}</p>
      <section className="three-part-section" data-part={index === 2 ? "do-now" : undefined}>
        <H className="three-part-label">{PART_LABELS[index]}</H>
        <p className="three-part-text">{values[index]}</p>
      </section>
    </div>
  );
}

export const THREE_PART_LABELS = PART_LABELS;
