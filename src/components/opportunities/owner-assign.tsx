"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STAFF_DIRECTORY } from "@/data/staff";
import { useOpportunityMutations } from "@/hooks/use-skyos";
import { toast } from "sonner";

export function OwnerAssignSelect({
  opportunityId,
  assignedTo,
}: {
  opportunityId: string;
  assignedTo: string | null;
}) {
  const mutations = useOpportunityMutations();
  const value = assignedTo?.trim() || "";

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (!next) return;
        void mutations.assignOwner
          .mutateAsync({ id: opportunityId, staffId: next })
          .then(() => toast.success("Owner assigned"));
      }}
    >
      <SelectTrigger className="h-8 w-[160px]" aria-label="Assign owner">
        <SelectValue placeholder="Assign owner" />
      </SelectTrigger>
      <SelectContent>
        {STAFF_DIRECTORY.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            {member.displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
