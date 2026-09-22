import type { Carrier, Opportunity } from "@/types";
import { isFmcsaConnected, isUnenrichedLead } from "@/lib/profile";
import {
  ENGLISH_FIRST_LANGUAGE_FOLLOWUP,
  voiceLanguageMode,
} from "@/lib/qualify/voice-language";

function pushFact(facts: string[], label: string, value: string | null | undefined) {
  const trimmed = value?.trim();
  if (trimmed) facts.push(`${label}: ${trimmed}`);
}

function setIf(context: Record<string, string>, key: string, value: string | null | undefined) {
  const trimmed = value?.trim();
  if (trimmed) context[key] = trimmed;
}

/**
 * Builds verified-only initial_context for Dograh qualification calls.
 * Never includes inferred, stale, or missing data as facts.
 * Omit empty strings — Dograh treats a blank contact_name as present, so the
 * agent cannot fall back to "sorry, is this {{contact_name}}?" on live calls.
 */
export function buildQualificationInitialContext(
  opportunity: Opportunity,
  carrier: Carrier | null | undefined,
  phone: string,
): Record<string, string> {
  const verifiedFacts: string[] = [];
  const context: Record<string, string> = {
    phone_number: phone.trim(),
    skyos_record_id: opportunity.id,
    call_language_mode: voiceLanguageMode(),
    language_followup_script: ENGLISH_FIRST_LANGUAGE_FOLLOWUP,
    call_opening_language: "English",
  };

  setIf(context, "contact_name", opportunity.contactName);
  setIf(context, "company_name", carrier?.legalName);

  if (carrier?.city?.trim()) context.city = carrier.city.trim();
  if (carrier?.state?.trim()) context.state = carrier.state.trim();

  pushFact(verifiedFacts, "Contact", opportunity.contactName);
  pushFact(verifiedFacts, "Company", carrier?.legalName);

  const unenriched = isUnenrichedLead(opportunity, carrier);
  if (unenriched) {
    context.fmcsa_connected = "no";
    pushFact(verifiedFacts, "Stated need", opportunity.statedNeed);
  } else if (carrier && isFmcsaConnected(carrier)) {
    context.fmcsa_connected = "yes";
    context.usdot = carrier.usdot;
    context.power_units = String(carrier.powerUnits);
    context.drivers = String(carrier.drivers);
    context.new_entrant = carrier.newEntrant ? "yes" : "no";
    context.operation_type = carrier.operationType;
    context.authority_status = carrier.authorityStatus;
    pushFact(verifiedFacts, "USDOT", carrier.usdot);
    pushFact(verifiedFacts, "Location", `${carrier.city}, ${carrier.state}`);
    pushFact(verifiedFacts, "Fleet size", `${carrier.powerUnits} power units`);
    if (carrier.newEntrant) {
      pushFact(verifiedFacts, "Registration signal", "Recently registered carrier");
    }
    pushFact(verifiedFacts, "Operation", carrier.operationType);
    if (carrier.authorizedForHire) {
      pushFact(verifiedFacts, "Authority", "Authorized for hire");
    }
  } else if (carrier?.profileKind === "census") {
    context.fmcsa_connected = "census_only";
    if (carrier.powerUnits > 0) {
      context.power_units = String(carrier.powerUnits);
      pushFact(verifiedFacts, "Fleet size", `${carrier.powerUnits} power units (Census)`);
    }
    pushFact(verifiedFacts, "Location", `${carrier.city}, ${carrier.state}`);
  }

  if (!unenriched) {
    pushFact(verifiedFacts, "Review reason", opportunity.reasonSummary);
    pushFact(verifiedFacts, "Recommended service", opportunity.recommendedService);
    pushFact(verifiedFacts, "Signal", opportunity.signalTitle);
    if (opportunity.recommendedService?.trim()) {
      context.recommended_service = opportunity.recommendedService.trim();
    }
    if (opportunity.reasonSummary?.trim()) {
      context.why_this_opportunity = opportunity.reasonSummary.trim();
    }
    if (opportunity.signalTitle?.trim()) {
      context.signal_title = opportunity.signalTitle.trim();
    }
  }

  if (opportunity.statedNeed?.trim()) {
    context.stated_need = opportunity.statedNeed.trim();
    if (unenriched) pushFact(verifiedFacts, "Stated need", opportunity.statedNeed);
  }

  context.call_agenda_mode = verifiedFacts.length > 2 ? "verified_signal" : "neutral_intro";
  context.verified_facts = verifiedFacts.join("\n");
  context.call_structure = [
    "1. Confirm you reached the right person.",
    "2. If verified facts exist, mention one relevant signal in plain language.",
    "3. Connect that signal to one or two relevant Sky services, especially compliance software.",
    "4. Ask one focused question about their current need.",
    "5. Offer a free consultation if there is interest.",
    "6. Capture consultation preference and callback timing before ending.",
    "Start in English. Do not open by asking a broad language-preference question.",
    voiceLanguageMode() === "english_only"
      ? `If another language is needed, say: "${ENGLISH_FIRST_LANGUAGE_FOLLOWUP}"`
      : "If the caller prefers another language and voice support is configured, continue in that language.",
    "Never state uncertain data as fact. Do not promise approvals, pricing, legal advice, or enrollment.",
  ].join("\n");

  return context;
}
