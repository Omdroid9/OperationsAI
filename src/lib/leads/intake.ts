import { inboundLeadCreation, recordKindLabel } from "@/lib/leads/creation";
import { leadIntakeInputSchema } from "@/lib/validation/schemas";
import type {
  Carrier,
  CreationProvenance,
  LeadSourceType,
  Opportunity,
  RecordKind,
} from "@/types";
import type { z } from "zod";

export type LeadIntakeInput = z.infer<typeof leadIntakeInputSchema>;

export type LeadIntakeSourceType = Extract<
  LeadSourceType,
  "manual" | "referral" | "csv_import" | "website_form"
>;

export interface LeadDuplicateMatch {
  opportunityId: string;
  carrierId: string;
  recordKind: RecordKind;
  companyName: string;
  matchOn: "email" | "phone" | "usdot";
  label: string;
}

export type LeadIntakeResult =
  | { status: "created"; opportunityId: string; carrierId: string }
  | { status: "duplicate_warning"; matches: LeadDuplicateMatch[] }
  | { status: "invalid"; errors: string[] };

export function normalizeEmail(value: string | null | undefined): string | null {
  const text = value?.trim().toLowerCase() ?? "";
  return text || null;
}

export function normalizePhone(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

export function normalizeUsdot(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits || null;
}

export function findLeadDuplicates(input: {
  email?: string | null;
  phone?: string | null;
  usdot?: string | null;
  carriers: Carrier[];
  opportunities: Opportunity[];
}): LeadDuplicateMatch[] {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const usdot = normalizeUsdot(input.usdot);
  if (!email && !phone && !usdot) return [];

  const matches: LeadDuplicateMatch[] = [];
  const seen = new Set<string>();

  for (const opportunity of input.opportunities) {
    if (opportunity.stage === "DISMISSED") continue;
    const carrier = input.carriers.find((item) => item.id === opportunity.carrierId);
    if (!carrier) continue;

    const hitOn: Array<"email" | "phone" | "usdot"> = [];
    if (email && normalizeEmail(carrier.email) === email) hitOn.push("email");
    if (phone && normalizePhone(carrier.phone) === phone) hitOn.push("phone");
    if (usdot && normalizeUsdot(carrier.usdot) === usdot) hitOn.push("usdot");
    if (hitOn.length === 0) continue;

    for (const matchOn of hitOn) {
      const key = `${opportunity.id}:${matchOn}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({
        opportunityId: opportunity.id,
        carrierId: carrier.id,
        recordKind: opportunity.recordKind,
        companyName: carrier.legalName,
        matchOn,
        label: `${recordKindLabel(opportunity.recordKind)} · ${carrier.legalName} · ${matchOn.toUpperCase()}`,
      });
    }
  }

  return matches;
}

export function validateLeadIntake(input: unknown): LeadIntakeResult | { status: "ok"; data: LeadIntakeInput } {
  const parsed = leadIntakeInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "invalid",
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }
  return { status: "ok", data: parsed.data };
}

export function buildLeadCreationProvenance(
  input: LeadIntakeInput,
  createdAt: string,
): CreationProvenance {
  return inboundLeadCreation({
    sourceType: input.sourceType,
    creationMethod: input.creationMethod,
    sourceRef: input.sourceRef ?? null,
    createdAt,
  });
}

export const CSV_LEAD_TEMPLATE = `name,company,email,phone,usdot,state,stated_need
Jordan Lee,Lee Logistics,jordan@leelogistics.example,5550100200,1234567,CA,Need help with New Entrant packet
`;

export const CSV_LEAD_COLUMNS = [
  "name",
  "company",
  "email",
  "phone",
  "usdot",
  "state",
  "stated_need",
] as const;

export type CsvLeadColumn = (typeof CSV_LEAD_COLUMNS)[number];

export function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (char === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = parseLine(lines[0] ?? "").map((header) => header.toLowerCase());
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

export function mapCsvRow(
  headers: string[],
  row: string[],
  mapping: Partial<Record<CsvLeadColumn, string>>,
): Record<CsvLeadColumn, string> {
  const indexByHeader = new Map(headers.map((header, index) => [header, index]));
  const read = (column: CsvLeadColumn) => {
    const header = mapping[column];
    if (!header) return "";
    const index = indexByHeader.get(header);
    if (index == null) return "";
    return row[index]?.trim() ?? "";
  };
  return {
    name: read("name"),
    company: read("company"),
    email: read("email"),
    phone: read("phone"),
    usdot: read("usdot"),
    state: read("state"),
    stated_need: read("stated_need"),
  };
}

export function guessCsvMapping(headers: string[]): Partial<Record<CsvLeadColumn, string>> {
  const mapping: Partial<Record<CsvLeadColumn, string>> = {};
  for (const header of headers) {
    const key = header.replace(/\s+/g, "_");
    if (["name", "contact", "contact_name", "full_name"].includes(key)) mapping.name = header;
    if (["company", "legal_name", "business"].includes(key)) mapping.company = header;
    if (["email", "email_address"].includes(key)) mapping.email = header;
    if (["phone", "telephone", "mobile"].includes(key)) mapping.phone = header;
    if (["usdot", "dot", "dot_number"].includes(key)) mapping.usdot = header;
    if (["state", "st"].includes(key)) mapping.state = header;
    if (["stated_need", "need", "notes", "message"].includes(key)) mapping.stated_need = header;
  }
  return mapping;
}
