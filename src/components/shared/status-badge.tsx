import { CASE_STATUS_LABEL, DOCUMENT_STATUS_LABEL, STAGE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { CaseStatus, DocumentReviewStatus, OpportunityStage } from "@/types";

type Tone = "neutral" | "info" | "warning" | "success" | "danger";

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info-foreground text-info",
  warning: "bg-warning-foreground text-warning",
  success: "bg-success-foreground text-success",
  danger: "bg-destructive/10 text-destructive",
};

function Badge({
  label,
  tone,
  className,
}: {
  label: string;
  tone: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-[6px] px-1.5 text-[11px] font-medium tracking-wide",
        toneClass[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function StageBadge({ stage }: { stage: OpportunityStage }) {
  const tone: Tone =
    stage === "WON"
      ? "success"
      : stage === "LOST" || stage === "DISMISSED"
        ? "neutral"
        : stage === "QUALIFIED" || stage === "CONSULTATION"
          ? "info"
          : stage === "CONTACTED"
            ? "warning"
            : "neutral";
  return <Badge label={STAGE_LABEL[stage]} tone={tone} />;
}

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const tone: Tone =
    status === "COMPLETE"
      ? "success"
      : status === "READY"
        ? "info"
        : status === "IN_REVIEW" || status === "WAITING_ON_CLIENT"
          ? "warning"
          : "neutral";
  return <Badge label={CASE_STATUS_LABEL[status]} tone={tone} />;
}

export function DocumentStatusBadge({ status }: { status: DocumentReviewStatus }) {
  const tone: Tone =
    status === "VERIFIED"
      ? "success"
      : status === "NEEDS_REVIEW" || status === "EXTRACTED"
        ? "warning"
        : status === "REJECTED"
          ? "danger"
          : "neutral";
  return <Badge label={DOCUMENT_STATUS_LABEL[status]} tone={tone} />;
}

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return <Badge label={label} tone={tone} />;
}
