import { primaryRecommendedService, reasonSummary } from "@/lib/recommendations/services";
import { demoSeedLeadCreation } from "@/lib/leads/creation";
import { calculateOpportunityScore, getOpportunityScoreBreakdown } from "@/lib/scoring/opportunity-score";
import { detectCarrierSignals, primarySignalTitle } from "@/lib/signals/detect";
import { qualificationResultSchema } from "@/lib/validation/schemas";
import type {
  Activity,
  CallRecord,
  Carrier,
  CarrierSnapshot,
  CaseDocument,
  CaseTask,
  DemoState,
  Opportunity,
  OpportunityStage,
  QualificationResult,
  Regulation,
  ServiceCase,
} from "@/types";

const NOW = "2026-08-12T15:00:00.000-07:00";

interface CarrierDraft {
  id: string;
  usdot: string;
  legalName: string;
  dbaName?: string | null;
  state: string;
  city: string;
  phone?: string | null;
  email?: string | null;
  powerUnits: number;
  drivers: number;
  operationType: "interstate" | "intrastate";
  authorizedForHire: boolean;
  newEntrant: boolean;
  hazmat?: boolean;
  passenger?: boolean;
  cargoTypes?: string[];
  authorityStatus?: Carrier["authorityStatus"];
  isCustomer?: boolean;
  existingServices?: string[];
  dormant?: boolean;
  crmContext?: boolean;
  regulatoryMatch?: boolean;
  stage?: OpportunityStage;
  assignedTo?: string | null;
  preferredLanguage?: string | null;
  nextAction?: string;
  followUpAt?: string | null;
  lastActivityAt?: string;
  lastActivityLabel?: string;
  snapshots?: Array<Pick<CarrierSnapshot, "snapshotDate" | "powerUnits" | "drivers">>;
}

function carrierFromDraft(draft: CarrierDraft): Carrier {
  return {
    id: draft.id,
    usdot: draft.usdot,
    legalName: draft.legalName,
    dbaName: draft.dbaName ?? null,
    state: draft.state,
    city: draft.city,
    phone: draft.phone ?? null,
    email: draft.email ?? null,
    powerUnits: draft.powerUnits,
    drivers: draft.drivers,
    operationType: draft.operationType,
    authorizedForHire: draft.authorizedForHire,
    newEntrant: draft.newEntrant,
    hazmat: draft.hazmat ?? false,
    passenger: draft.passenger ?? false,
    cargoTypes: draft.cargoTypes ?? ["General freight"],
    authorityStatus: draft.authorityStatus ?? "active",
    isCustomer: draft.isCustomer ?? false,
    existingServices: draft.existingServices ?? [],
    profileKind: "demo",
    source: "DEMO",
    sourceLastCheckedAt: NOW,
    createdAt: "2026-05-01T10:00:00.000-07:00",
    updatedAt: draft.lastActivityAt ?? NOW,
  };
}

