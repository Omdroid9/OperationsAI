"use client";

import { CarrierName } from "@/components/shared/profile-kind";
import { CaseStatusBadge } from "@/components/shared/status-badge";
import { EmptyState, TableSkeleton } from "@/components/shared/empty-state";
import { PageBody } from "@/components/shared/page-body";
import { PageHeader } from "@/components/shared/page-header";
import { useCarriers, useCases } from "@/hooks/use-skyos";
import { formatDateShort } from "@/lib/format";
import { getProfileKind } from "@/lib/profile";
import Link from "next/link";
import { useMemo } from "react";

export default function DocketPage() {
  const cases = useCases();
  const carriers = useCarriers();
  const rows = useMemo(() => {
    const carrierMap = new Map((carriers.data ?? []).map((item) => [item.id, item]));
    return (cases.data ?? []).map((item) => ({
      ...item,
      carrierName: carrierMap.get(item.carrierId)?.legalName ?? item.carrierId,
      profileKind: getProfileKind(carrierMap.get(item.carrierId)),
    }));
  }, [cases.data, carriers.data]);

  return (
    <PageBody>
      <PageHeader
        title="Docket"
        description="After Won, the sale becomes a case. Confirm extracted fields. Demo customers stay labeled."
      />
      {cases.isLoading ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No service cases."
          description="Mark an opportunity Won, then use Start Service."
        />
      ) : (
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="h-9 font-medium">Customer</th>
              <th className="h-9 font-medium">Service</th>
              <th className="h-9 font-medium">Status</th>
              <th className="h-9 font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-muted/50">
                <td className="h-11">
                  <Link href={`/docket/${row.id}`} className="hover:underline">
                    <CarrierName name={row.carrierName} kind={row.profileKind} />
                  </Link>
                </td>
                <td>{row.serviceType}</td>
                <td>
                  <CaseStatusBadge status={row.status} />
                </td>
                <td className="text-muted-foreground">{formatDateShort(row.targetDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageBody>
  );
}
