import { PROVENANCE_LABEL } from "@/lib/labels";
import type { DataProvenance } from "@/types";

export function ProvenanceLabel({ value }: { value: DataProvenance }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
      {PROVENANCE_LABEL[value]}
    </span>
  );
}