const DRAFTS: CarrierDraft[] = [
  {
    id: "patel-freight",
    usdot: "3418821",
    legalName: "Patel Freight Solutions",
    city: "Stockton",
    state: "CA",
    phone: "(209) 555-0148",
    email: "ravi@patelfreight.example",
    powerUnits: 4,
    drivers: 5,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: true,
    cargoTypes: ["General freight", "Produce"],
    crmContext: true,
    stage: "REVIEWED",
    assignedTo: "A. Mehta",
    nextAction: "Qualify",
    lastActivityAt: "2026-08-11T16:20:00.000-07:00",
    lastActivityLabel: "Profile reviewed",
  },
  {
    id: "sierra-valley",
    usdot: "2874410",
    legalName: "Sierra Valley Freight LLC",
    city: "Marysville",
    state: "CA",
    phone: "(530) 555-0194",
    powerUnits: 7,
    drivers: 8,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: false,
    stage: "DETECTED",
    nextAction: "Review opportunity",
    lastActivityAt: "2026-08-12T09:10:00.000-07:00",
    lastActivityLabel: "Fleet growth detected",
    snapshots: [
      { snapshotDate: "2026-05-12", powerUnits: 2, drivers: 2 },
      { snapshotDate: "2026-06-18", powerUnits: 3, drivers: 3 },
      { snapshotDate: "2026-08-08", powerUnits: 7, drivers: 8 },
    ],
  },
  {
    id: "central-coast",
    usdot: "1023387",
    legalName: "Central Coast Transport",
    city: "Salinas",
    state: "CA",
    powerUnits: 86,
    drivers: 94,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: false,
    stage: "DETECTED",
    nextAction: "Low priority — review if needed",
    lastActivityAt: "2026-08-09T11:00:00.000-07:00",
    lastActivityLabel: "Profile imported",
  },
  {
    id: "western-ridge",
    usdot: "3561204",
    legalName: "Western Ridge Logistics",
    city: "Fresno",
    state: "CA",
    phone: "(559) 555-0172",
    powerUnits: 6,
    drivers: 6,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: true,
    regulatoryMatch: true,
    stage: "DETECTED",
    nextAction: "Review regulation match",
    lastActivityAt: "2026-08-12T08:40:00.000-07:00",
    lastActivityLabel: "Regulation match",
  },
  {
    id: "redwood-linehaul",
    usdot: "1987743",
    legalName: "Redwood Linehaul Inc.",
    city: "Eureka",
    state: "CA",
    phone: "(707) 555-0133",
    powerUnits: 12,
    drivers: 14,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: false,
    isCustomer: true,
    existingServices: ["IFTA", "IRP"],
    crmContext: true,
    stage: "WON",
    assignedTo: "A. Mehta",
    nextAction: "Review missing items",
    lastActivityAt: "2026-08-12T10:05:00.000-07:00",
    lastActivityLabel: "Document needs review",
  },
  {
    id: "golden-valley",
    usdot: "3120988",
    legalName: "Golden Valley Carriers",
    city: "Modesto",
    state: "CA",
    phone: "(209) 555-0160",
    powerUnits: 6,
    drivers: 6,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: false,
    dormant: true,
    crmContext: true,
    stage: "DETECTED",
    nextAction: "Re-review dormant lead",
    lastActivityAt: "2026-08-10T14:00:00.000-07:00",
    lastActivityLabel: "Fleet size changed",
    snapshots: [
      { snapshotDate: "2025-11-02", powerUnits: 1, drivers: 1 },
      { snapshotDate: "2026-08-09", powerUnits: 6, drivers: 6 },
    ],
  },
  {
    id: "pacific-route",
    usdot: "2210981",
    legalName: "Pacific Route Logistics",
    city: "Oakland",
    state: "CA",
    powerUnits: 18,
    drivers: 21,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: false,
    isCustomer: true,
    existingServices: ["IFTA"],
    crmContext: true,
    stage: "REVIEWED",
    nextAction: "Discuss managed compliance",
    lastActivityAt: "2026-08-11T09:30:00.000-07:00",
    lastActivityLabel: "Customer expansion signal",
    snapshots: [
      { snapshotDate: "2026-02-01", powerUnits: 9, drivers: 10 },
      { snapshotDate: "2026-08-01", powerUnits: 18, drivers: 21 },
    ],
  },
  {
    id: "valley-star",
    usdot: "3441209",
    legalName: "Valley Star Transport",
    city: "Visalia",
    state: "CA",
    powerUnits: 3,
    drivers: 3,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: true,
    crmContext: true,
    stage: "LOST",
    nextAction: "No follow-up",
    lastActivityAt: "2026-08-05T13:10:00.000-07:00",
    lastActivityLabel: "Marked lost — timing",
  },
  {
    id: "summit-freight",
    usdot: "3309812",
    legalName: "Summit Freight Systems",
    city: "Reno",
    state: "NV",
    phone: "(775) 555-0188",
    powerUnits: 5,
    drivers: 5,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: true,
    stage: "CONTACTED",
    assignedTo: "L. Ortega",
    preferredLanguage: "Spanish",
    nextAction: "Follow up today",
    followUpAt: "2026-08-12T16:00:00.000-07:00",
    lastActivityAt: "2026-08-11T17:40:00.000-07:00",
    lastActivityLabel: "Left voicemail",
  },
  {
    id: "sierra-coast",
    usdot: "2766510",
    legalName: "Sierra Coast Hauling",
    city: "San Luis Obispo",
    state: "CA",
    phone: "(805) 555-0119",
    powerUnits: 8,
    drivers: 9,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: true,
    isCustomer: true,
    existingServices: ["New Entrant Compliance Review"],
    crmContext: true,
    stage: "WON",
    assignedTo: "A. Mehta",
    preferredLanguage: "English",
    nextAction: "Case in progress",
    lastActivityAt: "2026-08-08T11:20:00.000-07:00",
    lastActivityLabel: "Service started",
  },
  {
    id: "hill-country",
    usdot: "4012287",
    legalName: "Hill Country Freight",
    city: "San Marcos",
    state: "TX",
    phone: "(512) 555-0144",
    powerUnits: 4,
    drivers: 4,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: true,
    stage: "QUALIFIED",
    assignedTo: "L. Ortega",
    preferredLanguage: "English",
    nextAction: "Schedule consultation",
    lastActivityAt: "2026-08-10T15:15:00.000-07:00",
    lastActivityLabel: "Qualification completed",
  },
  {
    id: "bayshore-haul",
    usdot: "3510021",
    legalName: "Bayshore Haul Co",
    city: "San Jose",
    state: "CA",
    powerUnits: 3,
    drivers: 3,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: true,
    stage: "DETECTED",
    nextAction: "Review opportunity",
    lastActivityAt: "2026-08-12T07:55:00.000-07:00",
    lastActivityLabel: "New Entrant detected",
  },
  {
    id: "inland-empire",
    usdot: "3188701",
    legalName: "Inland Empire Carriers",
    city: "Ontario",
    state: "CA",
    powerUnits: 9,
    drivers: 11,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: false,
    stage: "REVIEWED",
    nextAction: "Qualify",
    lastActivityAt: "2026-08-07T12:00:00.000-07:00",
    lastActivityLabel: "Reviewed",
  },
  {
    id: "tehachapi-linehaul",
    usdot: "3621190",
    legalName: "Tehachapi Linehaul",
    city: "Tehachapi",
    state: "CA",
    powerUnits: 2,
    drivers: 2,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: true,
    stage: "DETECTED",
    nextAction: "Review opportunity",
    lastActivityAt: "2026-08-11T08:12:00.000-07:00",
    lastActivityLabel: "Signal detected",
  },
  {
    id: "mojave-basin",
    usdot: "2991044",
    legalName: "Mojave Basin Transport",
    city: "Barstow",
    state: "CA",
    powerUnits: 11,
    drivers: 12,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: false,
    stage: "CONTACTED",
    nextAction: "Wait for callback window",
    followUpAt: "2026-08-13T10:00:00.000-07:00",
    lastActivityAt: "2026-08-10T18:00:00.000-07:00",
    lastActivityLabel: "Call attempted",
  },
  {
    id: "salinas-valley",
    usdot: "3409811",
    legalName: "Salinas Valley Freight",
    city: "Gonzales",
    state: "CA",
    powerUnits: 5,
    drivers: 6,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: true,
    stage: "CONSULTATION",
    assignedTo: "A. Mehta",
    nextAction: "Complete consultation notes",
    lastActivityAt: "2026-08-09T16:45:00.000-07:00",
    lastActivityLabel: "Consultation booked",
  },
  {
    id: "kern-county",
    usdot: "2776502",
    legalName: "Kern County Logistics",
    city: "Bakersfield",
    state: "CA",
    powerUnits: 22,
    drivers: 25,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: false,
    stage: "DETECTED",
    nextAction: "Review if capacity allows",
    lastActivityAt: "2026-08-06T09:00:00.000-07:00",
    lastActivityLabel: "Imported",
  },
  {
    id: "oxnard-harbor",
    usdot: "3318704",
    legalName: "Oxnard Harbor Transport",
    city: "Oxnard",
    state: "CA",
    powerUnits: 4,
    drivers: 4,
    operationType: "intrastate",
    authorizedForHire: true,
    newEntrant: true,
    stage: "DETECTED",
    nextAction: "Review opportunity",
    lastActivityAt: "2026-08-08T10:22:00.000-07:00",
    lastActivityLabel: "Signal detected",
  },
  {
    id: "lone-star",
    usdot: "884221",
    legalName: "Lone Star Haulage",
    city: "Dallas",
    state: "TX",
    powerUnits: 64,
    drivers: 70,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: false,
    stage: "DISMISSED",
    nextAction: "Dismissed — established fleet",
    lastActivityAt: "2026-07-22T11:00:00.000-07:00",
    lastActivityLabel: "Dismissed",
  },
  {
    id: "rio-grande",
    usdot: "3901142",
    legalName: "Rio Grande Carriers",
    city: "El Paso",
    state: "TX",
    powerUnits: 8,
    drivers: 9,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: true,
    stage: "DETECTED",
    nextAction: "Review opportunity",
    lastActivityAt: "2026-08-11T11:11:00.000-07:00",
    lastActivityLabel: "Signal detected",
  },
  {
    id: "pecos-valley",
    usdot: "2884103",
    legalName: "Pecos Valley Transport",
    city: "Odessa",
    state: "TX",
    powerUnits: 15,
    drivers: 16,
    operationType: "intrastate",
    authorizedForHire: true,
    newEntrant: false,
    stage: "DETECTED",
    nextAction: "Low priority",
    lastActivityAt: "2026-08-04T08:00:00.000-07:00",
    lastActivityLabel: "Imported",
  },
  {
    id: "cascadia-freight",
    usdot: "3104428",
    legalName: "Cascadia Freight Co",
    city: "Medford",
    state: "OR",
    powerUnits: 6,
    drivers: 7,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: true,
    stage: "REVIEWED",
    nextAction: "Qualify",
    lastActivityAt: "2026-08-10T09:40:00.000-07:00",
    lastActivityLabel: "Reviewed",
  },
  {
    id: "desert-ridge",
    usdot: "3677810",
    legalName: "Desert Ridge Logistics",
    city: "Phoenix",
    state: "AZ",
    powerUnits: 5,
    drivers: 5,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: true,
    stage: "DETECTED",
    nextAction: "Review opportunity",
    lastActivityAt: "2026-08-12T06:30:00.000-07:00",
    lastActivityLabel: "Signal detected",
  },
  {
    id: "high-desert",
    usdot: "3012284",
    legalName: "High Desert Hauling",
    city: "Las Vegas",
    state: "NV",
    powerUnits: 3,
    drivers: 3,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: false,
    stage: "DETECTED",
    nextAction: "Review opportunity",
    lastActivityAt: "2026-08-09T07:18:00.000-07:00",
    lastActivityLabel: "Signal detected",
  },
  {
    id: "delta-produce",
    usdot: "2744091",
    legalName: "Delta Produce Haul",
    city: "Lodi",
    state: "CA",
    powerUnits: 7,
    drivers: 8,
    operationType: "intrastate",
    authorizedForHire: true,
    newEntrant: false,
    stage: "DETECTED",
    nextAction: "Review opportunity",
    lastActivityAt: "2026-08-03T12:00:00.000-07:00",
    lastActivityLabel: "Imported",
  },
  {
    id: "north-bay-drayage",
    usdot: "3488712",
    legalName: "North Bay Drayage",
    city: "Vallejo",
    state: "CA",
    powerUnits: 4,
    drivers: 5,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: true,
    stage: "DETECTED",
    nextAction: "Review opportunity",
    lastActivityAt: "2026-08-12T11:02:00.000-07:00",
    lastActivityLabel: "Signal detected",
  },
  {
    id: "east-bay-intermodal",
    usdot: "2199033",
    legalName: "East Bay Intermodal",
    city: "Richmond",
    state: "CA",
    powerUnits: 31,
    drivers: 34,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: false,
    isCustomer: true,
    existingServices: ["IFTA", "IRP", "ELDT"],
    crmContext: true,
    stage: "WON",
    nextAction: "Monitor only",
    lastActivityAt: "2026-07-30T10:00:00.000-07:00",
    lastActivityLabel: "Customer of record",
  },
  {
    id: "bakersfield-route",
    usdot: "3550188",
    legalName: "Bakersfield Route Lines",
    city: "Bakersfield",
    state: "CA",
    powerUnits: 2,
    drivers: 2,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: true,
    stage: "DETECTED",
    nextAction: "Review opportunity",
    lastActivityAt: "2026-08-11T19:20:00.000-07:00",
    lastActivityLabel: "Signal detected",
  },
  {
    id: "stockton-river",
    usdot: "3299001",
    legalName: "Stockton River Freight",
    city: "Stockton",
    state: "CA",
    powerUnits: 6,
    drivers: 6,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: true,
    stage: "REVIEWED",
    nextAction: "Qualify",
    lastActivityAt: "2026-08-08T15:00:00.000-07:00",
    lastActivityLabel: "Reviewed",
  },
  {
    id: "fresno-corridor",
    usdot: "3004419",
    legalName: "Fresno Corridor Carriers",
    city: "Fresno",
    state: "CA",
    powerUnits: 10,
    drivers: 12,
    operationType: "interstate",
    authorizedForHire: true,
    newEntrant: false,
    stage: "DETECTED",
    nextAction: "Review opportunity",
    lastActivityAt: "2026-08-07T08:45:00.000-07:00",
    lastActivityLabel: "Signal detected",
  },
];

