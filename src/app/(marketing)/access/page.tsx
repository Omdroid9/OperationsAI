import { SignInForm } from "@/components/marketing/sign-in-form";
import { SignInFormSkeleton } from "@/components/marketing/sign-in-form-skeleton";
import { SignInTrustPanel } from "@/components/marketing/sign-in-trust-panel";
import { MarketingSplitHero } from "@/components/marketing";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Access product",
  description: "Log in to access the SkyOS product workspace.",
};

export default function AccessPage() {
  return (
    <>
      <MarketingSplitHero
        title="Access the product"
        lead="Log in to enter the SkyOS workspace—prospecting, CRM, Docket, and RegLens."
        imageSrc="/marketing/california-corridor.webp"
        imageAlt="Highway corridor with trucks"
        actions={
          <Link
            href="/#product"
            className="border-b border-white/70 pb-0.5 font-sans text-sm text-white hover:border-white"
          >
            See the product
          </Link>
        }
      />

      <section className="bg-[var(--mkt-canvas)]">
        <div className="mx-auto grid max-w-[var(--mkt-content-max)] gap-12 px-6 py-14 md:grid-cols-12 md:gap-16 md:px-8 md:py-20">
          <div className="md:col-span-4">
            <SignInTrustPanel />
          </div>
          <div className="md:col-span-7 md:col-start-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--mkt-ink)]">
              Log in
            </h2>
            <span className="mkt-rule-brand mt-5 block" aria-hidden="true" />
            <p className="mt-5 font-sans text-base leading-relaxed text-[var(--mkt-ink-muted)]">
              Use the email and password assigned for your staff account. When auth is off in this
              environment, you can enter the product directly.
            </p>
            <Suspense fallback={<SignInFormSkeleton />}>
              <SignInForm />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
}
