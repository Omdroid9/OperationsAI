export interface FederalRegisterDocument {
  document_number: string;
  title: string;
  html_url: string;
  publication_date: string;
  effective_on: string | null;
  abstract: string | null;
}

interface FederalRegisterResponse {
  results: FederalRegisterDocument[];
  count: number;
}

export async function fetchFmcsaFederalRegister(perPage = 20): Promise<FederalRegisterDocument[]> {
  const url = new URL("https://www.federalregister.gov/api/v1/documents.json");
  url.searchParams.append("conditions[agencies][]", "federal-motor-carrier-safety-administration");
  for (const type of ["RULE", "PRORULE", "NOTICE"]) {
    url.searchParams.append("conditions[type][]", type);
  }
  url.searchParams.set("order", "newest");
  url.searchParams.set("per_page", String(perPage));

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Federal Register fetch failed (${response.status})`);
  }

  const payload = (await response.json()) as FederalRegisterResponse;
  return payload.results ?? [];
}

export function federalRegisterToImportEntry(doc: FederalRegisterDocument) {
  const sourceText = [doc.title, doc.abstract].filter(Boolean).join("\n\n");
  return {
    documentNumber: doc.document_number,
    title: doc.title,
    sourceUrl: doc.html_url,
    sourceText,
    publishedDate: doc.publication_date || null,
    effectiveDate: doc.effective_on || null,
  };
}
