function SkeletonLine({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[var(--mkt-border)] ${className ?? ""}`} />;
}

export function SignInFormSkeleton() {
  return (
    <div className="mt-8 space-y-7">
      <div>
        <SkeletonLine className="h-3 w-16" />
        <SkeletonLine className="mt-3 h-px w-full" />
      </div>
      <div>
        <SkeletonLine className="h-3 w-20" />
        <SkeletonLine className="mt-3 h-px w-full" />
      </div>
      <SkeletonLine className="h-10 w-28" />
    </div>
  );
}
