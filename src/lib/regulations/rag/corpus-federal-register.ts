import snapshot from "@/lib/regulations/rag/data/federal-register.json";
import type { RegulationChunk } from "@/lib/regulations/rag/types";

/**
 * Real FMCSA documents from the Federal Register public API, committed as a
 * snapshot so retrieval works offline. Refresh with `npm run corpus:refresh`.
 *
 * Only what the Federal Register publishes is carried over. Affected segment and
 * required action are left empty: nobody has extracted or confirmed them.
 */
export const FEDERAL_REGISTER_FETCHED_AT: string = snapshot.fetchedAt;

export const FEDERAL_REGISTER_CORPUS: RegulationChunk[] = snapshot.notices.map((notice) => ({
  id: `fr_${notice.documentNumber}`,
  title: notice.title,
  agency: snapshot.agency,
  category: notice.type,
  documentNumber: notice.documentNumber,
  publishedDate: notice.publishedDate,
  affectedSegment: "",
  requiredAction: "",
  summary: notice.abstract,
  body: notice.abstract,
  tags: notice.cfr,
  source: "federal_register",
  sourceUrl: notice.url,
  docketIds: notice.docketIds,
  rins: notice.rins,
}));