export const PATEL_QUALIFICATION: QualificationResult = qualificationResultSchema.parse({
  language: "English",
  preferred_language: "Hindi",
  detected_languages: ["Hindi", "English"],
  contact_verified: true,
  fleet_size_confirmed: 4,
  compliance_management: "internal",
  current_provider: null,
  needs: ["new_entrant_preparation"],
  interest_level: "high",
  callback_requested: true,
  callback_time: "tomorrow afternoon",
  consultation_accepted: true,
  consultation_preference: "phone",
  objections: [],
  summary_english:
    "Owner operates four trucks and currently manages compliance internally. New Entrant preparation has not been completed and the owner accepted a consultation follow-up.",
  call_outcome: "Interested in New Entrant support; callback requested.",
  suggested_next_step: "Schedule follow-up",
});

export const PATEL_TRANSCRIPT = `Agent: Hello, I'm calling on behalf of SkyOS. You can continue in English, Spanish, Hindi, Punjabi, or Marathi. Which language would you prefer?

Caller: Hindi theek rahega. Haan, main Ravi Patel bol raha hoon.

Agent: Dhanyavaad, Ravi ji. Kya aap Patel Freight Solutions se baat kar rahe hain?

Caller: Haan, sahi hai. Mere paas 4 trucks hain and IFTA main khud handle karta hoon.

Agent: Aap abhi compliance internally handle karte hain — koi bahar ki company nahi?

Caller: Nahi, khud hi. New Entrant ka process abhi complete nahi hua. Thoda confusing hai.

Agent: Kya aap chahenge ki koi team member follow-up kare?

Caller: Haan, tomorrow afternoon theek rahega.`;

