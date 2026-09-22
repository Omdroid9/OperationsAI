import { documentExtractionSchema } from "@/lib/validation/schemas";

export function isInsufficientDocumentExtraction(extraction: unknown): boolean {
  const parsed = documentExtractionSchema.safeParse(extraction);
  if (!parsed.success) return true;
  const { person_name, issued_date, expiration_date, confidence } = parsed.data;
  const hasField = Boolean(person_name?.trim() || issued_date || expiration_date);
  if (!hasField) return true;
  return confidence < 0.35;
}
