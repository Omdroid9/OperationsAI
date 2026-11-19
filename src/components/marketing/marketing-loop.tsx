"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useId, useRef, useState } from "react";

const STEPS = [
  {
    id: "discover",
    label: "Discover",
    title: "Find carriers worth a look",
    body: "Search public FMCSA records by state, fleet size and registration date. A score explains why a carrier may be relevant. Nobody is contacted until staff save a prospect.",
    src: "/marketing/product-shots/18-prospecting-v3.png",
    alt: "Prospecting search of California carriers with priority scores and a Save as prospect action",
  },
  {
    id: "intake",
    label: "Intake",
    title: "Keep every lead on one record",
    body: "Website requests and staff-entered leads share a list, each with its stage, owner and next action. Inbound requests stay separate from public-data prospects.",
    src: "/marketing/product-shots/19-crm-v3.png",
    alt: "CRM list of inbound leads with stage, owner and next action",
  },
  {
    id: "qualify",
    label: "Qualify",
    title: "Review the call, then update the record",
    body: "A qualification call produces a summary and extracted fields. Values that differ from the carrier record are pointed out, and staff review them before anything changes.",
    src: "/marketing/product-shots/21-call-patel-v3.png",
    alt: "Call record for Patel Freight with outcome, interest and suggested follow-up",
  },
  {
    id: "fulfill",
    label: "Fulfill",
    title: "Work the case from a checklist",
    body: "Won work opens a Docket case. Uploaded documents are read into draft fields, and staff confirm each one against the file before it counts as verified.",
    src: "/marketing/product-shots/22-docket-redwood-v3.png",
    alt: "Docket case for Redwood Linehaul listing documents to confirm and missing items",
  },
  {
    id: "monitor",
    label: "Monitor",
    title: "See which clients a new rule may touch",
    body: "RegLens pulls FMCSA notices from the Federal Register, finds related earlier notices and matches client operating profiles. Staff decide client by client, then approve the case tasks.",
    src: "/marketing/product-shots/23-reglens-detail-v3.png",
    alt: "RegLens notice with a current customer marked as potentially affected",
  },
] as const;

/** The product loop, one step at a time. The order is the order staff work in. */
export function MarketingLoop() {
  const [active, setActive] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const baseId = useId();
  const step = STEPS[active];

  const move = (next: number) => {
    const index = (next + STEPS.length) % STEPS.length;
    setActive(index);
    tabs.current[index]?.focus();
  };

  return (
    <section
      id="loop"
      className="scroll-mt-24 border-b border-[var(--mkt-border)] bg-[var(--mkt-snow)]"
      aria-labelledby="loop-title"
    >
      <div className="mx-auto max-w-[var(--mkt-content-max)] px-6 py-20 md:px-8 md:py-28">
        <h2 id="loop-title" className="mkt-title-section max-w-[22ch] text-[var(--mkt-ink)]">
          From first contact to an open case, in five steps
        </h2>

        <div
          role="tablist"
          aria-label="Product steps"
          className="mt-10 flex gap-1 overflow-x-auto border-b border-[var(--mkt-border)]"
        >
          {STEPS.map((item, index) => {
            const selected = index === active;
            return (
              <button
                key={item.id}
                ref={(node) => {
                  tabs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight") move(index + 1);
                  if (event.key === "ArrowLeft") move(index - 1);
                  if (event.key === "Home") move(0);
                  if (event.key === "End") move(STEPS.length - 1);
                }}
                className={cn(
                  "-mb-px flex shrink-0 items-baseline gap-2 border-b-2 px-3 py-3 font-sans text-sm transition-colors md:px-4",
                  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--mkt-ink)]",
                  selected
                    ? "border-[var(--mkt-ink)] font-medium text-[var(--mkt-ink)]"
                    : "border-transparent text-[var(--mkt-ink-faint)] hover:text-[var(--mkt-ink)]",
                )}
              >
                <span className="font-[family-name:var(--font-geist-mono)] text-[0.6875rem]">
                  {index + 1}
                </span>
                {item.label}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${step.id}`}
          className="mt-8 grid gap-8 md:grid-cols-12 md:gap-10"
        >
          <div className="md:col-span-4">
            <h3 className="font-sans text-xl font-medium leading-snug tracking-tight text-[var(--mkt-ink)]">
              {step.title}
            </h3>
            <p className="mt-3 font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)]">
              {step.body}
            </p>
          </div>
          <div className="md:col-span-8">
            <div className="overflow-hidden rounded-[10px] border border-[var(--mkt-border)] bg-[var(--mkt-canvas)]">
              <div className="relative aspect-[16/10] w-full">
                <Image
                  key={step.src}
                  src={step.src}
                  alt={step.alt}
                  fill
                  quality={90}
                  priority={active === 0}
                  className="object-cover object-left-top"
                  sizes="(max-width: 768px) 100vw, 48rem"
                />
              </div>
            </div>
            <p className="mt-2 font-sans text-xs text-[var(--mkt-ink-faint)]">
              Captured from the seeded demo workspace.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
