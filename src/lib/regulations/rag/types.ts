export type RegulationChunkSource = "seeded_index" | "workspace";

export interface RegulationChunk {
  id: string;
  title: string;
  agency: string;
  category: string;
  documentNumber: string | null;
  publishedDate: string | null;
  affectedSegment: string;
  requiredAction: string;
  summary: string;
  body: string;
  tags: string[];
  source: RegulationChunkSource;
  sourceUrl: string | null;
}

export interface RetrievedNotice {
  chunk: RegulationChunk;
  score: number;
  /** Dense cosine contribution before RRF fusion (0–1). */
  denseScore: number;
  /** BM25 raw score for this chunk. */
  bm25Score: number;
  /** RRF fusion score (Cormack et al., k=60). */
  rrfScore: number;
  overlapTerms: string[];
  whyRelated: string;
  /** Fraction of overlap terms attested in the cited chunk text. */
  citationFaithfulness: number;
}

export interface MatchGrounding {
  carrierId: string;
  matchType: "confirmed" | "potential" | "unknown";
  profileReason: string;
  supportingNoticeIds: string[];
  supportingTitles: string[];
  reviewRecommended: boolean;
}

export interface RegulationRagResult {
  regulationId: string;
  queryText: string;
  method: "hybrid_bm25_dense_rrf";
  similarNotices: RetrievedNotice[];
  matchGrounding: MatchGrounding[];
  disclaimer: string;
}
