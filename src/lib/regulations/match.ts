import { primaryRecommendedService } from "@/lib/recommendations/services";
import type { Carrier, Regulation, RegulationMatch, Signal } from "@/types";

function customerRequiredChange(regulation: Regulation, carrier: Carrier, reason: string): string {
  const services =
    carrier.existingServices.length > 0
      ? `Current services: ${carrier.existingServices.join(", ")}. `
      : "";
  return `${services}${regulation.requiredAction} ${reason}`.trim();
}

function prospectRequiredChange(regulation: Regulation, carrier: Carrier, signals: Signal[]): string {
  const service = primaryRecommendedService(carrier, signals);
  return `${regulation.requiredAction} Possible relevance for ${service.toLowerCase()} — review recommended, not a confirmed need.`;
}

export function matchRegulationToCarriers(
  regulation: Regulation,
  carriers: Carrier[],
  signalsByCarrier: Map<string, Signal[]> = new Map(),
): RegulationMatch[] {
  const text = `${regulation.affectedSegment} ${regulation.sourceText} ${regulation.category}`.toLowerCase();
  const wantsInterstate = text.includes("interstate");
  const wantsNewEntrant = text.includes("new entrant");
  const wantsCalifornia = text.includes("california") || text.includes(" ca ");
  const wantsEld = text.includes("eld") || text.includes("electronic logging");
  const wantsSmallFleet = text.includes("small fleet") || text.includes("1–10") || text.includes("1-10");

  return carriers.map((carrier) => {
    const known: string[] = [];
    const unknown: string[] = [];
    const audience = carrier.isCustomer ? ("customer" as const) : ("prospect" as const);
    const carrierSignals = signalsByCarrier.get(carrier.id) ?? [];

    if (wantsInterstate) {
      known.push(carrier.operationType === "interstate" ? "interstate" : "not-interstate");
    }
    if (wantsNewEntrant) {
      known.push(carrier.newEntrant ? "new-entrant" : "not-new-entrant");
    }
    if (wantsCalifornia) {
      known.push(carrier.state === "CA" ? "california" : "not-california");
    }
    if (wantsSmallFleet) {
      known.push(carrier.powerUnits <= 10 ? "small-fleet" : "larger-fleet");
    }
    if (wantsEld) {
      unknown.push("ELD vendor is not on file");
    }

    const negative = known.some((item) => item.startsWith("not-"));
    if (negative) {
      return {
        carrierId: carrier.id,
        opportunityId: null,
        matchType: "unknown" as const,
        reason: "Operating profile does not match the stated segment.",
        audience,
        requiredChange: "No action suggested. Profile does not match the affected segment.",
        suggestedService: null,
      };
    }

    if (unknown.length > 0 && known.length > 0) {
      const reason = `Potentially affected. ${unknown[0]}.`;
      return {
        carrierId: carrier.id,
        opportunityId: null,
        matchType: "potential" as const,
        reason,
        audience,
        requiredChange:
          audience === "customer"
            ? customerRequiredChange(regulation, carrier, reason)
            : prospectRequiredChange(regulation, carrier, carrierSignals),
        suggestedService: audience === "prospect" ? primaryRecommendedService(carrier, carrierSignals) : null,
      };
    }

    if (known.length >= 2) {
      const reason = "Operating profile matches the affected segment.";
      return {
        carrierId: carrier.id,
        opportunityId: null,
        matchType: "confirmed" as const,
        reason,
        audience,
        requiredChange:
          audience === "customer"
            ? customerRequiredChange(regulation, carrier, reason)
            : prospectRequiredChange(regulation, carrier, carrierSignals),
        suggestedService: audience === "prospect" ? primaryRecommendedService(carrier, carrierSignals) : null,
      };
    }

    if (known.length === 1) {
      const reason = "Partial profile match. Review recommended.";
      return {
        carrierId: carrier.id,
        opportunityId: null,
        matchType: "potential" as const,
        reason,
        audience,
        requiredChange:
          audience === "customer"
            ? customerRequiredChange(regulation, carrier, reason)
            : prospectRequiredChange(regulation, carrier, carrierSignals),
        suggestedService: audience === "prospect" ? primaryRecommendedService(carrier, carrierSignals) : null,
      };
    }

    return {
      carrierId: carrier.id,
      opportunityId: null,
      matchType: "unknown" as const,
      reason: "Not enough carrier fields to determine impact.",
      audience,
      requiredChange: "Review manually if this carrier may still be affected.",
      suggestedService: null,
    };
  });
}

export function previewRegulationMatches(
  regulation: Regulation,
  carriers: Carrier[],
  signals: Signal[],
): RegulationMatch[] {
  const signalsByCarrier = new Map<string, Signal[]>();
  for (const signal of signals) {
    const list = signalsByCarrier.get(signal.carrierId) ?? [];
    list.push(signal);
    signalsByCarrier.set(signal.carrierId, list);
  }
  return matchRegulationToCarriers(regulation, carriers, signalsByCarrier).filter(
    (match) => match.matchType === "confirmed" || match.matchType === "potential",
  );
}

const MATCH_RANK: Record<RegulationMatch["matchType"], number> = {
  confirmed: 2,
  potential: 1,
  unknown: 0,
};

export type AffectedCarrierSummary = {
  carrierId: string;
  audience: RegulationMatch["audience"];
  matchType: Exclude<RegulationMatch["matchType"], "unknown">;
  reason: string;
  regulationId: string;
  regulationTitle: string;
};

export function summarizeAffectedCarriers(
  regulations: Regulation[],
  matchesByRegulation: Record<string, RegulationMatch[]>,
): AffectedCarrierSummary[] {
  const best = new Map<string, AffectedCarrierSummary>();
  for (const regulation of regulations) {
    for (const match of matchesByRegulation[regulation.id] ?? []) {
      if (match.matchType === "unknown") continue;
      const current = best.get(match.carrierId);
      if (current && MATCH_RANK[current.matchType] >= MATCH_RANK[match.matchType]) continue;
      best.set(match.carrierId, {
        carrierId: match.carrierId,
        audience: match.audience,
        matchType: match.matchType,
        reason: match.reason,
        regulationId: regulation.id,
        regulationTitle: regulation.title,
      });
    }
  }
  return [...best.values()].sort((a, b) => {
    if (a.audience !== b.audience) return a.audience === "customer" ? -1 : 1;
    return MATCH_RANK[b.matchType] - MATCH_RANK[a.matchType];
  });
}
