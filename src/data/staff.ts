import type { StaffMember } from "@/types";

/** Placeholder staff directory until profiles sync from Supabase Auth (Phase D). */
export const STAFF_DIRECTORY: StaffMember[] = [
  {
    id: "staff_mehta",
    displayName: "A. Mehta",
    email: "amehta@skyos.example",
    role: "admin",
  },
  {
    id: "staff_ortega",
    displayName: "L. Ortega",
    email: "lortega@skyos.example",
    role: "staff",
  },
  {
    id: "staff_kim",
    displayName: "J. Kim",
    email: "jkim@skyos.example",
    role: "staff",
  },
];

export function staffById(id: string | null | undefined): StaffMember | null {
  if (!id) return null;
  return STAFF_DIRECTORY.find((item) => item.id === id) ?? null;
}

export function staffDisplayName(id: string | null | undefined): string {
  const member = staffById(id);
  if (member) return member.displayName;
  if (id?.trim()) return id.trim();
  return "Unassigned";
}

export function resolveStaffId(assignedTo: string | null | undefined): string | null {
  if (!assignedTo?.trim()) return null;
  const byId = staffById(assignedTo);
  if (byId) return byId.id;
  const byName = STAFF_DIRECTORY.find(
    (item) => item.displayName.toLowerCase() === assignedTo.trim().toLowerCase(),
  );
  return byName?.id ?? null;
}
