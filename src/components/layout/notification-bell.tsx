"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAttentionItems } from "@/hooks/use-skyos";
import type { AttentionItem, AttentionTone } from "@/lib/attention";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";
import Link from "next/link";

const toneDot: Record<AttentionTone, string> = {
  danger: "bg-destructive",
  warning: "bg-warning",
  info: "bg-info",
};

function AttentionRow({ item }: { item: AttentionItem }) {
  return (
    <DropdownMenuItem
      nativeButton={false}
      render={
        <Link
          href={item.href}
          className="flex w-full items-start gap-2.5 py-2"
        />
      }
    >
      <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", toneDot[item.tone])} />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{item.title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{item.detail}</span>
      </span>
    </DropdownMenuItem>
  );
}

export function NotificationBell() {
  const attention = useAttentionItems();
  const items = (attention.data ?? []).filter((item) => item.lane !== "discovery");
  const count = items.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`${count} items need attention`} />
        }
      >
        <span className="relative">
          <Bell className="size-3.5" />
          {count > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-0.5 text-[10px] font-medium tabular text-warning-foreground">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Needs attention</DropdownMenuLabel>
          {attention.isLoading ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Loading…</p>
          ) : count === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Nothing urgent right now.</p>
          ) : (
            items.slice(0, 8).map((item) => <AttentionRow key={item.id} item={item} />)
          )}
        </DropdownMenuGroup>
        {count > 8 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem nativeButton={false} render={<Link href="/app" className="text-sm" />}>
              View all on Overview
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
