"use client";

import { analyzeRegulationLive, fetchProviderStatus } from "@/lib/live/client";
import { queryKeys } from "@/lib/query-keys";
import {
  getActivityRepository,
  getAttentionItems,
  getCallRepository,
  getCarrierRepository,
  getCaseRepository,
  getOpportunityRepository,
  getRegulationRepository,
  getSignals,
} from "@/lib/repositories";
import type { RecordKind } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useOpportunities(kind?: RecordKind) {
  return useQuery({
    queryKey: kind ? queryKeys.opportunitiesByKind(kind) : queryKeys.opportunities,
    queryFn: () => getOpportunityRepository().getOpportunities(kind ? { kind } : undefined),
  });
}

export function useLeads() {
  return useOpportunities("lead");
}

export function useProspects() {
  return useOpportunities("prospect");
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: queryKeys.opportunity(id),
    queryFn: () => getOpportunityRepository().getOpportunity(id),
    enabled: Boolean(id),
  });
}

export function useCarrier(id: string) {
  return useQuery({
    queryKey: queryKeys.carrier(id),
    queryFn: () => getCarrierRepository().getCarrier(id),
    enabled: Boolean(id),
  });
}

export function useCarriers() {
  return useQuery({
    queryKey: queryKeys.carriers,
    queryFn: () => getCarrierRepository().getCarriers(),
  });
}

export function useSnapshots(carrierId: string) {
  return useQuery({
    queryKey: queryKeys.snapshots(carrierId),
    queryFn: () => getCarrierRepository().getSnapshots(carrierId),
    enabled: Boolean(carrierId),
  });
}

export function useActivities(leadId: string) {
  return useQuery({
    queryKey: queryKeys.activities(leadId),
    queryFn: () => getActivityRepository().getActivities(leadId),
    enabled: Boolean(leadId),
  });
}

export function useSignals(carrierId: string) {
  return useQuery({
    queryKey: ["signals", carrierId],
    queryFn: async () => getSignals(carrierId),
    enabled: Boolean(carrierId),
  });
}

export function useCalls() {
  return useQuery({
    queryKey: queryKeys.calls,
    queryFn: () => getCallRepository().getCalls(),
  });
}

export function useCall(id: string) {
  return useQuery({
    queryKey: queryKeys.call(id),
    queryFn: () => getCallRepository().getCall(id),
    enabled: Boolean(id),
  });
}

export function useCases() {
  return useQuery({
    queryKey: queryKeys.cases,
    queryFn: () => getCaseRepository().getCases(),
  });
}

export function useCase(id: string) {
  return useQuery({
    queryKey: queryKeys.case(id),
    queryFn: () => getCaseRepository().getCase(id),
    enabled: Boolean(id),
  });
}

export function useDocuments(caseId: string) {
  return useQuery({
    queryKey: queryKeys.documents(caseId),
    queryFn: () => getCaseRepository().getDocuments(caseId),
    enabled: Boolean(caseId),
  });
}

export function useTasks(caseId: string) {
  return useQuery({
    queryKey: queryKeys.tasks(caseId),
    queryFn: () => getCaseRepository().getTasks(caseId),
    enabled: Boolean(caseId),
  });
}

export function useRegulations() {
  return useQuery({
    queryKey: queryKeys.regulations,
    queryFn: () => getRegulationRepository().getRegulations(),
  });
}

export function useRegulation(id: string) {
  return useQuery({
    queryKey: queryKeys.regulation(id),
    queryFn: () => getRegulationRepository().getRegulation(id),
    enabled: Boolean(id),
  });
}

export function useMatches(regulationId: string) {
  return useQuery({
    queryKey: queryKeys.matches(regulationId),
    queryFn: () => getRegulationRepository().getMatches(regulationId),
    enabled: Boolean(regulationId),
  });
}

export function useAllMatches() {
  return useQuery({
    queryKey: queryKeys.allMatches,
    queryFn: () => getRegulationRepository().getAllMatches(),
  });
}

export function useAttentionItems() {
  return useQuery({
    queryKey: queryKeys.attention,
    queryFn: () => getAttentionItems(),
    staleTime: 2_000,
  });
}

export function useProviderStatus() {
  return useQuery({
    queryKey: ["provider-status"],
    queryFn: fetchProviderStatus,
    staleTime: 30_000,
  });
}

export function useInvalidateAll() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ refetchType: "active" });
  };
}

