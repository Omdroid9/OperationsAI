/** Legacy backup — do not overwrite in normal operation after D5 cutover. */
export const LEGACY_SNAPSHOT_ID = "default";

/** Demo walkthrough snapshot (Demo Mode only). */
export const DEMO_SNAPSHOT_ID = "demo";

/** Optional live workspace blob backup (Live Mode dual-write). */
export const LIVE_SNAPSHOT_ID = "live";

export function snapshotIdForDemoMode(demoMode: boolean): string {
  return demoMode ? DEMO_SNAPSHOT_ID : LIVE_SNAPSHOT_ID;
}
