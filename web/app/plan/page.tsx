"use client";

import Link from "next/link";
import { useId, useMemo } from "react";
import { ExportPanel } from "@/components/ExportPanel";
import { LeaveByIndicator } from "@/components/LeaveByIndicator";
import { AccessBadgeList } from "@/components/AccessStatusBadge";
import { TalkCard } from "@/components/TalkCard";
import { EmptyState, PageHeading, PrimaryButton, SecondaryButton } from "@/components/ui";
import { WaitForState } from "@/components/WaitForState";
import { agendaTalks, backupFor, leaveByForTalk, nowAndNext, whyFits } from "@/lib/agenda";
import { roomLabel } from "@/lib/fixtures/venue";
import { NO_ACCESSIBLE_ROUTE_MESSAGE } from "@/lib/routing";
import { ROUTES } from "@/lib/routes";
import { useApp } from "@/lib/store";
import { formatDateLong, formatTime, formatTimeRange, minutesBetween } from "@/lib/time";
import { withSpan } from "@/lib/telemetry";
import type { Talk } from "@/lib/types";

function NextCard({ talk, label }: { talk: Talk; label: "Now" | "Next" }) {
  const uid = useId();
  const { state, graph, nowIso, selectTalk, setCurrentRoute } = useApp();
  const prefs = state.prefs;
  const leave = useMemo(
    () => withSpan("route.calculate", { stepFree: prefs.required.stepFreeRouting }, () => leaveByForTalk(graph, prefs, state.currentLocationId, talk)),
    [graph, prefs, state.currentLocationId, talk],
  );
  const why = whyFits(talk, prefs);
  const timeToLeave = leave.leaveByIso ? minutesBetween(nowIso, leave.leaveByIso) : null;
  return (
    <section className="card" aria-labelledby={`${uid}-nownext-heading`}>
      <p className="progress" style={{ marginBottom: 0 }}>{label}</p>
      <h2 id={`${uid}-nownext-heading`}>
        <Link href={ROUTES.talk(talk.id)}>{talk.title}</Link>
      </h2>
      <p className="muted">
        {formatTimeRange(talk.start, talk.end)} · {roomLabel(talk.roomId)} · Floor {talk.floor}
      </p>
      <AccessBadgeList talk={talk} keys={["stepFree", "captions", "slides", "frontSeating"]} />
      <p className="small" style={{ marginTop: "0.5rem" }}>
        <strong>Why this fits you:</strong> {why.length ? `${why.join(". ")}.` : "Nothing in your choices rules it out."}
      </p>
      {label === "Next" && leave.route.ok && leave.leaveByIso && leave.travelMinutes !== null && (
        <>
          <LeaveByIndicator leaveByIso={leave.leaveByIso} travelMinutes={leave.travelMinutes} bufferMinutes={leave.bufferMinutes} stepFree={prefs.required.stepFreeRouting} />
          {timeToLeave !== null && timeToLeave <= 0 && <p className="status-note">It is time to go.</p>}
        </>
      )}
      {label === "Next" && !leave.route.ok && <p className="status-note" role="status">{NO_ACCESSIBLE_ROUTE_MESSAGE}</p>}
      <div className="stack" style={{ marginTop: "1rem" }}>
        {label === "Next" && (
          <PrimaryButton
            href={ROUTES.route(talk.roomId)}
            onClick={() => {
              selectTalk(talk.id);
              setCurrentRoute({ fromId: state.currentLocationId, toId: talk.roomId, talkId: talk.id });
            }}
          >
            Take me there
          </PrimaryButton>
        )}
        <SecondaryButton href={ROUTES.changes}>My plans changed</SecondaryButton>
      </div>
    </section>
  );
}

