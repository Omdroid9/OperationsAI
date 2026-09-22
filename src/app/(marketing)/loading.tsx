export default function MarketingLoading() {
  return (
    <div className="mx-auto w-full max-w-[var(--mkt-content-max)] px-5 py-16 sm:px-8">
      <div className="animate-pulse space-y-4">
        <div className="h-3 w-24 rounded-[var(--mkt-radius-sm)] bg-[var(--mkt-border)]/60" />
        <div className="h-10 max-w-md rounded-[var(--mkt-radius-sm)] bg-[var(--mkt-border)]/60" />
        <div className="h-20 max-w-lg rounded-[var(--mkt-radius-sm)] bg-[var(--mkt-border)]/60" />
        <div className="mt-8 h-48 max-w-2xl rounded-[var(--mkt-radius)] bg-[var(--mkt-border)]/40" />
      </div>
    </div>
  );
}
