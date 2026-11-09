import type { AttendeePreferences, Talk } from "../types";

/** One retrieved talk. Retrieval knows nothing about the attendee: no needs or preferences reach an adapter. */
export interface SearchHit {
  talkId: string;
  score: number;
  /** Why the words matched, e.g. 'Topic: Security'. */
  matched: string[];
}

export type SearchBackend = "demo" | "elasticsearch";

export interface TalkSearchAdapter {
  readonly backend: SearchBackend;
  readonly label: string;
  search(query: string, signal?: AbortSignal): Promise<SearchHit[]>;
}

export class SearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchError";
  }
}

export interface SearchResult {
  talk: Talk;
  matched: string[];
  fits: string[];
}

export interface HiddenResult {
  talk: Talk;
  reasons: string[];
}

export interface SearchOutcome {
  backend: SearchBackend;
  results: SearchResult[];
  /** Talks whose words matched but that do not confirm a required need. Never shown as recommendations. */
  hiddenByNeeds: HiddenResult[];
}

export interface SearchRequest {
  query: string;
  prefs: AttendeePreferences;
  talks: Talk[];
}
