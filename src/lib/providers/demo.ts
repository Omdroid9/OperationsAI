import type { CarrierDataProvider, LLMProvider, VoiceProvider } from "@/lib/providers/types";

export const demoCarrierProvider: CarrierDataProvider = {
  async getCarrier() {
    throw new Error("Live FMCSA lookup is not enabled. Demo carrier profiles are shown.");
  },
};

export const demoVoiceProvider: VoiceProvider = {
  async startCall() {
    return `demo_call_${Date.now()}`;
  },
  async getCallStatus() {
    return "completed";
  },
};

export const demoLlmProvider: LLMProvider = {
  async extractStructured(input) {
    return input.fallback;
  },
};
