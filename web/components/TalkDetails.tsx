"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { AccessStatusBadge } from "@/components/AccessStatusBadge";
import { TalkCard } from "@/components/TalkCard";
import { ErrorState, PageHeading, PrimaryButton, SecondaryButton } from "@/components/ui";
import { WaitForState } from "@/components/WaitForState";
import { accessFacts } from "@/lib/accessLabels";
import { agendaTalks, checkRequirements, conflictsWith, whyFits } from "@/lib/agenda";
import { downloadFile, exportTalk } from "@/lib/export";
import { roomLabel } from "@/lib/fixtures/venue";
import { ROUTES } from "@/lib/routes";
import { useApp } from "@/lib/store";
import { formatDateLong, formatTimeRange } from "@/lib/time";

function Details({ talkId }: { talkId: string }) {
  const uid = useId();
  const { talks, state, agenda, graph, selectTalk, setCurrentRoute, addToPlan, removeFromPlan } = useApp();
  const [message, setMessage] = useState("");
  const talk = talks.find((t) => t.id === talkId);
  if (!talk) {
    return (
      <div className="stack">
        <PageHeading>Talk not found</PageHeading>
        <ErrorState title="We could not find that talk">
          <p>It may have been removed, or the link may be wrong.</p>
        </ErrorState>
        <PrimaryButton href={ROUTES.plan}>Back to my plan</PrimaryButton>
      </div>
    );
  }
  const prefs = state.prefs;
  const req = checkRequirements(talk, prefs);
  const planned = agendaTalks(agenda.items, talks);
  const inPlan = planned.some((t) => t.id === talk.id);
  const clashes = inPlan ? [] : conflictsWith(talk, planned, graph, prefs);
  const why = whyFits(talk, prefs);
  const backups = talk.backupTalkIds.map((id) => talks.find((t) => t.id === id)).filter((t) => t !== undefined);
  const sampleFields = talk.provenance.sampleFields;

  return (
    <div className="stack">
      <PageHeading>{talk.title}</PageHeading>
      <p className="muted">
        {talk.speaker ? `Speaker: ${talk.speaker}` : "Speaker not listed"}
      </p>
      <section className="card" aria-labelledby={`${uid}-when-heading`}>
        <h2 id={`${uid}-when-heading`}>When and where</h2>
        <p style={{ marginBottom: 0 }}>
          {formatDateLong(talk.start)}
          <br />
          {formatTimeRange(talk.start, talk.end)}
          <br />
          {roomLabel(talk.roomId)} · Floor {talk.floor}
        </p>
      </section>

      {!req.eligible && (
        <div role="note" className="status-note">
          <strong>This talk does not confirm what you marked as required:</strong> {req.unmet.join("; ")}.
        </div>
      )}

      <section className="card" aria-labelledby={`${uid}-why-heading`}>
        <h2 id={`${uid}-why-heading`}>Why it fits you</h2>
        <p style={{ marginBottom: 0 }}>{why.length ? `${why.join(". ")}.` : "Nothing in your choices rules it out. Choose topics and needs in Settings for a closer match."}</p>
      </section>

      <section className="card" aria-labelledby={`${uid}-access-heading`}>
        <h2 id={`${uid}-access-heading`}>Accessibility facts</h2>
        <dl style={{ margin: 0 }}>
          {accessFacts(talk).map((f) => (
            <div key={f.key} style={{ marginBottom: "0.5rem" }}>
              <dt className="small muted">{f.heading}</dt>
              <dd style={{ margin: 0 }}>
                <AccessStatusBadge fact={f} />
              </dd>
            </div>
          ))}
        </dl>
        <p className="small muted">Unknown means the information has not been provided. It does not mean the feature is missing.</p>
      </section>

      <section className="card" aria-labelledby={`${uid}-sensory-heading`}>
        <h2 id={`${uid}-sensory-heading`}>Sensory notes</h2>
        <p style={{ marginBottom: "0.25rem" }}>{talk.sensoryNotes.text ?? "No sensory notes have been provided for this talk."}</p>
        {talk.sensoryNotes.text && <p className="small muted">Demo-provided information, not independently verified.</p>}
      </section>

      <section className="card" aria-labelledby={`${uid}-backup-heading`}>
        <h2 id={`${uid}-backup-heading`}>Backup talk</h2>
        {backups.length === 0 ? (
          <p style={{ marginBottom: 0 }}>No backup talk is listed.</p>
        ) : (
          <ul className="card-list">
            {backups.map((b) => (
              <li key={b.id}>
                <TalkCard talk={b} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {clashes.length > 0 && (
        <p className="status-note" role="note">
          Adding this would clash with {clashes.map((c) => c.title).join(", ")} (time or travel).
        </p>
      )}

      <div className="stack">
        <PrimaryButton
          href={ROUTES.route(talk.roomId)}
          onClick={() => {
            selectTalk(talk.id);
            setCurrentRoute({ fromId: state.currentLocationId, toId: talk.roomId, talkId: talk.id });
          }}
        >
          Take me there
        </PrimaryButton>
        <SecondaryButton href={ROUTES.joinSession(talk.id)}>Join session</SecondaryButton>
        <SecondaryButton
          onClick={() => {
            const file = exportTalk(talk, "ics");
            downloadFile(file);
            setMessage(`Downloaded ${file.filename}.`);
          }}
        >
          Add to calendar
        </SecondaryButton>
        {inPlan ? (
          state.agendaOverrides.added.includes(talk.id) ? (
            <SecondaryButton onClick={() => removeFromPlan(talk.id)}>Remove from my plan</SecondaryButton>
          ) : (
            <p className="small muted">This talk is in your plan.</p>
          )
        ) : (
          <SecondaryButton onClick={() => addToPlan(talk.id)}>Add to my plan</SecondaryButton>
        )}
        <div role="status" aria-live="polite">{message}</div>
      </div>

      <p className="small muted">
        Demo data ({talk.provenance.source}). Sample values: {sampleFields.length ? sampleFields.join(", ") : "none"}. Not a verified record.
      </p>
      <p>
        <Link href={ROUTES.plan}>Back to my plan</Link>
      </p>
    </div>
  );
}

export function TalkDetails({ talkId }: { talkId: string }) {
  return (
    <WaitForState>
      <Details talkId={talkId} />
    </WaitForState>
  );
}
