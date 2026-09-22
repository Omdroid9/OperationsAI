"use client";

import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared/empty-state";
import { NextStepPanel } from "@/components/shared/next-step";
import { PageBody } from "@/components/shared/page-body";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileKindBadge, ProfileKindNote } from "@/components/shared/profile-kind";
import { ProvenanceLabel } from "@/components/shared/provenance-label";
import { CaseStatusBadge, DocumentStatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NEW_ENTRANT_CHECKLIST } from "@/lib/docket/case";
import { daysUntilDate, isWithinRenewalWindow, RENEWAL_WINDOW_DAYS } from "@/lib/docket/renewal";
import { SERVICE_TYPES } from "@/lib/docket/service-types";
import { buildCaseTimeline } from "@/lib/docket/timeline";
import { useCarrier, useCase, useCaseMutations, useDocuments, useInvalidateAll, useProviderStatus, useTasks } from "@/hooks/use-skyos";
import { staffDisplayName } from "@/data/staff";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { formatDate, formatDateShort, formatPercent, plural } from "@/lib/format";
import { DOCUMENT_TYPE_LABEL } from "@/lib/labels";
import { extractDocumentLive } from "@/lib/live/client";
import { getProfileKind } from "@/lib/profile";
import { getCaseRepository } from "@/lib/repositories";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function DocketDetailPage() {
  const params = usePathnameId();
  const caseQuery = useCase(params);
  const serviceCase = caseQuery.data;
  const carrierQuery = useCarrier(serviceCase?.carrierId ?? "");
  const documentsQuery = useDocuments(params);
  const tasksQuery = useTasks(params);
  const caseMutations = useCaseMutations();
  const invalidate = useInvalidateAll();
  const providers = useProviderStatus();
  const { demoMode } = useDemoMode();
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [insufficientDialog, setInsufficientDialog] = useState<{
    open: boolean;
    fileName: string;
    documentLabel: string;
  }>({ open: false, fileName: "", documentLabel: "" });
  const [removeTarget, setRemoveTarget] = useState<{ id: string; label: string } | null>(null);

  async function handleRemoveDocument(documentId: string, label: string) {
    await caseMutations.removeDocument.mutateAsync(documentId);
    setRemoveTarget(null);
    toast.success(`${label} upload removed`);
  }

  if (caseQuery.isLoading) {
    return (
      <PageBody>
        <TableSkeleton />
      </PageBody>
    );
  }
  if (caseQuery.isError) {
    return (
      <PageBody>
        <ErrorState title="Case could not be loaded." />
      </PageBody>
    );
  }
  if (!serviceCase) {
    return (
      <PageBody>
        <EmptyState title="Case not found." />
      </PageBody>
    );
  }

  const documents = documentsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const checklist =
    SERVICE_TYPES[serviceCase.serviceTypeKey]?.documentTypes ?? NEW_ENTRANT_CHECKLIST;
  const timeline = buildCaseTimeline(documents, tasks);
  const missing = checklist.filter(
    (item) => !documents.some((doc) => doc.documentType === item.documentType && doc.fileName),
  );
  const needsReview = documents.filter((doc) => doc.reviewStatus === "NEEDS_REVIEW");
  const verifiedPendingExpiration = documents.filter(
    (doc) => doc.reviewStatus === "VERIFIED" && doc.expirationDate && !doc.expirationVerified,
  );
  const expiring = documents.filter((doc) => {
    if (!doc.expirationDate || doc.reviewStatus === "REJECTED") return false;
    const days = daysUntilDate(doc.expirationDate);
    return days <= RENEWAL_WINDOW_DAYS;
  });
  const completeCount = documents.filter((doc) => doc.reviewStatus === "VERIFIED").length;

  return (
    <PageBody>
      <PageHeader
        title={carrierQuery.data?.legalName ?? "Case"}
        badge={<ProfileKindBadge kind={getProfileKind(carrierQuery.data)} />}
        meta={
          <span>
            {serviceCase.serviceType}
            <span className="mx-2 text-border">·</span>
            {serviceCase.checklistLabel}
            {serviceCase.ownerId ? (
              <>
                <span className="mx-2 text-border">·</span>
                Owner {staffDisplayName(serviceCase.ownerId)}
              </>
            ) : null}
          </span>
        }
        actions={<CaseStatusBadge status={serviceCase.status} />}
      />
      <ProfileKindNote carrier={carrierQuery.data} className="mt-2 max-w-2xl" />

      <p className="mt-4 text-sm text-muted-foreground">
        {completeCount} verified · {needsReview.length} need review · {missing.length} missing
        {expiring.length > 0 ? (
          <span className="text-warning">
            {" "}
            · {expiring.length} expiring within {RENEWAL_WINDOW_DAYS} days or overdue
          </span>
        ) : null}
      </p>

      {expiring.length > 0 ? (
        <div className="mt-4 max-w-2xl border border-warning/30 bg-warning-foreground px-4 py-3">
          <p className="text-sm font-medium text-warning">Documents expiring soon</p>
          <ul className="mt-2 space-y-1 text-sm text-foreground">
            {expiring.map((doc) => {
              const days = daysUntilDate(doc.expirationDate!);
              const overdue = days < 0;
              return (
                <li key={doc.id}>
                  {DOCUMENT_TYPE_LABEL[doc.documentType] ?? doc.documentType}
                  {doc.personName ? ` · ${doc.personName}` : ""} —{" "}
                  {overdue ? (
                    <>
                      expired {formatDateShort(doc.expirationDate)} ({Math.abs(days)}{" "}
                      {plural(Math.abs(days), "day")} overdue)
                    </>
                  ) : (
                    <>
                      expires {formatDateShort(doc.expirationDate)} ({days}{" "}
                      {plural(days, "day")} left)
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-5">
        <NextStepPanel
          title={
            needsReview.length > 0
              ? "Confirm extracted fields before trusting them"
              : missing.length > 0
                ? "Request the missing documents"
                : "Case is waiting on remaining work"
          }
          body={
            needsReview.length > 0
              ? "Extraction is a draft. A person has to confirm names and dates."
              : missing.length > 0
                ? "Prototype checklist items still have no file. Attach a sample to see review flow."
                : "Nothing is blocking review right now."
          }
          action={null}
        />
      </div>

      <div className="mt-8 grid min-w-0 gap-10 lg:grid-cols-2">
        <section className="min-w-0">
          <h2 className="text-sm font-medium">Case timeline</h2>
          {timeline.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {timeline.slice(0, 8).map((event) => (
                <li key={event.id} className="py-2.5 text-sm">
                  <p className="font-medium">{event.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.detail} · {formatDateShort(event.at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0">
          <h2 className="text-sm font-medium">Required documents</h2>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {checklist.map((item) => {
              const doc = documents.find((entry) => entry.documentType === item.documentType);
              return (
                <li key={item.documentType} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-sm">{item.label}</p>
                    {doc?.fileName ? (
                      <p className="truncate text-xs text-muted-foreground">{doc.fileName}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Not received</p>
                    )}
                  </div>
                  {doc?.fileName ? (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <DocumentStatusBadge status={doc.reviewStatus} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRemoveTarget({ id: doc.id, label: item.label })}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <label
                        className={cn(
                          buttonVariants({
                            size: "sm",
                            variant: providers.data?.gemini ? "default" : "outline",
                          }),
                          uploadingType === item.documentType && "pointer-events-none opacity-50",
                        )}
                      >
                        <input
                          type="file"
                          accept="image/*,.pdf,application/pdf"
                          className="sr-only"
                          disabled={uploadingType === item.documentType}
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (!file) return;
                            setUploadingType(item.documentType);
                            try {
                              const result = await extractDocumentLive(
                                file,
                                serviceCase.id,
                                item.documentType,
                              );
                              if (result.insufficient) {
                                setInsufficientDialog({
                                  open: true,
                                  fileName: result.fileName,
                                  documentLabel: item.label,
                                });
                                return;
                              }
                              await getCaseRepository().applyDocumentExtraction(
                                serviceCase.id,
                                item.documentType,
                                result.extraction,
                                result.fileName,
                              );
                              invalidate();
                              toast.success("Extracted from upload");
                            } catch (error) {
                              invalidate();
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : demoMode
                                    ? "Live extraction failed. Use Attach sample for demo data, or retry with a clearer PDF/image."
                                    : "Live extraction failed. Retry with a clearer PDF/image, or turn Demo Mode on.",
                              );
                            } finally {
                              setUploadingType(null);
                            }
                          }}
                        />
                        {uploadingType === item.documentType ? "Extracting…" : "Upload"}
                      </label>
                      {demoMode ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await getCaseRepository().simulateUpload(serviceCase.id, item.documentType);
                            invalidate();
                            toast.success("Stored extraction attached");
                          }}
                        >
                          Attach sample
                        </Button>
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="min-w-0">
          <h2 className="text-sm font-medium">Documents needing review</h2>
          {needsReview.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No extracted fields waiting on confirmation.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {needsReview.map((doc) => (
                <li key={doc.id} className="py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {DOCUMENT_TYPE_LABEL[doc.documentType] ?? doc.documentType}
                      </p>
                      <dl className="mt-2 space-y-1 text-sm">
                        <div className="flex gap-2">
                          <dt className="w-24 shrink-0 text-muted-foreground">Person</dt>
                          <dd className="min-w-0 break-words">{doc.personName ?? "—"}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-24 shrink-0 text-muted-foreground">Issued</dt>
                          <dd>{formatDate(doc.issuedDate)}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-24 shrink-0 text-muted-foreground">Expiration</dt>
                          <dd className="tabular">{formatDate(doc.expirationDate)}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-24 shrink-0 text-muted-foreground">Confidence</dt>
                          <dd className="tabular">
                            {doc.confidence != null ? formatPercent(doc.confidence) : "—"}{" "}
                            <ProvenanceLabel value="AI_EXTRACTED" />
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-24 shrink-0 text-muted-foreground">Source</dt>
                          <dd className="min-w-0 break-all">{doc.fileName}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
                      <Button
                        size="sm"
                        onClick={async () => {
                          await caseMutations.verifyDocument.mutateAsync(doc.id);
                          toast.success("Fields confirmed");
                        }}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setRemoveTarget({
                            id: doc.id,
                            label: DOCUMENT_TYPE_LABEL[doc.documentType] ?? doc.documentType,
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {verifiedPendingExpiration.length > 0 ? (
            <>
              <h2 className="mt-8 text-sm font-medium">Confirm expiration dates</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Confirming stores the date. A renewal task opens only when the document is overdue
                or within {RENEWAL_WINDOW_DAYS} days of expiration.
              </p>
              <ul className="mt-3 divide-y divide-border border-y border-border">
                {verifiedPendingExpiration.map((doc) => (
                  <li key={doc.id} className="flex flex-col gap-2 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {DOCUMENT_TYPE_LABEL[doc.documentType] ?? doc.documentType}
                      </p>
                      <p className="text-xs text-muted-foreground tabular">
                        Expiration {formatDate(doc.expirationDate)}
                        {isWithinRenewalWindow(doc.expirationDate)
                          ? " · opens renewal task"
                          : " · no alert yet"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0 self-start sm:self-auto"
                      onClick={async () => {
                        const task = await caseMutations.confirmExpirationDate.mutateAsync(doc.id);
                        toast.success(
                          task
                            ? "Expiration confirmed · renewal task created"
                            : "Expiration confirmed · renewal alert opens within 45 days",
                        );
                      }}
                    >
                      Confirm expiration
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h2 className="mt-8 text-sm font-medium">Tasks</h2>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {tasks.length === 0 ? (
              <li className="py-2.5 text-sm text-muted-foreground">No tasks on this case.</li>
            ) : (
              tasks.map((task) => (
                <li key={task.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <p className={task.status === "done" ? "text-muted-foreground line-through" : ""}>
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{task.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular text-xs text-muted-foreground">{formatDate(task.dueDate)}</span>
                    {task.status === "open" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await caseMutations.completeTask.mutateAsync(task.id);
                          toast.success("Task complete");
                        }}
                      >
                        Mark done
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <Dialog
        open={insufficientDialog.open}
        onOpenChange={(open) => setInsufficientDialog((current) => ({ ...current, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>No relevant fields found</DialogTitle>
            <DialogDescription>
              {insufficientDialog.fileName ? (
                <>
                  <span className="font-medium text-foreground">{insufficientDialog.fileName}</span> did not
                  contain enough information for{" "}
                  <span className="font-medium text-foreground">{insufficientDialog.documentLabel}</span>.
                </>
              ) : (
                <>This file did not contain enough information for {insufficientDialog.documentLabel}.</>
              )}{" "}
              Upload a document that includes a person or business name and relevant dates, such as issued
              or expiration.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <Button onClick={() => setInsufficientDialog((current) => ({ ...current, open: false }))}>
              Try another file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove upload?</DialogTitle>
            <DialogDescription>
              This clears {removeTarget?.label ?? "this document"} and any extracted fields. You can upload
              again afterward.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!removeTarget) return;
                void handleRemoveDocument(removeTarget.id, removeTarget.label);
              }}
            >
              Remove upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageBody>
  );
}

function usePathnameId(): string {
  const params = useParams<{ id: string }>();
  return params.id;
}
