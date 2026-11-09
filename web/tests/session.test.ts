import { describe, expect, it } from "vitest";
import { buildFeed, catchUp, elapsedSec, formatElapsed, jumpBack, linesAt, spokenElapsed } from "@/lib/session";
import { transcriptFor } from "@/lib/fixtures/transcripts";
import type { TranscriptChunk, WrittenQuestion } from "@/lib/types";

const START = "2026-11-09T21:00:00.000Z";
const chunks: TranscriptChunk[] = [0, 20, 40, 60, 80, 100].map((s) => ({ talkId: "t", offsetSec: s, speaker: "Speaker", text: `line ${s}` }));

describe("session feed", () => {
  it("counts seconds since the talk started, negative before it", () => {
    expect(elapsedSec(START, "2026-11-09T21:01:05.000Z")).toBe(65);
    expect(elapsedSec(START, "2026-11-09T20:59:00.000Z")).toBe(-60);
  });

  it("merges read-out questions at the moment they were read, and skips waiting ones", () => {
    const qs: WrittenQuestion[] = [
      { id: "q1", talkId: "t", text: "How do we sign images?", askedAt: START, readOutAt: "2026-11-09T21:00:50.000Z" },
      { id: "q2", talkId: "t", text: "Not yet read", askedAt: START, readOutAt: null },
    ];
    const feed = buildFeed(chunks, qs, START);
    expect(feed.map((l) => l.offsetSec)).toEqual([0, 20, 40, 50, 60, 80, 100]);
    expect(feed[3]).toMatchObject({ kind: "question", speaker: "Question read out", text: "How do we sign images?" });
    expect(feed.some((l) => l.text === "Not yet read")).toBe(false);
  });

  it("shows only what has been said so far", () => {
    const feed = buildFeed(chunks, [], START);
    expect(linesAt(feed, 45)).toHaveLength(3);
    expect(linesAt(feed, -10)).toHaveLength(0);
  });

  it("jumps back 30 seconds but never before the start", () => {
    expect(jumpBack(95)).toBe(65);
    expect(jumpBack(10)).toBe(0);
  });

  it("catches up with at most 3 lines from the last minute", () => {
    const feed = buildFeed(chunks, [], START);
    expect(catchUp(feed, 100).map((l) => l.offsetSec)).toEqual([60, 80, 100]);
    expect(catchUp(feed, 50).map((l) => l.offsetSec)).toEqual([0, 20, 40]);
    expect(catchUp(feed, 500)).toEqual([]);
  });

  it("formats times for the eye and for screen readers", () => {
    expect(formatElapsed(245)).toBe("4:05");
    expect(spokenElapsed(245)).toBe("4 minutes 5 seconds");
    expect(spokenElapsed(60)).toBe("1 minute");
    expect(spokenElapsed(0)).toBe("0 seconds");
  });

  it("has a demo transcript for every demo talk, in time order", () => {
    for (const id of ["talk-supply-chain", "talk-observability", "talk-rbac", "talk-qa"]) {
      const t = transcriptFor(id);
      expect(t.length).toBeGreaterThanOrEqual(3);
      expect(t.map((c) => c.offsetSec)).toEqual([...t.map((c) => c.offsetSec)].sort((a, b) => a - b));
    }
  });
});
