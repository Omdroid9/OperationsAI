export type ProviderName = "supabase" | "fmcsa" | "gemini" | "vapi" | "gladia" | "dograh";

export interface ProviderStatus {
  supabase: boolean;
  fmcsa: boolean;
  gemini: boolean;
  vapi: boolean;
  gladia: boolean;
  dograh: boolean;
}

export function getProviderStatus(): ProviderStatus {
  return {
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    fmcsa: Boolean(process.env.FMCSA_WEB_KEY || process.env.FMCSA_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    vapi: Boolean(process.env.VAPI_API_KEY && process.env.VAPI_PHONE_NUMBER_ID),
    gladia: Boolean(process.env.GLADIA_API_KEY),
    dograh: Boolean(
      process.env.DOGRAH_API_KEY &&
        process.env.DOGRAH_WORKFLOW_UUID &&
        process.env.DOGRAH_WORKFLOW_ID &&
        process.env.DOGRAH_WEBHOOK_SECRET,
    ),
  };
}

export function fmcsaWebKey(): string | null {
  return process.env.FMCSA_WEB_KEY || process.env.FMCSA_API_KEY || null;
}
