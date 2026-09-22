import { demoStore } from "@/lib/demo/store";
import { readDemoModeFromRequest } from "@/lib/mode/demo-mode";
import { buildWorkspaceDuplicateIndex } from "@/lib/prospecting/dedupe";
import {
  defaultProspectingFilters,
  searchProspectingCarriers,
} from "@/lib/prospecting/search";
import type { ProspectingFilters } from "@/lib/prospecting/types";
import { NextResponse } from "next/server";

function parseFilters(body: Record<string, unknown>): ProspectingFilters {
  const defaults = defaultProspectingFilters();
  return {
    state: typeof body.state === "string" && body.state.trim() ? body.state.trim().toUpperCase() : defaults.state,
    registrationWindowDays:
      typeof body.registrationWindowDays === "number"
        ? Math.min(Math.max(body.registrationWindowDays, 90), 730)
        : defaults.registrationWindowDays,
    fleetMin:
      typeof body.fleetMin === "number"
        ? Math.min(Math.max(body.fleetMin, 1), 20)
        : defaults.fleetMin,
    fleetMax:
      typeof body.fleetMax === "number"
        ? Math.min(Math.max(body.fleetMax, 1), 20)
        : defaults.fleetMax,
    operation:
      body.operation === "interstate" ||
      body.operation === "authorized_for_hire" ||
      body.operation === "any"
        ? body.operation
        : defaults.operation,
    serviceNeed:
      body.serviceNeed === "onboarding" ||
      body.serviceNeed === "compliance_setup" ||
      body.serviceNeed === "software" ||
      body.serviceNeed === "filings_renewals" ||
      body.serviceNeed === "any"
        ? body.serviceNeed
        : defaults.serviceNeed,
    requireContact: Boolean(body.requireContact),
    offset: typeof body.offset === "number" ? Math.max(body.offset, 0) : 0,
  };
}

export async function POST(request: Request) {
  const demoMode = readDemoModeFromRequest(request);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const filters = parseFilters(body);

  if (filters.fleetMin > filters.fleetMax) {
    return NextResponse.json({ error: "Fleet minimum cannot exceed maximum." }, { status: 400 });
  }

  const state = demoStore.getState();
  const { usdots, labels } = buildWorkspaceDuplicateIndex(state.carriers, state.opportunities);

  try {
    const result = await searchProspectingCarriers({
      filters,
      demoMode,
      duplicateUsdots: usdots,
      duplicateLabels: labels,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prospecting search failed.";
    return NextResponse.json({ error: message, live: false }, { status: 503 });
  }
}
