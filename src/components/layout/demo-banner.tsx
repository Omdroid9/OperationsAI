"use client";

import { useDemoMode } from "@/hooks/use-demo-mode";
import { useProviderStatus } from "@/hooks/use-skyos";
import { PROVIDER_LABELS } from "@/lib/live/client";
import type { ProviderStatus } from "@/lib/providers/status";
import { Banner } from "@astryxdesign/core/Banner";

export function DemoBanner() {
  const { demoMode, ready } = useDemoMode();
  const status = useProviderStatus();
  const providers = status.data as (ProviderStatus & { demoMode?: boolean }) | undefined;
  const live = providers
    ? (Object.keys(PROVIDER_LABELS) as Array<keyof typeof PROVIDER_LABELS>)
        .filter((key) => Boolean(providers[key]))
        .map((key) => PROVIDER_LABELS[key])
    : [];

  if (!ready) return null;

  if (!demoMode) {
    return (
      <Banner
        status="info"
        container="section"
        title="Live mode"
        description={
          live.length > 0
            ? `Showing persisted and integrated data only · ${live.join(", ")} configured.`
            : "Showing persisted and integrated data only · no integrations configured yet."
        }
      />
    );
  }

  return (
    <Banner
      status="warning"
      container="section"
      title="Demo mode"
      description={
        live.length > 0
          ? `Seeded walkthrough data is active. Live: ${live.join(", ")}.`
          : "Seeded walkthrough data and simulated provider outputs are active."
      }
    />
  );
}
