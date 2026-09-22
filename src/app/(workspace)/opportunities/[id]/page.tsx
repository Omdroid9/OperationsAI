"use client";

import { OpportunityDetail } from "@/components/opportunities/opportunity-detail";
import { useParams } from "next/navigation";

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  return <OpportunityDetail id={params.id} />;
}
