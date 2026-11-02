import { tokenizeRegulationText } from "@/lib/regulations/rag/embed";
import type { RetrievedNotice } from "@/lib/regulations/rag/types";

/**
 * Deterministic citation faithfulness for RegLens retrieval claims.
 * Inspired by RAGAS faithfulness (claims supported by retrieved context),
 * but rule-based so demo mode needs no evaluator LLM.
 *
 * A retrieved notice is faithful when every reported overlap term appears
 * in the chunk's searchable text.
 */
export function citationFaithfulness(notice: RetrievedNotice): {
  score: number;
  supported: string[];
  unsupported: string[];
} {
  const context = tokenizeRegulationText(
    [
      notice.chunk.title,
      notice.chunk.category,
      notice.chunk.affectedSegment,
      notice.chunk.requiredAction,
      notice.chunk.summary,
      notice.chunk.body,
      notice.chunk.tags.join(" "),
    ].join("\n"),
  );
  const contextSet = new Set(context);
  const supported: string[] = [];
  const unsupported: string[] = [];

  for (const term of notice.overlapTerms) {
    const tokens = tokenizeRegulationText(term);
    const ok = tokens.length > 0 && tokens.every((token) => contextSet.has(token));
    if (ok) supported.push(term);
    else unsupported.push(term);
  }

  const total = notice.overlapTerms.length;
  return {
    score: total === 0 ? 0 : supported.length / total,
    supported,
    unsupported,
  };
}

export function filterFaithfulNotices(
  notices: RetrievedNotice[],
  minScore = 1,
): RetrievedNotice[] {
  return notices.filter((notice) => citationFaithfulness(notice).score >= minScore);
}
