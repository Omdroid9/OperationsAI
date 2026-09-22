import type { Opportunity, OpportunityStage } from "@/types";

export const WORKFLOW_STEPS = [
  {
    id: "detect",
    n: "01",
    label: "Detect",
    job: "Find carriers whose operating profile may be relevant.",
    href: "/opportunities",
  },
  {
    id: "review",
    n: "02",
    label: "Review",
    job: "Read why they surfaced and decide if outreach is worth it.",
    href: "/opportunities",
  },
  {
    id: "qualify",
    n: "03",
    label: "Qualify",
    job: "Confirm whether a real need exists.",
    href: "/calls",
  },
  {
    id: "convert",
    n: "04",
    label: "Convert",
    job: "Move a qualified lead through consultation to Won.",
    href: "/crm",
  },
  {
    id: "fulfill",
    n: "05",
    label: "Fulfill",
    job: "Turn the sale into a service case and missing-item work.",
    href: "/docket",
  },
] as const;

export type WorkflowStepId = (typeof WORKFLOW_STEPS)[number]["id"];

export function workflowStepForStage(stage: OpportunityStage, hasCase: boolean): WorkflowStepId {
  if (hasCase || stage === "WON") return "fulfill";
  if (stage === "QUALIFIED" || stage === "CONSULTATION") return "convert";
  if (stage === "CONTACTED") return "qualify";
  if (stage === "REVIEWED") return "review";
  if (stage === "DETECTED") return "detect";
  return "review";
}

export function nextStepCopy(opportunity: Opportunity): { title: string; body: string; action: string } {
  if (opportunity.stage === "WON" && opportunity.caseId) {
    return {
      title: "Review the service case",
      body: "The sale is recorded. Docket now tracks missing documents and items that need confirmation.",
      action: "Open case",
    };
  }
  if (opportunity.consultationStatus === "service_approved" || opportunity.stage === "WON") {
    return {
      title: "Start service",
      body: "Open a Docket case so fulfillment can collect documents and tasks. USDOT enrichment can wait.",
      action: "Start service",
    };
  }
  if (opportunity.consultationStatus === "complete") {
    return {
      title: "Approve service",
      body: "Consultation is complete. Approve only if this should become a customer.",
      action: "Approve service",
    };
  }
  if (opportunity.consultationStatus === "scheduled") {
    return {
      title: "Complete consultation",
      body: "Mark the consultation complete after the meeting.",
      action: "Complete consultation",
    };
  }
  if (opportunity.consultationStatus === "needs_follow_up") {
    return {
      title: "Schedule consultation",
      body: "They asked for a consult. Put a time on the record.",
      action: "Schedule consultation",
    };
  }
  if (opportunity.stage === "QUALIFIED" || opportunity.stage === "CONSULTATION") {
    return {
      title: "Convert this lead",
      body: "Qualification found a possible need. Continue only after a human agrees this should become a customer.",
      action: "Review record",
    };
  }
  if (["DETECTED", "REVIEWED", "CONTACTED"].includes(opportunity.stage)) {
    return {
      title: "Qualify before outreach gets ahead of the facts",
      body: "The score is relevance, not intent. A short qualification confirms fleet size, how compliance is handled, and whether they want a follow-up.",
      action: "Qualify",
    };
  }
  return {
    title: "No further action",
    body: "This opportunity is closed.",
    action: "View activity",
  };
}

export const PAGE_JOB: Record<string, string> = {
  "/app": "What needs attention today",
  "/opportunities": "Review saved prospects",
  "/crm": "Work inbound leads",
  "/calls": "What the conversation established",
  "/reglens": "What a regulation changes for this business",
  "/docket": "What is missing to fulfill the sale",
};
