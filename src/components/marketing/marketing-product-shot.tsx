import Image from "next/image";
import { cn } from "@/lib/utils";

type MarketingProductShotProps = {
  src: string;
  alt: string;
  title?: string;
  caption?: string;
  aspectClassName?: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
  objectFit?: "contain" | "cover";
};

export function MarketingProductShot({
  src,
  alt,
  title,
  caption,
  aspectClassName = "aspect-[16/9] md:aspect-[21/10]",
  priority,
  className,
  sizes = "(max-width: 768px) 100vw, 88rem",
  objectFit = "contain",
}: MarketingProductShotProps) {
  return (
    <figure className={cn("min-w-0", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-[10px] border border-[var(--mkt-border)] bg-[var(--mkt-snow)]",
        )}
      >
        <div className={cn("relative w-full", aspectClassName)}>
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            quality={90}
            className={objectFit === "cover" ? "object-cover object-center" : "object-contain object-top"}
            sizes={sizes}
          />
        </div>
      </div>
      {title || caption ? (
        <figcaption className="mt-3">
          {title ? (
            <p className="font-sans text-sm font-medium text-[var(--mkt-ink)]">{title}</p>
          ) : null}
          {caption ? (
            <p className="mt-1 font-sans text-sm leading-relaxed text-[var(--mkt-ink-muted)]">
              {caption}
            </p>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
