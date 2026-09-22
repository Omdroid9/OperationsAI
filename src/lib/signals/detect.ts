import { isSmallFleet, SCORE_WEIGHTS } from "@/lib/scoring/opportunity-score";
import type { Carrier, CarrierSnapshot, Signal, SignalType } from "@/types";

const SIGNAL_COPY: Record<
  SignalType,
  { title: string; description: (carrier: Carrier) => string }
> = {
  NEW_ENTRANT: {
    title: "New Entrant",
    description: (carrier) =>
      `${carrier.legalName} is listed as a New Entrant. New Entrant compliance review may be relevant.`,
  },
  AUTHORIZED_FOR_HIRE: {
    title: "Authorized for hire",
    description: () =>
      "Carrier holds for-hire authority. Operating-authority and tax credential work is often in scope.",
  },
  INTERSTATE: {
    title: "Interstate",
    description: () =>
      "Interstate operation. IRP/IFTA and federal operating rules may be relevant.",
  },
  SMALL_FLEET: {
    title: "Small fleet",
    description: (carrier) =>
      `${carrier.powerUnits} power units. Small fleets often handle compliance internally and may need structured support.`,
  },
  CALIFORNIA: {
    title: "California",
    description: () =>
      "California-based. State-specific filing and inspection programs may apply in addition to federal rules.",
  },
  FLEET_GROWTH: {
    title: "Fleet growth",
    description: (carrier) =>
      `Power units increased in recent snapshots. Current fleet size is ${carrier.powerUnits}.`,
  },
  REGULATORY_MATCH: {
    title: "Regulatory match",
    description: () =>
      "A reviewed regulation potentially affects this operating profile.",
  },
  DORMANT_LEAD_REACTIVATION: {
    title: "Dormant lead",
    description: () =>
      "Previously dismissed. Operating profile has changed enough to warrant another review.",
  },
  CUSTOMER_EXPANSION: {
    title: "Customer expansion",
    description: () =>
      "Existing customer with a changed fleet or operating profile. Additional services may be relevant.",
  },
  SAFETY_ACTIVITY: {
    title: "Safety activity",
    description: () => "Recent public safety activity was observed on the carrier profile.",
  },
  AUTHORITY_CHANGE: {
    title: "Authority change",
    description: () => "Operating authority status changed in a recent snapshot.",
  },
  CRM_CONTEXT: {
    title: "CRM context",
    description: () => "Prior CRM activity exists for this carrier.",
  },
};

function signalId(carrierId: string, type: SignalType): string {
  return `sig_${carrierId}_${type.toLowerCase()}`;
}

function makeSignal(
  carrier: Carrier,
  type: SignalType,
  points: number,
  detectedAt: string,
  source: Signal["source"] = "DERIVED",
  descriptionOverride?: string,
): Signal {
  const copy = SIGNAL_COPY[type];
  return {
    id: signalId(carrier.id, type),
    carrierId: carrier.id,
    type,
    title: copy.title,
    description: descriptionOverride ?? copy.description(carrier),
    scoreContribution: points,
    confidence: type === "REGULATORY_MATCH" ? 0.72 : 0.9,
    source,
    detectedAt,
  };
}

export function detectCarrierSignals(
  carrier: Carrier,
  snapshots: CarrierSnapshot[],
  options?: {
    dormant?: boolean;
    crmContext?: boolean;
    regulatoryMatch?: boolean;
    detectedAt?: string;
  },
): Signal[] {
  const detectedAt = options?.detectedAt ?? carrier.updatedAt;
  const signals: Signal[] = [];

  if (carrier.newEntrant) {
    signals.push(makeSignal(carrier, "NEW_ENTRANT", SCORE_WEIGHTS.NEW_ENTRANT, detectedAt));
  }
  if (carrier.authorizedForHire) {
    signals.push(
      makeSignal(carrier, "AUTHORIZED_FOR_HIRE", SCORE_WEIGHTS.AUTHORIZED_FOR_HIRE, detectedAt),
    );
  }
  if (carrier.operationType === "interstate") {
    signals.push(makeSignal(carrier, "INTERSTATE", SCORE_WEIGHTS.INTERSTATE, detectedAt));
  }
  if (isSmallFleet(carrier.powerUnits)) {
    signals.push(makeSignal(carrier, "SMALL_FLEET", SCORE_WEIGHTS.SMALL_FLEET, detectedAt));
  }
  if (carrier.state === "CA") {
    signals.push(makeSignal(carrier, "CALIFORNIA", SCORE_WEIGHTS.CALIFORNIA, detectedAt));
  }

  const ordered = [...snapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
  if (ordered.length >= 2) {
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    if (first && last && last.powerUnits > first.powerUnits) {
      const growth = ((last.powerUnits - first.powerUnits) / Math.max(first.powerUnits, 1)) * 100;
      if (growth >= 50) {
        signals.push(
          makeSignal(
            carrier,
            "FLEET_GROWTH",
            SCORE_WEIGHTS.RECENT_EVENT,
            last.snapshotDate,
            "DERIVED",
            `Fleet grew from ${first.powerUnits} to ${last.powerUnits} power units (${Math.round(growth)}%).`,
          ),
        );
      }
    }
  }

  if (options?.dormant) {
    signals.push(
      makeSignal(carrier, "DORMANT_LEAD_REACTIVATION", SCORE_WEIGHTS.RECENT_EVENT, detectedAt, "CRM"),
    );
  }
  if (options?.crmContext) {
    signals.push(makeSignal(carrier, "CRM_CONTEXT", SCORE_WEIGHTS.CRM_CONTEXT, detectedAt, "CRM"));
  }
  if (carrier.isCustomer && signals.some((signal) => signal.type === "FLEET_GROWTH")) {
    signals.push(
      makeSignal(carrier, "CUSTOMER_EXPANSION", SCORE_WEIGHTS.RECENT_EVENT, detectedAt, "CRM"),
    );
  }
  if (options?.regulatoryMatch) {
    signals.push(
      makeSignal(carrier, "REGULATORY_MATCH", SCORE_WEIGHTS.RECENT_EVENT, detectedAt, "DERIVED"),
    );
  }

  return signals;
}

export function primarySignalTitle(signals: Signal[]): string {
  const priority: SignalType[] = [
    "NEW_ENTRANT",
    "FLEET_GROWTH",
    "DORMANT_LEAD_REACTIVATION",
    "CUSTOMER_EXPANSION",
    "REGULATORY_MATCH",
    "INTERSTATE",
    "SMALL_FLEET",
  ];
  for (const type of priority) {
    const match = signals.find((signal) => signal.type === type);
    if (match) return `${match.title} opportunity`;
  }
  return "Operating profile opportunity";
}
