export interface NormalizedFmcsaCarrier {
  usdot: string;
  legalName: string;
  dbaName: string | null;
  state: string;
  city: string;
  phone: string | null;
  email: string | null;
  powerUnits: number;
  drivers: number;
  operationType: "interstate" | "intrastate";
  authorizedForHire: boolean;
  newEntrant: boolean;
  hazmat: boolean;
  passenger: boolean;
  cargoTypes: string[];
  authorityStatus: "active" | "inactive" | "pending";
}

export interface CarrierDataProvider {
  getCarrier(usdot: string): Promise<NormalizedFmcsaCarrier>;
}

export interface VoiceCallInput {
  leadId: string;
  phone: string;
  languageHint?: string;
  context: Record<string, string>;
}

export interface VoiceProvider {
  startCall(input: VoiceCallInput): Promise<string>;
  getCallStatus(callId: string): Promise<"queued" | "in_progress" | "completed" | "failed">;
}

export interface StructuredExtractionInput<T> {
  prompt: string;
  schemaDescription: string;
  fallback: T;
}

export interface LLMProvider {
  extractStructured<T>(input: StructuredExtractionInput<T>): Promise<T>;
}
