import Link from "next/link";
import type { ReactNode } from "react";
import { roomLabel } from "@/lib/fixtures/venue";
import { ROUTES } from "@/lib/routes";
import { formatTimeRange } from "@/lib/time";
import type { Talk } from "@/lib/types";
import { AccessBadgeList } from "./AccessStatusBadge";

export function TalkCard({ talk, why, heading = "h3", children }: { talk: Talk; why?: string[]; heading?: "h2" | "h3"; children?: ReactNode }) {
  const H = heading;
  return (
    <article className="card">
      <H>
        <Link href={ROUTES.talk(talk.id)}>{talk.title}</Link>
      </H>
      <p className="muted" style={{ marginBottom: 0 }}>
        {formatTimeRange(talk.start, talk.end)} · {roomLabel(talk.roomId)} · Floor {talk.floor}
      </p>
      <AccessBadgeList talk={talk} keys={["stepFree", "captions", "slides", "frontSeating"]} />
      {why && (
        <p className="small" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
          <strong>Why this fits you:</strong>{" "}
          {why.length > 0 ? `${why.join(". ")}.` : "Nothing in your choices rules it out."}
        </p>
      )}
      {children}
    </article>
  );
}
