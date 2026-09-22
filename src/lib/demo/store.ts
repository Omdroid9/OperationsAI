import { createInitialState, PATEL_QUALIFICATION, PATEL_TRANSCRIPT, SAMPLE_MEDICAL_EXTRACTION, SAMPLE_REGULATION_ANALYSIS } from "@/data/seed";
import { createEmptyWorkspaceState } from "@/lib/demo/empty-state";
import { resolveStaffId } from "@/data/staff";
import { consultationNextAction } from "@/lib/consultation/labels";
import { createCaseDocuments, createCaseTasks, createDocketCase } from "@/lib/docket/case";
import { isWithinRenewalWindow } from "@/lib/docket/renewal";
import {
  defaultServiceTypeKey,
  type ServiceTypeKey,
} from "@/lib/docket/service-types";
import { DOCUMENT_TYPE_LABEL } from "@/lib/labels";
import {
  fmcsaCensusProspectCreation,
  fmcsaProspectCreation,
  inferCreationForLegacyOpportunity,
  regulatoryCampaignProspectCreation,
} from "@/lib/leads/creation";
import {
  buildLeadCreationProvenance,
  findLeadDuplicates,
  validateLeadIntake,
  type LeadIntakeResult,
} from "@/lib/leads/intake";
import type { NormalizedFmcsaCarrier } from "@/lib/providers/fmcsa";
import { previewRegulationMatches } from "@/lib/regulations/match";
import { getUnimportedInboxNotices } from "@/lib/regulations/inbox";
import { primaryRecommendedService, reasonSummary } from "@/lib/recommendations/services";
import { calculateOpportunityScore, getOpportunityScoreBreakdown } from "@/lib/scoring/opportunity-score";
import { processCallResult } from "@/lib/scoring/process-call";
import { detectCarrierSignals, primarySignalTitle } from "@/lib/signals/detect";
import { documentExtractionSchema, qualificationResultSchema, regulationAnalysisSchema } from "@/lib/validation/schemas";
import type {
  Activity,
  CallRecord,
  Carrier,
  CaseDocument,
  CaseTask,
  DataProvenance,
  DemoState,
  Opportunity,
  OpportunityStage,
  ProspectSourceType,
  QualificationResult,
  Regulation,
  RegulationSourceType,
} from "@/types";
import type { CensusProspectSaveInput } from "@/lib/prospecting/types";
import { censusProspectToNormalized } from "@/lib/prospecting/search";

import { getProfileKind } from "@/lib/profile";
import { SEED_REGULATION_IDS } from "@/lib/mode/live-workspace";

export type IngestCarrierOptions = {
  sourceType?: Extract<
    ProspectSourceType,
    "fmcsa_usdot_lookup" | "fmcsa_ca_radar" | "fmcsa_census_prospect"
  >;
  sourceRef?: string | null;
  /** When set, apply FMCSA data onto this Lead/Prospect instead of creating a new Prospect. */
  enrichOpportunityId?: string;
};
const STORAGE_KEY = "skyos.demo.v1";

