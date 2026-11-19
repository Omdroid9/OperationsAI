import { describe, expect, it, vi } from "vitest";
import { createInitialState } from "@/data/seed";
import type { EmbedFn } from "@/lib/regulations/rag/gemini-embeddings";
import { SEEDED_REGULATION_CORPUS } from "@/lib/regulations/rag/corpus";
import { buildRegulationRagResultLive } from "@/lib/regulations/rag/live";

const seed = createInitialState();
const regulation = seed.regulations.find((item) => item.id === "reg_new-entrant-packet")!;

/** Two-dimensional stand-in: texts about hazmat point one way, everything else the other. */
const fakeEmbed: EmbedFn = async (texts) =>
  texts.map((text) =>
    /hazardous materials/i.test(text) ? Float32Array.from([1, 0]) : Float32Array.from([0, 1]),
  );

describe("buildRegulationRagResultLive", () => {
  it("ranks with embeddings and reports the embedding method", async () => {
    const outcome = await buildRegulationRagResultLive(
      { regulation, corpus: SEEDED_REGULATION_CORPUS },
      fakeEmbed,
    );
    expect(outcome.live).toBe(true);
    expect(outcome.result.method).toBe("hybrid_bm25_embedding_rrf");
    const ids = outcome.result.similarNotices.map((n) => n.chunk.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).not.toContain("corpus_hazmat-security");
    expect(ids).not.toContain("corpus_new-entrant-packet");
    expect(outcome.result.similarNotices.every((n) => n.semanticScore != null)).toBe(true);
  });

  it("falls back to lexical retrieval when the provider fails", async () => {
    const failing: EmbedFn = vi.fn(async () => {
      throw new Error("quota exceeded");
    });
    // A workspace notice the cache has not seen forces a provider call.
    const extra = { ...regulation, id: "reg_extra", title: "Uncached notice", sourceText: "IFTA" };
    const outcome = await buildRegulationRagResultLive(
      { regulation, workspaceRegulations: [extra], corpus: SEEDED_REGULATION_CORPUS },
      failing,
    );
    expect(outcome.live).toBe(false);
    expect(outcome.error).toBe("quota exceeded");
    expect(outcome.result.method).toBe("bm25");
    expect(outcome.result.similarNotices.length).toBeGreaterThan(0);
  });
});
