import Image from "next/image";
import { cn } from "@/lib/utils";

type MarketingProductShotProps = {
  src: string;
  alt: string;
  /** Optional path label in the faux window chrome */
  pathLabel?: string;
  /** Aspect of the frame — keep close to cropped shot (~2.26:1 → ~16/7) */
  aspectClassName?: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
};

/**
 * One product screenshot per frame. Shots are pre-cropped to remove browser tabs
 * and OS chrome; framed with a simple window bar so the app UI stays readable.
 */
export function MarketingProductShot({
  src,
  alt,
  pathLabel,
  aspectClassName = "aspect-[16/9]",
  priority,
  className,
  sizes = "(max-width: 768px) 100vw, 88rem",
}: MarketingProductShotProps) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-[10px] border border-[var(--mkt-border)] bg-[var(--mkt-snow)]",
        className,
      )}
    >
      {pathLabel ? (
        <div className="flex items-center gap-2 border-b border-[var(--mkt-border)] bg-[var(--mkt-sand)] px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-[color-mix(in_srgb,var(--mkt-ink)_25%,transparent)]" />
          <span className="h-2 w-2 rounded-full bg-[color-mix(in_srgb,var(--mkt-ink)_25%,transparent)]" />
          <span className="h-2 w-2 rounded-full bg-[color-mix(in_srgb,var(--mkt-ink)_25%,transparent)]" />
          <span className="ml-3 truncate font-mono text-[0.7rem] text-[var(--mkt-ink-faint)]">
            {pathLabel}
          </span>
        </div>
      ) : null}
      <div className={cn("relative w-full bg-[var(--mkt-canvas)]", aspectClassName)}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          quality={90}
          className="object-contain object-top"
          sizes={sizes}
        />
      </div>
    </figure>
  );
}
