export const DEMO_TODAY = new Date("2026-08-12T15:00:00-07:00");

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/Los_Angeles",
});

const DATE_SHORT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "America/Los_Angeles",
});

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return DATE_FORMAT.format(new Date(iso));
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return DATE_SHORT.format(new Date(iso));
}

export function formatUsdot(usdot: string): string {
  return `USDOT ${usdot}`;
}

export function formatRelative(iso: string, now: Date = DEMO_TODAY): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffMin) < 60) {
    if (diffMin === 0) return "Just now";
    return diffMin > 0 ? `${diffMin}m ago` : `in ${Math.abs(diffMin)}m`;
  }
  if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `${diffHours}h ago` : `in ${Math.abs(diffHours)}h`;
  }
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays === -1) return "Tomorrow";
  if (diffDays > 1 && diffDays < 14) return `${diffDays}d ago`;
  if (diffDays < -1 && diffDays > -14) return `in ${Math.abs(diffDays)}d`;
  return formatDateShort(iso);
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function plural(count: number, singular: string, pluralForm?: string): string {
  return count === 1 ? singular : (pluralForm ?? `${singular}s`);
}
