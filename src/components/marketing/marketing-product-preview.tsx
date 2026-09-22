import Image from "next/image";
import { MarketingSectionRule } from "@/components/marketing/marketing-section-rule";

const FEATURED = {
  src: "/presentations/shots/04-crm-consultation.png",
  alt: "SkyOS CRM opportunity with Detect → Fulfill stages and consultation handoff",
  label: "CRM — consultation handoff",
  caption: "One record from inbound lead through Convert. Next action stays on the page.",
} as const;

const SHOTS = [
  {
    src: "/presentations/shots/09-docket-case.png",
    alt: "SkyOS Docket case with required documents and missing items",
    label: "Docket",
  },
  {
    src: "/presentations/shots/11-docket-extracted.png",
    alt: "SkyOS document fields extracted for staff confirmation",
    label: "Document fields",
  },
  {
    src: "/presentations/shots/12-reglens.png",
    alt: "SkyOS RegLens FMCSA notices queue",
    label: "RegLens",
  },
] as const;

export function MarketingProductPreview() {
  return (
    <section
      id="product"
      className="scroll-mt-24 border-b border-[var(--mkt-border)] bg-[var(--mkt-snow)]"
      aria-label="Product preview"
    >
      <div className="mx-auto max-w-[88rem] px-6 py-16 md:px-8 md:py-24">
        <p className="font-sans text-sm text-[var(--mkt-ink-faint)]">Product</p>
        <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-[clamp(1.85rem,3.5vw,2.75rem)] tracking-tight text-[var(--mkt-ink)]">
          Real screens. Real workflow.
        </h2>
        <MarketingSectionRule tone="brand" className="mt-5" />
        <p className="mt-6 max-w-2xl font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)]">
          These are the same views staff use day to day—not mockups. Scroll the product after you
          Access product.
        </p>

        <figure className="mt-12 overflow-hidden rounded-[10px] border border-[var(--mkt-border)] bg-[var(--mkt-canvas)]">
          <div className="relative aspect-[16/9] w-full md:aspect-[21/10]">
            <Image
              src={FEATURED.src}
              alt={FEATURED.alt}
              fill
              quality={85}
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 88rem"
            />
          </div>
          <figcaption className="border-t border-[var(--mkt-border)] px-5 py-4 md:px-6">
            <p className="font-sans text-sm font-medium text-[var(--mkt-ink)]">{FEATURED.label}</p>
            <p className="mt-1 font-sans text-sm text-[var(--mkt-ink-muted)]">{FEATURED.caption}</p>
          </figcaption>
        </figure>

        <ul className="mt-8 grid gap-6 md:grid-cols-3 md:gap-5">
          {SHOTS.map((shot) => (
            <li key={shot.src}>
              <figure className="overflow-hidden rounded-[8px] border border-[var(--mkt-border)] bg-[var(--mkt-canvas)]">
                <div className="relative aspect-[16/10] w-full">
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    fill
                    quality={80}
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 100vw, 28rem"
                  />
                </div>
                <figcaption className="border-t border-[var(--mkt-border)] px-4 py-3 font-sans text-sm font-medium text-[var(--mkt-ink)]">
                  {shot.label}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
