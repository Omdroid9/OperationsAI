export function SkyosMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      className={className}
      aria-hidden
    >
      <rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 14h20" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 14V9h4v5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
