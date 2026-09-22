"use client";

import { CarrierName } from "@/components/shared/profile-kind";
import { EmptyState, TableSkeleton } from "@/components/shared/empty-state";
import { PageBody } from "@/components/shared/page-body";
import { formatInterest } from "@/lib/qualify/display";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { useCalls, useCarriers, useOpportunities } from "@/hooks/use-skyos";
import { formatRelative } from "@/lib/format";
import { getProfileKind } from "@/lib/profile";
import Link from "next/link";
import { useMemo } from "react";

export default function CallsPage() {
  const calls = useCalls();
  const opportunities = useOpportunities();
  const carriers = useCarriers();

  const rows = useMemo(() => {
    const oppMap = new Map((opportunities.data ?? []).map((item) => [item.id, item]));
    const carrierMap = new Map((carriers.data ?? []).map((item) => [item.id, item]));
    return (calls.data ?? []).map((call) => {
      const opportunity = oppMap.get(call.leadId);
      const carrier = carrierMap.get(call.carrierId);
      return {
        ...call,
        carrierName: carrier?.legalName ?? call.carrierId,
        profileKind: getProfileKind(carrier),
        opportunityId: opportunity?.id,
      };
    });
  }, [calls.data, opportunities.data, carriers.data]);

  return (
    <PageBody>
      <PageHeader
        title="Calls"
        description="After qualification, this is the structured result: language, fleet, interest, and whether they asked for a follow-up. Simulated calls on demo profiles are labeled."
      />
      {calls.isLoading ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No call history."
          description="Qualify an opportunity to attach a stored multilingual call result."
        />
      ) : (
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="h-9 font-medium">Carrier</th>
              <th className="h-9 font-medium">Language</th>
              <th className="h-9 font-medium">Duration</th>
              <th className="h-9 font-medium">Result</th>
              <th className="h-9 font-medium">Interest</th>
              <th className="h-9 font-medium">Follow-up</th>
              <th className="h-9 font-medium">Next</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-muted/50">
                <td className="h-11">
                  <Link href={`/calls/${row.id}`} className="hover:underline">
                    <CarrierName name={row.carrierName} kind={row.profileKind} />
                  </Link>
                </td>
                <td>{row.detectedLanguages.join(" + ")}</td>
                <td className="tabular text-muted-foreground">
                  {row.durationSeconds ? `${Math.round(row.durationSeconds / 60)} min` : "—"}
                </td>
                <td>
                  <StatusBadge
                    label={
                      row.status === "failed"
                        ? "Failed"
                        : row.status === "simulated"
                          ? "Simulated"
                          : "Completed"
                    }
                    tone={
                      row.status === "failed"
                        ? "danger"
                        : row.status === "simulated"
                          ? "warning"
                          : "success"
                    }
                  />
                </td>
                <td>{formatInterest(row.qualification.interest_level)}</td>
                <td className="text-muted-foreground">
                  {row.qualification.callback_requested === true
                    ? row.qualification.callback_time ?? formatRelative(row.createdAt)
                    : row.qualification.callback_requested === false
                      ? "Not requested"
                      : "Not captured"}
                </td>
                <td>
                  {row.status === "failed" && row.opportunityId ? (
                    <Link href={`/opportunities/${row.opportunityId}`} className="text-sm hover:underline">
                      Retry
                    </Link>
                  ) : (
                    <Link href={`/calls/${row.id}`} className="text-sm text-muted-foreground hover:underline">
                      Open
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageBody>
  );
}
