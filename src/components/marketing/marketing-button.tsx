import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "on-dark";

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

type MarketingButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type MarketingButtonAsLink = CommonProps & {
  href: string;
};

const variants: Record<Variant, string> = {
  primary: "bg-[var(--mkt-brand)] text-[var(--mkt-snow)] hover:bg-[var(--mkt-brand-deep)]",
  secondary:
    "border border-[color-mix(in_srgb,var(--mkt-ink)_20%,transparent)] bg-transparent text-[var(--mkt-ink)] hover:border-[var(--mkt-brand)] hover:text-[var(--mkt-brand)]",
  ghost: "bg-transparent text-[color-mix(in_srgb,var(--mkt-ink)_70%,transparent)] hover:text-[var(--mkt-brand)]",
  "on-dark":
    "bg-[var(--mkt-on-dark)] text-[var(--mkt-ink)] hover:bg-[var(--mkt-on-dark-hover)]",
};

function buttonClasses(variant: Variant, className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-[3px] px-5 py-2.5",
    "font-sans text-[0.875rem] font-medium transition-colors duration-200",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    className,
  );
}

export function MarketingButton(props: MarketingButtonAsButton | MarketingButtonAsLink) {
  const { children, variant = "primary", className } = props;

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={buttonClasses(variant, className)}>
        {children}
      </Link>
    );
  }

  const { children: _c, variant: _v, className: _cl, ...buttonProps } =
    props as MarketingButtonAsButton;

  return (
    <button type="button" {...buttonProps} className={buttonClasses(variant, className)}>
      {children}
    </button>
  );
}

/** Primary nav / section CTA — alias for brand-filled button. */
export function MarketingPrimaryButton({
  href,
  children,
  className,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "on-dark";
  /** @deprecated size ignored — Huckleberry uses fixed button sizing */
  size?: string;
}) {
  return (
    <MarketingButton href={href} variant={variant} className={className}>
      {children}
    </MarketingButton>
  );
}

export const marketingPrimaryClass =
  "rounded-[3px] bg-[var(--mkt-brand)] font-medium text-[var(--mkt-snow)] hover:bg-[var(--mkt-brand-deep)]";
