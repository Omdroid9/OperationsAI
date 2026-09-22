/** True when Dograh voice stack is verified for multilingual live conversation. */
export function isMultilingualVoiceConfigured(): boolean {
  return process.env.DOGRAH_MULTILINGUAL_VOICE === "true";
}

export const ENGLISH_FIRST_LANGUAGE_FOLLOWUP =
  "I can arrange a follow-up in your preferred language. What language would work best?";

export function voiceLanguageMode(): "english_only" | "multilingual" {
  return isMultilingualVoiceConfigured() ? "multilingual" : "english_only";
}
