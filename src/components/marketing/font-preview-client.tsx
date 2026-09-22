"use client";

import { SKY_FONT_CHOICES, type SkyFontChoice } from "@/lib/fonts/sky-fonts";
import Link from "next/link";
import { useState } from "react";

const CRM_SAMPLE = {
  carrier: "Patel Freight Solutions",
  usdot: "3847291",
  stage: "Qualified",
  action: "Schedule follow-up",
  owner: "A. Mehta",
  activity: "Aug 12, 2026",
};

function fontFamily(id: SkyFontChoice): string {
  switch (id) {
    case "mango":
      return "var(--font-mango), ui-sans-serif, system-ui, sans-serif";
    case "humane":
      return "var(--font-humane), ui-sans-serif, system-ui, sans-serif";
    case "dominique":
      return "var(--font-dominique), ui-serif, Georgia, serif";
    default:
      return "var(--font-nohemi), ui-sans-serif, system-ui, sans-serif";
  }
}

function displayFamily(id: SkyFontChoice): string {
  if (id === "nohemi") return "var(--font-mango), ui-sans-serif, system-ui, sans-serif";
  return fontFamily(id);
}

export function FontPreviewClient() {
  const [active, setActive] = useState<SkyFontChoice>("mango");
  const bodyFamily = active === "mango" ? "var(--font-nohemi), ui-sans-serif, sans-serif" : fontFamily(active);
  const headlineFamily = displayFamily(active);
  const meta = SKY_FONT_CHOICES.find((item) => item.id === active);

  return (
    <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8" style={{ fontFamily: bodyFamily }}>
      <p className="text-sm text-[var(--mkt-muted)]">
        <Link href="/" className="underline-offset-2 hover:underline">
          ← Home
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-medium tracking-[-0.03em] text-[var(--mkt-fg)]">
        Font comparison
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--mkt-muted)]">
        Compare candidates. Live stack: <strong className="font-medium text-[var(--mkt-fg)]">Mango Grotesque</strong> display,{" "}
        <strong className="font-medium text-[var(--mkt-fg)]">Nohemi</strong> headings and body.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {SKY_FONT_CHOICES.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => setActive(choice.id)}
            className={`rounded-[6px] border px-3 py-1.5 text-sm transition-colors ${
              active === choice.id
                ? "border-[var(--mkt-fg)] bg-[var(--mkt-fg)] text-[var(--mkt-surface)]"
                : "border-[var(--mkt-border)] bg-[var(--mkt-surface)] text-[var(--mkt-fg)] hover:border-[var(--mkt-muted)]"
            }`}
          >
            {choice.label}
          </button>
        ))}
      </div>
      {meta ? <p className="mt-3 text-sm text-[var(--mkt-muted)]">{meta.note}</p> : null}

      <section className="mt-10 rounded-[var(--mkt-radius)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)] p-6 sm:p-8">
        <p className="text-[13px] font-medium text-[var(--mkt-muted)]">Marketing</p>
        <h2 className="mt-2 max-w-xl text-4xl font-semibold tracking-[-0.03em] leading-[1.08] text-[var(--mkt-fg)]" style={{ fontFamily: headlineFamily }}>
          Make trucking compliance simpler.
        </h2>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-[var(--mkt-muted)]">
          Authority, filings, renewals, and monitoring—in SkyOS. We help organize the next step; we
          do not guarantee regulatory outcomes.
        </p>
      </section>

      <section className="mt-6 overflow-hidden rounded-[var(--mkt-radius)] border border-[var(--mkt-border)] bg-[var(--mkt-surface)]">
        <div className="border-b border-[var(--mkt-border)] px-4 py-3">
          <p className="text-[13px] font-medium text-[var(--mkt-fg)]">CRM · Leads</p>
          <p className="text-xs text-[var(--mkt-muted)]">Dense table sample</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--mkt-border)] text-xs text-[var(--mkt-muted)]">
              <th className="px-4 py-2 font-medium">Name / company</th>
              <th className="px-4 py-2 font-medium">USDOT</th>
              <th className="px-4 py-2 font-medium">Stage</th>
              <th className="px-4 py-2 font-medium">Next action</th>
              <th className="hidden px-4 py-2 font-medium sm:table-cell">Owner</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-3">
                <span className="block font-medium">{CRM_SAMPLE.carrier}</span>
                <span className="text-xs text-[var(--mkt-muted)]">Ravi Patel</span>
              </td>
              <td className="px-4 py-3 font-mono text-xs tabular-nums">{CRM_SAMPLE.usdot}</td>
              <td className="px-4 py-3">{CRM_SAMPLE.stage}</td>
              <td className="px-4 py-3">{CRM_SAMPLE.action}</td>
              <td className="hidden px-4 py-3 sm:table-cell">{CRM_SAMPLE.owner}</td>
            </tr>
          </tbody>
        </table>
        <p className="border-t border-[var(--mkt-border)] px-4 py-2 font-mono text-[11px] text-[var(--mkt-muted)]">
          IDs stay in Geist Mono · {CRM_SAMPLE.activity}
        </p>
      </section>
    </div>
  );
}
