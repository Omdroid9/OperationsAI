const TRANSCRIPT_FETCH_TIMEOUT_MS = 12_000;

function allowedTranscriptHosts(): string[] {
  const hosts = new Set<string>(["app.dograh.com", "dograh.com"]);
  const apiUrl = process.env.DOGRAH_API_URL?.trim();
  if (apiUrl) {
    try {
      hosts.add(new URL(apiUrl).hostname);
    } catch {
      // Ignore invalid DOGRAH_API_URL.
    }
  }
  const extra = process.env.DOGRAH_TRANSCRIPT_URL_HOSTS ?? "";
  for (const item of extra.split(",")) {
    const host = item.trim();
    if (host) hosts.add(host);
  }
  return [...hosts];
}

function isDograhHost(hostname: string): boolean {
  return hostname === "dograh.com" || hostname.endsWith(".dograh.com");
}

function isSignedStorageHost(hostname: string): boolean {
  return (
    hostname.endsWith(".amazonaws.com") ||
    hostname.endsWith(".cloudfront.net") ||
    hostname === "storage.googleapis.com" ||
    hostname.endsWith(".storage.googleapis.com") ||
    hostname.endsWith(".blob.core.windows.net")
  );
}

export function isAllowedDograhTranscriptUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname;
    if (isDograhHost(hostname) || isSignedStorageHost(hostname)) return true;
    const hosts = allowedTranscriptHosts();
    return hosts.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

function isLikelyTranscriptUrl(value: string): boolean {
  return value.startsWith("https://") || value.startsWith("http://");
}

function textFromJsonBody(value: unknown): string | null {
  if (typeof value === "string" && value.trim() && !isLikelyTranscriptUrl(value.trim())) {
    return value.trim();
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["transcript", "text", "content", "body"]) {
    const item = record[key];
    if (typeof item === "string" && item.trim() && !isLikelyTranscriptUrl(item.trim())) {
      return item.trim();
    }
  }
  return null;
}

export async function fetchDograhTranscriptText(url: string): Promise<string | null> {
  if (!isAllowedDograhTranscriptUrl(url)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSCRIPT_FETCH_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      Accept: "text/plain,text/*,application/json,*/*",
    };
    const host = new URL(url).hostname;
    const apiKey = process.env.DOGRAH_API_KEY?.trim();
    if (apiKey && isDograhHost(host)) {
      headers["X-API-Key"] = apiKey;
    }
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
      headers,
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    const body = await response.text();
    const trimmed = body.trim();
    if (!trimmed || isLikelyTranscriptUrl(trimmed)) return null;
    if (contentType.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return textFromJsonBody(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveTranscriptContent(
  inlineOrUrl: string | null | undefined,
): Promise<{ text: string; url: string | null }> {
  const raw = inlineOrUrl?.trim() ?? "";
  if (!raw) return { text: "", url: null };
  if (!isLikelyTranscriptUrl(raw)) {
    return { text: raw, url: null };
  }
  const fetched = await fetchDograhTranscriptText(raw);
  return { text: fetched ?? "", url: raw };
}
