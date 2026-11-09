import { describe, expect, it, vi } from "vitest";
import { DEMO_PERSONAS } from "@/lib/fixtures/personas";
import { DEMO_TALKS } from "@/lib/fixtures/talks";
import { defaultPreferences } from "@/lib/preferences";
import { ElasticsearchSearchAdapter, parseSearchResponse } from "@/lib/search/elasticsearch";
import { LocalSearchAdapter, tokenize } from "@/lib/search/local";
import { createSearchAdapter, searchTalks } from "@/lib/search/service";
import { SearchError } from "@/lib/search/types";
import type { TalkSearchAdapter } from "@/lib/search/types";

const local = new LocalSearchAdapter();
const prefsOf = (id: string) => DEMO_PERSONAS.find((p) => p.id === id)!.prefs;

describe("local demo search", () => {
  it("drops filler words", () => {
    expect(tokenize("Show me a beginner security talk")).toEqual(["beginner", "security"]);
  });
  it("finds talks in plain language", async () => {
    const ids = (await local.search("beginner security talk")).map((h) => h.talkId);
    expect(ids).toEqual(expect.arrayContaining(["talk-rbac", "talk-observability"]));
  });
  it("matches whole words, so 'ai' does not match inside 'Plain'", async () => {
    expect(await local.search("ai")).toEqual([]);
  });
  it("returns an explanation for each hit and nothing for an empty or unmatched query", async () => {
    const hits = await local.search("observability");
    expect(hits[0].matched.length).toBeGreaterThan(0);
    expect(await local.search("   ")).toEqual([]);
    expect(await local.search("zzzz")).toEqual([]);
  });
});

describe("eligibility is separate from ranking", () => {
  it("hides talks that do not confirm captions for Priya, and says why", async () => {
    const out = await searchTalks(local, { query: "security", prefs: prefsOf("priya"), talks: DEMO_TALKS });
    expect(out.results.map((r) => r.talk.id)).toEqual(["talk-supply-chain"]);
    expect(out.hiddenByNeeds.map((h) => [h.talk.id, h.reasons[0]]).sort()).toEqual([
      ["talk-qa", "No captions"],
      ["talk-rbac", "Captions not confirmed"],
    ]);
  });
  it("never returns a step-unconfirmed talk to Marcus", async () => {
    const out = await searchTalks(local, { query: "supply chain security", prefs: prefsOf("marcus"), talks: DEMO_TALKS });
    expect(out.results.map((r) => r.talk.id)).not.toContain("talk-qa");
    expect(out.hiddenByNeeds.map((h) => h.talk.id)).toContain("talk-qa");
  });
  it("keeps everything when there are no required needs", async () => {
    const out = await searchTalks(local, { query: "security", prefs: defaultPreferences(), talks: DEMO_TALKS });
    expect(out.hiddenByNeeds).toEqual([]);
    const retrieved = (await local.search("security")).map((h) => h.talkId).sort();
    expect(retrieved).toEqual(["talk-qa", "talk-rbac", "talk-supply-chain"]);
    expect(out.results.map((r) => r.talk.id).sort()).toEqual(retrieved);
  });
  it("sends only the query text to the adapter, never needs or preferences", async () => {
    const search = vi.fn(async () => []);
    const spy: TalkSearchAdapter = { backend: "demo", label: "spy", search };
    await searchTalks(spy, { query: "security", prefs: prefsOf("priya"), talks: DEMO_TALKS });
    expect(search).toHaveBeenCalledTimes(1);
    expect((search.mock.calls[0] as unknown[])[0]).toBe("security");
    expect(JSON.stringify(search.mock.calls)).not.toMatch(/captions|stepFree|priya/i);
  });
  it("ignores ids a remote index returns that the app does not know", async () => {
    const remote: TalkSearchAdapter = { backend: "elasticsearch", label: "x", search: async () => [{ talkId: "ghost", score: 1, matched: [] }, { talkId: "talk-qa", score: 0.5, matched: ["why"] }] };
    const out = await searchTalks(remote, { query: "q", prefs: defaultPreferences(), talks: DEMO_TALKS });
    expect(out.results.map((r) => r.talk.id)).toEqual(["talk-qa"]);
  });
});

describe("Elasticsearch adapter (contract tests with a fake fetch; NOT a live Elasticsearch)", () => {
  it("validates the response and drops malformed hits", () => {
    expect(parseSearchResponse({ hits: [{ id: "talk-qa", score: 2, why: "title match" }, { nope: 1 }, "x", { talk_id: "talk-rbac" }] })).toEqual([
      { talkId: "talk-qa", score: 2, matched: ["title match"] },
      { talkId: "talk-rbac", score: 1, matched: [] },
    ]);
    expect(() => parseSearchResponse({})).toThrow(SearchError);
    expect(() => parseSearchResponse(null)).toThrow(SearchError);
  });
  it("posts only {q} to /api/search", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ hits: [] }), { status: 200 }));
    await new ElasticsearchSearchAdapter("http://api.test/", fetchImpl as unknown as typeof fetch).search("security");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api.test/api/search");
    expect(JSON.parse(init.body as string)).toEqual({ q: "security" });
  });
  it("turns network and HTTP failures into SearchError", async () => {
    const down = new ElasticsearchSearchAdapter("http://x", (async () => { throw new TypeError("net"); }) as unknown as typeof fetch);
    await expect(down.search("q")).rejects.toThrow("could not be reached");
    const bad = new ElasticsearchSearchAdapter("http://x", (async () => new Response("no", { status: 503 })) as unknown as typeof fetch);
    await expect(bad.search("q")).rejects.toThrow("(503)");
    const junk = new ElasticsearchSearchAdapter("http://x", (async () => new Response("not json", { status: 200 })) as unknown as typeof fetch);
    await expect(junk.search("q")).rejects.toThrow(SearchError);
  });
  it("is only chosen when configured; otherwise demo mode", () => {
    expect(createSearchAdapter(undefined, undefined).backend).toBe("demo");
    expect(createSearchAdapter("elasticsearch", undefined).backend).toBe("demo");
    expect(createSearchAdapter("elasticsearch", "http://api").backend).toBe("elasticsearch");
  });
});
