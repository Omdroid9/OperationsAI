#!/usr/bin/env node
/**
 * Snapshot recent FMCSA documents from the Federal Register public API (no key).
 * Output is committed so Demo Mode and CI retrieve over real notices offline.
 *   npm run corpus:refresh
 * Then: npm run eval:rag:refresh  (re-embeds anything new; needs GEMINI_API_KEY)
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PAGES = 3;
const PER_PAGE = 100;
const FIELDS = [
  "document_number",
  "title",
  "abstract",
  "type",
  "action",
  "publication_date",
  "effective_on",
  "html_url",
  "docket_ids",
  "regulation_id_numbers",
  "cfr_references",
];
const OUT = resolve(process.cwd(), "src/lib/regulations/rag/data/federal-register.json");

const documents = [];
for (let page = 1; page <= PAGES; page += 1) {
  const url = new URL("https://www.federalregister.gov/api/v1/documents.json");
  url.searchParams.append("conditions[agencies][]", "federal-motor-carrier-safety-administration");
  for (const type of ["RULE", "PRORULE", "NOTICE"]) url.searchParams.append("conditions[type][]", type);
  for (const field of FIELDS) url.searchParams.append("fields[]", field);
  url.searchParams.set("order", "newest");
  url.searchParams.set("per_page", String(PER_PAGE));
  url.searchParams.set("page", String(page));
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Federal Register ${response.status} on page ${page}`);
  const payload = await response.json();
  documents.push(...(payload.results ?? []));
}

const normalizeDocket = (value) => value.replace(/^Docket\s+(No\.?|ID)?\s*/i, "").trim();
const seen = new Set();
const notices = documents
  .filter((doc) => doc.abstract && doc.abstract.trim().length >= 80)
  .filter((doc) => (seen.has(doc.document_number) ? false : seen.add(doc.document_number)))
  .map((doc) => ({
    documentNumber: doc.document_number,
    title: doc.title.trim(),
    abstract: doc.abstract.replace(/\s+/g, " ").trim(),
    type: doc.type,
    action: doc.action ?? null,
    publishedDate: doc.publication_date ?? null,
    effectiveDate: doc.effective_on ?? null,
    url: doc.html_url,
    docketIds: (doc.docket_ids ?? []).map(normalizeDocket).filter(Boolean),
    rins: doc.regulation_id_numbers ?? [],
    cfr: (doc.cfr_references ?? []).map((ref) => `${ref.title} CFR ${ref.part}`),
  }))
  .sort((a, b) => a.documentNumber.localeCompare(b.documentNumber));

writeFileSync(
  OUT,
  `${JSON.stringify({ source: "federalregister.gov/api/v1", agency: "FMCSA", fetchedAt: new Date().toISOString().slice(0, 10), notices }, null, 1)}\n`,
);
console.log(`Wrote ${notices.length} notices to ${OUT}`);
