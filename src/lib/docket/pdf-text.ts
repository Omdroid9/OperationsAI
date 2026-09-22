/**
 * Lightweight text pull from PDF content streams.
 * Enough for typed/specimen PDFs. Scanned image PDFs return empty.
 */
export function extractTextFromPdf(bytes: Buffer): string {
  const raw = bytes.toString("latin1");
  const chunks: string[] = [];

  for (const match of raw.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) {
    chunks.push(unescapePdfString(match[0].slice(1, match[0].lastIndexOf(")"))));
  }

  for (const match of raw.matchAll(/\[([\s\S]*?)\]\s*TJ/g)) {
    const inner = match[1] ?? "";
    for (const part of inner.matchAll(/\((?:\\.|[^\\)])*\)/g)) {
      chunks.push(unescapePdfString(part[0].slice(1, -1)));
    }
  }

  return chunks
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function unescapePdfString(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

/** Parse labeled specimen / form text without calling Gemini. */
export function parseLabeledDocumentFields(
  text: string,
  documentType: string,
): {
  document_type: string;
  person_name: string | null;
  issued_date: string | null;
  expiration_date: string | null;
  confidence: number;
} | null {
  if (!text.trim()) return null;

  const name =
    matchField(text, /(?:^|\n)\s*(?:Name|Named insured|Registered owner|Contact name)\s*:\s*(.+)$/im) ??
    null;
  const issued =
    matchDate(text, /(?:^|\n)\s*(?:Issued date|Issue date|Issued)\s*:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/im) ??
    null;
  const expiration =
    matchDate(
      text,
      /(?:^|\n)\s*(?:Expiration date|Expires|Expiry date|Expiration)\s*:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/im,
    ) ?? null;

  if (!name && !issued && !expiration) return null;

  const hits = [name, issued, expiration].filter(Boolean).length;
  return {
    document_type: documentType,
    person_name: cleanName(name),
    issued_date: issued,
    expiration_date: expiration,
    confidence: hits >= 2 ? 0.92 : 0.7,
  };
}

function matchField(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  const value = match?.[1]?.trim();
  return value ? value.replace(/\s+/g, " ") : null;
}

function matchDate(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match?.[1] ?? null;
}

function cleanName(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/\s*\/\s*.*$/, "").trim() || null;
}
