import { describe, expect, it } from "vitest";
import { buildBm25Index, bm25Scores, rankedIds } from "@/lib/regulations/rag/bm25";
import {
  cosineSimilarity,
  embedText,
  overlapTerms,
  tokenizeRegulationText,
} from "@/lib/regulations/rag/embed";
import { semanticCutoffIds } from "@/lib/regulations/rag/retrieve";
import { reciprocalRankFusion, rrfRankedIds } from "@/lib/regulations/rag/rrf";

describe("tokenizeRegulationText", () => {
  it("collapses domain phrases into single tokens", () => {
    const tokens = tokenizeRegulationText(
      "New Entrant carriers using an Electronic Logging Device for hours-of-service",
    );
    expect(tokens).toContain("new_entrant");
    expect(tokens).toContain("eld");
    expect(tokens).toContain("hours_of_service");
    expect(tokens).not.toContain("entrant");
  });

  it("drops stopwords and single characters", () => {
    expect(tokenizeRegulationText("the carrier must be a b")).toEqual(["carrier"]);
  });
});

describe("embedText", () => {
  it("is deterministic and unit length", () => {
    const a = embedText("interstate eld recordkeeping");
    const b = embedText("interstate eld recordkeeping");
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(cosineSimilarity(a, a)).toBeCloseTo(1, 5);
  });

  it("returns a zero vector for empty input", () => {
    const v = embedText("");
    expect(cosineSimilarity(v, v)).toBe(0);
  });

  it("scores shared vocabulary above disjoint vocabulary", () => {
    const query = embedText("eld hours of service interstate");
    const near = embedText("interstate carriers eld hours of service retention");
    const far = embedText("hazmat placard security plan training");
    expect(cosineSimilarity(query, near)).toBeGreaterThan(cosineSimilarity(query, far));
  });
});

describe("overlapTerms", () => {
  it("returns shared terms once, in candidate order, with phrases unjoined", () => {
    expect(overlapTerms("new entrant eld eld", "ELD rules for New Entrant fleets")).toEqual([
      "eld",
      "new entrant",
    ]);
  });
});

describe("BM25", () => {
  const index = buildBm25Index([
    { id: "a", text: "eld eld eld interstate" },
    { id: "b", text: "eld interstate hazmat placard security training plan" },
    { id: "c", text: "ifta irp renewal" },
  ]);

  it("ranks higher term frequency in a shorter document first", () => {
    expect(rankedIds(bm25Scores(index, "eld"))).toEqual(["a", "b"]);
  });

  it("omits documents with no matching term", () => {
    expect(bm25Scores(index, "eld").has("c")).toBe(false);
  });

  it("weights rare terms above common ones", () => {
    const scores = bm25Scores(index, "hazmat interstate");
    expect(scores.get("b")!).toBeGreaterThan(scores.get("a")!);
  });

  it("returns nothing for an empty query or empty index", () => {
    expect(bm25Scores(index, "").size).toBe(0);
    expect(bm25Scores(buildBm25Index([]), "eld").size).toBe(0);
  });
});

describe("reciprocalRankFusion", () => {
  it("matches the Cormack formula with k=60", () => {
    const scores = reciprocalRankFusion([
      ["a", "b"],
      ["b", "a"],
    ]);
    expect(scores.get("a")).toBeCloseTo(1 / 61 + 1 / 62, 10);
    expect(scores.get("b")).toBeCloseTo(1 / 62 + 1 / 61, 10);
  });

  it("rewards agreement across lists over a single first place", () => {
    const ranked = rrfRankedIds([
      ["solo", "both"],
      ["both", "other"],
    ]);
    expect(ranked[0]).toBe("both");
  });

  it("honors a custom k", () => {
    expect(reciprocalRankFusion([["a"]], { k: 0 }).get("a")).toBe(1);
  });
});

describe("semanticCutoffIds", () => {
  const cut = (scores: Record<string, number>, limit = 4) =>
    [...semanticCutoffIds(new Map(Object.entries(scores)), limit)];

  it("keeps everything above the largest drop", () => {
    expect(cut({ a: 0.77, b: 0.72, c: 0.71, d: 0.63, e: 0.62 })).toEqual(["a", "b", "c"]);
  });

  it("keeps only the nearest notice when the first drop is largest", () => {
    expect(cut({ a: 0.79, b: 0.65, c: 0.64 })).toEqual(["a"]);
  });

  it("does not look past the limit for a drop", () => {
    expect(cut({ a: 0.8, b: 0.79, c: 0.78, d: 0.2 }, 2)).toEqual(["a"]);
  });

  it("handles one notice and none", () => {
    expect(cut({ a: 0.5 })).toEqual(["a"]);
    expect(cut({})).toEqual([]);
  });
});
