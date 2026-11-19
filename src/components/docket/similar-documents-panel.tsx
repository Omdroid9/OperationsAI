"use client";

import { formatDate } from "@/lib/format";
import type { SimilarDocumentResult } from "@/lib/docket/rag/retrieve";

export function SimilarDocumentsPanel({ result }: { result: SimilarDocumentResult }) {
  if (result.exemplars.length === 0) return null;

  return (
    <div className="mt-3 rounded-[6px] border border-border bg-muted/40 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Prior confirmed patterns
      </p>
      <ul className="mt-2 space-y-2">
        {result.exemplars.map((item) => (
          <li key={item.id} className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{item.label}</span>
            <span className="mx-1.5 text-border">·</span>
            {item.personName}
            <span className="mx-1.5 text-border">·</span>
            {formatDate(item.issuedDate)} → {formatDate(item.expirationDate)}
            <p className="mt-0.5">{item.notes}</p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">{result.disclaimer}</p>
    </div>
  );
}
