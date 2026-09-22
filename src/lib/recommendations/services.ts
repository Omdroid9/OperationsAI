import { isSmallFleet } from "@/lib/scoring/opportunity-score";
import type { Carrier, Signal } from "@/types";

export function recommendServices(carrier: Carrier, signals: Signal[]): string[] {
  const services: string[] = [];
  const has = (type: Signal["type"]) => signals.some((signal) => signal.type === type);

  if (carrier.newEntrant || has("NEW_ENTRANT")) {
    services.push("New Entrant Compliance Review");
    services.push("Driver Qualification Support");
  }
  if (carrier.operationType === "interstate" && isSmallFleet(carrier.powerUnits)) {
    services.push("IRP / IFTA Review");
  }
  if (carrier.state === "CA") {
    services.push("California Compliance Review");
  }
  if (has("FLEET_GROWTH") || has("CUSTOMER_EXPANSION")) {
    services.push("Managed Fleet Compliance");
  }
  if (has("REGULATORY_MATCH")) {
    services.push("Regulatory Change Review");
  }

  return [...new Set(services)];
}

export function primaryRecommendedService(carrier: Carrier, signals: Signal[]): string {
  return recommendServices(carrier, signals)[0] ?? "Compliance review";
}

export function reasonSummary(carrier: Carrier, services: string[]): string {
  const service = services[0] ?? "compliance support";
  const fleet = `${carrier.powerUnits} power unit${carrier.powerUnits === 1 ? "" : "s"}`;
  const scope = carrier.operationType === "interstate" ? "interstate" : "intrastate";
  const entrant = carrier.newEntrant ? "New Entrant " : "";
  return `${carrier.legalName} is a ${entrant}${scope} carrier with ${fleet}. ${service} is suggested for qualification — not a confirmed need.`;
}
