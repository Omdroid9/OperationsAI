import Link from "next/link";

const ACCESS_POINTS = [
  "Prospecting, CRM, voice qualification, Docket, and RegLens in one product.",
  "Demo mode for the seeded walkthrough; live mode when providers are configured.",
  "Invite-only staff accounts when authentication is enabled.",
] as const;

export function SignInTrustPanel() {
  return (
    <aside>
      <p className="font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)] md:text-[1.05rem]">
        This page is how you access the SkyOS product. Log in with a staff account, or enter
        directly when auth is disabled for evaluation.
      </p>

      <ul className="mt-8 space-y-4 border-t border-[var(--mkt-border)] pt-8">
        {ACCESS_POINTS.map((point) => (
          <li
            key={point}
            className="border-b border-[var(--mkt-border)] pb-4 font-sans text-sm leading-relaxed text-[var(--mkt-ink-muted)] last:border-b-0 last:pb-0"
          >
            {point}
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <p className="font-sans text-sm font-medium text-[var(--mkt-ink)]">Need an account?</p>
        <p className="mt-2 font-sans text-sm leading-relaxed text-[var(--mkt-ink-muted)]">
          Ask your administrator to provision access. Until then, review the product page.
        </p>
        <div className="mt-4 flex flex-col items-start gap-3">
          <Link href="/#product" className="mkt-text-link">
            Product screens
          </Link>
          <Link href="/#modules" className="mkt-text-link">
            Feature list
          </Link>
        </div>
      </div>
    </aside>
  );
}
