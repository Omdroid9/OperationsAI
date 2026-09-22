export function parseCensusAddDate(value: string | null | undefined): Date | null {
  const raw = value?.trim() ?? "";
  if (!/^\d{8}$/.test(raw)) return null;
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6));
  const day = Number(raw.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseCensusMcs150Date(value: string | null | undefined): Date | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  const compact = raw.replace(/\s.*/, "");
  if (/^\d{8}$/.test(compact)) {
    return parseCensusAddDate(compact);
  }
  return null;
}

export function daysSince(date: Date, now = new Date()): number {
  const ms = now.getTime() - date.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function registrationCutoffIso(windowDays: number, now = new Date()): string {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);
  const year = cutoff.getUTCFullYear();
  const month = String(cutoff.getUTCMonth() + 1).padStart(2, "0");
  const day = String(cutoff.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
