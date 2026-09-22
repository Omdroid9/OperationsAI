import { createHash } from "crypto";

const INTAKE_SALT = process.env.INTAKE_HASH_SALT ?? "skyos-intake-staging";

export function hashIntakeValue(value: string): string {
  return createHash("sha256").update(`${INTAKE_SALT}:${value}`).digest("hex");
}

export function hashClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim();
  if (!ip) return null;
  return hashIntakeValue(ip);
}

export function hashEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;
  return hashIntakeValue(normalized);
}
