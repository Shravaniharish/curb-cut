"use client";

/**
 * Screen 10: session companion. Live transcript replayed on the demo clock, pause, back 30 seconds, catch me up,
 * text size, and a written question for the presenter. No sound and no animation: the only movement is keeping
 * the newest line in view, which is instant when reduced motion is on.
 */
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AccessStatusBadge } from "./AccessStatusBadge";
import { Dialog } from "./Dialog";
import { EmptyState, PageHeading, PrimaryButton, SecondaryButton } from "./ui";
import { accessFacts } from "@/lib/accessLabels";
import { transcriptFor } from "@/lib/fixtures/transcripts";
import { roomLabel } from "@/lib/fixtures/venue";
import { TEXT_SCALE_MAX, TEXT_SCALE_MIN, TEXT_SCALE_STEP } from "@/lib/preferences";
import { QUESTION_MAX_LENGTH, useQuestions } from "@/lib/questions";
import { ROUTES } from "@/lib/routes";
import { buildFeed, catchUp, elapsedSec, formatElapsed, jumpBack, linesAt, spokenElapsed } from "@/lib/session";
import { useApp } from "@/lib/store";
import { clockNowIso, formatTime } from "@/lib/time";
import { withSpan } from "@/lib/telemetry";

/** The store's clock ticks every 5 s; the transcript needs a finer clock so lines arrive when they are said. */
function useSecondClock(): string {
  const { state, nowIso } = useApp();
  const [now, setNow] = useState(nowIso);
  useEffect(() => {
    const tick = () => setNow(clockNowIso(state.demoClock));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.demoClock]);
  return now;
}

