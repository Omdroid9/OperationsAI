import { isDemoMode, LIVE_MODE_SETUP } from "@/lib/mode/demo-mode";
import { demoCarrierProvider, demoLlmProvider, demoVoiceProvider } from "@/lib/providers/demo";
import { dograhVoiceProvider, DOGRAH_SETUP } from "@/lib/providers/dograh";
import { fmcsaCarrierProvider } from "@/lib/providers/fmcsa";
import { geminiLlmProvider } from "@/lib/providers/gemini";
import { getProviderStatus } from "@/lib/providers/status";
import type { CarrierDataProvider, LLMProvider, VoiceProvider } from "@/lib/providers/types";

const liveRequiredCarrierProvider: CarrierDataProvider = {
  async getCarrier() {
    throw new Error(`Live FMCSA lookup is not configured. ${LIVE_MODE_SETUP}`);
  },
};

const liveRequiredVoiceProvider: VoiceProvider = {
  async startCall() {
    throw new Error(`Dograh voice is not configured. ${DOGRAH_SETUP}`);
  },
  async getCallStatus() {
    throw new Error(`Dograh voice is not configured. ${DOGRAH_SETUP}`);
  },
};

const liveRequiredLlmProvider: LLMProvider = {
  async extractStructured() {
    throw new Error(`Live analysis is not configured. ${LIVE_MODE_SETUP}`);
  },
};

export function getCarrierDataProvider(demoMode = isDemoMode()): CarrierDataProvider {
  if (getProviderStatus().fmcsa) return fmcsaCarrierProvider;
  return demoMode ? demoCarrierProvider : liveRequiredCarrierProvider;
}

export function getLlmProvider(demoMode = isDemoMode()): LLMProvider {
  if (getProviderStatus().gemini) return geminiLlmProvider;
  return demoMode ? demoLlmProvider : liveRequiredLlmProvider;
}

/** Live Mode uses Dograh only. Demo Mode may fall back to the labeled simulated provider. */
export function getVoiceProvider(demoMode = isDemoMode()): VoiceProvider {
  if (getProviderStatus().dograh) return dograhVoiceProvider;
  return demoMode ? demoVoiceProvider : liveRequiredVoiceProvider;
}
