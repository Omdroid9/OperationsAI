"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOpportunityMutations } from "@/hooks/use-skyos";
import {
  CSV_LEAD_COLUMNS,
  CSV_LEAD_TEMPLATE,
  guessCsvMapping,
  mapCsvRow,
  parseCsvText,
  type CsvLeadColumn,
  type LeadDuplicateMatch,
  type LeadIntakeSourceType,
} from "@/lib/leads/intake";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Mode = "manual" | "csv";

const SOURCE_OPTIONS: Array<{ value: LeadIntakeSourceType; label: string }> = [
  { value: "manual", label: "Manual" },
  { value: "referral", label: "Referral" },
  { value: "csv_import", label: "CSV Import" },
  { value: "website_form", label: "Website form" },
];

const EMPTY_FORM = {
  contactName: "",
  company: "",
  email: "",
  phone: "",
  usdot: "",
  state: "",
  statedNeed: "",
  owner: "",
  sourceType: "manual" as LeadIntakeSourceType,
};

export function AddLeadDialog({
  open,
  onOpenChange,
  initialMode = "manual",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: Mode;
}) {
  const mutations = useOpportunityMutations();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<LeadDuplicateMatch[]>([]);
  const [pendingInput, setPendingInput] = useState<unknown>(null);
  const [csvText, setCsvText] = useState("");
  const [csvMapping, setCsvMapping] = useState<Partial<Record<CsvLeadColumn, string>>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      if (initialMode === "csv") {
        setForm((current) => ({ ...current, sourceType: "csv_import" }));
      }
    }
  }, [open, initialMode]);

  const parsedCsv = useMemo(() => parseCsvText(csvText), [csvText]);

  function reset() {
    setForm(EMPTY_FORM);
    setErrors([]);
    setDuplicates([]);
    setPendingInput(null);
    setCsvText("");
    setCsvMapping({});
    setMode(initialMode);
  }

  async function submitLead(input: unknown, acknowledgeDuplicates = false) {
    setBusy(true);
    setErrors([]);
    try {
      const result = await mutations.createLead.mutateAsync({
        input,
        options: { acknowledgeDuplicates },
      });
      if (result.status === "invalid") {
        setErrors(result.errors);
        setDuplicates([]);
        setPendingInput(null);
        return;
      }
      if (result.status === "duplicate_warning") {
        setDuplicates(result.matches);
        setPendingInput(input);
        return;
      }
      toast.success("Lead created");
      onOpenChange(false);
      reset();
      router.push(`/opportunities/${result.opportunityId}`);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Lead could not be created."]);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitManual(event: React.FormEvent) {
    event.preventDefault();
    await submitLead({
      ...form,
      creationMethod: "intake",
      sourceRef: form.sourceType === "referral" ? "staff-referral" : null,
    });
  }

  async function onSubmitCsv() {
    if (!parsedCsv.headers.length) {
      setErrors(["Upload a CSV with a header row."]);
      return;
    }
    if (!csvMapping.name || !csvMapping.company) {
      setErrors(["Map at least name and company columns."]);
      return;
    }

    setBusy(true);
    setErrors([]);
    const batchId = `csv-${Date.now()}`;
    let created = 0;
    let skipped = 0;
    const warnings: string[] = [];

    try {
      for (let index = 0; index < parsedCsv.rows.length; index += 1) {
        const mapped = mapCsvRow(parsedCsv.headers, parsedCsv.rows[index] ?? [], csvMapping);
        const input = {
          contactName: mapped.name,
          company: mapped.company,
          email: mapped.email,
          phone: mapped.phone,
          usdot: mapped.usdot,
          state: mapped.state,
          statedNeed: mapped.stated_need,
          owner: "",
          sourceType: "csv_import" as const,
          creationMethod: "intake",
          sourceRef: `${batchId}#${index + 1}`,
        };
        const first = await mutations.createLead.mutateAsync({ input });
        if (first.status === "invalid") {
          skipped += 1;
          warnings.push(`Row ${index + 1}: ${first.errors[0] ?? "invalid"}`);
          continue;
        }
        if (first.status === "duplicate_warning") {
          skipped += 1;
          warnings.push(
            `Row ${index + 1}: skipped duplicate (${first.matches.map((item) => item.label).join("; ")}). Add manually if needed.`,
          );
          continue;
        }
        created += 1;
      }
      if (created > 0) toast.success(`${created} lead${created === 1 ? "" : "s"} imported`);
      if (warnings.length) {
        setErrors(warnings.slice(0, 8));
        toast.message(`${skipped} row${skipped === 1 ? "" : "s"} need review.`);
      } else if (created > 0) {
        onOpenChange(false);
        reset();
      } else {
        setErrors(["No leads were imported. Check mapping and row data."]);
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "CSV import failed."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add lead</DialogTitle>
          <DialogDescription>
            Create an inbound lead. FMCSA discovery stays in Opportunities as Prospects.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "manual" ? "default" : "outline"}
            onClick={() => setMode("manual")}
          >
            Manual entry
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "csv" ? "default" : "outline"}
            onClick={() => {
              setMode("csv");
              setForm((current) => ({ ...current, sourceType: "csv_import" }));
            }}
          >
            CSV import
          </Button>
        </div>

        {errors.length > 0 ? (
          <div className="rounded-[8px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <ul className="list-disc space-y-1 pl-4">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {duplicates.length > 0 ? (
          <div className="rounded-[8px] border border-amber-600/30 bg-amber-500/5 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">Possible duplicates</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Matching email, phone, or USDOT on existing Leads or Prospects. Review before creating.
            </p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {duplicates.map((match) => (
                <li key={`${match.opportunityId}-${match.matchOn}`}>
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={() => router.push(`/opportunities/${match.opportunityId}`)}
                  >
                    {match.label}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy || !pendingInput}
                onClick={() => pendingInput && void submitLead(pendingInput, true)}
              >
                Create anyway
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setDuplicates([]);
                  setPendingInput(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {mode === "manual" ? (
          <form className="space-y-3" onSubmit={onSubmitManual}>
            <Field label="Contact name" required>
              <Input
                value={form.contactName}
                onChange={(event) => setForm({ ...form, contactName: event.target.value })}
                required
              />
            </Field>
            <Field label="Company" required>
              <Input
                value={form.company}
                onChange={(event) => setForm({ ...form, company: event.target.value })}
                required
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="USDOT (optional)">
                <Input
                  value={form.usdot}
                  onChange={(event) => setForm({ ...form, usdot: event.target.value })}
                  inputMode="numeric"
                />
              </Field>
              <Field label="State (optional)">
                <Input
                  value={form.state}
                  onChange={(event) => setForm({ ...form, state: event.target.value })}
                  maxLength={2}
                  placeholder="CA"
                />
              </Field>
            </div>
            <Field label="Stated need">
              <Textarea
                value={form.statedNeed}
                onChange={(event) => setForm({ ...form, statedNeed: event.target.value })}
                className="min-h-20"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Owner (optional)">
                <Input
                  value={form.owner}
                  onChange={(event) => setForm({ ...form, owner: event.target.value })}
                />
              </Field>
              <Field label="Source" required>
                <Select
                  value={form.sourceType}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      sourceType: String(value ?? "manual") as LeadIntakeSourceType,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.filter((item) => item.value !== "csv_import").map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Create lead"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="rounded-[8px] border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">CSV template</p>
              <p className="mt-1">
                Columns: name, company, email, phone, usdot, state, stated_need. Map columns after
                paste or upload.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => {
                  const blob = new Blob([CSV_LEAD_TEMPLATE], { type: "text/csv;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement("a");
                  anchor.href = url;
                  anchor.download = "skyos-lead-import-template.csv";
                  anchor.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download template
              </Button>
            </div>
            <Field label="CSV file">
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  setCsvText(text);
                  const parsed = parseCsvText(text);
                  setCsvMapping(guessCsvMapping(parsed.headers));
                }}
              />
            </Field>
            <Field label="Or paste CSV">
              <Textarea
                className="min-h-28 font-mono text-xs"
                value={csvText}
                onChange={(event) => {
                  const text = event.target.value;
                  setCsvText(text);
                  const parsed = parseCsvText(text);
                  setCsvMapping(guessCsvMapping(parsed.headers));
                }}
                placeholder={CSV_LEAD_TEMPLATE.trim()}
              />
            </Field>
            {parsedCsv.headers.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Column mapping</p>
                {CSV_LEAD_COLUMNS.map((column) => (
                  <div key={column} className="flex items-center gap-2">
                    <span className="w-28 text-xs text-muted-foreground">{column}</span>
                    <Select
                      value={csvMapping[column] ?? ""}
                      onValueChange={(value) =>
                        setCsvMapping((current) => ({
                          ...current,
                          [column]: String(value ?? ""),
                        }))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {parsedCsv.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  {parsedCsv.rows.length} data row{parsedCsv.rows.length === 1 ? "" : "s"} ready.
                  Duplicate rows get a warning and are created only when continued in batch review.
                </p>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={busy} onClick={() => void onSubmitCsv()}>
                {busy ? "Importing…" : "Import leads"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </label>
      {children}
    </div>
  );
}
