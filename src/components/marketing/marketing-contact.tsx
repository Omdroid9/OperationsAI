import { getMarketingContact } from "@/lib/marketing/contact";
import { cn } from "@/lib/utils";

export function MarketingContactLinks({ className }: { className?: string }) {
  const { email, phone, phoneHref } = getMarketingContact();

  return (
    <div className={cn("flex flex-col gap-1 text-sm", className)}>
      <a
        href={`mailto:${email}`}
        className="text-[var(--mkt-fg)] underline-offset-2 hover:underline"
      >
        {email}
      </a>
      {phone && phoneHref ? (
        <a
          href={phoneHref}
          className="text-[var(--mkt-muted)] underline-offset-2 hover:text-[var(--mkt-fg)] hover:underline"
        >
          {phone}
        </a>
      ) : null}
    </div>
  );
}
