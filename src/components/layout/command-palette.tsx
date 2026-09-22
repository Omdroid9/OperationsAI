"use client";

import { ProfileKindBadge } from "@/components/shared/profile-kind";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCarriers, useOpportunities } from "@/hooks/use-skyos";
import { getProfileKind } from "@/lib/profile";
import type { ProfileKind } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const ROUTES = [
  { href: "/app", label: "Overview" },
  { href: "/prospecting", label: "Prospecting" },
  { href: "/opportunities", label: "Saved Prospects" },
  { href: "/crm", label: "CRM" },
  { href: "/calls", label: "Calls" },
  { href: "/reglens", label: "RegLens" },
  { href: "/docket", label: "Docket" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const carriers = useCarriers();
  const opportunities = useOpportunities();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo(() => {
    const q = query.toLowerCase();
    const routes: Array<{ href: string; label: string; kind?: ProfileKind }> = ROUTES.filter((item) =>
      item.label.toLowerCase().includes(q),
    );
    const carrierItems = (carriers.data ?? [])
      .filter((carrier) => carrier.legalName.toLowerCase().includes(q) || carrier.usdot.includes(q))
      .slice(0, 6)
      .map((carrier) => {
        const opportunity = (opportunities.data ?? []).find((item) => item.carrierId === carrier.id);
        return {
          href: opportunity ? `/opportunities/${opportunity.id}` : "/opportunities",
          label: carrier.legalName,
          kind: getProfileKind(carrier),
        };
      });
    return [...routes, ...carrierItems];
  }, [query, carriers.data, opportunities.data]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>Jump to a page or carrier.</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search carrier or page"
        />
        <ul className="max-h-72 overflow-auto">
          {items.map((item) => (
            <li key={`${item.href}-${item.label}`}>
              <button
                type="button"
                className="flex h-8 w-full items-center rounded-[6px] px-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  router.push(item.href);
                }}
              >
                {item.label}
                {item.kind ? <ProfileKindBadge kind={item.kind} className="ml-2" /> : null}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
