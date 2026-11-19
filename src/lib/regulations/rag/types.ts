/** seeded_index: illustrative sample. federal_register: published document. workspace: staff import. */
export type RegulationChunkSource = "seeded_index" | "federal_register" | "workspace";

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
  /** Federal Register docket ids and RINs, when published. */
  docketIds?: string[];
  rins?: string[];
}

export interface RetrievedNotice {
  chunk: RegulationChunk;
  score: number;
  /** Hashed-token cosine. Kept for the eval ablation; not used to rank by default. */
  denseScore: number;
  /** BM25 raw score for this chunk. */
  bm25Score: number;
  /** RRF fusion score (Cormack et al., k=60). */
  rrfScore: number;
  /** Overlap terms attested in the notice's own text (title + body). */
  overlapTerms: string[];
  /** Candidate terms that matched only an assigned label, not the notice text. Not displayed. */
  unattestedTerms?: string[];
  whyRelated: string;
  /**
   * Attested terms / candidate terms. Below 1 means some matches rested on labels alone.
   * Null when the notice was matched on meaning with no term claims to check.
   */
  citationFaithfulness: number | null;
  /** Embedding cosine between the query and this notice, when model vectors were used. */
  semanticScore?: number;
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
  /** bm25: keyless term ranking. embedding: model vectors + BM25, fused with RRF. */
  method: "bm25" | "hybrid_bm25_embedding_rrf";
  similarNotices: RetrievedNotice[];
  matchGrounding: MatchGrounding[];
  disclaimer: string;
}
