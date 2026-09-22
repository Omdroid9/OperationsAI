import { daysSince, parseCensusAddDate, registrationCutoffIso } from "@/lib/prospecting/dates";
import { eligibleFleetsizeSoql } from "@/lib/prospecting/fleetsize";
import { mockProspectingResults } from "@/lib/prospecting/mock";
import {
  censusRowSchema,
  isAuthorizedForHire,
  isInterstateOperation,
  normalizeEmail,
  normalizePhone,
  parseDrivers,
  parsePowerUnits,
} from "@/lib/prospecting/normalize";
import { outreachReadiness, suggestService } from "@/lib/prospecting/readiness";
import { buildReviewReason, scoreDiscoveredProspect } from "@/lib/prospecting/score";
import type {
  DiscoveredProspect,
  ProspectingFilters,
  ProspectingSearchResult,
} from "@/lib/prospecting/types";

const CENSUS_BASE = "https://data.transportation.gov/resource/az4n-8mr2.json";
const PAGE_LIMIT = 50;

const SELECT_FIELDS = [
  "dot_number",
  "legal_name",
  "dba_name",
  "phy_city",
  "phy_state",
  "status_code",
  "power_units",
  "fleetsize",
  "add_date",
  "mcs150_date",
  "carrier_operation",
  "classdef",
  "phone",
  "email_address",
  "company_officer_1",
  "total_drivers",
].join(",");

type CacheEntry = { expiresAt: number; result: ProspectingSearchResult };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(filters: ProspectingFilters): string {
  return JSON.stringify(filters);
}

function buildWhereClause(filters: ProspectingFilters): string {
  const cutoff = registrationCutoffIso(filters.registrationWindowDays);
  const parts = [
    `phy_state='${filters.state.toUpperCase()}'`,
    "status_code='A'",
    `fleetsize IN (${eligibleFleetsizeSoql()})`,
    `add_date > '${cutoff}'`,
  ];
  return parts.join(" AND ");
}

function passesPostFilters(
  row: DiscoveredProspect,
  filters: ProspectingFilters,
): boolean {
  if (row.powerUnits < filters.fleetMin || row.powerUnits > filters.fleetMax) return false;
  if (filters.requireContact && !row.phone && !row.email) return false;
  if (filters.operation === "interstate" && !isInterstateOperation(row.carrierOperation)) {
    return false;
  }
  if (filters.operation === "authorized_for_hire" && !isAuthorizedForHire(row.classdef)) {
    return false;
  }
  if (filters.serviceNeed === "onboarding" && row.powerUnits > 10) return false;
  if (filters.serviceNeed === "compliance_setup" && row.powerUnits > 15) return false;
  if (filters.serviceNeed === "software" && row.powerUnits < 3) return false;
  if (filters.serviceNeed === "filings_renewals" && !isAuthorizedForHire(row.classdef)) {
    return false;
  }
  return true;
}

function rowToProspect(
  raw: unknown,
  queriedAt: string,
  duplicateUsdots: Set<string>,
  duplicateLabels: Map<string, string>,
): DiscoveredProspect | null {
  const parsed = censusRowSchema.safeParse(raw);
  if (!parsed.success) return null;

  const row = parsed.data;
  const usdot = row.dot_number.replace(/\D/g, "");
  if (!usdot || !row.legal_name?.trim()) return null;
  if ((row.status_code ?? "").toUpperCase() !== "A") return null;

  const powerUnits = parsePowerUnits(row.power_units);
  const drivers = parseDrivers(row.total_drivers);
  const phone = normalizePhone(row.phone);
  const email = normalizeEmail(row.email_address);

  const scored = scoreDiscoveredProspect({
    powerUnits,
    addDate: row.add_date ?? null,
    mcs150Date: row.mcs150_date ?? null,
    carrierOperation: row.carrier_operation ?? null,
    classdef: row.classdef ?? null,
    phone: row.phone ?? null,
    email: row.email_address ?? null,
  });

  const suggestedService = suggestService({
    powerUnits,
    classdef: row.classdef ?? null,
    carrierOperation: row.carrier_operation ?? null,
    addDate: row.add_date ?? null,
  });

  const readiness = outreachReadiness({
    score: scored.score,
    scoreLines: scored.scoreLines,
    powerUnits,
    phone,
    email,
    addDate: row.add_date ?? null,
  });

  return {
    usdot,
    legalName: row.legal_name.trim(),
    dbaName: row.dba_name?.trim() || null,
    city: row.phy_city?.trim() || "—",
    state: row.phy_state?.trim() || "—",
    powerUnits,
    drivers,
    addDate: row.add_date ?? null,
    mcs150Date: row.mcs150_date ?? null,
    carrierOperation: row.carrier_operation ?? null,
    classdef: row.classdef ?? null,
    phone,
    email,
    officer: row.company_officer_1?.trim() || null,
    score: scored.score,
    scoreLines: scored.scoreLines,
    reviewReason: buildReviewReason(scored.scoreLines, suggestedService),
    outreachReadiness: readiness.readiness,
    outreachReason: readiness.reason,
    suggestedService,
    alreadyInWorkspace: duplicateUsdots.has(usdot),
    duplicateLabel: duplicateLabels.get(usdot) ?? null,
    sourceDataset: "az4n-8mr2",
    queriedAt,
  };
}

