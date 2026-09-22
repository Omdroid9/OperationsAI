import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingNav } from "@/components/marketing/nav";
import { marketingFontVariables } from "@/lib/fonts/marketing-fonts";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`marketing ${marketingFontVariables} flex min-h-full flex-col bg-[var(--mkt-bg)] text-[var(--mkt-ink)] antialiased`}
    >
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
