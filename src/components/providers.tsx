"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { createEmptyWorkspaceState } from "@/lib/demo/empty-state";
import { demoStore } from "@/lib/demo/store";
import { fetchProviderStatus } from "@/lib/live/client";
import { loadWorkspaceFromCloud } from "@/lib/live/sync";
import {
  DEMO_MODE_EVENT,
  getDemoModeClient,
  writeDemoModeCookie,
} from "@/lib/mode/demo-mode";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useCallback, useEffect, useState } from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  const hydrateWorkspace = useCallback(async () => {
    writeDemoModeCookie(getDemoModeClient());
    const demoMode = getDemoModeClient();
    try {
      const status = await fetchProviderStatus();
      if (status.supabase) {
        const remote = await loadWorkspaceFromCloud();
        if (remote) {
          demoStore.replaceState(remote);
          void queryClient.invalidateQueries();
          return;
        }
      }
    } catch {
      // Fall back below.
    }

    if (!demoMode) {
      demoStore.replaceState(createEmptyWorkspaceState());
      void queryClient.invalidateQueries();
      return;
    }

    demoStore.hydrateFromStorage();
    void queryClient.invalidateQueries();
  }, [queryClient]);

  useEffect(() => {
    void hydrateWorkspace();
    function onDemoModeChange() {
      void hydrateWorkspace();
    }
    window.addEventListener(DEMO_MODE_EVENT, onDemoModeChange);
    return () => window.removeEventListener(DEMO_MODE_EVENT, onDemoModeChange);
  }, [hydrateWorkspace]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
