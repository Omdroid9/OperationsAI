import type { OutreachReadiness } from "@/types";

export type { OutreachReadiness };

export type ProspectingOperationFilter = "any" | "interstate" | "authorized_for_hire";

export type ProspectingServiceFilter =
  | "any"
  | "onboarding"
  | "compliance_setup"
  | "software"
  | "filings_renewals";

export interface ProspectingFilters {
  state: string;
  registrationWindowDays: number;
  fleetMin: number;
  fleetMax: number;
  operation: ProspectingOperationFilter;
  serviceNeed: ProspectingServiceFilter;
  requireContact: boolean;
  offset: number;
}

export interface ProspectingScoreLine {
  key: string;
  label: string;
  points: number;
  field: string;
  provenance: "FMCSA Census";
}

export interface DiscoveredProspect {
  usdot: string;
  legalName: string;
  dbaName: string | null;
  city: string;
  state: string;
  powerUnits: number;
  drivers: number;
  addDate: string | null;
  mcs150Date: string | null;
  carrierOperation: string | null;
  classdef: string | null;
  phone: string | null;
  email: string | null;
  officer: string | null;
  score: number;
  scoreLines: ProspectingScoreLine[];
  reviewReason: string;
  outreachReadiness: OutreachReadiness;
  outreachReason: string;
  suggestedService: string;
  alreadyInWorkspace: boolean;
  duplicateLabel: string | null;
  sourceDataset: "az4n-8mr2";
  queriedAt: string;
}

export interface ProspectingSearchResult {
  live: boolean;
  queriedAt: string;
  sourceDataset: "az4n-8mr2";
  sourceUrl: string;
  filters: ProspectingFilters;
  offset: number;
  limit: number;
  totalEligible: number;
  prospects: DiscoveredProspect[];
  note?: string;
}

export interface CensusProspectSaveInput {
  usdot: string;
  legalName: string;
  dbaName?: string | null;
  city: string;
  state: string;
  powerUnits: number;
  drivers?: number;
  phone?: string | null;
  email?: string | null;
  carrierOperation?: string | null;
  classdef?: string | null;
  addDate?: string | null;
  sourceRef: string;
  queriedAt: string;
  reviewReason?: string;
  outreachReadiness?: OutreachReadiness;
  outreachReadinessReason?: string;
  discoveryScore?: number;
}
