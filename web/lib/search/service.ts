/**
 * TalkSearchService: retrieval (adapter) is separate from eligibility (local, uses the attendee's required needs).
 * A result that cannot confirm a required need is moved to `hiddenByNeeds` and is never shown as a match.
 */
import { checkRequirements, whyFits } from "../agenda";
import { withSpan } from "../telemetry";
import { ElasticsearchSearchAdapter } from "./elasticsearch";
import { LocalSearchAdapter } from "./local";
import type { SearchOutcome, SearchRequest, SearchBackend, TalkSearchAdapter } from "./types";

export const NO_MATCH_MESSAGE = "No talks match all your needs. Try fewer words.";

export async function searchTalks(adapter: TalkSearchAdapter, req: SearchRequest, signal?: AbortSignal): Promise<SearchOutcome> {
  return withSpan("search.query", { backend: adapter.backend, query_length: req.query.length }, async () => {
    const hits = await adapter.search(req.query, signal);
    const byId = new Map(req.talks.map((t) => [t.id, t]));
    const outcome: SearchOutcome = { backend: adapter.backend, results: [], hiddenByNeeds: [] };
    for (const hit of hits) {
      const talk = byId.get(hit.talkId);
      if (!talk) continue; // unknown ids from a remote index are ignored rather than invented
      const check = checkRequirements(talk, req.prefs);
      if (check.eligible) outcome.results.push({ talk, matched: hit.matched, fits: whyFits(talk, req.prefs) });
      else outcome.hiddenByNeeds.push({ talk, reasons: check.unmet });
    }
    return outcome;
  });
}

/** Choose the adapter from configuration. Defaults to the demo adapter and says so in the UI. */
export function createSearchAdapter(backend: SearchBackend | string | undefined, apiBase: string | undefined): TalkSearchAdapter {
  if (backend === "elasticsearch" && apiBase) return new ElasticsearchSearchAdapter(apiBase);
  if (backend === "api" && apiBase) return new ElasticsearchSearchAdapter(apiBase, undefined, "api");
  return new LocalSearchAdapter();
}
