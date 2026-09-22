import { collectAttentionItems } from "@/lib/attention";
import { demoStore, type IngestCarrierOptions } from "@/lib/demo/store";
import type { LeadIntakeResult } from "@/lib/leads/intake";
import type { CensusProspectSaveInput } from "@/lib/prospecting/types";
import { isDemoMode, LIVE_MODE_SETUP } from "@/lib/mode/demo-mode";
import { filterLiveWorkspace } from "@/lib/mode/live-workspace";
import type { NormalizedFmcsaCarrier } from "@/lib/providers/types";
import type {
  Activity,
  CallRecord,
  Carrier,
  CarrierSnapshot,
  CaseDocument,
  CaseTask,
  DemoState,
  Opportunity,
  QualificationResult,
  RecordKind,
  Regulation,
  RegulationMatch,
  ServiceCase,
  ServiceTypeKey,
} from "@/types";

export interface OpportunityRepository {
  getOpportunities(options?: { kind?: RecordKind }): Promise<Opportunity[]>;
  getOpportunity(id: string): Promise<Opportunity | null>;
  addNote(id: string, content: string): Promise<void>;
  scheduleFollowUp(id: string, at: string, note?: string): Promise<void>;
  dismiss(id: string, reason: string): Promise<void>;
  removeProspect(id: string): Promise<void>;
  qualify(id: string): Promise<CallRecord>;
  applyQualification(
    id: string,
    qualification: QualificationResult,
    meta: {
      provider: "vapi" | "demo" | "dograh";
      status: CallRecord["status"];
      transcript: string;
      transcriptUrl?: string | null;
      providerCallId?: string | null;
      recordingUrl?: string | null;
      durationSeconds?: number | null;
    },
  ): Promise<CallRecord>;
  recordFailedQualificationAttempt(
    id: string,
    meta: {
      provider: "vapi" | "demo" | "dograh";
      providerCallId?: string | null;
      transcript?: string;
      transcriptUrl?: string | null;
      recordingUrl?: string | null;
      durationSeconds?: number | null;
      error?: string | null;
    },
  ): Promise<CallRecord>;
  ingestNormalizedCarrier(
    normalized: NormalizedFmcsaCarrier,
    options?: IngestCarrierOptions,
  ): Promise<{ opportunityId: string; created: boolean }>;
  ingestCensusProspect(
    input: CensusProspectSaveInput,
  ): Promise<{ opportunityId: string; created: boolean }>;
  createLead(
    input: unknown,
    options?: { acknowledgeDuplicates?: boolean },
  ): Promise<LeadIntakeResult>;
  assignOwner(id: string, staffId: string): Promise<Opportunity>;
  scheduleConsultation(id: string, at: string, note?: string): Promise<Opportunity>;
  completeConsultation(id: string, note?: string): Promise<Opportunity>;
  approveService(id: string): Promise<Opportunity>;
  notMovingForward(id: string, note?: string): Promise<Opportunity>;
  markWon(id: string): Promise<void>;
  markLost(id: string, reason: string): Promise<void>;
  startService(id: string, serviceTypeKey?: ServiceTypeKey): Promise<ServiceCase>;
}

export interface CarrierRepository {
  getCarriers(): Promise<Carrier[]>;
  getCarrier(id: string): Promise<Carrier | null>;
  getSnapshots(carrierId: string): Promise<CarrierSnapshot[]>;
}

export interface ActivityRepository {
  getActivities(leadId: string): Promise<Activity[]>;
}

export interface CallRepository {
  getCalls(): Promise<CallRecord[]>;
  getCall(id: string): Promise<CallRecord | null>;
}

export interface CaseRepository {
  getCases(): Promise<ServiceCase[]>;
  getCase(id: string): Promise<ServiceCase | null>;
  getDocuments(caseId: string): Promise<CaseDocument[]>;
  getTasks(caseId: string): Promise<CaseTask[]>;
  verifyDocument(documentId: string): Promise<void>;
  removeDocument(documentId: string): Promise<void>;
  simulateUpload(caseId: string, documentType: string): Promise<void>;
  applyDocumentExtraction(
    caseId: string,
    documentType: string,
    extraction: unknown,
    fileName: string,
  ): Promise<void>;
  confirmExpirationDate(documentId: string): Promise<CaseTask | null>;
  completeTask(taskId: string): Promise<void>;
}

