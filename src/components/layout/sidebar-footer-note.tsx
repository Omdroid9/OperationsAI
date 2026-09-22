"use client";

import { useSideNavCollapse } from "@astryxdesign/core/SideNav";

export function SidebarFooterNote() {
  const { isCollapsed } = useSideNavCollapse();

  if (isCollapsed) return null;

  return (
    <p className="text-[11px] leading-4 text-muted-foreground">
      Detect a carrier, qualify the need, then fulfill the work.
    </p>
  );
}
