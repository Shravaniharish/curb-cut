"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { TalkCard } from "@/components/TalkCard";
import { EmptyState, ErrorState, LoadingState, PageHeading, PrimaryButton, SecondaryButton } from "@/components/ui";
import { WaitForState } from "@/components/WaitForState";
import { LIVE } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { createSearchAdapter, NO_MATCH_MESSAGE, searchTalks } from "@/lib/search/service";
import { LocalSearchAdapter } from "@/lib/search/local";
import type { SearchOutcome, TalkSearchAdapter } from "@/lib/search/types";
import { useApp } from "@/lib/store";

type Status = "idle" | "loading" | "done" | "error";

export const PLACEHOLDER = "Ask in your own words, e.g. 'beginner security talk'";

function Search({ adapterOverride }: { adapterOverride?: TalkSearchAdapter }) {
  const uid = useId();
  const { talks, state, searchQuery, setSearchQuery } = useApp();
  const configured = useMemo(
    () => adapterOverride ?? createSearchAdapter(LIVE ? "api" : process.env.NEXT_PUBLIC_SEARCH_BACKEND, process.env.NEXT_PUBLIC_API_URL),
    [adapterOverride],
  );
  const [adapter, setAdapter] = useState<TalkSearchAdapter>(configured);
  const [input, setInput] = useState(searchQuery);
  const [submitted, setSubmitted] = useState(searchQuery.trim());
  const [status, setStatus] = useState<Status>(searchQuery.trim() ? "loading" : "idle");
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefs = state.prefs;

  useEffect(() => {
    if (!submitted) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the search request is an external system synced to the submitted query
    setStatus("loading");
    searchTalks(adapter, { query: submitted, prefs, talks }, controller.signal).then(
      (o) => {
        if (controller.signal.aborted) return;
        setOutcome(o);
        setStatus("done");
      },
      (e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Search failed.");
        setStatus("error");
      },
    );
    return () => controller.abort();
  }, [submitted, adapter, prefs, talks, attempt]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    setSearchQuery(q);
    setSubmitted(q);
    if (!q) {
      setStatus("idle");
      setOutcome(null);
    } else {
      setAttempt((a) => a + 1);
    }
  }

  const count = outcome?.results.length ?? 0;
  return (
    <div className="stack">
      <PageHeading>Search talks</PageHeading>
      <form role="search" onSubmit={submit} className="stack">
        <div>
          <label className="field" htmlFor={`${uid}-talk-search`}>
            What are you looking for?
          </label>
          <input ref={inputRef} id={`${uid}-talk-search`} type="search" value={input} placeholder={PLACEHOLDER} onChange={(e) => setInput(e.target.value)} autoComplete="off" />
        </div>
        <PrimaryButton type="submit" loading={status === "loading"}>
          Search
        </PrimaryButton>
      </form>
      <p className="small muted" data-testid="search-mode">
        {adapter.backend === "elasticsearch"
          ? "Search mode: Elasticsearch. Only your words are sent; your needs are applied on this device."
          : adapter.backend === "api"
            ? "Search mode: Curb Cut service (keyword search, not Elasticsearch yet). Only your words are sent; your needs are applied on this device."
            : "Search mode: demo search over sample talks on this device. Elasticsearch is not connected."}
      </p>

      <div aria-live="polite" role="status" className="sr-only">
        {status === "done" ? (count > 0 ? `${count} ${count === 1 ? "talk" : "talks"} found.` : NO_MATCH_MESSAGE) : ""}
      </div>

      {status === "idle" && (
        <EmptyState title="Start with a few words">
          <p>Try “beginner security talk” or “observability”. Your required needs are always applied.</p>
        </EmptyState>
      )}
      {status === "loading" && <LoadingState label="Searching…" />}
      {status === "error" && (
        <ErrorState
          title="Search is not working right now"
          actions={
            <>
              <SecondaryButton onClick={() => setAttempt((a) => a + 1)}>Try again</SecondaryButton>
              {adapter.backend !== "demo" && (
                <SecondaryButton
                  onClick={() => {
                    setAdapter(new LocalSearchAdapter());
                    setAttempt((a) => a + 1);
                  }}
                >
                  Use demo search instead
                </SecondaryButton>
              )}
            </>
          }
        >
          <p>{error}</p>
        </ErrorState>
      )}
      {status === "done" && outcome && (
        <>
          {count > 0 && (
            <>
              <h2>
                {count} {count === 1 ? "talk" : "talks"} found
              </h2>
              <ul className="card-list">
                {outcome.results.map((r) => (
                  <li key={r.talk.id}>
                    <TalkCard talk={r.talk} why={r.fits}>
                      {r.matched.length > 0 && <p className="small muted">Matched your words: {r.matched.join("; ")}</p>}
                    </TalkCard>
                  </li>
                ))}
              </ul>
            </>
          )}
          {count === 0 && (
            <EmptyState
              title={NO_MATCH_MESSAGE}
              actions={
                <>
                  <PrimaryButton onClick={() => inputRef.current?.focus()}>Change search terms</PrimaryButton>
                  <SecondaryButton href={ROUTES.settings}>Review my needs</SecondaryButton>
                </>
              }
            >
              <p>Your required needs were not relaxed to find more talks.</p>
            </EmptyState>
          )}
          {outcome.hiddenByNeeds.length > 0 && (
            <details className="collapse">
              <summary>
                {outcome.hiddenByNeeds.length} matching {outcome.hiddenByNeeds.length === 1 ? "talk was" : "talks were"} hidden because{" "}
                {outcome.hiddenByNeeds.length === 1 ? "it does" : "they do"} not confirm your needs
              </summary>
              <ul>
                {outcome.hiddenByNeeds.map((h) => (
                  <li key={h.talk.id}>
                    <Link href={ROUTES.talk(h.talk.id)}>{h.talk.title}</Link>: {h.reasons.join("; ")}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

export function SearchView({ adapter }: { adapter?: TalkSearchAdapter }) {
  return (
    <WaitForState>
      <Search adapterOverride={adapter} />
    </WaitForState>
  );
}
