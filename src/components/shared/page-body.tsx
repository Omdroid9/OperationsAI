import { cn } from "@/lib/utils";

export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full min-w-0 max-w-[1280px] overflow-x-hidden px-4 py-4 sm:px-6 sm:py-5", className)}>{children}</div>
  );
}
