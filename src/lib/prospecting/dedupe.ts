import { normalizeEmail, normalizePhone, normalizeUsdot } from "@/lib/leads/intake";
import type { Carrier, Opportunity } from "@/types";

export function buildWorkspaceDuplicateIndex(
  carriers: Carrier[],
  opportunities: Opportunity[],
): {
  usdots: Set<string>;
  labels: Map<string, string>;
} {
  const usdots = new Set<string>();
  const labels = new Map<string, string>();

  for (const opportunity of opportunities) {
    if (opportunity.stage === "DISMISSED") continue;
    const carrier = carriers.find((item) => item.id === opportunity.carrierId);
    if (!carrier) continue;

    const usdot = normalizeUsdot(carrier.usdot);
    if (!usdot) continue;
    usdots.add(usdot);
    labels.set(
      usdot,
      `${opportunity.recordKind === "lead" ? "Lead" : "Prospect"} · ${carrier.legalName}`,
    );
  }

  return { usdots, labels };
}

export function findProspectWorkspaceMatch(input: {
  usdot: string;
  email?: string | null;
  phone?: string | null;
  carriers: Carrier[];
  opportunities: Opportunity[];
}): { matchOn: "usdot" | "email" | "phone"; label: string } | null {
  const usdot = normalizeUsdot(input.usdot);
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  for (const opportunity of input.opportunities) {
    if (opportunity.stage === "DISMISSED") continue;
    const carrier = input.carriers.find((item) => item.id === opportunity.carrierId);
    if (!carrier) continue;

    if (usdot && normalizeUsdot(carrier.usdot) === usdot) {
      return {
        matchOn: "usdot",
        label: `${opportunity.recordKind === "lead" ? "Lead" : "Prospect"} · ${carrier.legalName}`,
      };
    }
    if (email && normalizeEmail(carrier.email) === email) {
      return {
        matchOn: "email",
        label: `${opportunity.recordKind === "lead" ? "Lead" : "Prospect"} · ${carrier.legalName}`,
      };
    }
    if (phone && normalizePhone(carrier.phone) === phone) {
      return {
        matchOn: "phone",
        label: `${opportunity.recordKind === "lead" ? "Lead" : "Prospect"} · ${carrier.legalName}`,
      };
    }
  }

  return null;
}
