import { MarketingSectionRule } from "@/components/marketing/marketing-section-rule";
import Image from "next/image";
import type { ReactNode } from "react";

export function MarketingPageHeader({
  title,
  lead,
  imageSrc,
  imageAlt,
  footer,
}: {
  title: ReactNode;
  lead?: string;
  imageSrc?: string;
  imageAlt?: string;
  footer?: ReactNode;
  /** @deprecated */
  eyebrow?: string;
}) {
  const hasImage = Boolean(imageSrc && imageAlt);

  return (
    <section className="bg-[var(--mkt-snow)] pt-28 md:pt-36">
      <div className="mx-auto grid max-w-[var(--mkt-content-max)] items-end gap-10 px-6 pb-12 md:grid-cols-12 md:px-8 md:pb-16">
        <div className={hasImage ? "md:col-span-7" : "md:col-span-5"}>
          <h1 className="mkt-title-page">{title}</h1>
          <MarketingSectionRule />
          {hasImage && lead ? (
            <p className="mt-5 max-w-lg font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)] md:text-lg">
              {lead}
            </p>
          ) : null}
          {hasImage && footer ? <div className="mt-6">{footer}</div> : null}
        </div>

        {hasImage ? (
          <figure className="md:col-span-5">
            <div className="relative aspect-[5/3] w-full overflow-hidden bg-[var(--mkt-border)]">
              <Image
                src={imageSrc!}
                alt={imageAlt!}
                fill
                priority
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
            </div>
          </figure>
        ) : (
          <div className="md:col-span-6 md:col-start-7">
            {lead ? (
              <p className="font-sans text-base leading-[1.8] text-[var(--mkt-ink-muted)] md:text-lg">
                {lead}
              </p>
            ) : null}
            {footer ? <div className="mt-6">{footer}</div> : null}
          </div>
        )}
      </div>
    </section>
  );
}
