"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProspectingFilters } from "@/lib/prospecting/types";

export function ProspectingFiltersBar({
  filters,
  onChange,
  onSearch,
  busy,
}: {
  filters: ProspectingFilters;
  onChange: (next: ProspectingFilters) => void;
  onSearch: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-border pb-4">
      <div>
        <label htmlFor="prospect-state" className="mb-1 block text-[11px] text-muted-foreground">
          State
        </label>
        <Input
          id="prospect-state"
          className="w-20"
          value={filters.state}
          onChange={(event) => onChange({ ...filters, state: event.target.value.toUpperCase(), offset: 0 })}
        />
      </div>
      <div>
        <label htmlFor="prospect-window" className="mb-1 block text-[11px] text-muted-foreground">
          Registered within
        </label>
        <Select
          value={String(filters.registrationWindowDays)}
          onValueChange={(value) =>
            onChange({ ...filters, registrationWindowDays: Number(value), offset: 0 })
          }
        >
          <SelectTrigger id="prospect-window" className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="365">12 months</SelectItem>
            <SelectItem value="548">18 months</SelectItem>
            <SelectItem value="730">24 months</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label htmlFor="prospect-fleet-min" className="mb-1 block text-[11px] text-muted-foreground">
          Fleet min
        </label>
        <Input
          id="prospect-fleet-min"
          type="number"
          min={1}
          max={20}
          className="w-20"
          value={filters.fleetMin}
          onChange={(event) =>
            onChange({ ...filters, fleetMin: Number(event.target.value), offset: 0 })
          }
        />
      </div>
      <div>
        <label htmlFor="prospect-fleet-max" className="mb-1 block text-[11px] text-muted-foreground">
          Fleet max
        </label>
        <Input
          id="prospect-fleet-max"
          type="number"
          min={1}
          max={20}
          className="w-20"
          value={filters.fleetMax}
          onChange={(event) =>
            onChange({ ...filters, fleetMax: Number(event.target.value), offset: 0 })
          }
        />
      </div>
      <div>
        <label htmlFor="prospect-operation" className="mb-1 block text-[11px] text-muted-foreground">
          Operation
        </label>
        <Select
          value={filters.operation}
          onValueChange={(value) =>
            onChange({
              ...filters,
              operation: value as ProspectingFilters["operation"],
              offset: 0,
            })
          }
        >
          <SelectTrigger id="prospect-operation" className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="interstate">Interstate</SelectItem>
            <SelectItem value="authorized_for_hire">Authorized for hire</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label htmlFor="prospect-service" className="mb-1 block text-[11px] text-muted-foreground">
          Service fit
        </label>
        <Select
          value={filters.serviceNeed}
          onValueChange={(value) =>
            onChange({
              ...filters,
              serviceNeed: value as ProspectingFilters["serviceNeed"],
              offset: 0,
            })
          }
        >
          <SelectTrigger id="prospect-service" className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="compliance_setup">Compliance setup</SelectItem>
            <SelectItem value="software">Software</SelectItem>
            <SelectItem value="filings_renewals">Filings and renewals</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={filters.requireContact}
          onChange={(event) =>
            onChange({ ...filters, requireContact: event.target.checked, offset: 0 })
          }
        />
        Require contact info
      </label>
      <Button onClick={onSearch} disabled={busy}>
        {busy ? "Searching…" : "Search Census"}
      </Button>
    </div>
  );
}
