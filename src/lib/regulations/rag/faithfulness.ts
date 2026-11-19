import { tokenizeRegulationText } from "@/lib/regulations/rag/embed";
import type { RegulationChunk, RetrievedNotice } from "@/lib/regulations/rag/types";

/**
 * Deterministic citation faithfulness for RegLens retrieval claims.
 * Inspired by RAGAS faithfulness (claims supported by retrieved context),
 * but rule-based so demo mode needs no evaluator LLM.
 *
 * A claimed overlap term is supported only when it appears in the notice's
 * own text (title + body). Category, affected segment, required action,
 * summary, and tags are labels that staff or a model assigned; a term that
 * matches only a label is not attested by the source and is reported as
 * unsupported. Checking against the labels as well would make this metric
 * pass by construction, because overlap terms are drawn from those fields.
 */
export function noticeSourceText(chunk: RegulationChunk): string {
  return [chunk.title, chunk.body].join("\n");
}

export function checkTermsAgainstSource(
  terms: string[],
  chunk: RegulationChunk,
): { score: number; supported: string[]; unsupported: string[] } {
  const contextSet = new Set(tokenizeRegulationText(noticeSourceText(chunk)));
  const supported: string[] = [];
  const unsupported: string[] = [];

  for (const term of terms) {
    const tokens = tokenizeRegulationText(term);
    const ok = tokens.length > 0 && tokens.every((token) => contextSet.has(token));
    if (ok) supported.push(term);
    else unsupported.push(term);
  }

  return {
    score: terms.length === 0 ? 0 : supported.length / terms.length,
    supported,
    unsupported,
  };
}

/** Faithfulness of the terms a retrieved notice currently displays. */
export function citationFaithfulness(notice: RetrievedNotice): {
  score: number;
  supported: string[];
  unsupported: string[];
} {
  return checkTermsAgainstSource(
    [...notice.overlapTerms, ...(notice.unattestedTerms ?? [])],
    notice.chunk,
  );
}

export function filterFaithfulNotices(
  notices: RetrievedNotice[],
  minScore = 1,
): RetrievedNotice[] {
  return notices.filter((notice) => citationFaithfulness(notice).score >= minScore);
}