const HILL_QUALIFICATION: QualificationResult = qualificationResultSchema.parse({
  language: "English",
  preferred_language: null,
  detected_languages: ["English"],
  contact_verified: true,
  fleet_size_confirmed: 4,
  compliance_management: "external",
  current_provider: "Local bookkeeper",
  needs: ["irp_ifta_review"],
  interest_level: "medium",
  callback_requested: true,
  callback_time: "next week",
  consultation_accepted: null,
  consultation_preference: null,
  objections: ["Already has some help"],
  summary_english:
    "Dispatcher confirmed four trucks. A local bookkeeper files some paperwork. IRP/IFTA review was requested for next week.",
});

export const SAMPLE_REGULATION_TEXT = `FEDERAL MOTOR CARRIER SAFETY ADMINISTRATION
Docket No. FMCSA-2026-0144
New Entrant Safety Assurance Program — Supplemental Device and Recordkeeping Requirements

Published: August 1, 2026
Effective: August 15, 2026
Compliance deadline: October 15, 2026

This notice clarifies that interstate New Entrant motor carriers must complete an updated safety assurance packet, including driver qualification file completeness and hours-of-service recordkeeping using an approved electronic logging device where required.

Carriers operating in interstate commerce that are currently in the New Entrant program should review device compatibility and file completeness before the October 15, 2026 deadline.

This prototype text is illustrative and is not an official FMCSA publication.`;

