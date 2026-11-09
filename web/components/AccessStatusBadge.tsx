import { accessFacts } from "@/lib/accessLabels";
import type { AccessFact } from "@/lib/accessLabels";
import type { Talk } from "@/lib/types";

/** An access fact as text plus a glyph. Colour reinforces the state but never carries it alone. */
export function AccessStatusBadge({ fact, withHeading = false }: { fact: AccessFact; withHeading?: boolean }) {
  return (
    <span className="badge" data-tone={fact.tone}>
      <span aria-hidden="true">{fact.icon}</span>
      <span>
        {withHeading && fact.tone === "unknown" && (fact.key === "captions" || fact.key === "slides")
          ? `${fact.heading}: unknown`
          : withHeading && (fact.key === "captions" || fact.key === "slides")
            ? `${fact.heading}: ${fact.label}`
            : fact.label}
      </span>
    </span>
  );
}

export function AccessBadgeList({ talk, keys }: { talk: Talk; keys?: AccessFact["key"][] }) {
  const facts = accessFacts(talk).filter((f) => !keys || keys.includes(f.key));
  return (
    <ul className="badges" aria-label="Accessibility facts">
      {facts.map((f) => (
        <li key={f.key}>
          <AccessStatusBadge fact={f} withHeading />
        </li>
      ))}
    </ul>
  );
}
