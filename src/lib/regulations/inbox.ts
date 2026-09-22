import type { Regulation } from "@/types";

export interface InboxNotice {
  id: string;
  sourceText: string;
  analysis: {
    agency: string;
    title: string;
    category: string;
    published_date: string | null;
    effective_date: string | null;
    deadline: string | null;
    affected_segment: string;
    required_action: string;
    confidence: number;
    source_summary: string;
  };
}

export const REGULATORY_INBOX: InboxNotice[] = [
  {
    id: "inbox_eld-small-fleet",
    sourceText: `FEDERAL MOTOR CARRIER SAFETY ADMINISTRATION
Docket No. FMCSA-2026-0198
Electronic Logging Device — Small Fleet Clarification

Published: August 5, 2026
Effective: September 1, 2026
Compliance deadline: November 1, 2026

Interstate carriers operating 1–10 power units must confirm ELD compatibility and retain supporting documentation in the driver qualification file.

Small fleet interstate carriers should review device vendor records and hours-of-service policies before the November 1, 2026 deadline.

Illustrative prototype text — not an official FMCSA publication.`,
    analysis: {
      agency: "FMCSA",
      title: "ELD Clarification — Small Interstate Fleets",
      category: "Hours of Service",
      published_date: "2026-08-05",
      effective_date: "2026-09-01",
      deadline: "2026-11-01",
      affected_segment: "interstate small fleet carriers (1–10 power units)",
      required_action:
        "Confirm ELD vendor compatibility and retain supporting documentation before November 1, 2026",
      confidence: 0.88,
      source_summary:
        "Illustrative notice asking small interstate fleets to confirm ELD compatibility and retain supporting documentation.",
    },
  },
];

export function getUnimportedInboxNotices(regulations: Regulation[]): InboxNotice[] {
  const titles = new Set(regulations.map((item) => item.title));
  return REGULATORY_INBOX.filter((notice) => !titles.has(notice.analysis.title));
}
