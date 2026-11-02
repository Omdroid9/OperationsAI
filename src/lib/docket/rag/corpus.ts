export type DocumentExemplar = {
  id: string;
  documentType: "medical_certificate" | "cdl" | "insurance" | "other";
  label: string;
  personName: string;
  issuedDate: string;
  expirationDate: string;
  notes: string;
  reviewStatus: "VERIFIED";
};

/**
 * Seeded prior confirmed document exemplars for Docket confirm grounding.
 * Demo-safe — not real PII; used only to show staff what a confirmed extraction looked like.
 */
export const SEEDED_DOCUMENT_EXEMPLARS: DocumentExemplar[] = [
  {
    id: "ex_med_harjit",
    documentType: "medical_certificate",
    label: "Medical certificate · confirmed pattern",
    personName: "Harjit Singh",
    issuedDate: "2026-01-10",
    expirationDate: "2027-01-10",
    notes: "Name matches case contact. 12-month certificate window. Staff confirmed before renewal task.",
    reviewStatus: "VERIFIED",
  },
  {
    id: "ex_cdl_harjit",
    documentType: "cdl",
    label: "CDL · confirmed pattern",
    personName: "Harjit Singh",
    issuedDate: "2024-06-01",
    expirationDate: "2028-06-01",
    notes: "Class A. Expiration verified against state card photo. Do not trust extraction alone.",
    reviewStatus: "VERIFIED",
  },
  {
    id: "ex_med_generic",
    documentType: "medical_certificate",
    label: "Medical certificate · short validity",
    personName: "Sample Driver",
    issuedDate: "2026-03-01",
    expirationDate: "2026-09-01",
    notes: "Six-month certificate — confirm specialty restriction before setting renewal.",
    reviewStatus: "VERIFIED",
  },
  {
    id: "ex_insurance",
    documentType: "insurance",
    label: "Insurance certificate · confirmed pattern",
    personName: "—",
    issuedDate: "2025-08-22",
    expirationDate: "2026-08-22",
    notes: "Policy period confirmed from certificate schedule. Carrier name must match case.",
    reviewStatus: "VERIFIED",
  },
];