export function useOpportunityMutations() {
  const invalidate = useInvalidateAll();
  const repo = getOpportunityRepository();
  return {
    addNote: useMutation({
      mutationFn: ({ id, content }: { id: string; content: string }) => repo.addNote(id, content),
      onSuccess: invalidate,
    }),
    scheduleFollowUp: useMutation({
      mutationFn: ({ id, at, note }: { id: string; at: string; note?: string }) =>
        repo.scheduleFollowUp(id, at, note),
      onSuccess: invalidate,
    }),
    dismiss: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => repo.dismiss(id, reason),
      onSuccess: invalidate,
    }),
    removeProspect: useMutation({
      mutationFn: (id: string) => repo.removeProspect(id),
      onSuccess: invalidate,
    }),
    qualify: useMutation({
      mutationFn: (id: string) => repo.qualify(id),
      onSuccess: invalidate,
    }),
    applyQualification: useMutation({
      mutationFn: ({
        id,
        qualification,
        meta,
      }: {
        id: string;
        qualification: Parameters<typeof repo.applyQualification>[1];
        meta: Parameters<typeof repo.applyQualification>[2];
      }) => repo.applyQualification(id, qualification, meta),
      onSuccess: invalidate,
    }),
    recordFailedQualificationAttempt: useMutation({
      mutationFn: ({
        id,
        meta,
      }: {
        id: string;
        meta: Parameters<typeof repo.recordFailedQualificationAttempt>[1];
      }) => repo.recordFailedQualificationAttempt(id, meta),
      onSuccess: invalidate,
    }),
    ingestNormalizedCarrier: useMutation({
      mutationFn: ({
        normalized,
        options,
      }: {
        normalized: Parameters<typeof repo.ingestNormalizedCarrier>[0];
        options?: Parameters<typeof repo.ingestNormalizedCarrier>[1];
      }) => repo.ingestNormalizedCarrier(normalized, options),
      onSuccess: invalidate,
    }),
    ingestCensusProspect: useMutation({
      mutationFn: (input: Parameters<typeof repo.ingestCensusProspect>[0]) =>
        repo.ingestCensusProspect(input),
      onSuccess: invalidate,
    }),
    createLead: useMutation({
      mutationFn: ({
        input,
        options,
      }: {
        input: unknown;
        options?: { acknowledgeDuplicates?: boolean };
      }) => repo.createLead(input, options),
      onSuccess: (result) => {
        if (result.status === "created") invalidate();
      },
    }),
    markWon: useMutation({
      mutationFn: (id: string) => repo.markWon(id),
      onSuccess: invalidate,
    }),
    markLost: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => repo.markLost(id, reason),
      onSuccess: invalidate,
    }),
    startService: useMutation({
      mutationFn: ({
        id,
        serviceTypeKey,
      }: {
        id: string;
        serviceTypeKey?: Parameters<typeof repo.startService>[1];
      }) => repo.startService(id, serviceTypeKey),
      onSuccess: invalidate,
    }),
    assignOwner: useMutation({
      mutationFn: ({ id, staffId }: { id: string; staffId: string }) => repo.assignOwner(id, staffId),
      onSuccess: invalidate,
    }),
    scheduleConsultation: useMutation({
      mutationFn: ({ id, at, note }: { id: string; at: string; note?: string }) =>
        repo.scheduleConsultation(id, at, note),
      onSuccess: invalidate,
    }),
    completeConsultation: useMutation({
      mutationFn: ({ id, note }: { id: string; note?: string }) =>
        repo.completeConsultation(id, note),
      onSuccess: invalidate,
    }),
    approveService: useMutation({
      mutationFn: (id: string) => repo.approveService(id),
      onSuccess: invalidate,
    }),
    notMovingForward: useMutation({
      mutationFn: ({ id, note }: { id: string; note?: string }) => repo.notMovingForward(id, note),
      onSuccess: invalidate,
    }),
  };
}

export function useCaseMutations() {
  const invalidate = useInvalidateAll();
  const repo = getCaseRepository();
  return {
    verifyDocument: useMutation({
      mutationFn: (documentId: string) => repo.verifyDocument(documentId),
      onSuccess: invalidate,
    }),
    removeDocument: useMutation({
      mutationFn: (documentId: string) => repo.removeDocument(documentId),
      onSuccess: invalidate,
    }),
    confirmExpirationDate: useMutation({
      mutationFn: (documentId: string) => repo.confirmExpirationDate(documentId),
      onSuccess: invalidate,
    }),
    completeTask: useMutation({
      mutationFn: (taskId: string) => repo.completeTask(taskId),
      onSuccess: invalidate,
    }),
  };
}

export function useRegulationMutations() {
  const invalidate = useInvalidateAll();
  const repo = getRegulationRepository();
  return {
    importFederalRegister: useMutation({
      mutationFn: (
        entries: Parameters<typeof repo.importFederalRegisterRegulations>[0],
      ) => repo.importFederalRegisterRegulations(entries),
      onSuccess: invalidate,
    }),
    clearFederalRegister: useMutation({
      mutationFn: () => repo.clearFederalRegisterRegulations(),
      onSuccess: invalidate,
    }),
    analyze: useMutation({
      mutationFn: async (sourceText: string) => {
        const { analysis } = await analyzeRegulationLive(sourceText);
        return repo.analyze(sourceText, analysis);
      },
      onSuccess: invalidate,
    }),
    markRelevantToCase: useMutation({
      mutationFn: ({
        regulationId,
        caseId,
        reason,
        decidedBy,
      }: {
        regulationId: string;
        caseId: string;
        reason: string;
        decidedBy: string;
      }) => repo.markRelevantToCase(regulationId, caseId, reason, decidedBy),
      onSuccess: invalidate,
    }),
  };
}
