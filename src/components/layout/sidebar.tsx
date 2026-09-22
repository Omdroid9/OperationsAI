"use client";

import { SidebarFooterNote } from "@/components/layout/sidebar-footer-note";
import { SkyosMark } from "@/components/layout/skyos-mark";
import { useOpportunity } from "@/hooks/use-skyos";
import { activeNavHref, opportunityIdFromPathname } from "@/lib/workspace-nav";
import {
  SideNav,
  SideNavCollapseButton,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
  type SideNavImperativeCollapseHandle,
} from "@astryxdesign/core/SideNav";
import {
  Briefcase,
  FileText,
  LayoutGrid,
  Phone,
  Radar,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type RefObject } from "react";

const GROUPS = [
  {
    label: "Today",
    items: [{ href: "/app", label: "Overview", hint: "What needs you", icon: LayoutGrid }],
  },
  {
    label: "Find",
    items: [
      { href: "/prospecting", label: "Prospecting", hint: "Census discovery", icon: Radar },
      { href: "/opportunities", label: "Opportunities", hint: "Saved prospects", icon: Radar },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/crm", label: "CRM", hint: "Inbound leads", icon: Briefcase },
      { href: "/calls", label: "Calls", hint: "What they said", icon: Phone },
    ],
  },
  {
    label: "Fulfill",
    items: [{ href: "/docket", label: "Docket", hint: "Missing items", icon: FileText }],
  },
  {
    label: "Watch",
    items: [{ href: "/reglens", label: "RegLens", hint: "Rule → signal", icon: Scale }],
  },
];

export function Sidebar({
  handleRef,
}: {
  handleRef?: RefObject<SideNavImperativeCollapseHandle | null>;
}) {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const opportunityId = opportunityIdFromPathname(pathname);
  const opportunityQuery = useOpportunity(opportunityId ?? "");

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <SideNav
      key={hydrated ? "persisted" : "ssr"}
      handleRef={handleRef}
      collapsible={{ hasButton: false }}
      resizable={{
        defaultWidth: 232,
        minWidth: 196,
        maxWidth: 320,
        ...(hydrated ? { autoSaveId: "skyos-sidenav" } : {}),
      }}
      header={
        <SideNavHeading
          as={Link}
          heading="SkyOS"
          subheading="Compliance operations"
          headingHref="/app"
          icon={<SkyosMark />}
        />
      }
      footer={<SidebarFooterNote />}
      footerIcons={<SideNavCollapseButton aria-label="Expand or collapse sidebar" />}
    >
      {GROUPS.map((group) => (
        <SideNavSection key={group.label} title={group.label}>
          {group.items.map((item) => {
            const active = activeNavHref(pathname, item.href, opportunityQuery.data);
            return (
              <SideNavItem
                key={item.href}
                as={Link}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isSelected={active}
                endContent={
                  <span className="text-[10px] font-normal text-muted-foreground">{item.hint}</span>
                }
              />
            );
          })}
        </SideNavSection>
      ))}
    </SideNav>
  );
}
