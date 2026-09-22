"use client";

import { CommandPalette } from "@/components/layout/command-palette";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { SideNavImperativeCollapseHandle } from "@astryxdesign/core/SideNav";
import { AppShell as AstryxAppShell } from "@astryxdesign/core/AppShell";
import { usePathname } from "next/navigation";
import { useRef } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sideNavHandleRef = useRef<SideNavImperativeCollapseHandle>(null);

  return (
    <AstryxAppShell
      height="fill"
      variant="section"
      contentPadding={0}
      sideNav={<Sidebar handleRef={sideNavHandleRef} />}
      topNav={<Topbar pathname={pathname} sideNavHandleRef={sideNavHandleRef} />}
    >
      {children}
      <CommandPalette />
    </AstryxAppShell>
  );
}