export interface RegulationRepository {
  getRegulations(): Promise<Regulation[]>;
  getRegulation(id: string): Promise<Regulation | null>;
  getMatches(regulationId: string): Promise<RegulationMatch[]>;
  analyze(sourceText: string, analysis?: unknown): Promise<Regulation>;
  importRegulatoryInbox(
    notices?: Array<{ sourceText: string; analysis: unknown }>,
  ): Promise<number>;
  createCampaign(id: string): Promise<{ confirmed: number; potential: number; created: number }>;
  flagCustomers(id: string): Promise<number>;
  importFederalRegisterRegulations(
    entries: Array<{
      documentNumber: string;
      title: string;
      sourceUrl: string;
      sourceText: string;
      publishedDate: string | null;
      effectiveDate: string | null;
    }>,
  ): Promise<{ imported: number; skipped: number }>;
  clearFederalRegisterRegulations(): Promise<number>;
  getAllMatches(): Promise<Record<string, RegulationMatch[]>>;
  markRelevantToCase(
    regulationId: string,
    caseId: string,
    reason: string,
    decidedBy: string,
  ): Promise<CaseTask>;
}

function delay<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

function workspace(): DemoState {
  const state = demoStore.getState();
  return isDemoMode() ? state : filterLiveWorkspace(state);
}

function assertDemoMutation(action: string): void {
  if (!isDemoMode()) {
    throw new Error(`${action} requires Demo Mode, or use a live integration instead. ${LIVE_MODE_SETUP}`);
  }
}

export const demoOpportunityRepository: OpportunityRepository = {
  async getOpportunities(options) {
    demoStore.pruneLegacyFmcsaProspects();
    const list = workspace().opportunities.filter((item) => {
      if (item.recordKind !== "prospect") return true;
      return item.creation.sourceType !== "legacy_fmcsa";
    });
    if (!options?.kind) return delay([...list]);
    return delay(list.filter((item) => item.recordKind === options.kind));
  },
  async getOpportunity(id) {
    return delay(workspace().opportunities.find((item) => item.id === id) ?? null);
  },
  async addNote(id, content) {
    demoStore.addNote(id, content);
  },
  async scheduleFollowUp(id, at, note) {
    demoStore.scheduleFollowUp(id, at, note);
  },
  async dismiss(id, reason) {
    demoStore.setStage(id, "DISMISSED", `Dismissed. ${reason}`);
  },
  async removeProspect(id) {
    demoStore.removeProspect(id);
  },
  async qualify(id) {
    assertDemoMutation("Simulated qualification");
    return demoStore.qualify(id);
  },
  async applyQualification(id, qualification, meta) {
    if (!isDemoMode() && (meta.provider === "demo" || meta.status === "simulated")) {
      throw new Error(`Simulated qualification is unavailable. ${LIVE_MODE_SETUP}`);
    }
    return demoStore.applyQualification(id, qualification, meta);
  },
  async recordFailedQualificationAttempt(id, meta) {
    return demoStore.recordFailedQualificationAttempt(id, meta);
  },
  async ingestNormalizedCarrier(normalized, options) {
    return demoStore.ingestNormalizedCarrier(normalized, options);
  },
  async ingestCensusProspect(input) {
    return demoStore.ingestCensusProspect(input);
  },
  async createLead(input, options) {
    return demoStore.createLeadFromIntake(input, options);
  },
  async assignOwner(id, staffId) {
    return demoStore.assignOwner(id, staffId);
  },
  async scheduleConsultation(id, at, note) {
    return demoStore.scheduleConsultation(id, at, note);
  },
  async completeConsultation(id, note) {
    return demoStore.completeConsultation(id, note);
  },
  async approveService(id) {
    return demoStore.approveService(id);
  },
  async notMovingForward(id, note) {
    return demoStore.notMovingForward(id, note);
  },
  async markWon(id) {
    demoStore.setStage(id, "WON", "Marked Won.");
  },
  async markLost(id, reason) {
    demoStore.setStage(id, "LOST", `Marked Lost. ${reason}`);
  },
  async startService(id, serviceTypeKey) {
    return demoStore.startService(id, serviceTypeKey);
  },
};

