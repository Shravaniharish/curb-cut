/**
 * Elasticsearch-backed search via the Curb Cut API. The browser never talks to Elasticsearch and never holds a key:
 * it calls POST {API}/api/search, which is owned by the API area. Only the query text is sent. The attendee's
 * needs are applied locally afterwards, so they are not transmitted.
 *
 * STATUS: written against the contract in docs/ARCHITECTURE.md ("hits with a why string"). The router did not
 * exist when this was written, so the response shape is validated defensively and is UNVERIFIED against a live
 * Elasticsearch deployment.
 */
import { SearchError } from "./types";
import type { SearchHit, TalkSearchAdapter } from "./types";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Validate untrusted JSON from the API. Hits without a string id are dropped. */
export function parseSearchResponse(body: unknown): SearchHit[] {
  if (!isObj(body) || !Array.isArray(body.hits)) throw new SearchError("The search service returned an unexpected response.");
  const rawHits: unknown[] = body.hits;
  const hits: SearchHit[] = [];
  rawHits.forEach((raw, i) => {
    if (!isObj(raw)) return;
    const id = typeof raw.id === "string" ? raw.id : typeof raw.talk_id === "string" ? raw.talk_id : null;
    if (!id) return;
    const score = typeof raw.score === "number" && Number.isFinite(raw.score) ? raw.score : rawHits.length - i;
    const why = typeof raw.why === "string" ? [raw.why.slice(0, 300)] : [];
    hits.push({ talkId: id, score, matched: why });
  });
  return hits;
}

export class ElasticsearchSearchAdapter implements TalkSearchAdapter {
  readonly label: string;
  constructor(
    private readonly apiBase: string,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
    /** "api" is the Curb Cut API's own keyword search; "elasticsearch" is the same call once it is backed by Elastic. */
    readonly backend: "elasticsearch" | "api" = "elasticsearch",
  ) {
    this.label = backend === "api" ? "Curb Cut API search" : "Elasticsearch search";
  }

  async search(query: string, signal?: AbortSignal): Promise<SearchHit[]> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.apiBase.replace(/\/$/, "")}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
        signal,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      throw new SearchError("The search service could not be reached.");
    }
    if (!res.ok) throw new SearchError(`The search service returned an error (${res.status}).`);
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new SearchError("The search service returned an unexpected response.");
    }
    return parseSearchResponse(body);
  }
}
