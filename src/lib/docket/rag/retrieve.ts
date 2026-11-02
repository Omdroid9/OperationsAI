import {
  SEEDED_DOCUMENT_EXEMPLARS,
  type DocumentExemplar,
} from "@/lib/docket/rag/corpus";
import type { CaseDocument } from "@/types";

export type SimilarDocumentResult = {
  documentId: string;
  exemplars: DocumentExemplar[];
  disclaimer: string;
};

/**
 * Retrieve prior confirmed document patterns for the same document type.
 * Lexical type match only — keeps Docket confirm grounded without embedding providers.
 */
export function retrieveSimilarDocuments(document: CaseDocument): SimilarDocumentResult {
  const exemplars = SEEDED_DOCUMENT_EXEMPLARS.filter(
    (item) => item.documentType === document.documentType,
  ).slice(0, 2);

  return {
    documentId: document.id,
    exemplars,
    disclaimer:
      "Prior confirmed patterns are seeded examples for staff review. They do not verify this upload. Confirm names and dates against the source file.",
  };
}
