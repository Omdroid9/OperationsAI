import { CA_RADAR_NAME_QUERIES, CA_RADAR_SEED_USDOTS } from "@/data/radar-ca-candidates";
import { fmcsaCarrierProvider, searchCarriersByName } from "@/lib/providers/fmcsa";
import { getProviderStatus } from "@/lib/providers/status";
import type { NormalizedFmcsaCarrier } from "@/lib/providers/types";
import { NextResponse } from "next/server";

export const maxDuration = 60;

function radarScore(carrier: NormalizedFmcsaCarrier): number {
  let score = 0;
  if (carrier.state === "CA") score += 25;
  if (carrier.newEntrant) score += 35;
  if (carrier.operationType === "interstate") score += 15;
  if (carrier.authorizedForHire) score += 10;
  if (carrier.powerUnits > 0 && carrier.powerUnits <= 10) score += 10;
  if (carrier.phone) score += 15;
  if (carrier.authorityStatus === "active") score += 5;
  return score;
}

export async function POST(request: Request) {
  const status = getProviderStatus();
  if (!status.fmcsa) {
    return NextResponse.json(
      { error: "Add FMCSA_WEB_KEY to run the California New Entrant radar." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    usdots?: string[];
    limit?: number;
    requirePhone?: boolean;
  };
  const limit = Math.min(Math.max(body.limit ?? 12, 1), 25);
  const requirePhone = Boolean(body.requirePhone);

  const usdotSet = new Set<string>();
  for (const usdot of body.usdots ?? []) {
    const clean = usdot.replace(/\D/g, "");
    if (clean) usdotSet.add(clean);
  }
  for (const usdot of CA_RADAR_SEED_USDOTS) usdotSet.add(usdot);

  const nameHits: NormalizedFmcsaCarrier[] = [];
  for (const query of CA_RADAR_NAME_QUERIES) {
    try {
      const found = await searchCarriersByName(query, 15);
      nameHits.push(...found);
      for (const item of found) {
        if (item.usdot) usdotSet.add(item.usdot.replace(/\D/g, ""));
      }
    } catch {
      // Continue with remaining queries / seeds.
    }
  }

  const detailed: Array<NormalizedFmcsaCarrier & { radarScore: number; hasPhone: boolean }> = [];
  let lookedUp = 0;
  for (const usdot of usdotSet) {
    if (detailed.length >= limit * 2) break;
    try {
      const carrier = await fmcsaCarrierProvider.getCarrier(usdot);
      lookedUp += 1;
      if (carrier.state !== "CA") continue;
      const hasPhone = Boolean(carrier.phone);
      if (requirePhone && !hasPhone) continue;
      detailed.push({
        ...carrier,
        radarScore: radarScore(carrier),
        hasPhone,
      });
    } catch {
      // Skip missing / failed USDOTs.
    }
  }

  const ranked = detailed
    .sort((a, b) => {
      if (b.newEntrant !== a.newEntrant) return Number(b.newEntrant) - Number(a.newEntrant);
      if (b.hasPhone !== a.hasPhone) return Number(b.hasPhone) - Number(a.hasPhone);
      return b.radarScore - a.radarScore;
    })
    .slice(0, limit);

  return NextResponse.json({
    live: true,
    scanned: usdotSet.size,
    lookedUp,
    nameHitCount: nameHits.length,
    matched: ranked.length,
    withPhone: ranked.filter((item) => item.hasPhone).length,
    carriers: ranked,
    note:
      "FMCSA QCMobile does not support list-by-state. Radar uses name search + seed USDOTs, then keeps California matches. Phone is only shown when FMCSA returns it.",
  });
}