function matchingCarriers(state: Pick<DemoState, "carriers" | "cases">): Carrier[] {
  const caseCarrierIds = new Set(state.cases.map((item) => item.carrierId));
  return state.carriers.map((carrier) =>
    carrier.isCustomer || caseCarrierIds.has(carrier.id)
      ? { ...carrier, isCustomer: true }
      : carrier,
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function offsetDaysIso(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function defaultConsultationFields(): Pick<
  Opportunity,
  "consultationStatus" | "consultationScheduledAt" | "consultationNote" | "serviceApprovedAt"
> {
  return {
    consultationStatus: "not_applicable",
    consultationScheduledAt: null,
    consultationNote: null,
    serviceApprovedAt: null,
  };
}

class DemoStore {
  private state: DemoState;
  private listeners = new Set<() => void>();

  constructor() {
    this.state = migrateState(createInitialState());
    this.seedRegulationPreviews();
  }

  private seedRegulationPreviews(): void {
    this.rematchRegulations();
  }

  private rematchRegulations(): void {
    const carriers = matchingCarriers(this.state);
    for (const regulation of this.state.regulations) {
      if (regulation.status === "analyzed" && regulation.sourceText.trim()) {
        this.state.matches[regulation.id] = previewRegulationMatches(
          regulation,
          carriers,
          this.state.signals,
        );
      }
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): DemoState {
    return this.state;
  }

  hydrateFromStorage(): void {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      this.state = migrateState(JSON.parse(raw) as DemoState);
      this.emitLocal();
    } catch {
      this.state = migrateState(createInitialState());
      this.seedRegulationPreviews();
    }
  }

  replaceState(state: DemoState): void {
    this.state = migrateState(state);
    this.seedRegulationPreviews();
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    }
    for (const listener of this.listeners) listener();
  }

  private syncTimer: ReturnType<typeof setTimeout> | null = null;

  private scheduleCloudSync(): void {
    if (typeof window === "undefined") return;
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      void import("@/lib/live/sync").then(({ pushWorkspaceToCloud }) =>
        pushWorkspaceToCloud(this.state),
      );
    }, 1200);
  }

  private emitLocal(): void {
    for (const listener of this.listeners) listener();
  }

  reset(): void {
    this.state = migrateState(createInitialState());
    this.seedRegulationPreviews();
    this.persist();
    this.emit();
  }

  /** Empty Live workspace in-memory (caller persists wipe to Supabase). */
  clearLiveLocal(): void {
    this.state = migrateState(createEmptyWorkspaceState());
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    }
    this.emitLocal();
  }

  private persist(): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  private emit(): void {
    this.persist();
    this.scheduleCloudSync();
    this.emitLocal();
  }

  private patchOpportunity(opportunityId: string, patch: Partial<Opportunity>): Opportunity {
    const index = this.state.opportunities.findIndex((item) => item.id === opportunityId);
    const current = this.state.opportunities[index];
    if (index < 0 || !current) {
      throw new Error("Opportunity not found");
    }
    // Creation provenance and recordKind are immutable after create.
    const { creation: _creation, recordKind: _recordKind, ...safePatch } = patch;
    const next = {
      ...current,
      ...safePatch,
      creation: current.creation,
      recordKind: current.recordKind,
      updatedAt: nowIso(),
    };
    this.state.opportunities[index] = next;
    return next;
  }

  private addActivity(activity: Activity): void {
    this.state.activities = [activity, ...this.state.activities];
  }

  addNote(opportunityId: string, content: string, createdBy = "You"): void {
    this.addActivity({
      id: id("act"),
      leadId: opportunityId,
      type: "NOTE",
      content,
      createdAt: nowIso(),
      createdBy,
    });
    this.patchOpportunity(opportunityId, {
      lastActivityAt: nowIso(),
      lastActivityLabel: "Note added",
    });
    this.emit();
  }

  scheduleFollowUp(opportunityId: string, at: string, note?: string): void {
    this.patchOpportunity(opportunityId, {
      followUpAt: at,
      nextAction: "Follow up",
      lastActivityAt: nowIso(),
      lastActivityLabel: "Follow-up scheduled",
    });
    this.addActivity({
      id: id("act"),
      leadId: opportunityId,
      type: "FOLLOW_UP",
      content: note ? `Follow-up scheduled. ${note}` : "Follow-up scheduled.",
      createdAt: nowIso(),
      createdBy: "You",
    });
    this.emit();
  }

  setStage(opportunityId: string, stage: OpportunityStage, content: string): Opportunity {
    const nextAction =
      stage === "WON"
        ? "Start Service"
        : stage === "LOST" || stage === "DISMISSED"
          ? "No follow-up"
          : stage === "QUALIFIED"
            ? "Schedule consultation"
            : "Review opportunity";
    const updated = this.patchOpportunity(opportunityId, {
      stage,
      nextAction,
      lastActivityAt: nowIso(),
      lastActivityLabel: content,
    });
    this.addActivity({
      id: id("act"),
      leadId: opportunityId,
      type: "STAGE_CHANGE",
      content,
      createdAt: nowIso(),
      createdBy: "You",
    });
    this.emit();
    return updated;
  }

  /** Permanently remove a saved prospect from the workspace. */
  removeProspect(opportunityId: string): void {
    const opportunity = this.state.opportunities.find((item) => item.id === opportunityId);
    if (!opportunity) throw new Error("Prospect not found");
    if (opportunity.recordKind !== "prospect") {
      throw new Error("Only saved prospects can be removed from this list.");
    }

    const carrierId = opportunity.carrierId;
    this.state.opportunities = this.state.opportunities.filter((item) => item.id !== opportunityId);
    this.state.activities = this.state.activities.filter((item) => item.leadId !== opportunityId);
    this.state.calls = this.state.calls.filter((item) => item.leadId !== opportunityId);

    for (const regulationId of Object.keys(this.state.matches)) {
      this.state.matches[regulationId] = this.state.matches[regulationId].filter(
        (match) => match.opportunityId !== opportunityId,
      );
    }

    const carrierStillUsed =
      this.state.opportunities.some((item) => item.carrierId === carrierId) ||
      this.state.cases.some((item) => item.carrierId === carrierId);
    const carrier = this.state.carriers.find((item) => item.id === carrierId);
    if (!carrierStillUsed && carrier && !carrier.isCustomer) {
      this.state.carriers = this.state.carriers.filter((item) => item.id !== carrierId);
      this.state.signals = this.state.signals.filter((item) => item.carrierId !== carrierId);
      this.state.snapshots = this.state.snapshots.filter((item) => item.carrierId !== carrierId);
      for (const regulationId of Object.keys(this.state.matches)) {
        this.state.matches[regulationId] = this.state.matches[regulationId].filter(
          (match) => match.carrierId !== carrierId,
        );
      }
    }

    this.emit();
  }

  /** Drop old live-import prospects that are not Census / intentional saves. */
  pruneLegacyFmcsaProspects(): number {
    const legacyIds = this.state.opportunities
      .filter(
        (item) =>
          item.recordKind === "prospect" && item.creation.sourceType === "legacy_fmcsa",
      )
      .map((item) => item.id);
    if (legacyIds.length === 0) return 0;
    for (const id of legacyIds) {
      try {
        this.removeProspect(id);
      } catch {
        // Skip rows that cannot be removed cleanly.
      }
    }
    return legacyIds.length;
  }

  qualify(opportunityId: string): CallRecord {
    const opportunity = this.state.opportunities.find((item) => item.id === opportunityId);
    if (!opportunity) throw new Error("Opportunity not found");
    const qualification = qualificationResultSchema.parse(
      opportunity.carrierId === "patel-freight"
        ? PATEL_QUALIFICATION
        : {
            ...PATEL_QUALIFICATION,
            language: opportunity.preferredLanguage ?? "English",
            detected_languages: opportunity.detectedLanguages.length
              ? opportunity.detectedLanguages
              : ["English"],
            summary_english:
              "Simulated qualification. A possible need was identified and a follow-up was requested.",
          },
    );
    return this.applyQualification(opportunityId, qualification, {
      provider: "demo",
      status: "simulated",
      transcript:
        opportunity.carrierId === "patel-freight"
          ? PATEL_TRANSCRIPT
          : "Simulated transcript. Live voice is not enabled in this demo.",
    });
  }

  applyQualification(
    opportunityId: string,
    qualificationInput: QualificationResult,
    meta: {
      provider: "vapi" | "demo" | "dograh";
      status: CallRecord["status"];
      transcript: string;
      transcriptUrl?: string | null;
      providerCallId?: string | null;
      recordingUrl?: string | null;
      durationSeconds?: number | null;
    },
  ): CallRecord {
    const opportunity = this.state.opportunities.find((item) => item.id === opportunityId);
    if (!opportunity) throw new Error("Opportunity not found");
    const qualification = qualificationResultSchema.parse(qualificationInput);
    const processed = processCallResult(opportunity, qualification);
    const startedAt = nowIso();
    const nextAction = qualification.suggested_next_step?.trim() || processed.nextAction;
    const callLanguage =
      qualification.preferred_language?.trim() ||
      qualification.language?.trim() ||
      "English";
    const summary = qualification.summary_english?.trim() || qualification.call_outcome?.trim() || "";
    const call: CallRecord = {
      id: `call_${opportunity.carrierId}_${Date.now()}`,
      leadId: opportunity.id,
      carrierId: opportunity.carrierId,
      provider: meta.provider,
      providerCallId: meta.providerCallId ?? null,
      status: meta.status,
      startedAt,
      endedAt: startedAt,
      durationSeconds: meta.durationSeconds ?? (meta.provider === "demo" ? 11 * 60 + 20 : null),
      language: callLanguage,
      detectedLanguages: qualification.detected_languages,
      originalTranscript: meta.transcript,
      transcriptUrl: meta.transcriptUrl ?? null,
      englishSummary: summary,
      qualification,
      recordingUrl: meta.recordingUrl ?? null,
      createdAt: startedAt,
    };

    // Idempotent: same Dograh/Vapi run must not create duplicate call rows.
    if (meta.providerCallId) {
      const existing = this.state.calls.find(
        (item) => item.providerCallId === meta.providerCallId && item.leadId === opportunityId,
      );
      if (existing) {
        Object.assign(existing, {
          status: meta.status,
          originalTranscript: meta.transcript || existing.originalTranscript,
          transcriptUrl: meta.transcriptUrl ?? existing.transcriptUrl,
          englishSummary: summary || existing.englishSummary,
          qualification,
          recordingUrl: meta.recordingUrl ?? existing.recordingUrl,
          durationSeconds: meta.durationSeconds ?? existing.durationSeconds,
          language: callLanguage,
          endedAt: startedAt,
        });
        this.patchOpportunity(opportunityId, {
          ...processed,
          ...(qualification.consultation_accepted === true
            ? {
                consultationStatus: "needs_follow_up" as const,
                stage:
                  processed.stage === "LOST" ? processed.stage : ("CONSULTATION" as OpportunityStage),
                nextAction: "Schedule consultation",
              }
            : {}),
          nextAction:
            qualification.consultation_accepted === true
              ? "Schedule consultation"
              : nextAction,
          followUpAt:
            qualification.callback_requested === true
              ? "2026-08-13T14:00:00.000-07:00"
              : opportunity.followUpAt,
          lastActivityAt: startedAt,
          lastActivityLabel: "Qualification updated",
        });
        this.emit();
        return existing;
      }
    }

    this.state.calls = [call, ...this.state.calls];
    const consultationPatch =
      qualification.consultation_accepted === true
        ? {
            consultationStatus: "needs_follow_up" as const,
            stage: processed.stage === "LOST" ? processed.stage : ("CONSULTATION" as OpportunityStage),
            nextAction: "Schedule consultation",
          }
        : {};
    this.patchOpportunity(opportunityId, {
      ...processed,
      ...consultationPatch,
      nextAction: consultationPatch.nextAction ?? nextAction,
      followUpAt:
        qualification.callback_requested === true
          ? "2026-08-13T14:00:00.000-07:00"
          : opportunity.followUpAt,
      lastActivityAt: startedAt,
      lastActivityLabel: "Qualification completed",
    });
    this.addActivity({
      id: id("act"),
      leadId: opportunityId,
      type: "CALL",
      content: `Qualification ${call.status === "simulated" ? "simulated" : "completed"} (${meta.provider}).${
        processed.interestLevel ? ` Interest ${processed.interestLevel}.` : ""
      }`,
      createdAt: startedAt,
      createdBy: "SkyOS",
    });
    this.addActivity({
      id: id("act"),
      leadId: opportunityId,
      type: "STAGE_CHANGE",
      content: `Moved to ${processed.stage === "LOST" ? "Lost" : "Qualified"}.`,
      createdAt: startedAt,
      createdBy: "SkyOS",
    });
    if (summary) {
      this.addActivity({
        id: id("act"),
        leadId: opportunityId,
        type: "SUMMARY",
        content: summary,
        createdAt: startedAt,
        createdBy: "SkyOS",
      });
    }
    this.emit();
    return call;
  }

  /** Persist an abrupt disconnect / failed live attempt without advancing stage. */
  recordFailedQualificationAttempt(
    opportunityId: string,
    meta: {
      provider: "vapi" | "demo" | "dograh";
      providerCallId?: string | null;
      transcript?: string;
      transcriptUrl?: string | null;
      recordingUrl?: string | null;
      durationSeconds?: number | null;
      error?: string | null;
    },
  ): CallRecord {
    const opportunity = this.state.opportunities.find((item) => item.id === opportunityId);
    if (!opportunity) throw new Error("Opportunity not found");
    const startedAt = nowIso();
    const errorMessage =
      meta.error?.trim() || "Call ended before qualification was captured. Retry the call.";
    const qualification = qualificationResultSchema.parse({
      language: null,
      preferred_language: null,
      detected_languages: [],
      contact_verified: null,
      fleet_size_confirmed: null,
      compliance_management: "unknown",
      current_provider: null,
      needs: [],
      interest_level: "unknown",
      callback_requested: null,
      callback_time: null,
      consultation_accepted: null,
      consultation_preference: null,
      objections: [],
      summary_english: errorMessage,
      call_outcome: "Call disconnected",
      suggested_next_step: "Retry the call",
    });

    if (meta.providerCallId) {
      const existing = this.state.calls.find(
        (item) => item.providerCallId === meta.providerCallId && item.leadId === opportunityId,
      );
      if (existing) {
        Object.assign(existing, {
          status: "failed" as const,
          originalTranscript: meta.transcript ?? existing.originalTranscript,
          transcriptUrl: meta.transcriptUrl ?? existing.transcriptUrl,
          englishSummary: errorMessage,
          qualification,
          recordingUrl: meta.recordingUrl ?? existing.recordingUrl,
          durationSeconds: meta.durationSeconds ?? existing.durationSeconds,
          endedAt: startedAt,
        });
        this.patchOpportunity(opportunityId, {
          lastActivityAt: startedAt,
          lastActivityLabel: "Call disconnected — retry recommended",
          nextAction: opportunity.nextAction.includes("Retry")
            ? opportunity.nextAction
            : "Retry qualification call",
        });
        this.emit();
        return existing;
      }
    }

    const call: CallRecord = {
      id: `call_${opportunity.carrierId}_${Date.now()}`,
      leadId: opportunity.id,
      carrierId: opportunity.carrierId,
      provider: meta.provider,
      providerCallId: meta.providerCallId ?? null,
      status: "failed",
      startedAt,
      endedAt: startedAt,
      durationSeconds: meta.durationSeconds ?? null,
      language: "English",
      detectedLanguages: [],
      originalTranscript: meta.transcript ?? "",
      transcriptUrl: meta.transcriptUrl ?? null,
      englishSummary: errorMessage,
      qualification,
      recordingUrl: meta.recordingUrl ?? null,
      createdAt: startedAt,
    };
    this.state.calls = [call, ...this.state.calls];
    this.patchOpportunity(opportunityId, {
      lastActivityAt: startedAt,
      lastActivityLabel: "Call disconnected — retry recommended",
      nextAction: "Retry qualification call",
    });
    this.addActivity({
      id: id("act"),
      leadId: opportunityId,
      type: "CALL",
      content: `Call disconnected (${meta.provider}). Retry recommended.`,
      createdAt: startedAt,
      createdBy: "SkyOS",
    });
    this.emit();
    return call;
  }

  assignOwner(opportunityId: string, staffId: string): Opportunity {
    const updated = this.patchOpportunity(opportunityId, {
      assignedTo: staffId,
      lastActivityAt: nowIso(),
      lastActivityLabel: "Owner assigned",
    });
    this.addActivity({
      id: id("act"),
      leadId: opportunityId,
      type: "NOTE",
      content: `Owner assigned.`,
      createdAt: nowIso(),
      createdBy: "You",
    });
    this.emit();
    return updated;
  }

  scheduleConsultation(opportunityId: string, at: string, note?: string): Opportunity {
    const updated = this.patchOpportunity(opportunityId, {
      stage: "CONSULTATION",
      consultationStatus: "scheduled",
      consultationScheduledAt: at,
      consultationNote: note?.trim() || null,
      followUpAt: at,
      nextAction: consultationNextAction("scheduled"),
      lastActivityAt: nowIso(),
      lastActivityLabel: "Consultation scheduled",
    });
    this.addActivity({
      id: id("act"),
      leadId: opportunityId,
      type: "FOLLOW_UP",
      content: note ? `Consultation scheduled. ${note}` : "Consultation scheduled.",
      createdAt: nowIso(),
      createdBy: "You",
    });
    this.emit();
    return updated;
  }

  completeConsultation(opportunityId: string, note?: string): Opportunity {
    const updated = this.patchOpportunity(opportunityId, {
      consultationStatus: "complete",
      consultationNote: note?.trim() || null,
      nextAction: consultationNextAction("complete"),
      lastActivityAt: nowIso(),
      lastActivityLabel: "Consultation complete",
    });
    this.addActivity({
      id: id("act"),
      leadId: opportunityId,
      type: "NOTE",
      content: note ? `Consultation complete. ${note}` : "Consultation complete.",
      createdAt: nowIso(),
      createdBy: "You",
    });
    this.emit();
    return updated;
  }

  approveService(opportunityId: string): Opportunity {
    const at = nowIso();
    const updated = this.patchOpportunity(opportunityId, {
      consultationStatus: "service_approved",
      serviceApprovedAt: at,
      nextAction: consultationNextAction("service_approved"),
      lastActivityAt: at,
      lastActivityLabel: "Service approved",
    });
    this.addActivity({
      id: id("act"),
      leadId: opportunityId,
      type: "STAGE_CHANGE",
      content: "Service approved by staff.",
      createdAt: at,
      createdBy: "You",
    });
    this.emit();
    return updated;
  }

  notMovingForward(opportunityId: string, note?: string): Opportunity {
    const updated = this.patchOpportunity(opportunityId, {
      consultationStatus: "not_moving_forward",
      stage: "LOST",
      nextAction: "No follow-up",
      lastActivityAt: nowIso(),
      lastActivityLabel: "Not moving forward",
    });
    this.addActivity({
      id: id("act"),
      leadId: opportunityId,
      type: "STAGE_CHANGE",
      content: note ? `Not moving forward. ${note}` : "Not moving forward.",
      createdAt: nowIso(),
      createdBy: "You",
    });
    this.emit();
    return updated;
  }

  startService(opportunityId: string, serviceTypeKey?: ServiceTypeKey): ServiceCaseLike {
    const opportunity = this.state.opportunities.find((item) => item.id === opportunityId);
    if (!opportunity) throw new Error("Opportunity not found");
    if (opportunity.consultationStatus !== "service_approved") {
      throw new Error("Approve service before starting a Docket case.");
    }
    if (opportunity.caseId) {
      const existing = this.state.cases.find((item) => item.id === opportunity.caseId);
      if (existing) return existing;
    }

    const openedAt = nowIso();
    const key = serviceTypeKey ?? defaultServiceTypeKey(opportunity.recommendedService);
    const ownerId = resolveStaffId(opportunity.assignedTo);
    const serviceCase = createDocketCase(opportunity, openedAt, key, ownerId);
    const documents = createCaseDocuments(serviceCase.id, openedAt, key);
    const tasks = createCaseTasks(serviceCase.id, openedAt, key, ownerId);

    const medical = documents.find((doc) => doc.documentType === "medical_certificate");
    if (medical && opportunity.carrierId === "patel-freight") {
      const extracted = documentExtractionSchema.parse(SAMPLE_MEDICAL_EXTRACTION);
      medical.fileName = "medical_certificate.pdf";
      medical.storagePath = "demo/medical_certificate.pdf";
      medical.personName = extracted.person_name;
      medical.issuedDate = extracted.issued_date;
      medical.expirationDate = extracted.expiration_date;
      medical.confidence = extracted.confidence;
      medical.reviewStatus = "NEEDS_REVIEW";
      const medicalTask = tasks.find((task) => task.title.includes("Medical"));
      if (medicalTask) {
        medicalTask.title = "Verify medical certificate";
        medicalTask.description = "Extracted fields need human confirmation.";
        medicalTask.dueDate = "2026-08-12T15:00:00.000-07:00";
      }
    }

    this.state.cases = [serviceCase, ...this.state.cases];
    this.state.documents = [...documents, ...this.state.documents];
    this.state.tasks = [...tasks, ...this.state.tasks];
    this.state.carriers = this.state.carriers.map((carrier) =>
      carrier.id === opportunity.carrierId
        ? { ...carrier, isCustomer: true, updatedAt: openedAt }
        : carrier,
    );
    this.patchOpportunity(opportunityId, {
      stage: "WON",
      caseId: serviceCase.id,
      nextAction: "Review missing items",
      lastActivityAt: openedAt,
      lastActivityLabel: "Service case opened",
    });
    this.addActivity({
      id: id("act"),
      leadId: opportunityId,
      type: "STAGE_CHANGE",
      content: "Service case created after service approval.",
      createdAt: openedAt,
      createdBy: "You",
    });
    this.rematchRegulations();
    this.emit();
    return serviceCase;
  }

  verifyDocument(documentId: string): void {
    const index = this.state.documents.findIndex((item) => item.id === documentId);
    const document = this.state.documents[index];
    if (index < 0 || !document) throw new Error("Document not found");
    this.state.documents[index] = { ...document, reviewStatus: "VERIFIED" };
    this.state.documents = [...this.state.documents];

    const relatedTaskIndex = this.state.tasks.findIndex(
      (task) =>
        task.caseId === document.caseId &&
        task.kind === "checklist" &&
        task.title.toLowerCase().includes(document.documentType.replace("_", " ")),
    );
    if (relatedTaskIndex >= 0) {
      const relatedTask = this.state.tasks[relatedTaskIndex]!;
      this.state.tasks[relatedTaskIndex] = { ...relatedTask, status: "done" };
      this.state.tasks = [...this.state.tasks];
    }

    const caseIndex = this.state.cases.findIndex((item) => item.id === document.caseId);
    const serviceCase = this.state.cases[caseIndex];
    if (caseIndex >= 0 && serviceCase) {
      const remaining = this.state.documents.filter(
        (item) => item.caseId === serviceCase.id && item.reviewStatus === "NEEDS_REVIEW",
      );
      this.state.cases[caseIndex] = {
        ...serviceCase,
        updatedAt: nowIso(),
        ...(remaining.length === 0 ? { status: "WAITING_ON_CLIENT" as const } : {}),
      };
      this.state.cases = [...this.state.cases];
    }
    this.emit();
  }

  confirmExpirationDate(documentId: string): CaseTask | null {
    const index = this.state.documents.findIndex((item) => item.id === documentId);
    const document = this.state.documents[index];
    if (index < 0 || !document) throw new Error("Document not found");
    if (document.reviewStatus !== "VERIFIED") {
      throw new Error("Verify document fields before confirming expiration.");
    }
    if (!document.expirationDate?.trim()) {
      throw new Error("No expiration date to confirm.");
    }
    this.state.documents[index] = { ...document, expirationVerified: true };
    this.state.documents = [...this.state.documents];
    const serviceCase = this.state.cases.find((item) => item.id === document.caseId);
    if (!serviceCase) throw new Error("Case not found");

    const existing = this.state.tasks.find(
      (task) =>
        task.caseId === document.caseId &&
        task.kind === "renewal" &&
        task.title.includes(document.documentType),
    );
    if (existing) {
      // Drop premature renewal tasks created before the 45-day window rule.
      if (!isWithinRenewalWindow(document.expirationDate)) {
        this.state.tasks = this.state.tasks.filter((task) => task.id !== existing.id);
        this.emit();
        return null;
      }
      this.emit();
      return existing;
    }

    // Only open a renewal task when the date is overdue or inside the 45-day window.
    // Far-future expirations stay verified on the document without alerting.
    if (!isWithinRenewalWindow(document.expirationDate)) {
      this.emit();
      return null;
    }

    const renewalTask: CaseTask = {
      id: id("task"),
      caseId: document.caseId,
      title: `Renewal review · ${document.documentType.replace("_", " ")}`,
      description: `Verified expiration ${document.expirationDate}. Schedule renewal follow-up.`,
      status: "open",
      priority: "high",
      dueDate: document.expirationDate,
      source: "HUMAN_CONFIRMED",
      assignedTo: serviceCase.ownerId,
      kind: "renewal",
      createdAt: nowIso(),
    };
    this.state.tasks = [renewalTask, ...this.state.tasks];
    serviceCase.updatedAt = nowIso();
    this.emit();
    return renewalTask;
  }

  /** Remove open renewal tasks whose due date is still outside the attention window. */
  pruneDeferredRenewalTasks(): number {
    const before = this.state.tasks.length;
    this.state.tasks = this.state.tasks.filter((task) => {
      if (task.kind !== "renewal" || task.status !== "open") return true;
      return isWithinRenewalWindow(task.dueDate);
    });
    const removed = before - this.state.tasks.length;
    if (removed > 0) this.emit();
    return removed;
  }

  completeTask(taskId: string): void {
    const task = this.state.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error("Task not found");
    task.status = "done";
    const serviceCase = this.state.cases.find((item) => item.id === task.caseId);
    if (serviceCase) serviceCase.updatedAt = nowIso();
    this.emit();
  }

  markRegulationRelevantToCase(
    regulationId: string,
    caseId: string,
    reason: string,
    decidedBy: string,
  ): CaseTask {
    const regulation = this.state.regulations.find((item) => item.id === regulationId);
    const serviceCase = this.state.cases.find((item) => item.id === caseId);
    if (!regulation) throw new Error("Regulation not found");
    if (!serviceCase) throw new Error("Case not found");

    const existing = this.state.tasks.find(
      (task) =>
        task.caseId === caseId &&
        task.kind === "regulation_review" &&
        task.description.includes(regulationId),
    );
    if (existing) return existing;

    const task: CaseTask = {
      id: id("task"),
      caseId,
      title: "Review regulatory change",
      description: `${reason.trim()} Regulation: ${regulation.title} (${regulationId}).`,
      status: "open",
      priority: "high",
      dueDate: offsetDaysIso(nowIso(), 7),
      source: "FMCSA",
      assignedTo: serviceCase.ownerId,
      kind: "regulation_review",
      createdAt: nowIso(),
    };
    this.state.tasks = [task, ...this.state.tasks];
    serviceCase.updatedAt = nowIso();
    this.addActivity({
      id: id("act"),
      leadId: serviceCase.leadId,
      type: "NOTE",
      content: `Regulatory change marked relevant to case. ${reason}`,
      createdAt: nowIso(),
      createdBy: decidedBy,
    });
    this.emit();
    return task;
  }

  importFederalRegisterRegulations(
    entries: Array<{
      documentNumber: string;
      title: string;
      sourceUrl: string;
      sourceText: string;
      publishedDate: string | null;
      effectiveDate: string | null;
    }>,
  ): { imported: number; skipped: number } {
    let imported = 0;
    let skipped = 0;
    for (const entry of entries) {
      if (this.state.regulations.some((item) => item.documentNumber === entry.documentNumber)) {
        skipped += 1;
        continue;
      }
      const regulationId = `reg_fr_${entry.documentNumber.replace(/\W/g, "_")}`;
      const regulation: Regulation = {
        id: regulationId,
        title: entry.title,
        agency: "FMCSA",
        sourceUrl: entry.sourceUrl,
        sourceText: entry.sourceText,
        category: "Federal Register",
        publishedDate: entry.publishedDate,
        effectiveDate: entry.effectiveDate,
        deadline: null,
        affectedSegment: "Review recommended",
        requiredAction: "Staff review recommended",
        confidence: 0.85,
        sourceSummary: entry.sourceText.slice(0, 280),
        status: "analyzed",
        campaignCreated: false,
        customersFlagged: false,
        sourceType: "federal_register",
        fetchedAt: nowIso(),
        documentNumber: entry.documentNumber,
        createdAt: nowIso(),
      };
      this.state.regulations = [regulation, ...this.state.regulations];
      this.state.matches[regulationId] = previewRegulationMatches(
        regulation,
        matchingCarriers(this.state),
        this.state.signals,
      );
      imported += 1;
    }
    if (imported > 0) this.emit();
    return { imported, skipped };
  }

  clearFederalRegisterRegulations(): number {
    const keep: Regulation[] = [];
    let removed = 0;
    for (const regulation of this.state.regulations) {
      if (
        regulation.sourceType === "federal_register" ||
        regulation.sourceType === "manual_paste"
      ) {
        delete this.state.matches[regulation.id];
        removed += 1;
        continue;
      }
      keep.push(regulation);
    }
    if (removed === 0) return 0;
    this.state.regulations = keep;
    this.emit();
    return removed;
  }

  removeDocument(documentId: string): void {
    const index = this.state.documents.findIndex((item) => item.id === documentId);
    const document = this.state.documents[index];
    if (index < 0 || !document) throw new Error("Document not found");
    const label = DOCUMENT_TYPE_LABEL[document.documentType] ?? document.documentType;

    this.state.documents[index] = {
      ...document,
      fileName: "",
      storagePath: null,
      personName: null,
      issuedDate: null,
      expirationDate: null,
      confidence: null,
      reviewStatus: "UPLOADED",
      expirationVerified: false,
    };
    this.state.documents = [...this.state.documents];

    const relatedTaskIndex = this.state.tasks.findIndex(
      (task) =>
        task.caseId === document.caseId &&
        (task.title.includes(label) ||
          task.title.toLowerCase().includes(document.documentType.replace("_", " "))),
    );
    if (relatedTaskIndex >= 0) {
      const relatedTask = this.state.tasks[relatedTaskIndex]!;
      this.state.tasks[relatedTaskIndex] = {
        ...relatedTask,
        status: "open",
        description: `${label} has not been received.`,
      };
      this.state.tasks = [...this.state.tasks];
    }

    const caseIndex = this.state.cases.findIndex((item) => item.id === document.caseId);
    const serviceCase = this.state.cases[caseIndex];
    if (caseIndex >= 0 && serviceCase) {
      const hasReview = this.state.documents.some(
        (item) => item.caseId === serviceCase.id && item.reviewStatus === "NEEDS_REVIEW",
      );
      this.state.cases[caseIndex] = {
        ...serviceCase,
        updatedAt: nowIso(),
        ...(hasReview ? { status: "OPEN" as const } : {}),
      };
      this.state.cases = [...this.state.cases];
    }
    this.emit();
  }

  simulateUpload(caseId: string, documentType: string): void {
    this.applyDocumentExtraction(caseId, documentType, SAMPLE_MEDICAL_EXTRACTION, `${documentType}.pdf`);
  }

  applyDocumentExtraction(
    caseId: string,
    documentType: string,
    extractionInput: unknown,
    fileName: string,
  ): void {
    const extracted = documentExtractionSchema.parse(extractionInput);
    let document = this.state.documents.find(
      (item) => item.caseId === caseId && item.documentType === documentType,
    );
    if (!document) {
      document = {
        id: id("doc"),
        caseId,
        fileName,
        storagePath: `demo/${fileName}`,
        documentType: extracted.document_type || documentType,
        personName: extracted.person_name,
        issuedDate: extracted.issued_date,
        expirationDate: extracted.expiration_date,
        confidence: extracted.confidence,
        reviewStatus: "NEEDS_REVIEW",
        expirationVerified: false,
        required: true,
        createdAt: nowIso(),
      };
      this.state.documents = [document, ...this.state.documents];
    } else {
      document.fileName = fileName;
      document.storagePath = `demo/${fileName}`;
      document.documentType = extracted.document_type || documentType;
      document.personName = extracted.person_name;
      document.issuedDate = extracted.issued_date;
      document.expirationDate = extracted.expiration_date;
      document.confidence = extracted.confidence;
      document.reviewStatus = "NEEDS_REVIEW";
      document.expirationVerified = false;
    }
    this.emit();
  }

  analyzeRegulation(
    sourceText: string,
    analysis?: unknown,
    sourceType: RegulationSourceType = "manual_paste",
  ): Regulation {
    const parsed = regulationAnalysisSchema.parse(analysis ?? {
      ...SAMPLE_REGULATION_ANALYSIS,
      source_summary:
        sourceText.trim().length > 40
          ? SAMPLE_REGULATION_ANALYSIS.source_summary
          : "Stored analysis used because the pasted text was too short for a live model.",
    });
    const regulation: Regulation = {
      id: id("reg"),
      title: parsed.title,
      agency: parsed.agency,
      sourceUrl: null,
      sourceText,
      category: parsed.category,
      publishedDate: parsed.published_date,
      effectiveDate: parsed.effective_date,
      deadline: parsed.deadline,
      affectedSegment: parsed.affected_segment,
      requiredAction: parsed.required_action,
      confidence: parsed.confidence,
      sourceSummary: parsed.source_summary,
      status: "analyzed",
      campaignCreated: false,
      customersFlagged: false,
      sourceType,
      createdAt: nowIso(),
    };
    this.state.regulations = [regulation, ...this.state.regulations];
    this.state.matches[regulation.id] = previewRegulationMatches(
      regulation,
      matchingCarriers(this.state),
      this.state.signals,
    );
    this.emit();
    return regulation;
  }

  importRegulatoryInbox(notices?: Array<{ sourceText: string; analysis: unknown }>): number {
    const pending =
      notices ??
      getUnimportedInboxNotices(this.state.regulations).map((notice) => ({
        sourceText: notice.sourceText,
        analysis: notice.analysis,
      }));
    for (const notice of pending) {
      this.analyzeRegulation(notice.sourceText, notice.analysis, "demo_seed");
    }
    return pending.length;
  }

  createCampaign(regulationId: string): { confirmed: number; potential: number; created: number } {
    const regulation = this.state.regulations.find((item) => item.id === regulationId);
    if (!regulation) throw new Error("Regulation not found");
    const matches = previewRegulationMatches(
      regulation,
      matchingCarriers(this.state),
      this.state.signals,
    ).filter((match) => match.audience === "prospect");
    this.state.matches[regulationId] = [
      ...(this.state.matches[regulationId] ?? []).filter((match) => match.audience === "customer"),
      ...matches,
    ];

    let created = 0;
    for (const match of matches) {
      const carrier = this.state.carriers.find((item) => item.id === match.carrierId);
      if (!carrier) continue;
      const existing = this.state.opportunities.find((item) => item.carrierId === match.carrierId);
      if (existing && existing.stage !== "DISMISSED" && existing.stage !== "LOST") {
        const already = this.state.signals.some(
          (signal) => signal.carrierId === carrier.id && signal.type === "REGULATORY_MATCH",
        );
        if (!already) {
          const extraSignals = detectCarrierSignals(carrier, this.snapshotsFor(carrier.id), {
            regulatoryMatch: true,
            detectedAt: nowIso(),
          });
          const regulatory = extraSignals.filter((signal) => signal.type === "REGULATORY_MATCH");
          this.state.signals.push(...regulatory);
          const breakdown = getOpportunityScoreBreakdown(carrier, [
            ...this.state.signals.filter((signal) => signal.carrierId === carrier.id),
          ]);
          this.patchOpportunity(existing.id, {
            score: calculateOpportunityScore(breakdown),
            scoreBreakdown: breakdown,
            signalTitle: primarySignalTitle(
              this.state.signals.filter((signal) => signal.carrierId === carrier.id),
            ),
            lastActivityAt: nowIso(),
            lastActivityLabel: "Regulation match added",
          });
          this.addActivity({
            id: id("act"),
            leadId: existing.id,
            type: "SIGNAL",
            content: `${match.matchType === "confirmed" ? "Confirmed" : "Potential"} match to ${regulation.title}. ${match.reason}`,
            createdAt: nowIso(),
            createdBy: "SkyOS",
          });
        }
        match.opportunityId = existing.id;
        continue;
      }

      const extraSignals = detectCarrierSignals(carrier, this.snapshotsFor(carrier.id), {
        regulatoryMatch: true,
        detectedAt: nowIso(),
      });
      this.state.signals.push(...extraSignals.filter((signal) => signal.type === "REGULATORY_MATCH"));
      const allSignals = this.state.signals.filter((signal) => signal.carrierId === carrier.id);
      const breakdown = getOpportunityScoreBreakdown(carrier, allSignals);
      const opportunity: Opportunity = {
        id: id("opp"),
        carrierId: carrier.id,
        recordKind: "prospect",
        creation: regulatoryCampaignProspectCreation(nowIso(), regulationId),
        stage: "DETECTED",
        score: calculateOpportunityScore(breakdown),
        scoreBreakdown: breakdown,
        recommendedService: primaryRecommendedService(carrier, allSignals),
        reasonSummary: reasonSummary(carrier, [primaryRecommendedService(carrier, allSignals)]),
        signalTitle: primarySignalTitle(allSignals),
        contactName: null,
        statedNeed: null,
        assignedTo: null,
        preferredLanguage: null,
        detectedLanguages: [],
        nextAction: "Review regulation match",
        followUpAt: null,
        lastActivityAt: nowIso(),
        lastActivityLabel: "Regulation campaign",
        interestLevel: null,
        callbackRequested: false,
        caseId: null,
        ...defaultConsultationFields(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      this.state.opportunities = [opportunity, ...this.state.opportunities];
      match.opportunityId = opportunity.id;
      created += 1;
    }

    regulation.campaignCreated = true;
    this.emit();
    const confirmed = matches.filter((match) => match.matchType === "confirmed").length;
    const potential = matches.filter((match) => match.matchType === "potential").length;
    return { confirmed, potential, created };
  }

  flagCustomers(regulationId: string): number {
    const regulation = this.state.regulations.find((item) => item.id === regulationId);
    if (!regulation) throw new Error("Regulation not found");
    const customerMatches = previewRegulationMatches(
      regulation,
      matchingCarriers(this.state).filter((carrier) => carrier.isCustomer),
      this.state.signals,
    );
    this.state.matches[regulationId] = [
      ...(this.state.matches[regulationId] ?? []).filter((match) => match.audience === "prospect"),
      ...customerMatches,
    ];

    for (const match of customerMatches) {
      const serviceCase = this.state.cases.find((item) => item.carrierId === match.carrierId);
      if (!serviceCase) continue;
      const exists = this.state.tasks.some(
        (task) => task.caseId === serviceCase.id && task.title.includes("regulation"),
      );
      if (exists) continue;
      this.state.tasks.unshift({
        id: id("task"),
        caseId: serviceCase.id,
        title: "Review regulation impact",
        description: match.requiredChange,
        status: "open",
        priority: match.matchType === "confirmed" ? "high" : "medium",
        dueDate: regulation.deadline,
        source: "DERIVED",
        assignedTo: serviceCase.ownerId,
        kind: "regulation_review",
        createdAt: nowIso(),
      });
    }
    regulation.customersFlagged = true;
    this.emit();
    return customerMatches.length;
  }

  ingestNormalizedCarrier(
    normalized: NormalizedFmcsaCarrier,
    options?: IngestCarrierOptions,
  ): { opportunityId: string; created: boolean } {
    if (options?.enrichOpportunityId) {
      return this.enrichOpportunityWithFmcsa(options.enrichOpportunityId, normalized);
    }

    const sourceType = options?.sourceType ?? "fmcsa_usdot_lookup";
    const sourceRef = options?.sourceRef ?? normalized.usdot;
    const existing = this.state.carriers.find((item) => item.usdot === normalized.usdot);
    const now = nowIso();
    if (existing) {
      Object.assign(existing, {
        ...normalized,
        profileKind: "live" as const,
        source: "FMCSA" as const,
        sourceLastCheckedAt: now,
        updatedAt: now,
      });
      const signals = detectCarrierSignals(existing, this.snapshotsFor(existing.id), { detectedAt: now });
      this.state.signals = [
        ...this.state.signals.filter((signal) => signal.carrierId !== existing.id),
        ...signals,
      ];
      const breakdown = getOpportunityScoreBreakdown(existing, signals);
      const opportunity = this.state.opportunities.find((item) => item.carrierId === existing.id);
      if (opportunity) {
        // Enrich existing Lead or Prospect; do not change creation provenance.
        this.patchOpportunity(opportunity.id, {
          score: calculateOpportunityScore(breakdown),
          scoreBreakdown: breakdown,
          recommendedService: primaryRecommendedService(existing, signals),
          reasonSummary: reasonSummary(existing, [primaryRecommendedService(existing, signals)]),
          signalTitle: primarySignalTitle(signals),
          nextAction:
            opportunity.recordKind === "lead" &&
            ["DETECTED", "REVIEWED", "CONTACTED"].includes(opportunity.stage)
              ? "Qualify"
              : opportunity.nextAction,
          lastActivityAt: now,
          lastActivityLabel:
            opportunity.recordKind === "lead"
              ? "FMCSA profile enriched"
              : "Live FMCSA lookup refreshed",
        });
        this.emit();
        return { opportunityId: opportunity.id, created: false };
      }
    }

    const carrierId = existing?.id ?? `live-${normalized.usdot}`;
    const carrier: Carrier = {
      id: carrierId,
      ...normalized,
      isCustomer: false,
      existingServices: [],
      profileKind: "live",
      source: "FMCSA" as const,
      sourceLastCheckedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    if (!existing) this.state.carriers = [carrier, ...this.state.carriers];
    const signals = detectCarrierSignals(carrier, [], { detectedAt: now });
    this.state.signals = [...signals, ...this.state.signals.filter((signal) => signal.carrierId !== carrierId)];
    const breakdown = getOpportunityScoreBreakdown(carrier, signals);
    const creation = fmcsaProspectCreation({
      sourceType,
      usdot: normalized.usdot,
      sourceRef,
      createdAt: now,
    });
    const opportunity: Opportunity = {
      id: `opp_${carrierId}`,
      carrierId,
      recordKind: "prospect",
      creation,
      stage: "DETECTED",
      score: calculateOpportunityScore(breakdown),
      scoreBreakdown: breakdown,
      recommendedService: primaryRecommendedService(carrier, signals),
      reasonSummary: reasonSummary(carrier, [primaryRecommendedService(carrier, signals)]),
      signalTitle: primarySignalTitle(signals),
      contactName: null,
      statedNeed: null,
      assignedTo: null,
      preferredLanguage: null,
      detectedLanguages: [],
      nextAction: "Review opportunity",
      followUpAt: null,
      lastActivityAt: now,
      lastActivityLabel: "FMCSA prospect discovered",
      interestLevel: null,
      callbackRequested: false,
      caseId: null,
      ...defaultConsultationFields(),
      createdAt: now,
      updatedAt: now,
    };
    this.state.opportunities = [opportunity, ...this.state.opportunities];
    this.addActivity({
      id: id("act"),
      leadId: opportunity.id,
      type: "SIGNAL",
      content: "Prospect imported from FMCSA discovery. Human review is required before outreach.",
      createdAt: now,
      createdBy: "SkyOS",
    });
    this.emit();
    return { opportunityId: opportunity.id, created: true };
  }

  ingestCensusProspect(
    input: CensusProspectSaveInput,
  ): { opportunityId: string; created: boolean } {
    const normalized = censusProspectToNormalized({
      ...input,
      drivers: input.drivers ?? 0,
    });
    const usdot = normalized.usdot.replace(/\D/g, "");
    if (!usdot) {
      throw new Error("USDOT is required.");
    }

    const duplicates = findLeadDuplicates({
      usdot,
      email: input.email,
      phone: input.phone,
      carriers: this.state.carriers,
      opportunities: this.state.opportunities,
    });
    if (duplicates.length > 0) {
      const match = duplicates[0];
      throw new Error(
        `Already in workspace as ${match.label} (matched on ${match.matchOn}).`,
      );
    }

    const now = nowIso();
    const carrierId = `census-${usdot}`;
    const carrier: Carrier = {
      id: carrierId,
      ...normalized,
      isCustomer: false,
      existingServices: [],
      profileKind: "census",
      source: "FMCSA" as const,
      sourceLastCheckedAt: input.queriedAt,
      createdAt: now,
      updatedAt: now,
    };

    const signals = detectCarrierSignals(carrier, [], { detectedAt: now });
    this.state.carriers = [carrier, ...this.state.carriers];
    this.state.signals = [...signals, ...this.state.signals];

    const breakdown = getOpportunityScoreBreakdown(carrier, signals);
    const creation = fmcsaCensusProspectCreation({
      usdot,
      sourceRef: input.sourceRef,
      createdAt: now,
    });

    const opportunity: Opportunity = {
      id: `opp_${carrierId}`,
      carrierId,
      recordKind: "prospect",
      creation,
      stage: "DETECTED",
      score: calculateOpportunityScore(breakdown),
      scoreBreakdown: breakdown,
      recommendedService: primaryRecommendedService(carrier, signals),
      reasonSummary:
        input.reviewReason ??
        `Saved from FMCSA Census prospecting. Staff review required before outreach.`,
      signalTitle: primarySignalTitle(signals),
      contactName: null,
      statedNeed: null,
      assignedTo: null,
      preferredLanguage: null,
      detectedLanguages: [],
      nextAction: "Review opportunity",
      followUpAt: null,
      lastActivityAt: now,
      lastActivityLabel: "Prospect saved from Census search",
      interestLevel: null,
      callbackRequested: false,
      caseId: null,
      ...defaultConsultationFields(),
      outreachReadiness: input.outreachReadiness ?? null,
      outreachReadinessReason: input.outreachReadinessReason ?? null,
      discoveryScore: input.discoveryScore ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.state.opportunities = [opportunity, ...this.state.opportunities];
    this.addActivity({
      id: id("act"),
      leadId: opportunity.id,
      type: "SIGNAL",
      content:
        "Prospect saved from FMCSA Census search. Contact details are public record only — not outreach consent.",
      createdAt: now,
      createdBy: "SkyOS",
    });
    this.emit();
    return { opportunityId: opportunity.id, created: true };
  }

  /**
   * Attach a verified FMCSA profile to an existing Lead (or Prospect) in place.
   * Preserves creation provenance and recordKind. Does not invent carrier facts.
   */
  private enrichOpportunityWithFmcsa(
    opportunityId: string,
    normalized: NormalizedFmcsaCarrier,
  ): { opportunityId: string; created: boolean } {
    const usdot = normalized.usdot.replace(/\D/g, "");
    if (!usdot) {
      throw new Error("Enter a USDOT number.");
    }

    const opportunity = this.state.opportunities.find((item) => item.id === opportunityId);
    if (!opportunity) {
      throw new Error("Lead not found.");
    }

    const carrier = this.state.carriers.find((item) => item.id === opportunity.carrierId);
    if (!carrier) {
      throw new Error("Carrier record not found.");
    }

    const conflict = this.state.carriers.find(
      (item) => item.usdot === usdot && item.id !== carrier.id && Boolean(item.usdot),
    );
    if (conflict) {
      const other = this.state.opportunities.find((item) => item.carrierId === conflict.id);
      throw new Error(
        other
          ? `USDOT ${usdot} is already linked to another record. Open that record instead of duplicating it.`
          : `USDOT ${usdot} is already linked to another carrier profile.`,
      );
    }

    const now = nowIso();
    Object.assign(carrier, {
      ...normalized,
      usdot,
      phone: normalized.phone || carrier.phone,
      email: normalized.email || carrier.email,
      profileKind: "live" as const,
      source: "FMCSA" as const,
      sourceLastCheckedAt: now,
      updatedAt: now,
    });

    const signals = detectCarrierSignals(carrier, this.snapshotsFor(carrier.id), { detectedAt: now });
    this.state.signals = [
      ...this.state.signals.filter((signal) => signal.carrierId !== carrier.id),
      ...signals,
    ];
    const breakdown = getOpportunityScoreBreakdown(carrier, signals);
    const service = primaryRecommendedService(carrier, signals);
    const readyToContact = ["DETECTED", "REVIEWED", "CONTACTED"].includes(opportunity.stage);

    this.patchOpportunity(opportunity.id, {
      score: calculateOpportunityScore(breakdown),
      scoreBreakdown: breakdown,
      recommendedService: service,
      reasonSummary: reasonSummary(carrier, [service]),
      signalTitle: primarySignalTitle(signals),
      nextAction: readyToContact ? "Qualify" : opportunity.nextAction,
      lastActivityAt: now,
      lastActivityLabel: "FMCSA profile enriched",
    });
    this.addActivity({
      id: id("act"),
      leadId: opportunity.id,
      type: "SIGNAL",
      content: `FMCSA profile connected for USDOT ${usdot}. Review before outreach.`,
      createdAt: now,
      createdBy: "SkyOS",
    });
    this.emit();
    return { opportunityId: opportunity.id, created: false };
  }

  createLeadFromIntake(
    rawInput: unknown,
    options?: { acknowledgeDuplicates?: boolean },
  ): LeadIntakeResult {
    const validated = validateLeadIntake(rawInput);
    if (validated.status !== "ok") return validated;

    const input = validated.data;
    const duplicates = findLeadDuplicates({
      email: input.email,
      phone: input.phone,
      usdot: input.usdot,
      carriers: this.state.carriers,
      opportunities: this.state.opportunities,
    });
    if (duplicates.length > 0 && !options?.acknowledgeDuplicates) {
      return { status: "duplicate_warning", matches: duplicates };
    }

    const now = nowIso();
    const carrierId = id("inbound");
    const carrier: Carrier = {
      id: carrierId,
      usdot: input.usdot ?? "",
      legalName: input.company,
      dbaName: null,
      state: input.state ?? "",
      city: "",
      phone: input.phone,
      email: input.email,
      powerUnits: 0,
      drivers: 0,
      operationType: "intrastate",
      authorizedForHire: false,
      newEntrant: false,
      hazmat: false,
      passenger: false,
      cargoTypes: [],
      authorityStatus: "pending",
      isCustomer: false,
      existingServices: [],
      profileKind: "intake",
      source: "CRM",
      sourceLastCheckedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const creation = buildLeadCreationProvenance(input, now);
    const statedNeed = input.statedNeed;
    const opportunity: Opportunity = {
      id: `opp_${carrierId}`,
      carrierId,
      recordKind: "lead",
      creation,
      stage: "DETECTED",
      score: 0,
      scoreBreakdown: [],
      recommendedService: "Needs FMCSA enrichment",
      reasonSummary:
        "Intake only. No FMCSA profile is connected yet, so score and service suggestions are withheld.",
      signalTitle: "Inbound lead",
      contactName: input.contactName,
      statedNeed,
      assignedTo: input.owner,
      preferredLanguage: null,
      detectedLanguages: [],
      nextAction: "Add USDOT to enrich",
      followUpAt: null,
      lastActivityAt: now,
      lastActivityLabel: "Lead intake",
      interestLevel: null,
      callbackRequested: false,
      caseId: null,
      consultationStatus: "not_applicable",
      consultationScheduledAt: null,
      consultationNote: null,
      serviceApprovedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.state.carriers = [carrier, ...this.state.carriers];
    this.state.opportunities = [opportunity, ...this.state.opportunities];
    this.addActivity({
      id: id("act"),
      leadId: opportunity.id,
      type: "SIGNAL",
      content: `Inbound lead created (${input.sourceType}). ${input.contactName} · ${input.company}. FMCSA profile not connected.`,
      createdAt: now,
      createdBy: "SkyOS",
    });
    this.emit();
    return { status: "created", opportunityId: opportunity.id, carrierId };
  }

  private snapshotsFor(carrierId: string) {
    return this.state.snapshots.filter((snapshot) => snapshot.carrierId === carrierId);
  }
}

type ServiceCaseLike = DemoState["cases"][number];

function migrateState(state: DemoState): DemoState {
  const carrierMapPreview = new Map(state.carriers.map((carrier) => [carrier.id, carrier]));
  const opportunities = state.opportunities.map((opportunity) => {
    const creation = inferCreationForLegacyOpportunity(
      opportunity,
      carrierMapPreview.get(opportunity.carrierId),
    );
    const inboundIntake =
      creation.recordKind === "lead" &&
      creation.sourceType !== "demo_seed" &&
      ["manual", "referral", "csv_import", "website_form"].includes(creation.sourceType);

    const carrier = carrierMapPreview.get(opportunity.carrierId);
    const unenriched =
      inboundIntake && getProfileKind(carrier) !== "live";

    return {
      ...opportunity,
      creation,
      recordKind: creation.recordKind,
      contactName: opportunity.contactName ?? null,
      statedNeed: opportunity.statedNeed ?? null,
      outreachReadiness: opportunity.outreachReadiness ?? null,
      outreachReadinessReason: opportunity.outreachReadinessReason ?? null,
      discoveryScore: opportunity.discoveryScore ?? null,
      ...(unenriched
        ? {
            score: 0,
            scoreBreakdown: [],
            recommendedService: "Needs FMCSA enrichment",
            reasonSummary:
              "Intake only. No FMCSA profile is connected yet, so score and service suggestions are withheld.",
            signalTitle: "Inbound lead",
            nextAction:
              opportunity.nextAction === "Add USDOT to enrich" ||
              opportunity.stage === "DETECTED" ||
              opportunity.stage === "REVIEWED" ||
              opportunity.stage === "CONTACTED"
                ? "Add USDOT to enrich"
                : opportunity.nextAction,
          }
        : {}),
    };
  });

  const carriers: Carrier[] = state.carriers.map((carrier) => {
    const linked = opportunities.find((item) => item.carrierId === carrier.id);
    const shouldBeIntake =
      linked?.recordKind === "lead" &&
      linked.creation.sourceType !== "demo_seed" &&
      getProfileKind(carrier) !== "live" &&
      (carrier.source === "CRM" ||
        carrier.id.startsWith("inbound") ||
        linked.creation.sourceType === "manual" ||
        linked.creation.sourceType === "referral" ||
        linked.creation.sourceType === "csv_import" ||
        linked.creation.sourceType === "website_form");

    const profileKind = shouldBeIntake
      ? ("intake" as const)
      : getProfileKind(carrier);

    return {
      ...carrier,
      profileKind,
      source: (profileKind === "live" || profileKind === "census"
        ? "FMCSA"
        : profileKind === "intake"
          ? "CRM"
          : carrier.source === "FMCSA"
            ? "DEMO"
            : carrier.source) as DataProvenance,
      ...(shouldBeIntake
        ? {
            // Clear invented FMCSA-shaped placeholders for unenriched intake carriers.
            powerUnits: carrier.profileKind === "live" ? carrier.powerUnits : 0,
            drivers: carrier.profileKind === "live" ? carrier.drivers : 0,
            authorizedForHire: carrier.profileKind === "live" ? carrier.authorizedForHire : false,
            cargoTypes: carrier.profileKind === "live" ? carrier.cargoTypes : [],
            authorityStatus:
              carrier.profileKind === "live" ? carrier.authorityStatus : ("pending" as const),
            usdot: carrier.usdot.startsWith("PENDING-") ? "" : carrier.usdot,
          }
        : {}),
    };
  });

  const matches: DemoState["matches"] = { ...state.matches };
  for (const regulation of state.regulations) {
    if (regulation.status === "analyzed" && regulation.sourceText.trim()) {
      matches[regulation.id] = previewRegulationMatches(
        regulation,
        matchingCarriers({ carriers, cases: state.cases }),
        state.signals,
      );
    }
  }

  // Legacy live-import prospects are not part of the product loop (Census → Saved Prospects).
  // Drop them from seed/demo/hydrated state so they never reappear after reset or migrate.
  const opportunitiesWithoutLegacy = opportunities.filter(
    (opportunity) => opportunity.creation.sourceType !== "legacy_fmcsa",
  );
  const opportunityIds = new Set(opportunitiesWithoutLegacy.map((item) => item.id));
  const caseCarrierIds = new Set(state.cases.map((item) => item.carrierId));
  const opportunityCarrierIds = new Set(opportunitiesWithoutLegacy.map((item) => item.carrierId));
  const keepCarrierIds = new Set([...opportunityCarrierIds, ...caseCarrierIds]);

  const carriersWithoutLegacy = carriers.filter((carrier) => keepCarrierIds.has(carrier.id));
  const activities = state.activities.filter((item) => opportunityIds.has(item.leadId));
  const calls = state.calls.filter((item) => opportunityIds.has(item.leadId));
  const signals = state.signals.filter((item) => keepCarrierIds.has(item.carrierId));
  const snapshots = state.snapshots.filter((item) => keepCarrierIds.has(item.carrierId));
  for (const regulationId of Object.keys(matches)) {
    matches[regulationId] = (matches[regulationId] ?? []).filter(
      (match) =>
        keepCarrierIds.has(match.carrierId) &&
        (match.opportunityId == null || opportunityIds.has(match.opportunityId)),
    );
  }

  return {
    ...state,
    carriers: carriersWithoutLegacy,
    opportunities: opportunitiesWithoutLegacy.map((opportunity) => ({
      ...opportunity,
      assignedTo: resolveStaffId(opportunity.assignedTo) ?? opportunity.assignedTo,
      consultationStatus: opportunity.consultationStatus ?? "not_applicable",
      consultationScheduledAt: opportunity.consultationScheduledAt ?? null,
      consultationNote: opportunity.consultationNote ?? null,
      serviceApprovedAt:
        opportunity.serviceApprovedAt ??
        (opportunity.stage === "WON" && opportunity.caseId ? opportunity.updatedAt : null),
    })),
    activities,
    calls,
    signals,
    snapshots,
    cases: state.cases.map((item) => ({
      ...item,
      serviceTypeKey: item.serviceTypeKey ?? defaultServiceTypeKey(item.serviceType),
      ownerId: item.ownerId ?? resolveStaffId(
        opportunitiesWithoutLegacy.find((o) => o.id === item.leadId)?.assignedTo ?? null,
      ),
      serviceApprovedAt: item.serviceApprovedAt ?? item.openedAt,
    })),
    documents: state.documents.map((doc) => ({
      ...doc,
      expirationVerified: doc.expirationVerified ?? false,
    })),
    tasks: state.tasks.map((task) => ({
      ...task,
      assignedTo: task.assignedTo ?? null,
      kind: task.kind ?? "checklist",
    })),
    regulations: state.regulations.map((reg) => ({
      ...reg,
      sourceType:
        reg.sourceType ??
        (SEED_REGULATION_IDS.has(reg.id)
          ? "demo_seed"
          : reg.id.startsWith("reg_fr_")
            ? "federal_register"
            : "manual_paste"),
      fetchedAt: reg.fetchedAt ?? null,
      documentNumber: reg.documentNumber ?? null,
    })),
    matches,
  };
}

export const demoStore = new DemoStore();
