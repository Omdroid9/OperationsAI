import { chunkEmbeddingText, retrieveSimilarNotices, type RetrievalStrategy } from "@/lib/regulations/rag/retrieve";
import type { RegulationChunk } from "@/lib/regulations/rag/types";

/**
 * Relevance labels that nobody hand-wrote: two Federal Register documents are
 * related when they share a docket id or a RIN (for example a proposed rule and
 * its final rule, or an exemption application and its decision).
 *
 * Each labelled document is used as the query and must retrieve its relatives.
 * Two medical-exemption series make up a third of the corpus and are near
 * duplicates of each other, so they are reported separately.
 */
export type DocketStratum = "rules_and_notices" | "medical_exemption_series";

export type DocketQuery = {
  chunk: RegulationChunk;
  related: Set<string>;
  stratum: DocketStratum;
};

const SERIES_TITLE = /^Qualification of Drivers; Exemption Applications; (Epilepsy|Hearing|Vision|Diabetes)/i;

export function buildDocketQueries(corpus: RegulationChunk[]): DocketQuery[] {
  const byKey = new Map<string, string[]>();
  for (const chunk of corpus) {
    for (const key of [...(chunk.docketIds ?? []), ...(chunk.rins ?? [])]) {
      byKey.set(key, [...(byKey.get(key) ?? []), chunk.id]);
    }
  }
  return corpus
    .map((chunk) => {
      const related = new Set<string>();
      for (const key of [...(chunk.docketIds ?? []), ...(chunk.rins ?? [])]) {
        for (const id of byKey.get(key) ?? []) if (id !== chunk.id) related.add(id);
      }
      return {
        chunk,
        related,
        stratum: (SERIES_TITLE.test(chunk.title)
          ? "medical_exemption_series"
          : "rules_and_notices") as DocketStratum,
      };
    })
    .filter((query) => query.related.size > 0);
}

export type DocketSummary = {
  queries: number;
  recallAtK: number;
  mrr: number;
  /** Gated product output: share of shown notices that are related, and average shown. */
  gatedPrecision: number;
  gatedRecall: number;
  gatedShown: number;
  gatedEmpty: number;
};

export function runDocketEval(
  corpus: RegulationChunk[],
  queries: DocketQuery[],
  strategy: RetrievalStrategy,
  k: number,
  chunkVectors?: Map<string, Float32Array>,
): DocketSummary {
  let recall = 0;
  let mrr = 0;
  let gatedPrecision = 0;
  let gatedRecall = 0;
  let gatedShown = 0;
  let gatedEmpty = 0;
  for (const query of queries) {
    // Document vectors on both sides: notice-to-notice similarity is symmetric.
    const queryVector = chunkVectors?.get(query.chunk.id);
    const options = {
      limit: k,
      strategy,
      corpus,
      excludeIds: [query.chunk.id],
      semantic: chunkVectors && queryVector ? { queryVector, chunkVectors } : undefined,
    };
    const text = chunkEmbeddingText(query.chunk);
    const denominator = Math.min(query.related.size, k);

    const ranked = retrieveSimilarNotices(text, { ...options, gate: false }).map((n) => n.chunk.id);
    recall += ranked.filter((id) => query.related.has(id)).length / denominator;
    const first = ranked.findIndex((id) => query.related.has(id));
    mrr += first === -1 ? 0 : 1 / (first + 1);

    const shown = retrieveSimilarNotices(text, options).map((n) => n.chunk.id);
    const hits = shown.filter((id) => query.related.has(id)).length;
    gatedShown += shown.length;
    gatedRecall += hits / denominator;
    if (shown.length === 0) gatedEmpty += 1;
    else gatedPrecision += hits / shown.length;
  }
  const n = queries.length || 1;
  return {
    queries: queries.length,
    recallAtK: recall / n,
    mrr: mrr / n,
    gatedPrecision: gatedPrecision / Math.max(1, queries.length - gatedEmpty),
    gatedRecall: gatedRecall / n,
    gatedShown: gatedShown / n,
    gatedEmpty,
  };
}
