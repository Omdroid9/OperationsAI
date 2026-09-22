import { getProfileKind, profileKindHint, profileKindLabel } from "@/lib/profile";
import { cn } from "@/lib/utils";
import type { Carrier, ProfileKind } from "@/types";

export function ProfileKindBadge({
  kind,
  className,
}: {
  kind: ProfileKind;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-[6px] px-1.5 text-[11px] font-medium",
        kind === "live"
          ? "bg-info-foreground text-info"
          : kind === "census"
            ? "border border-border bg-card text-muted-foreground"
            : kind === "intake"
            ? "border border-border bg-card text-muted-foreground"
            : "border border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {profileKindLabel(kind)}
    </span>
  );
}

export function CarrierName({
  name,
  kind,
  className,
}: {
  name: string;
  kind: ProfileKind;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <span className="font-medium text-foreground">{name}</span>
      {kind === "intake" ? null : <ProfileKindBadge kind={kind} />}
    </span>
  );
}

export function ProfileKindNote({
  carrier,
  className,
}: {
  carrier?: Pick<Carrier, "id" | "profileKind"> | null;
  className?: string;
}) {
  const kind = getProfileKind(carrier);
  return <p className={cn("text-sm text-muted-foreground", className)}>{profileKindHint(kind)}</p>;
}