async function fetchCensusPage(
  filters: ProspectingFilters,
): Promise<{ rows: unknown[]; sourceUrl: string }> {
  const params = new URLSearchParams();
  params.set("$select", SELECT_FIELDS);
  params.set("$where", buildWhereClause(filters));
  params.set("$order", "add_date DESC");
  params.set("$limit", String(PAGE_LIMIT));
  if (filters.offset > 0) params.set("$offset", String(filters.offset));

  const sourceUrl = `${CENSUS_BASE}?${params.toString()}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = process.env.SOCRATA_APP_TOKEN?.trim();
  if (token) headers["X-App-Token"] = token;

  const response = await fetch(sourceUrl, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    throw new Error(`FMCSA Census query failed (${response.status}).`);
  }

  const rows = (await response.json()) as unknown[];
  return { rows, sourceUrl };
}

export async function searchProspectingCarriers(input: {
  filters: ProspectingFilters;
  demoMode: boolean;
  duplicateUsdots: Set<string>;
  duplicateLabels: Map<string, string>;
  forceMock?: boolean;
}): Promise<ProspectingSearchResult> {
  const { filters, demoMode, duplicateUsdots, duplicateLabels } = input;
  const key = cacheKey(filters);
  const cached = cache.get(key);
  if (!demoMode && cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const queriedAt = new Date().toISOString();

  if (demoMode || input.forceMock) {
    const prospects = mockProspectingResults(filters).map((row) => ({
      ...row,
      queriedAt,
      alreadyInWorkspace: duplicateUsdots.has(row.usdot),
      duplicateLabel: duplicateLabels.get(row.usdot) ?? null,
    }));
    return {
      live: false,
      queriedAt,
      sourceDataset: "az4n-8mr2",
      sourceUrl: CENSUS_BASE,
      filters,
      offset: filters.offset,
      limit: PAGE_LIMIT,
      totalEligible: prospects.length,
      prospects,
      note: "Demo Mode — labeled mock prospecting results. Live Mode queries the FMCSA Census API.",
    };
  }

  try {
    const { rows, sourceUrl } = await fetchCensusPage(filters);
    const prospects = rows
      .map((row) => rowToProspect(row, queriedAt, duplicateUsdots, duplicateLabels))
      .filter((row): row is DiscoveredProspect => Boolean(row))
      .filter((row) => passesPostFilters(row, filters))
      .sort((a, b) => b.score - a.score);

    const result: ProspectingSearchResult = {
      live: true,
      queriedAt,
      sourceDataset: "az4n-8mr2",
      sourceUrl,
      filters,
      offset: filters.offset,
      limit: PAGE_LIMIT,
      totalEligible: prospects.length,
      prospects,
    };

    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, result });
    return result;
  } catch (error) {
    if (demoMode) {
      return searchProspectingCarriers({ ...input, demoMode: true, forceMock: true });
    }
    throw error;
  }
}

export function defaultProspectingFilters(): ProspectingFilters {
  return {
    state: "CA",
    registrationWindowDays: 548,
    fleetMin: 1,
    fleetMax: 20,
    operation: "any",
    serviceNeed: "any",
    requireContact: false,
    offset: 0,
  };
}

export function censusProspectToNormalized(input: {
  usdot: string;
  legalName: string;
  dbaName?: string | null;
  city: string;
  state: string;
  powerUnits: number;
  drivers: number;
  phone?: string | null;
  email?: string | null;
  carrierOperation?: string | null;
  classdef?: string | null;
  addDate?: string | null;
}) {
  const addParsed = parseCensusAddDate(input.addDate ?? null);
  const newEntrant = addParsed ? daysSince(addParsed) <= 548 : false;

  return {
    usdot: input.usdot.replace(/\D/g, ""),
    legalName: input.legalName,
    dbaName: input.dbaName ?? null,
    state: input.state,
    city: input.city,
    phone: normalizePhone(input.phone ?? null),
    email: normalizeEmail(input.email ?? null),
    powerUnits: input.powerUnits,
    drivers: input.drivers,
    operationType: isInterstateOperation(input.carrierOperation ?? null)
      ? ("interstate" as const)
      : ("intrastate" as const),
    authorizedForHire: isAuthorizedForHire(input.classdef ?? null),
    newEntrant,
    hazmat: false,
    passenger: false,
    cargoTypes: [] as string[],
    authorityStatus: "active" as const,
  };
}
