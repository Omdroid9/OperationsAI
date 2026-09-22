import { demoModeHeaders, getDemoModeClient } from "@/lib/mode/demo-mode";
import type { ProspectingFilters, ProspectingSearchResult } from "@/lib/prospecting/types";

function withDemoMode(init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      ...demoModeHeaders(getDemoModeClient()),
      ...(init?.headers ?? {}),
    },
  };
}

export async function searchProspecting(
  filters: Partial<ProspectingFilters>,
): Promise<ProspectingSearchResult> {
  const response = await fetch(
    "/api/prospecting/search",
    withDemoMode({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters),
    }),
  );
  const payload = (await response.json()) as ProspectingSearchResult & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Prospecting search unavailable.");
  }
  return payload;
}
