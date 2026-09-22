import { outreachReadiness, suggestService } from "@/lib/prospecting/readiness";
import { buildReviewReason, scoreDiscoveredProspect } from "@/lib/prospecting/score";
import type { DiscoveredProspect, ProspectingFilters } from "@/lib/prospecting/types";

const QUERIED_AT = "2026-08-13T08:00:00.000Z";

function buildMockRow(
  base: Omit<
    DiscoveredProspect,
    "score" | "scoreLines" | "reviewReason" | "outreachReadiness" | "outreachReason" | "suggestedService"
  >,
): DiscoveredProspect {
  const scored = scoreDiscoveredProspect({
    powerUnits: base.powerUnits,
    addDate: base.addDate,
    mcs150Date: base.mcs150Date,
    carrierOperation: base.carrierOperation,
    classdef: base.classdef,
    phone: base.phone,
    email: base.email,
  });
  const suggestedService = suggestService({
    powerUnits: base.powerUnits,
    classdef: base.classdef,
    carrierOperation: base.carrierOperation,
    addDate: base.addDate,
  });
  const readiness = outreachReadiness({
    score: scored.score,
    scoreLines: scored.scoreLines,
    powerUnits: base.powerUnits,
    phone: base.phone,
    email: base.email,
    addDate: base.addDate,
  });
  return {
    ...base,
    score: scored.score,
    scoreLines: scored.scoreLines,
    suggestedService,
    reviewReason: buildReviewReason(scored.scoreLines, suggestedService),
    outreachReadiness: readiness.readiness,
    outreachReason: readiness.reason,
    queriedAt: QUERIED_AT,
  };
}

export function mockProspectingResults(filters: ProspectingFilters): DiscoveredProspect[] {
  const all: DiscoveredProspect[] = [
    buildMockRow({
      usdot: "4521001",
      legalName: "CENTRAL VALLEY HAULERS LLC",
      dbaName: null,
      city: "Fresno",
      state: "CA",
      powerUnits: 4,
      drivers: 3,
      addDate: "20260615",
      mcs150Date: "20260701 0000",
      carrierOperation: "A",
      classdef: "AUTHORIZED FOR HIRE",
      phone: "5595550101",
      email: "dispatch@centralvalleyhaul.example",
      officer: "MARIA GONZALEZ",
      alreadyInWorkspace: false,
      duplicateLabel: null,
      sourceDataset: "az4n-8mr2",
      queriedAt: QUERIED_AT,
    }),
    buildMockRow({
      usdot: "4521002",
      legalName: "BAY LINE TRANSPORT INC",
      dbaName: "Bay Line",
      city: "Oakland",
      state: "CA",
      powerUnits: 8,
      drivers: 7,
      addDate: "20260301",
      mcs150Date: "20260410 0000",
      carrierOperation: "A",
      classdef: "AUTHORIZED FOR HIRE",
      phone: "5105550199",
      email: null,
      officer: "JAMES CHEN",
      alreadyInWorkspace: false,
      duplicateLabel: null,
      sourceDataset: "az4n-8mr2",
      queriedAt: QUERIED_AT,
    }),
    buildMockRow({
      usdot: "4521003",
      legalName: "DESERT ROUTE LOGISTICS",
      dbaName: null,
      city: "Bakersfield",
      state: "CA",
      powerUnits: 12,
      drivers: 10,
      addDate: "20250120",
      mcs150Date: "20250601 0000",
      carrierOperation: "C",
      classdef: "PRIVATE PROPERTY;AUTHORIZED FOR HIRE",
      phone: null,
      email: "ops@desertroute.example",
      officer: null,
      alreadyInWorkspace: false,
      duplicateLabel: null,
      sourceDataset: "az4n-8mr2",
      queriedAt: QUERIED_AT,
    }),
    buildMockRow({
      usdot: "4521004",
      legalName: "COASTAL CARTAGE CO",
      dbaName: null,
      city: "Long Beach",
      state: "CA",
      powerUnits: 2,
      drivers: 2,
      addDate: "20241105",
      mcs150Date: "20250115 0000",
      carrierOperation: "A",
      classdef: "AUTHORIZED FOR HIRE",
      phone: "5625550144",
      email: "info@coastalcartage.example",
      officer: "PATRICIA REYES",
      alreadyInWorkspace: false,
      duplicateLabel: null,
      sourceDataset: "az4n-8mr2",
      queriedAt: QUERIED_AT,
    }),
    buildMockRow({
      usdot: "4521006",
      legalName: "INLAND EMPIRE COURIER",
      dbaName: null,
      city: "Riverside",
      state: "CA",
      powerUnits: 18,
      drivers: 14,
      addDate: "20240701",
      mcs150Date: "20240801 0000",
      carrierOperation: "C",
      classdef: "PRIVATE PROPERTY",
      phone: null,
      email: null,
      officer: null,
      alreadyInWorkspace: false,
      duplicateLabel: null,
      sourceDataset: "az4n-8mr2",
      queriedAt: QUERIED_AT,
    }),
  ];

  let rows = all.filter((row) => row.state === filters.state);
  rows = rows.filter(
    (row) => row.powerUnits >= filters.fleetMin && row.powerUnits <= filters.fleetMax,
  );
  if (filters.requireContact) {
    rows = rows.filter((row) => row.phone || row.email);
  }
  if (filters.operation === "interstate") {
    rows = rows.filter((row) => row.carrierOperation === "A");
  }
  if (filters.operation === "authorized_for_hire") {
    rows = rows.filter((row) => (row.classdef ?? "").includes("AUTHORIZED FOR HIRE"));
  }
  return rows.sort((a, b) => b.score - a.score);
}
