/** Admin Demo Mode. Default ON so the walkthrough stays presentation-ready. */

export const DEMO_MODE_COOKIE = "skyos.demo-mode";
export const DEMO_MODE_STORAGE_KEY = "skyos.demoMode";
export const DEMO_MODE_HEADER = "x-skyos-demo-mode";
export const DEMO_MODE_EVENT = "skyos:demo-mode";

export const DEMO_MODE_DEFAULT = true;

export function parseDemoModeFlag(value: string | null | undefined): boolean | null {
  if (value == null || value === "") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "on") return true;
  if (normalized === "0" || normalized === "false" || normalized === "off") return false;
  return null;
}

export function readDemoModeFromCookieHeader(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return DEMO_MODE_DEFAULT;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${DEMO_MODE_COOKIE}=([^;]*)`));
  const parsed = parseDemoModeFlag(match?.[1]);
  return parsed ?? DEMO_MODE_DEFAULT;
}

export function readDemoModeFromRequest(request: Request): boolean {
  const header = parseDemoModeFlag(request.headers.get(DEMO_MODE_HEADER));
  if (header != null) return header;
  return readDemoModeFromCookieHeader(request.headers.get("cookie"));
}

export function getDemoModeClient(): boolean {
  if (typeof window === "undefined") return DEMO_MODE_DEFAULT;
  const stored = parseDemoModeFlag(window.localStorage.getItem(DEMO_MODE_STORAGE_KEY));
  if (stored != null) return stored;
  const cookieMatch = document.cookie.match(new RegExp(`(?:^|;\\s*)${DEMO_MODE_COOKIE}=([^;]*)`));
  const fromCookie = parseDemoModeFlag(cookieMatch?.[1]);
  return fromCookie ?? DEMO_MODE_DEFAULT;
}

/** Prefer this in browser data/UI paths. On the server, use readDemoModeFromRequest. */
export function isDemoMode(): boolean {
  if (typeof window !== "undefined") return getDemoModeClient();
  return DEMO_MODE_DEFAULT;
}

export function writeDemoModeCookie(enabled: boolean): void {
  if (typeof document === "undefined") return;
  const value = enabled ? "1" : "0";
  document.cookie = `${DEMO_MODE_COOKIE}=${value}; path=/; max-age=31536000; SameSite=Lax`;
}

export function setDemoModeClient(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, enabled ? "1" : "0");
  writeDemoModeCookie(enabled);
  window.dispatchEvent(new CustomEvent(DEMO_MODE_EVENT, { detail: { enabled } }));
}

export function demoModeHeaders(enabled = getDemoModeClient()): HeadersInit {
  return { [DEMO_MODE_HEADER]: enabled ? "1" : "0" };
}

export const LIVE_MODE_SETUP =
  "Demo Mode is off. Configure the integration or turn Demo Mode on for the walkthrough.";
