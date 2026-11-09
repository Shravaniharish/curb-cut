"use client";

/**
 * Screen 13: presenter console (laptop). Very large text, written questions oldest first. "Mark as read out" moves
 * a question to the done list, and the session companion shows it inline in the transcript.
 */
import { useId } from "react";
import { EmptyState, PageHeading, PrimaryButton } from "./ui";
import { CAPTION_LABELS } from "@/lib/accessLabels";
import { useQuestions } from "@/lib/questions";
import { useApp } from "@/lib/store";
import { formatTime } from "@/lib/time";
import { withSpan } from "@/lib/telemetry";

export function PresenterConsole({ talkId }: { talkId: string }) {
  const uid = useId();
  const { talks, nowIso } = useApp();
  const talk = talks.find((t) => t.id === talkId) ?? null;
  const { questions, markReadOut } = useQuestions(talkId);
  const waiting = questions.filter((q) => !q.readOutAt);
  const done = questions.filter((q) => q.readOutAt);

  if (!talk) {
    return (
      <EmptyState title="We can't find this talk">
        <p>Check the link from the access team.</p>
      </EmptyState>
    );
  }

  return (
    <div className="stack staff-screen presenter">
      <p className="small muted">Curb Cut · Presenter console</p>
      <PageHeading>{talk.title}</PageHeading>
      <p className="presenter-status">Captions: {CAPTION_LABELS[talk.access.captions]}</p>

      <section aria-labelledby={`${uid}-q`}>
        <h2 id={`${uid}-q`}>
          Written questions <span className="muted">({waiting.length} waiting)</span>
        </h2>
        {waiting.length === 0 ? (
          <p className="card">No written questions yet.</p>
        ) : (
          <ol className="card-list">
            {waiting.map((q) => (
              <li key={q.id} className="card presenter-question">
                <p>{q.text}</p>
                <p className="small muted">Sent at {formatTime(q.askedAt)}</p>
                <PrimaryButton onClick={() => withSpan("session.question.read_out", { talk_id: talkId }, () => markReadOut(q.id, nowIso))}>
                  Mark as read out
                </PrimaryButton>
              </li>
            ))}
          </ol>
        )}
      </section>

      {done.length > 0 && (
        <section aria-labelledby={`${uid}-done`}>
          <h2 id={`${uid}-done`}>Read out</h2>
          <ul className="card-list">
            {done.map((q) => (
              <li key={q.id} className="card">
                <p>
                  <span aria-hidden="true">✓ </span>
                  {q.text}
                </p>
                <p className="small muted">Read out at {formatTime(q.readOutAt as string)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="small muted">Questions arrive without names. Demo: they reach this screen from tabs in this browser only.</p>
    </div>
  );
}
