/** Deterministic demo search over the local sample talks. Used when Elasticsearch is not configured. */
import { DEMO_TALKS } from "../fixtures/talks";
import { roomLabel } from "../fixtures/venue";
import type { Talk, Topic } from "../types";
import type { SearchHit, TalkSearchAdapter } from "./types";

const STOPWORDS = new Set([
  "a", "an", "the", "i", "me", "my", "want", "to", "for", "of", "in", "on", "about", "and", "or", "with",
  "talk", "talks", "session", "sessions", "show", "find", "looking", "something", "some", "is", "are", "that",
]);

/** Words that stand for a topic. Matching a word through this table is reported as a topic match. */
const TOPIC_WORDS: Record<Topic, string[]> = {
  Security: ["security", "secure", "supply", "chain", "rbac", "vulnerability", "sbom", "trust"],
  Observability: ["observability", "monitoring", "tracing", "metrics", "logs", "logging", "telemetry"],
  AI: ["ai", "ml", "llm", "machine", "learning"],
  "Platform engineering": ["platform", "engineering", "internal", "developer"],
  Networking: ["network", "networking", "ingress", "mesh", "cni"],
  "Beginner-friendly": ["beginner", "beginners", "intro", "introduction", "basics", "starter", "new", "plain", "easy"],
};

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length > 0 && !STOPWORDS.has(w));
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** True when a word in `text` starts with `token`, so "ai" does not match inside "plain". */
function hasWord(text: string, token: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escapeRe(token)}`).test(text);
}

function scoreTalk(talk: Talk, tokens: string[]): SearchHit | null {
  const title = talk.title.toLowerCase();
  const desc = (talk.description ?? "").toLowerCase();
  const room = roomLabel(talk.roomId).toLowerCase();
  let score = 0;
  const matched: string[] = [];
  for (const token of tokens) {
    if (hasWord(title, token)) {
      score += 3;
      matched.push(`Title mentions "${token}"`);
    }
    const topics = talk.topics.filter((t) => TOPIC_WORDS[t].includes(token) || hasWord(t.toLowerCase(), token));
    for (const t of topics) {
      score += 2;
      matched.push(`Topic: ${t}`);
    }
    if (hasWord(desc, token)) {
      score += 1;
      matched.push(`Description mentions "${token}"`);
    }
    if (hasWord(room, token)) {
      score += 1;
      matched.push(`Room: ${roomLabel(talk.roomId)}`);
    }
  }
  return score > 0 ? { talkId: talk.id, score, matched: [...new Set(matched)] } : null;
}

export class LocalSearchAdapter implements TalkSearchAdapter {
  readonly backend = "demo" as const;
  readonly label = "Demo search over local sample talks";
  constructor(private readonly talks: Talk[] = DEMO_TALKS) {}

  async search(query: string): Promise<SearchHit[]> {
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];
    return this.talks
      .map((t) => scoreTalk(t, tokens))
      .filter((h): h is SearchHit => h !== null)
      .sort((a, b) => b.score - a.score || a.talkId.localeCompare(b.talkId));
  }
}