export function SessionCompanion({ talkId }: { talkId: string }) {
  const uid = useId();
  const { talks, graph, state, updatePrefs } = useApp();
  const talk = talks.find((t) => t.id === talkId) ?? null;
  const nowIso = useSecondClock();
  const { questions, ask } = useQuestions(talkId);
  const chunks = useMemo(() => transcriptFor(talkId), [talkId]);
  const feed = useMemo(() => (talk ? buildFeed(chunks, questions, talk.start) : []), [chunks, questions, talk]);

  // null = following live. A number = held at that many seconds into the talk.
  const [heldAt, setHeldAt] = useState<number | null>(null);
  const [announce, setAnnounce] = useState(false);
  const [catchUpOpen, setCatchUpOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<"idle" | "sent" | "failed">("idle");
  const logRef = useRef<HTMLOListElement>(null);

  const liveSec = talk ? elapsedSec(talk.start, nowIso) : 0;
  const viewSec = heldAt ?? liveSec;
  const shown = linesAt(feed, viewSec);
  const waiting = heldAt === null ? 0 : linesAt(feed, liveSec).length - shown.length;

  // Keep the newest line in view while following live.
  useEffect(() => {
    if (heldAt !== null) return;
    const last = logRef.current?.lastElementChild;
    const reduce = state.prefs.display.reducedMotion || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    last?.scrollIntoView?.({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [shown.length, heldAt, state.prefs.display.reducedMotion]);

  if (!talk) {
    return (
      <EmptyState title="We can't find this session" actions={<SecondaryButton href={ROUTES.plan}>Back to my plan</SecondaryButton>}>
        <p>It may have been removed from the demo schedule.</p>
      </EmptyState>
    );
  }

  const captions = accessFacts(talk).find((f) => f.key === "captions");
  const started = liveSec >= 0;
  const scale = state.prefs.display.textScale;
  const setScale = (next: number) =>
    updatePrefs((p) => {
      p.display.textScale = Math.round(Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, next)) * 10) / 10;
    });
  const bullets = catchUp(feed, viewSec);

  const send = () => {
    const ok = withSpan("session.question.ask", { talk_id: talkId }, () => ask(draft, nowIso));
    setSent(ok ? "sent" : "failed");
    if (ok) setDraft("");
  };

  return (
    <div className="stack">
      <p>
        <Link href={ROUTES.talk(talk.id)}>
          <span aria-hidden="true">← </span>Back to talk details
        </Link>
      </p>
      <PageHeading>{talk.title}</PageHeading>
      <p className="muted">
        {formatTime(talk.start)} · {roomLabel(talk.roomId, graph)}
      </p>
      {captions && (
        <ul className="badges" aria-label="Captions">
          <li>
            <AccessStatusBadge fact={captions} withHeading />
          </li>
        </ul>
      )}
      <p className="status-note small" role="note">
        Demo transcript: sample lines replayed on the demo clock, not a live captioner.
      </p>

      <div className="row" role="group" aria-label="Transcript controls">
        {heldAt === null ? (
          <SecondaryButton onClick={() => setHeldAt(liveSec)} disabled={!started}>
            Pause
          </SecondaryButton>
        ) : (
          <PrimaryButton onClick={() => setHeldAt(null)}>Resume</PrimaryButton>
        )}
        <SecondaryButton onClick={() => setHeldAt(jumpBack(viewSec))} disabled={!started}>
          Back 30 seconds
        </SecondaryButton>
        <SecondaryButton onClick={() => setScale(scale - TEXT_SCALE_STEP)} disabled={scale <= TEXT_SCALE_MIN} aria-describedby={`${uid}-size`}>
          A- <span className="sr-only">Smaller text</span>
        </SecondaryButton>
        <SecondaryButton onClick={() => setScale(scale + TEXT_SCALE_STEP)} disabled={scale >= TEXT_SCALE_MAX} aria-describedby={`${uid}-size`}>
          A+ <span className="sr-only">Larger text</span>
        </SecondaryButton>
        <span id={`${uid}-size`} className="small muted">
          Text size {Math.round(scale * 100)}%
        </span>
      </div>
      <label className="choice">
        <input type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} />
        <span>Read new lines aloud (with your screen reader)</span>
      </label>

      {heldAt !== null && (
        <div className="status-note" role="status">
          <p>
            Paused at {formatElapsed(heldAt)}. {waiting} new {waiting === 1 ? "line" : "lines"} waiting.
          </p>
          <SecondaryButton onClick={() => setHeldAt(null)}>Resume live</SecondaryButton>
        </div>
      )}

      <section aria-labelledby={`${uid}-tx`}>
        <h2 id={`${uid}-tx`}>Transcript</h2>
        {!started ? (
          <p className="card">This talk starts at {formatTime(talk.start)}. Lines will appear here when it begins.</p>
        ) : shown.length === 0 ? (
          <p className="card">Waiting for the first line…</p>
        ) : (
          <ol
            ref={logRef}
            className="transcript"
            role="log"
            aria-live={announce && heldAt === null ? "polite" : "off"}
            aria-label="Live transcript, newest line last"
          >
            {shown.map((l) => (
              <li key={l.key} className={l.kind === "question" ? "transcript-question" : undefined}>
                <span className="small muted">{formatElapsed(l.offsetSec)} </span>
                <strong>{l.speaker}:</strong> {l.text}
              </li>
            ))}
          </ol>
        )}
        {started && (
          <SecondaryButton onClick={() => setCatchUpOpen(true)}>Catch me up</SecondaryButton>
        )}
      </section>

      <section aria-labelledby={`${uid}-ask`} className="card">
        <h2 id={`${uid}-ask`}>Ask a question in writing</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label className="field" htmlFor={`${uid}-q`}>
            Your question
          </label>
          <textarea
            id={`${uid}-q`}
            rows={3}
            maxLength={QUESTION_MAX_LENGTH}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setSent("idle");
            }}
          />
          <p className="small muted">Your question is sent without your name.</p>
          <PrimaryButton type="submit" disabled={!draft.trim()}>
            Send
          </PrimaryButton>
        </form>
        <div role="status">
          {sent === "sent" && <p>Sent to the presenter. You&apos;ll see it here when it&apos;s read out.</p>}
          {sent === "failed" && <p className="error-box">Not sent: this browser could not save it. Try again, or raise your hand.</p>}
        </div>
      </section>

      <Dialog open={catchUpOpen} title="Catch me up" onClose={() => setCatchUpOpen(false)}>
        <p className="small muted">The last minute, from the transcript. Choose a time to jump back to it.</p>
        {bullets.length === 0 ? (
          <p>Nothing new was said in the last minute.</p>
        ) : (
          <ul className="catch-up">
            {bullets.map((b) => (
              <li key={b.key}>
                <button
                  type="button"
                  className="btn-link"
                  aria-label={`Jump back to ${spokenElapsed(b.offsetSec)}`}
                  onClick={() => {
                    setHeldAt(b.offsetSec);
                    setCatchUpOpen(false);
                  }}
                >
                  {formatElapsed(b.offsetSec)}
                </button>{" "}
                {b.text}
              </li>
            ))}
          </ul>
        )}
        <SecondaryButton onClick={() => setCatchUpOpen(false)}>Close</SecondaryButton>
      </Dialog>
    </div>
  );
}
