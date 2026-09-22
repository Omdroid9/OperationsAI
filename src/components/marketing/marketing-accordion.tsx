import { cn } from "@/lib/utils";

export type MarketingAccordionItem = {
  id: string;
  question: string;
  answer: string;
};

export function MarketingAccordion({
  items,
  className,
}: {
  items: readonly MarketingAccordionItem[];
  className?: string;
}) {
  return (
    <div className={cn("border-t border-[var(--mkt-border)]", className)}>
      {items.map((item) => (
        <details key={item.id} className="group border-b border-[var(--mkt-border)]">
          <summary className="flex cursor-pointer list-none items-baseline justify-between gap-8 py-6 marker:content-none md:py-7 [&::-webkit-details-marker]:hidden">
            <span className="font-sans text-base font-medium leading-snug text-[var(--mkt-ink)] md:text-[1.05rem]">
              {item.question}
            </span>
            <span
              aria-hidden
              className="shrink-0 font-sans text-lg leading-none text-[var(--mkt-ink-faint)] transition-transform duration-150 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="max-w-2xl pb-6 font-sans text-base leading-[1.8] text-[var(--mkt-ink-muted)] md:pb-8">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
