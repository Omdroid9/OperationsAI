"use client";

import { MarketingContainer } from "@/components/marketing/marketing-container";
import { MarketingPrimaryButton } from "@/components/marketing/marketing-button";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect } from "react";

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <MarketingContainer className="py-20">
      <h1 className="mkt-title-page">This page could not load</h1>
      <p className="mkt-lead mt-4 max-w-lg">
        Something went wrong while loading this page. You can try again or return to the home page.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        <MarketingPrimaryButton href="/">
          Back to home
        </MarketingPrimaryButton>
        <Button variant="ghost" nativeButton={false} render={<Link href="/" />}>
          Home
        </Button>
      </div>
    </MarketingContainer>
  );
}