export const demoCarrierRepository: CarrierRepository = {
  async getCarriers() {
    return delay([...workspace().carriers]);
  },
  async getCarrier(id) {
    return delay(workspace().carriers.find((item) => item.id === id) ?? null);
  },
  async getSnapshots(carrierId) {
    return delay(workspace().snapshots.filter((item) => item.carrierId === carrierId));
  },
};

export const demoActivityRepository: ActivityRepository = {
  async getActivities(leadId) {
    return delay(
      workspace()
        .activities.filter((item) => item.leadId === leadId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  },
};

export const demoCallRepository: CallRepository = {
  async getCalls() {
    return delay([...workspace().calls]);
  },
  async getCall(id) {
    return delay(workspace().calls.find((item) => item.id === id) ?? null);
  },
};

export const demoCaseRepository: CaseRepository = {
  async getCases() {
    return delay([...workspace().cases]);
  },
  async getCase(id) {
    return delay(workspace().cases.find((item) => item.id === id) ?? null);
  },
  async getDocuments(caseId) {
    return delay(
      workspace()
        .documents.filter((item) => item.caseId === caseId)
        .map((item) => ({ ...item })),
    );
  },
  async getTasks(caseId) {
    demoStore.pruneDeferredRenewalTasks();
    return delay(
      workspace()
        .tasks.filter((item) => item.caseId === caseId)
        .map((item) => ({ ...item })),
    );
  },
  async verifyDocument(documentId) {
    demoStore.verifyDocument(documentId);
  },
  async removeDocument(documentId) {
    demoStore.removeDocument(documentId);
  },
  async simulateUpload(caseId, documentType) {
    assertDemoMutation("Attach sample");
    demoStore.simulateUpload(caseId, documentType);
  },
  async applyDocumentExtraction(caseId, documentType, extraction, fileName) {
    demoStore.applyDocumentExtraction(caseId, documentType, extraction, fileName);
  },
  async confirmExpirationDate(documentId) {
    return demoStore.confirmExpirationDate(documentId);
  },
  async completeTask(taskId) {
    demoStore.completeTask(taskId);
  },
};

export const demoRegulationRepository: RegulationRepository = {
  async getRegulations() {
    return delay([...workspace().regulations]);
  },
  async getRegulation(id) {
    return delay(workspace().regulations.find((item) => item.id === id) ?? null);
  },
  async getMatches(regulationId) {
    return delay(workspace().matches[regulationId] ?? []);
  },
  async analyze(sourceText, analysis) {
    if (!isDemoMode() && analysis == null) {
      throw new Error(`Stored regulation analysis is unavailable. ${LIVE_MODE_SETUP}`);
    }
    return demoStore.analyzeRegulation(sourceText, analysis);
  },
  async importRegulatoryInbox(notices) {
    if (!isDemoMode()) {
      if (!notices || notices.length === 0) {
        throw new Error(`Seeded regulatory inbox is unavailable. ${LIVE_MODE_SETUP}`);
      }
    }
    return demoStore.importRegulatoryInbox(notices);
  },
  async createCampaign(id) {
    return demoStore.createCampaign(id);
  },
  async flagCustomers(id) {
    return demoStore.flagCustomers(id);
  },
  async importFederalRegisterRegulations(entries) {
    return demoStore.importFederalRegisterRegulations(entries);
  },
  async clearFederalRegisterRegulations() {
    return demoStore.clearFederalRegisterRegulations();
  },
  async getAllMatches() {
    return delay({ ...workspace().matches });
  },
  async markRelevantToCase(regulationId, caseId, reason, decidedBy) {
    return demoStore.markRegulationRelevantToCase(regulationId, caseId, reason, decidedBy);
  },
};

export function getAttentionItems() {
  demoStore.pruneDeferredRenewalTasks();
  demoStore.pruneLegacyFmcsaProspects();
  return collectAttentionItems(workspace());
}

export function getOpportunityRepository(): OpportunityRepository {
  return demoOpportunityRepository;
}
export function getCarrierRepository(): CarrierRepository {
  return demoCarrierRepository;
}
export function getActivityRepository(): ActivityRepository {
  return demoActivityRepository;
}
export function getCallRepository(): CallRepository {
  return demoCallRepository;
}
export function getCaseRepository(): CaseRepository {
  return demoCaseRepository;
}
export function getRegulationRepository(): RegulationRepository {
  return demoRegulationRepository;
}

export function getSignals(carrierId: string) {
  return workspace().signals.filter((item) => item.carrierId === carrierId);
}
