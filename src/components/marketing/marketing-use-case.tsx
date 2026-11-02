import { MarketingProductShot } from "@/components/marketing/marketing-product-shot";

const PHOTOS = [
  {
    src: "/marketing/california-corridor.webp",
    alt: "A tractor-trailer on the highway",
    caption: "The work is carriers — authority, filings, renewals, driver documents.",
  },
  {
    src: "/marketing/ops-compliance-desk.webp",
    alt: "A compliance desk with files, a laptop, and a truck outside the window",
    caption: "Staff run that work. Carriers never log in.",
  },
] as const;

export function MarketingUseCase() {
  return (
    <section
      id="use-case"
      className="scroll-mt-24 border-b border-[var(--mkt-border)] bg-[var(--mkt-snow)]"
      aria-labelledby="use-case-title"
    >
      <div className="mx-auto grid max-w-[var(--mkt-content-max)] gap-10 px-6 py-20 md:grid-cols-12 md:gap-10 md:px-8 md:py-28">
        <h2
          id="use-case-title"
          className="text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.15] text-[var(--mkt-ink)] md:col-span-4"
        >
          Who it’s for
        </h2>
        <div className="md:col-span-7 md:col-start-6">
          <p className="max-w-[60ch] font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)] md:text-lg">
            The shop that helps carriers with authority, filings, renewals, and documents. Public
            data can flag a carrier worth reviewing — not that they want to buy, or that they are
            out of compliance.
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-[88rem] gap-6 px-4 pb-16 sm:px-6 md:grid-cols-2 md:px-8 md:pb-20">
        {PHOTOS.map((photo) => (
          <MarketingProductShot
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            caption={photo.caption}
            aspectClassName="aspect-[16/10]"
            objectFit="cover"
            sizes="(max-width: 768px) 100vw, 44rem"
          />
        ))}
      </div>
    </section>
  );
}
