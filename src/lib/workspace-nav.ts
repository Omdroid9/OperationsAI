import type { Opportunity } from "@/types";
import { PAGE_JOB } from "@/lib/workflow";

/** Detail ids live under `/opportunities/[id]` for both leads and prospects. */
export function opportunityIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/opportunities\/([^/?#]+)/);
  return match?.[1] ?? null;
}

export function workspaceJobLabel(
  pathname: string,
  opportunity?: Pick<Opportunity, "recordKind"> | null,
): string {
  if (opportunity?.recordKind === "lead") {
    return PAGE_JOB["/crm"] ?? "Work inbound leads";
  }
  if (opportunity?.recordKind === "prospect") {
    return PAGE_JOB["/opportunities"] ?? "Review saved prospects";
  }

  const section = Object.keys(PAGE_JOB)
    .sort((a, b) => b.length - a.length)
    .find((key) => (key === "/app" ? pathname === "/app" : pathname.startsWith(key)));
  return section ? (PAGE_JOB[section] ?? "SkyOS") : "SkyOS";
}

/** Which primary nav item should look selected for this route. */
export function activeNavHref(
  pathname: string,
  itemHref: string,
  opportunity?: Pick<Opportunity, "recordKind"> | null,
): boolean {
  if (opportunity?.recordKind === "lead") {
    if (itemHref === "/crm") return true;
    if (itemHref === "/opportunities") return false;
  }
  if (opportunity?.recordKind === "prospect") {
    if (itemHref === "/opportunities") return true;
    if (itemHref === "/crm") return false;
  }

  if (itemHref === "/app") return pathname === "/app";
  return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}

export function recordListHref(opportunity: Pick<Opportunity, "recordKind">): {
  href: string;
  label: string;
} {
  if (opportunity.recordKind === "lead") {
    return { href: "/crm", label: "CRM" };
  }
  return { href: "/opportunities", label: "Saved Prospects" };
}
