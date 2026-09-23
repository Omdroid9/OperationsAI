import { MarketingProductShot } from "@/components/marketing/marketing-product-shot";
import { MarketingSectionRule } from "@/components/marketing/marketing-section-rule";

const SHOTS = [
  {
    src: "/marketing/product-shots/05-crm-approve.png",
    alt: "SkyOS CRM opportunity ready to approve service",
    label: "CRM — approve service",
    caption: "One record from inbound lead through Convert. Next action stays on the page.",
    pathLabel: "skyos.app / crm",
  },
  {
    src: "/marketing/product-shots/09-docket-case.png",
    alt: "SkyOS Docket case with required documents and missing items",
    label: "Docket",
    caption: "Checklist, uploads, and what is still missing to fulfill the case.",
    pathLabel: "skyos.app / docket",
  },
  {
    src: "/marketing/product-shots/11-docket-extracted.png",
    alt: "SkyOS document fields extracted for staff confirmation",
    label: "Document fields",
    caption: "Extraction is a draft. Staff confirm names and dates before they drive the case.",
    pathLabel: "skyos.app / docket · review",
  },
  {
    src: "/marketing/product-shots/12-reglens.png",
    alt: "SkyOS RegLens FMCSA notices queue",
    label: "RegLens",
    caption: "Fetch notices, then review customers who may need follow-up.",
    pathLabel: "skyos.app / reglens",
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
          Each frame shows one product view—browser tabs and desktop chrome removed so the UI stays
          readable. Access the product to run the seeded demo.
        </p>

        <ul className="mt-12 space-y-10">
          {SHOTS.map((shot) => (
            <li key={shot.src}>
              <MarketingProductShot
                src={shot.src}
                alt={shot.alt}
                pathLabel={shot.pathLabel}
                aspectClassName="aspect-[16/9] md:aspect-[21/10]"
                sizes="(max-width: 768px) 100vw, 88rem"
              />
              <div className="mt-4 max-w-2xl px-1">
                <p className="font-sans text-sm font-medium text-[var(--mkt-ink)]">{shot.label}</p>
                <p className="mt-1 font-sans text-sm text-[var(--mkt-ink-muted)]">{shot.caption}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
