import {
  retrieveSimilarNotices,
  type RetrievalStrategy,
  type SemanticVectors,
} from "@/lib/regulations/rag/retrieve";
import { SEEDED_REGULATION_CORPUS } from "@/lib/regulations/rag/corpus";
import type { GoldenCase } from "@/lib/regulations/rag/eval/golden";

export type CaseResult = {
  id: string;
  kind: GoldenCase["kind"];
  retrieved: string[];
  recall: number;
  precision: number;
  reciprocalRank: number;
  forbiddenHits: string[];
  minFaithfulness: number | null;
};

export type Summary = {
  cases: number;
  recallAtK: number;
  precisionAtK: number;
  mrr: number;
  forbiddenHitCases: number;
  emptyResultCases: number;
};

export function runCase(
  golden: GoldenCase,
  strategy: RetrievalStrategy,
  k: number,
  semantic?: SemanticVectors,
): CaseResult {
  const notices = retrieveSimilarNotices(golden.query, {
    limit: k,
    strategy,
    semantic,
    corpus: SEEDED_REGULATION_CORPUS,
  });
  const retrieved = notices.map((notice) => notice.chunk.id);
  const relevant = new Set(golden.relevant);
  const hits = retrieved.filter((id) => relevant.has(id)).length;
  const firstHit = retrieved.findIndex((id) => relevant.has(id));
  const forbidden = new Set(golden.forbidden ?? []);
  return {
    id: golden.id,
    kind: golden.kind,
    retrieved,
    recall: hits / Math.min(relevant.size, k),
    precision: retrieved.length === 0 ? 0 : hits / retrieved.length,
    reciprocalRank: firstHit === -1 ? 0 : 1 / (firstHit + 1),
    forbiddenHits: retrieved.filter((id) => forbidden.has(id)),
    minFaithfulness:
      notices.length === 0
        ? null
        : Math.min(...notices.map((notice) => notice.citationFaithfulness ?? 1)),
  };
}

export function summarize(results: CaseResult[]): Summary {
  const n = results.length || 1;
  return {
    cases: results.length,
    recallAtK: results.reduce((sum, r) => sum + r.recall, 0) / n,
    precisionAtK: results.reduce((sum, r) => sum + r.precision, 0) / n,
    mrr: results.reduce((sum, r) => sum + r.reciprocalRank, 0) / n,
    forbiddenHitCases: results.filter((r) => r.forbiddenHits.length > 0).length,
    emptyResultCases: results.filter((r) => r.retrieved.length === 0).length,
  };
}