export const SAMPLE_REGULATION_ANALYSIS = {
  agency: "FMCSA",
  title: "New Entrant Safety Assurance — Supplemental Recordkeeping",
  category: "New Entrant",
  published_date: "2026-08-01",
  effective_date: "2026-08-15",
  deadline: "2026-10-15",
  affected_segment: "interstate New Entrant carriers",
  required_action: "Review New Entrant packet completeness and ELD recordkeeping before October 15, 2026",
  confidence: 0.91,
  source_summary:
    "Illustrative notice directing interstate New Entrants to complete an updated safety assurance packet and confirm hours-of-service recordkeeping before the stated deadline.",
};

export const SAMPLE_MEDICAL_EXTRACTION = {
  document_type: "medical_certificate",
  person_name: "Harjit Singh",
  issued_date: "2026-01-10",
  expiration_date: "2027-01-10",
  confidence: 0.94,
};

function buildOpportunity(carrier: Carrier, draft: CarrierDraft, snapshots: CarrierSnapshot[]): {
  opportunity: Opportunity;
  signals: ReturnType<typeof detectCarrierSignals>;
} {
  const signals = detectCarrierSignals(carrier, snapshots, {
    dormant: draft.dormant,
    crmContext: draft.crmContext,
    regulatoryMatch: draft.regulatoryMatch,
    detectedAt: draft.lastActivityAt ?? NOW,
  });
  const breakdown = getOpportunityScoreBreakdown(carrier, signals);
  const score = calculateOpportunityScore(breakdown);
  const services = [primaryRecommendedService(carrier, signals)];
  const createdAt = draft.lastActivityAt ?? NOW;
  const creation = demoSeedLeadCreation(createdAt, carrier.id);
  const opportunity: Opportunity = {
    id: `opp_${carrier.id}`,
    carrierId: carrier.id,
    recordKind: "lead",
    creation,
    stage: draft.stage ?? "DETECTED",
    score,
    scoreBreakdown: breakdown,
    recommendedService: services[0] ?? "Compliance review",
    reasonSummary: reasonSummary(carrier, services),
    signalTitle: primarySignalTitle(signals),
    contactName: null,
    statedNeed: null,
    assignedTo: draft.assignedTo === "A. Mehta" ? "staff_mehta" : draft.assignedTo === "L. Ortega" ? "staff_ortega" : draft.assignedTo ?? null,
    preferredLanguage: draft.preferredLanguage ?? null,
    detectedLanguages: draft.preferredLanguage ? [draft.preferredLanguage] : [],
    nextAction: draft.nextAction ?? "Review opportunity",
    followUpAt: draft.followUpAt ?? null,
    lastActivityAt: draft.lastActivityAt ?? NOW,
    lastActivityLabel: draft.lastActivityLabel ?? "Signal detected",
    interestLevel: draft.stage === "QUALIFIED" || draft.stage === "CONSULTATION" || draft.stage === "WON" ? "high" : null,
    callbackRequested: Boolean(draft.followUpAt),
    caseId: null,
    consultationStatus:
      draft.stage === "CONSULTATION"
        ? "scheduled"
        : draft.stage === "WON"
          ? "service_approved"
          : "not_applicable",
    consultationScheduledAt: draft.stage === "CONSULTATION" ? draft.followUpAt ?? null : null,
    consultationNote: null,
    serviceApprovedAt: draft.stage === "WON" ? createdAt : null,
    createdAt,
    updatedAt: draft.lastActivityAt ?? NOW,
  };
  return { opportunity, signals };
}

