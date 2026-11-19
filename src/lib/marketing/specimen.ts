import { buildExtractiveBriefing, type Briefing } from "@/lib/regulations/briefing";
import {
  FEDERAL_REGISTER_CORPUS,
  chunkEmbeddingText,
  retrieveSimilarNotices,
  type RegulationChunk,
  type RetrievedNotice,
} from "@/lib/regulations/rag";
import type { Regulation } from "@/types";

/**
 * The landing page shows one real notice exactly as RegLens handles it: the
 * same retrieval and the same quoted briefing, run at build time over the
 * committed Federal Register snapshot. Nothing on it is written by hand.
 */
const SPECIMEN_DOCUMENT_NUMBER = "2026-17893";

export type Specimen = {
  notice: RegulationChunk;
  similar: RetrievedNotice[];
  briefing: Briefing;
};

export function getLandingSpecimen(): Specimen | null {
  const notice =
    FEDERAL_REGISTER_CORPUS.find((chunk) => chunk.documentNumber === SPECIMEN_DOCUMENT_NUMBER) ??
    null;
  if (!notice) return null;

  const similar = retrieveSimilarNotices(chunkEmbeddingText(notice), {
    limit: 3,
    excludeIds: [notice.id],
  });
  const asRegulation = {
    id: notice.id,
    title: notice.title,
    documentNumber: notice.documentNumber,
    sourceUrl: notice.sourceUrl,
    sourceText: notice.body,
    sourceSummary: notice.summary,
  } as Regulation;

  return { notice, similar, briefing: buildExtractiveBriefing(asRegulation, similar) };
}
