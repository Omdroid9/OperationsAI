import type { DemoState } from "@/types";

export function createEmptyWorkspaceState(): DemoState {
  return {
    carriers: [],
    snapshots: [],
    signals: [],
    opportunities: [],
    activities: [],
    calls: [],
    regulations: [],
    matches: {},
    cases: [],
    documents: [],
    tasks: [],
  };
}