function activity(
  id: string,
  leadId: string,
  type: Activity["type"],
  content: string,
  createdAt: string,
  createdBy = "SkyOS",
): Activity {
  return { id, leadId, type, content, createdAt, createdBy };
}

export function createInitialState(): DemoState {
  const carriers: Carrier[] = [];
  const snapshots: CarrierSnapshot[] = [];
  const signals = [];
  const opportunities: Opportunity[] = [];

  for (const draft of DRAFTS) {
    const carrier = carrierFromDraft(draft);
    carriers.push(carrier);
    const carrierSnapshots = (draft.snapshots ?? []).map((snapshot, index) => ({
      id: `snap_${carrier.id}_${index}`,
      carrierId: carrier.id,
      snapshotDate: snapshot.snapshotDate,
      powerUnits: snapshot.powerUnits,
      drivers: snapshot.drivers,
      authorityStatus: carrier.authorityStatus,
      operationType: carrier.operationType,
    }));
    snapshots.push(...carrierSnapshots);
    const built = buildOpportunity(carrier, draft, carrierSnapshots);
    signals.push(...built.signals);
    opportunities.push(built.opportunity);
  }

  const patel = opportunities.find((item) => item.carrierId === "patel-freight");
  const hill = opportunities.find((item) => item.carrierId === "hill-country");
  const redwood = opportunities.find((item) => item.carrierId === "redwood-linehaul");
  const sierraCoast = opportunities.find((item) => item.carrierId === "sierra-coast");
  const western = opportunities.find((item) => item.carrierId === "western-ridge");

  const activities: Activity[] = [];
  if (patel) {
    patel.stage = "CONSULTATION";
    patel.consultationStatus = "needs_follow_up";
    patel.assignedTo = "staff_mehta";
    patel.preferredLanguage = "Hindi";
    patel.interestLevel = "high";
    patel.callbackRequested = true;
    patel.nextAction = "Schedule consultation";
    patel.lastActivityLabel = "Consultation accepted on call";
    patel.lastActivityAt = "2026-08-12T11:30:00.000-07:00";
    activities.push(
      activity("act_patel_signal", patel.id, "SIGNAL", "New Entrant opportunity detected from public operating profile.", "2026-08-10T09:00:00.000-07:00"),
      activity("act_patel_review", patel.id, "STAGE_CHANGE", "Moved to Reviewed after human review of the carrier profile.", "2026-08-11T16:20:00.000-07:00", "A. Mehta"),
      activity("act_patel_note", patel.id, "NOTE", "Owner listed on the MCS-150 appears to be Ravi Patel. No prior service history.", "2026-08-11T16:24:00.000-07:00", "A. Mehta"),
      activity("act_patel_call", patel.id, "CALL", "Qualification call completed. Consultation accepted. Follow-up requested.", "2026-08-12T11:30:00.000-07:00", "SkyOS"),
    );
  }
  if (hill) {
    activities.push(
      activity("act_hill_call", hill.id, "CALL", "Qualification call completed. Interest medium. Callback requested next week.", "2026-08-10T15:15:00.000-07:00", "SkyOS"),
      activity("act_hill_stage", hill.id, "STAGE_CHANGE", "Moved to Qualified.", "2026-08-10T15:16:00.000-07:00", "SkyOS"),
    );
  }
  if (redwood) {
    activities.push(
      activity("act_redwood_won", redwood.id, "STAGE_CHANGE", "Marked Won. IFTA/IRP service in progress.", "2026-07-18T10:00:00.000-07:00", "A. Mehta"),
      activity("act_redwood_doc", redwood.id, "NOTE", "Medical certificate uploaded. Extracted fields need review.", "2026-08-12T10:05:00.000-07:00", "SkyOS"),
    );
  }

  const calls: CallRecord[] = [];
  if (patel) {
    calls.push({
      id: "call_patel-freight",
      leadId: patel.id,
      carrierId: "patel-freight",
      provider: "demo",
      providerCallId: "demo_patel_1",
      status: "completed",
      startedAt: "2026-08-12T11:18:00.000-07:00",
      endedAt: "2026-08-12T11:28:00.000-07:00",
      durationSeconds: 10 * 60,
      language: "Hindi",
      detectedLanguages: ["Hindi", "English"],
      originalTranscript: PATEL_TRANSCRIPT,
      transcriptUrl: null,
      englishSummary: PATEL_QUALIFICATION.summary_english ?? "",
      qualification: PATEL_QUALIFICATION,
      recordingUrl: null,
      createdAt: "2026-08-12T11:30:00.000-07:00",
    });
  }
  if (hill) {
    calls.push({
      id: "call_hill-country",
      leadId: hill.id,
      carrierId: "hill-country",
      provider: "demo",
      providerCallId: "demo_hill_1",
      status: "completed",
      startedAt: "2026-08-10T15:02:00.000-07:00",
      endedAt: "2026-08-10T15:14:00.000-07:00",
      durationSeconds: 12 * 60,
      language: "English",
      detectedLanguages: ["English"],
      originalTranscript:
        "Agent: Hello, I'm calling on behalf of SkyOS. Which language would you prefer?\nCaller: English is fine. This is Marco at Hill Country Freight.\nAgent: Can you confirm how many trucks you run today?\nCaller: Four trucks. A local bookkeeper handles some of the filings.\nAgent: Would you like a human follow-up on IRP and IFTA?\nCaller: Yes, next week works.",
      transcriptUrl: null,
      englishSummary: HILL_QUALIFICATION.summary_english ?? "",
      qualification: HILL_QUALIFICATION,
      recordingUrl: null,
      createdAt: "2026-08-10T15:15:00.000-07:00",
    });
  }

  const regulations: Regulation[] = [
    {
      id: "reg_new-entrant-packet",
      title: SAMPLE_REGULATION_ANALYSIS.title,
      agency: SAMPLE_REGULATION_ANALYSIS.agency,
      sourceUrl: null,
      sourceText: SAMPLE_REGULATION_TEXT,
      category: SAMPLE_REGULATION_ANALYSIS.category,
      publishedDate: SAMPLE_REGULATION_ANALYSIS.published_date,
      effectiveDate: SAMPLE_REGULATION_ANALYSIS.effective_date,
      deadline: SAMPLE_REGULATION_ANALYSIS.deadline,
      affectedSegment: SAMPLE_REGULATION_ANALYSIS.affected_segment,
      requiredAction: SAMPLE_REGULATION_ANALYSIS.required_action,
      confidence: SAMPLE_REGULATION_ANALYSIS.confidence,
      sourceSummary: SAMPLE_REGULATION_ANALYSIS.source_summary,
      status: "analyzed",
      campaignCreated: false,
      customersFlagged: false,
      sourceType: "demo_seed",
      fetchedAt: null,
      documentNumber: null,
      createdAt: "2026-08-12T08:30:00.000-07:00",
    },
    {
      id: "reg_needs-review",
      title: "Unparsed notice",
      agency: "Unknown",
      sourceUrl: null,
      sourceText: "",
      category: "Uncategorized",
      publishedDate: null,
      effectiveDate: null,
      deadline: null,
      affectedSegment: "Unknown",
      requiredAction: "Paste source text to analyze",
      confidence: 0,
      sourceSummary: "No analysis yet.",
      status: "needs_review",
      campaignCreated: false,
      customersFlagged: false,
      sourceType: "demo_seed",
      fetchedAt: null,
      documentNumber: null,
      createdAt: "2026-08-11T12:00:00.000-07:00",
    },
  ];

  const cases: ServiceCase[] = [];
  const documents: CaseDocument[] = [];
  const tasks: CaseTask[] = [];

  if (redwood) {
    const caseId = "case_redwood-linehaul";
    redwood.caseId = caseId;
    cases.push({
      id: caseId,
      leadId: redwood.id,
      carrierId: "redwood-linehaul",
      serviceType: "IFTA / IRP Review",
      serviceTypeKey: "renewal_support",
      ownerId: "staff_mehta",
      status: "IN_REVIEW",
      openedAt: "2026-07-18T10:00:00.000-07:00",
      targetDate: "2026-08-16T00:00:00.000-07:00",
      checklistLabel: "Renewal document checklist",
      serviceApprovedAt: "2026-07-18T10:00:00.000-07:00",
      createdAt: "2026-07-18T10:00:00.000-07:00",
      updatedAt: "2026-08-12T10:05:00.000-07:00",
    });
    documents.push(
      {
        id: "doc_redwood_medical",
        caseId,
        fileName: "medical_certificate.pdf",
        storagePath: "demo/medical_certificate.pdf",
        documentType: "medical_certificate",
        personName: SAMPLE_MEDICAL_EXTRACTION.person_name,
        issuedDate: SAMPLE_MEDICAL_EXTRACTION.issued_date,
        expirationDate: SAMPLE_MEDICAL_EXTRACTION.expiration_date,
        confidence: SAMPLE_MEDICAL_EXTRACTION.confidence,
        reviewStatus: "NEEDS_REVIEW",
        expirationVerified: false,
        required: true,
        createdAt: "2026-08-12T10:05:00.000-07:00",
      },
      {
        id: "doc_redwood_cdl",
        caseId,
        fileName: "cdl_harjit_singh.pdf",
        storagePath: "demo/cdl_harjit_singh.pdf",
        documentType: "cdl",
        personName: "Harjit Singh",
        issuedDate: "2024-03-02",
        expirationDate: "2028-03-02",
        confidence: 0.97,
        reviewStatus: "VERIFIED",
        expirationVerified: true,
        required: true,
        createdAt: "2026-07-20T09:00:00.000-07:00",
      },
    );
    tasks.push(
      {
        id: "task_redwood_mvr",
        caseId,
        title: "Request MVR",
        description: "MVR has not been received.",
        status: "open",
        priority: "high",
        dueDate: "2026-08-16T00:00:00.000-07:00",
        source: "DERIVED",
        assignedTo: "staff_mehta",
        kind: "checklist",
        createdAt: "2026-08-12T10:06:00.000-07:00",
      },
      {
        id: "task_redwood_medical",
        caseId,
        title: "Verify medical certificate",
        description: "Extracted fields need human confirmation.",
        status: "open",
        priority: "high",
        dueDate: NOW,
        source: "DERIVED",
        assignedTo: "staff_mehta",
        kind: "checklist",
        createdAt: "2026-08-12T10:06:00.000-07:00",
      },
    );
  }

  if (sierraCoast) {
    const caseId = "case_sierra-coast";
    sierraCoast.caseId = caseId;
    cases.push({
      id: caseId,
      leadId: sierraCoast.id,
      carrierId: "sierra-coast",
      serviceType: "New Entrant Compliance Review",
      serviceTypeKey: "compliance_onboarding",
      ownerId: "staff_mehta",
      status: "WAITING_ON_CLIENT",
      openedAt: "2026-08-08T11:20:00.000-07:00",
      targetDate: "2026-08-22T00:00:00.000-07:00",
      checklistLabel: "New entrant compliance checklist",
      serviceApprovedAt: "2026-08-08T11:20:00.000-07:00",
      createdAt: "2026-08-08T11:20:00.000-07:00",
      updatedAt: "2026-08-11T09:00:00.000-07:00",
    });
    tasks.push({
      id: "task_sierra_dq",
      caseId,
      title: "Request driver qualification file",
      description: "Client was asked to send remaining DQ documents.",
      status: "open",
      priority: "medium",
      dueDate: "2026-08-18T00:00:00.000-07:00",
      source: "CRM",
      assignedTo: "staff_mehta",
      kind: "checklist",
      createdAt: "2026-08-11T09:00:00.000-07:00",
    });
    documents.push({
      id: "doc_sierra_insurance",
      caseId,
      fileName: "insurance_certificate.pdf",
      storagePath: "demo/insurance_certificate.pdf",
      documentType: "insurance",
      personName: null,
      issuedDate: "2025-08-22",
      expirationDate: "2026-08-22",
      confidence: 0.92,
      reviewStatus: "VERIFIED",
      expirationVerified: false,
      required: true,
      createdAt: "2026-08-08T11:25:00.000-07:00",
    });
  }

  if (western) {
    activities.push(
      activity(
        "act_western_reg",
        western.id,
        "SIGNAL",
        "Potential match to New Entrant Safety Assurance notice. Device vendor unknown.",
        "2026-08-12T08:40:00.000-07:00",
      ),
    );
  }

  return {
    carriers,
    snapshots,
    signals,
    opportunities,
    activities,
    calls,
    regulations,
    matches: {},
    cases,
    documents,
    tasks,
  };
}
