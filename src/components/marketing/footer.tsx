import { MarketingContactLinks } from "@/components/marketing/marketing-contact";
import Link from "next/link";

const LINKS = [
  { href: "/#product", label: "Product" },
  { href: "/#voice", label: "Voice" },
  { href: "/#under-the-hood", label: "Under the hood" },
  { href: "/#modules", label: "Features" },
  { href: "/#faq", label: "FAQ" },
  { href: "/access", label: "Access product" },
];

export function MarketingFooter() {
  return (
    <footer className="mkt-on-dark mt-auto bg-[var(--mkt-brand)]">
      <div className="mx-auto max-w-[var(--mkt-content-max)] px-6 py-14 md:px-8 md:py-16">
        <div className="grid gap-12 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-5">
            <p className="font-sans text-[0.95rem] font-medium tracking-tight text-white">
              SkyOS
            </p>
            <p className="mt-4 max-w-sm font-sans text-sm leading-relaxed text-[var(--mkt-on-dark-muted)]">
              Operations workspace for trucking compliance teams—prospecting, qualification, cases,
              and monitoring with staff review on important decisions.
            </p>
            <MarketingContactLinks className="mt-5 [&_a]:text-white [&_a:hover]:opacity-80" />
          </div>

          <nav className="md:col-span-3 md:col-start-7" aria-label="Footer">
            <p className="font-sans text-xs tracking-wide text-[var(--mkt-on-dark-faint)]">
              On this page
            </p>
            <ul className="mt-4 space-y-3 font-sans text-sm">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[var(--mkt-on-dark-muted)] transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-3">
            <p className="font-sans text-xs tracking-wide text-[var(--mkt-on-dark-faint)]">
              Product
            </p>
            <ul className="mt-4 space-y-2 font-sans text-sm text-[var(--mkt-on-dark-muted)]">
              <li>Prospecting and opportunities</li>
              <li>CRM and voice qualification</li>
              <li>Docket and RegLens</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/20 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="font-sans text-xs text-[var(--mkt-on-dark-faint)]">
            © {new Date().getFullYear()} SkyOS
          </p>
          <p className="font-sans text-sm text-[var(--mkt-on-dark-faint)]">
            Staff review on important decisions
          </p>
        </div>
      </div>
    </footer>
  );
}
