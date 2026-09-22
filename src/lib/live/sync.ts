import { demoModeHeaders, getDemoModeClient } from "@/lib/mode/demo-mode";
import type { DemoState } from "@/types";

function withDemoMode(init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      ...demoModeHeaders(getDemoModeClient()),
      ...(init?.headers ?? {}),
    },
  };
}

export async function loadWorkspaceFromCloud(): Promise<DemoState | null> {
  const response = await fetch("/api/sync", withDemoMode({ cache: "no-store" }));
  if (!response.ok) return null;
  const payload = (await response.json()) as { configured?: boolean; state?: DemoState | null };
  if (!payload.configured || !payload.state) return null;
  return payload.state;
}

export async function pushWorkspaceToCloud(state: DemoState): Promise<boolean> {
  const response = await fetch(
    "/api/sync",
    withDemoMode({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    }),
  );
  if (!response.ok) return false;
  const payload = (await response.json()) as { saved?: boolean };
  return Boolean(payload.saved);
}

export async function fetchRegulatoryInbox(existingTitles: string[]): Promise<
  Array<{
    id: string;
    sourceText: string;
    analysis: unknown;
    live?: boolean;
  }>
> {
  const response = await fetch(
    "/api/reglens/inbox",
    withDemoMode({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ existingTitles, enrich: true }),
    }),
  );
  if (!response.ok) return [];
  const payload = (await response.json()) as {
    notices?: Array<{ id: string; sourceText: string; analysis: unknown; live?: boolean }>;
  };
  return payload.notices ?? [];
}