function Plan() {
  const uid = useId();
  const { state, agenda, talks, nowIso, removeFromPlan } = useApp();
  const planned = useMemo(() => agendaTalks(agenda.items, talks), [agenda.items, talks]);
  const { now, next } = useMemo(() => nowAndNext(agenda.items, talks, nowIso), [agenda.items, talks, nowIso]);
  const backup = next ? backupFor(next, talks, state.prefs, planned.map((t) => t.id)) : null;
  const breaks = agenda.items.filter((i) => i.kind === "break");
  const excluded = agenda.excluded.map((e) => ({ ...e, talk: talks.find((t) => t.id === e.talkId) })).filter((e) => e.talk);

  return (
    <div className="stack">
      <PageHeading>Your plan</PageHeading>
      <p className="muted">
        {formatDateLong(nowIso)} · {formatTime(nowIso)} Salt Lake City time
        {state.demoClock.mode === "demo" ? " (demo clock)" : ""}
      </p>
      {state.onboarding === "guest" && (
        <p className="small muted">You are using Curb Cut as a guest. <Link href={ROUTES.setupNeeds}>Tell us what helps</Link> to personalise this plan.</p>
      )}

      {planned.length === 0 ? (
        <EmptyState
          title="No talks in your plan yet"
          actions={
            <>
              <PrimaryButton href={ROUTES.search}>Search talks</PrimaryButton>
              <SecondaryButton href={ROUTES.settings}>Review my needs</SecondaryButton>
            </>
          }
        >
          <p>
            {excluded.length > 0
              ? "Nothing in the sample schedule confirms all of your needs yet. You can search or review your needs."
              : "Search for a talk to add to your plan."}
          </p>
        </EmptyState>
      ) : (
        <>
          {now && <NextCard talk={now} label="Now" />}
          {next ? <NextCard talk={next} label="Next" /> : <EmptyState title="Nothing else today">You have no more talks planned for today.</EmptyState>}
          {next && backup && (
            <section className="card" aria-labelledby={`${uid}-backup-heading`}>
              <h2 id={`${uid}-backup-heading`}>Backup talk</h2>
              <p className="small muted">Same time as {next.title}, and it also confirms your required needs.</p>
              <TalkCard talk={backup} why={whyFits(backup, state.prefs)} />
            </section>
          )}
          <section aria-labelledby={`${uid}-today-heading`} className="stack">
            <h2 id={`${uid}-today-heading`}>Today&apos;s talks</h2>
            <ul className="card-list">
              {agenda.items.map((item) =>
                item.kind === "talk" ? (
                  <li key={`t-${item.talkId}`}>
                    {(() => {
                      const talk = talks.find((t) => t.id === item.talkId)!;
                      return (
                        <TalkCard talk={talk} why={whyFits(talk, state.prefs)}>
                          {item.userAdded && <p className="small">You added this talk.</p>}
                          {item.userAdded && (
                            <SecondaryButton onClick={() => removeFromPlan(talk.id)}>Remove from my plan</SecondaryButton>
                          )}
                        </TalkCard>
                      );
                    })()}
                  </li>
                ) : (
                  <li key={`b-${item.start}`}>
                    <article className="card">
                      <h3>Quiet break</h3>
                      <p className="muted" style={{ marginBottom: 0 }}>
                        {formatTimeRange(item.start, item.end)} · {roomLabel(item.roomId)}
                      </p>
                      <div style={{ marginTop: "0.5rem" }}>
                        <SecondaryButton href={ROUTES.route(item.roomId)}>Take me to the quiet room</SecondaryButton>
                      </div>
                    </article>
                  </li>
                ),
              )}
            </ul>
          </section>
        </>
      )}

      {state.prefs.preferences.quietBreaks && planned.length > 0 && breaks.length === 0 && (
        <p className="status-note">No gap in today&apos;s plan is long enough for a quiet break after travel time. Quiet rooms are on every floor.</p>
      )}

      {excluded.length > 0 && (
        <details className="collapse">
          <summary>Talks left out of your plan ({excluded.length})</summary>
          <ul>
            {excluded.map((e) => (
              <li key={e.talkId}>
                <Link href={ROUTES.talk(e.talkId)}>{e.talk!.title}</Link>: {e.reasons.join("; ")}
              </li>
            ))}
          </ul>
        </details>
      )}

      <ExportPanel />
    </div>
  );
}

export default function Page() {
  return (
    <WaitForState>
      <Plan />
    </WaitForState>
  );
}
