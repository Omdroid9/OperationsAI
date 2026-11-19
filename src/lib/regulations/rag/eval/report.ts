import latest from "@/lib/regulations/rag/eval/latest.json";

/** Typed view of the last committed eval run, for the retrieval quality page. */
export type DocketRow = {
  strategy: string;
  queries: number;
  recallAtK: number;
  mrr: number;
  gatedPrecision: number;
  gatedRecall: number;
  gatedShown: number;
  gatedEmpty: number;
};
export type GoldenRow = {
  strategy: string;
  cases: number;
  recallAtK: number;
  precisionAtK: number;
  mrr: number;
  forbiddenHitCases: number;
  emptyResultCases: number;
};
export type GoldenCaseRow = {
  id: string;
  kind: string;
  query: string;
  relevant: string[];
  bm25: string[];
  embedding: string[] | null;
};
export type EvalReport = {
  model: string;
  hasVectors: boolean;
  corpus: { size: number; fetchedAt: string };
  docketK: number;
  goldenK: number;
  docket: Array<{ stratum: string; rows: DocketRow[] }>;
  golden: Array<{ kind: string; rows: GoldenRow[] }>;
  goldenCases: GoldenCaseRow[];
};

export function getEvalReport(): EvalReport {
  return latest as EvalReport;
}
