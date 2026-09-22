import { STAFF_DIRECTORY } from "@/data/staff";
import type { StaffProfile } from "@/lib/auth/profile";

const PLACEHOLDER_NAMES = new Set(
  ["admin name", "admin", "user", "staff", "test user", "name"].map((value) =>
    value.toLowerCase(),
  ),
);

function staffKeyToDisplayName(staffKey: string): string | null {
  const exact = STAFF_DIRECTORY.find((member) => member.id === staffKey);
  if (exact) return exact.displayName;

  const normalized = staffKey.replace(/^staff_/, "");
  const bySuffix = STAFF_DIRECTORY.find(
    (member) => member.id === `staff_${normalized}` || member.id.endsWith(`_${normalized}`),
  );
  return bySuffix?.displayName ?? null;
}

function formatEmailLocal(email: string): string {
  const local = email.split("@")[0] ?? "";
  const fromStaff = STAFF_DIRECTORY.find(
    (member) => member.email.split("@")[0]?.toLowerCase() === local.toLowerCase(),
  );
  if (fromStaff) return fromStaff.displayName;

  return local
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatAccountLabel(
  profile:
    | Pick<StaffProfile, "displayName" | "staffKey">
    | null
    | undefined,
  email: string | null | undefined,
): string {
  if (profile?.staffKey) {
    const fromKey = staffKeyToDisplayName(profile.staffKey);
    if (fromKey) return fromKey;
  }

  const displayName = profile?.displayName?.trim();
  if (displayName && !PLACEHOLDER_NAMES.has(displayName.toLowerCase())) {
    return displayName;
  }

  if (email?.trim()) return formatEmailLocal(email);
  return "Staff";
}

export function formatRoleLabel(role: string): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "staff":
      return "Staff";
    case "readonly":
      return "Read-only";
    default:
      return role;
  }
}
