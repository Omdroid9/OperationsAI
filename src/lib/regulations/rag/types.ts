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
  overlapTerms: string[];
  whyRelated: string;
}

export interface MatchGrounding {
  carrierId: string;
  matchType: "confirmed" | "potential" | "unknown";
  profileReason: string;
  supportingNoticeIds: string[];
  reviewRecommended: boolean;
}

export interface RegulationRagResult {
  regulationId: string;
  queryText: string;
  method: "lexical_seeded_index";
  similarNotices: RetrievedNotice[];
  matchGrounding: MatchGrounding[];
  disclaimer: string;
}
