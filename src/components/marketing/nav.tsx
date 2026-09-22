"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** In-page anchors only — public marketing is a single product page. */
const LINKS = [
  { href: "/#product", label: "Product" },
  { href: "/#voice", label: "Voice" },
  { href: "/#modules", label: "Features" },
  { href: "/#faq", label: "FAQ" },
];

export function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300",
        scrolled || open
          ? "border-b border-[var(--mkt-border)] bg-[var(--mkt-snow)]/95 shadow-[0_1px_0_rgba(28,25,23,0.06)] backdrop-blur-md"
          : "border-b border-[var(--mkt-border)] bg-[var(--mkt-snow)]/90 backdrop-blur-sm",
      )}
    >
      <div className="mx-auto flex max-w-[var(--mkt-content-max)] items-center justify-between px-6 py-3.5 md:px-8">
        <Link href="/" className="min-w-0" onClick={() => setOpen(false)}>
          <span className="block font-sans text-[0.9rem] font-medium tracking-tight text-[var(--mkt-ink)]">
            SkyOS
          </span>
          <span className="block font-sans text-[0.7rem] text-[var(--mkt-ink-faint)]">
            Operations workspace
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="mkt-nav-link font-sans text-[0.9rem] font-medium text-[var(--mkt-ink-muted)] transition-colors hover:text-[var(--mkt-brand)]"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/access"
            className="rounded-[3px] bg-[var(--mkt-brand)] px-3.5 py-2 font-sans text-[0.8rem] font-medium text-[var(--mkt-snow)] transition-colors hover:bg-[var(--mkt-brand-deep)]"
          >
            Access product
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center text-[var(--mkt-ink)] md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="flex w-5 flex-col gap-1.5" aria-hidden="true">
            <span
              className={cn(
                "h-px w-full bg-current transition-transform",
                open && "translate-y-[3.5px] rotate-45",
              )}
            />
            <span className={cn("h-px w-full bg-current transition-opacity", open && "opacity-0")} />
            <span
              className={cn(
                "h-px w-full bg-current transition-transform",
                open && "-translate-y-[3.5px] -rotate-45",
              )}
            />
          </span>
        </button>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          className="border-t border-[var(--mkt-border)] bg-[var(--mkt-snow)] px-6 py-5 md:hidden"
          aria-label="Mobile"
        >
          <ul className="flex flex-col">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block border-b border-[var(--mkt-border)] py-4 font-sans text-base font-medium text-[var(--mkt-ink)]"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-5">
              <Link
                href="/access"
                className="inline-flex rounded-[3px] bg-[var(--mkt-brand)] px-5 py-3 font-sans text-sm font-medium text-[var(--mkt-snow)]"
                onClick={() => setOpen(false)}
              >
                Access product
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
