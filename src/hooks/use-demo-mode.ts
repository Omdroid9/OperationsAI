"use client";

import {
  DEMO_MODE_DEFAULT,
  DEMO_MODE_EVENT,
  getDemoModeClient,
  setDemoModeClient,
  writeDemoModeCookie,
} from "@/lib/mode/demo-mode";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

export function useDemoMode() {
  const queryClient = useQueryClient();
  const [demoMode, setDemoModeState] = useState(DEMO_MODE_DEFAULT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = getDemoModeClient();
    setDemoModeState(current);
    writeDemoModeCookie(current);
    setReady(true);

    function onChange(event: Event) {
      const detail = (event as CustomEvent<{ enabled: boolean }>).detail;
      setDemoModeState(detail?.enabled ?? getDemoModeClient());
      void queryClient.invalidateQueries();
    }

    window.addEventListener(DEMO_MODE_EVENT, onChange);
    return () => window.removeEventListener(DEMO_MODE_EVENT, onChange);
  }, [queryClient]);

  const setDemoMode = useCallback(
    (enabled: boolean) => {
      setDemoModeClient(enabled);
      setDemoModeState(enabled);
      void queryClient.invalidateQueries();
    },
    [queryClient],
  );

  return { demoMode, setDemoMode, ready };
}
