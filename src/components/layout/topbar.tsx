"use client";

import { NotificationBell } from "@/components/layout/notification-bell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthProfile } from "@/hooks/use-auth-profile";
import { useOpportunity } from "@/hooks/use-skyos";
import { formatAccountLabel, formatRoleLabel } from "@/lib/auth/account-label";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { isAuthRequired } from "@/lib/supabase/client";
import { demoStore } from "@/lib/demo/store";
import { opportunityIdFromPathname, workspaceJobLabel } from "@/lib/workspace-nav";
import { cn } from "@/lib/utils";
import { SideNavCollapseButton, type SideNavImperativeCollapseHandle } from "@astryxdesign/core/SideNav";
import { TopNav } from "@astryxdesign/core/TopNav";
import { useQueryClient } from "@tanstack/react-query";
import { Moon, Search, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { RefObject } from "react";
import { toast } from "sonner";

export function Topbar({
  pathname,
  sideNavHandleRef,
}: {
  pathname: string;
  sideNavHandleRef?: RefObject<SideNavImperativeCollapseHandle | null>;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const { demoMode, setDemoMode, ready } = useDemoMode();
  const authRequired = isAuthRequired();
  const authProfile = useAuthProfile();
  const accountLabel = formatAccountLabel(
    authProfile.data?.profile,
    authProfile.data?.email,
  );
  const opportunityId = opportunityIdFromPathname(pathname);
  const opportunityQuery = useOpportunity(opportunityId ?? "");
  const job = workspaceJobLabel(pathname, opportunityQuery.data);

  async function toggleDemoMode() {
    if (demoMode) {
      const confirmed = window.confirm(
        "Turn Demo Mode off? Seeded walkthrough records will be hidden. Only live persisted data and integrations will show.",
      );
      if (!confirmed) return;
      setDemoMode(false);
      toast.message("Demo Mode off. Showing live data only.");
      return;
    }
    setDemoMode(true);
    toast.message("Demo Mode on. Walkthrough data is available.");
  }

  async function clearLiveWorkspace() {
    if (demoMode) return;
    const confirmed = window.confirm(
      "Clear all Live workspace data? Leads, cases, documents, calls, and regulations will be removed from Live Mode. Demo walkthrough data is not affected.",
    );
    if (!confirmed) return;
    try {
      const response = await fetch("/api/workspace/clear-live", { method: "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not clear Live workspace.");
      }
      demoStore.clearLiveLocal();
      await queryClient.invalidateQueries({ refetchType: "active" });
      toast.success("Live workspace cleared");
      router.push("/app");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear Live workspace.");
    }
  }

  return (
    <TopNav
      label="SkyOS workspace"
      centerContent={
        <p className="min-w-0 truncate text-[13px] text-foreground">{job}</p>
      }
      endContent={
        <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
          {ready ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 shrink-0 px-2 text-[13px] font-semibold",
                demoMode ? "text-warning" : "text-foreground",
              )}
              aria-label={demoMode ? "Demo Mode on. Tap to turn off." : "Live Mode on. Tap to turn Demo on."}
              onClick={() => void toggleDemoMode()}
            >
              {demoMode ? "Demo" : "Live"}
            </Button>
          ) : null}
          {sideNavHandleRef ? (
            <div className="hidden md:block">
              <SideNavCollapseButton
                handleRef={sideNavHandleRef}
                aria-label="Expand or collapse sidebar"
              />
            </div>
          ) : null}
          <button
            type="button"
            className="flex h-8 items-center gap-2 rounded-[6px] border border-border bg-card px-2 text-[12px] text-muted-foreground sm:px-2.5"
            aria-label="Search"
            onClick={() =>
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
            }
          >
            <Search className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="ml-2 hidden font-mono text-[10px] text-muted-foreground/80 md:inline">
              ⌘K
            </kbd>
          </button>
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="size-3.5 dark:hidden" />
            <Moon className="hidden size-3.5 dark:block" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="sm" className="max-w-[7.5rem] truncate sm:max-w-none" />}
            >
              {accountLabel}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              {authRequired && authProfile.data?.profile ? (
                <>
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium text-foreground">{accountLabel}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRoleLabel(authProfile.data.profile.role)}
                      {authProfile.data.email ? ` · ${authProfile.data.email}` : null}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem onClick={() => void toggleDemoMode()}>
                {demoMode ? "Turn Demo Mode off" : "Turn Demo Mode on"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!demoMode}
                onClick={() => {
                  if (!demoMode) return;
                  demoStore.reset();
                  void queryClient.invalidateQueries({ refetchType: "active" });
                  toast.success("Demo data reset");
                }}
              >
                Reset demo data
              </DropdownMenuItem>
              <DropdownMenuItem disabled={demoMode} onClick={() => void clearLiveWorkspace()}>
                Clear live workspace
              </DropdownMenuItem>
              {authRequired ? (
                <>
                  <DropdownMenuSeparator />
                  {authProfile.data?.profile?.role === "admin" ? (
                    <DropdownMenuItem onClick={() => router.push("/settings/team")}>
                      Grant team access
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    onClick={async () => {
                      await fetch("/api/auth/sign-out", { method: "POST" });
                      void queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
                      router.push("/access");
                      router.refresh();
                      toast.message("Signed out");
                    }}
                  >
                    Sign out
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    />
  );
}
