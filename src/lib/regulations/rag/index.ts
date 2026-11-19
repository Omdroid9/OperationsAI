export { SEEDED_REGULATION_CORPUS } from "@/lib/regulations/rag/corpus";
export {
  FEDERAL_REGISTER_CORPUS,
  FEDERAL_REGISTER_FETCHED_AT,
} from "@/lib/regulations/rag/corpus-federal-register";
export {
  checkTermsAgainstSource,
  citationFaithfulness,
  filterFaithfulNotices,
  noticeSourceText,
} from "@/lib/regulations/rag/faithfulness";
export {
  buildRegulationRagResult,
  emptyRegulationRagResult,
  retrieveSimilarNotices,
} from "@/lib/regulations/rag/retrieve";
export {
  BM25_MIN_SHARE,
  DEMO_CORPUS,
  PRODUCT_CORPUS,
  chunkEmbeddingText,
  regulationEmbeddingText,
  regulationToChunk,
  semanticCutoffIds,
} from "@/lib/regulations/rag/retrieve";
export type { RetrievalStrategy, SemanticVectors } from "@/lib/regulations/rag/retrieve";
export { reciprocalRankFusion, rrfRankedIds } from "@/lib/regulations/rag/rrf";
export type {
  MatchGrounding,
  RegulationChunk,
  RegulationRagResult,
  RetrievedNotice,
} from "@/lib/regulations/rag/types";
