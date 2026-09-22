import { z } from "zod";

export const qualificationResultSchema = z.object({
  language: z.string().nullable(),
  preferred_language: z.string().nullable(),
  detected_languages: z.array(z.string()),
  contact_verified: z.boolean().nullable(),
  fleet_size_confirmed: z.number().nullable(),
  compliance_management: z.enum(["internal", "external", "mixed", "unknown"]),
  current_provider: z.string().nullable(),
  needs: z.array(z.string()),
  interest_level: z.enum(["high", "medium", "low", "none", "unknown"]),
  callback_requested: z.boolean().nullable(),
  callback_time: z.string().nullable(),
  consultation_accepted: z.boolean().nullable(),
  consultation_preference: z.string().nullable(),
  objections: z.array(z.string()),
  summary_english: z.string().nullable(),
  call_outcome: z.string().nullable().optional(),
  suggested_next_step: z.string().nullable().optional(),
  source: z.enum(["dograh_structured", "transcript_extracted", "mixed"]).optional(),
});

export const regulationAnalysisSchema = z.object({
  agency: z.string(),
  title: z.string(),
  category: z.string(),
  published_date: z.string().nullable(),
  effective_date: z.string().nullable(),
  deadline: z.string().nullable(),
  affected_segment: z.string(),
  required_action: z.string(),
  confidence: z.number().min(0).max(1),
  source_summary: z.string(),
});

export const documentExtractionSchema = z.object({
  document_type: z.string(),
  person_name: z.string().nullable(),
  issued_date: z.string().nullable(),
  expiration_date: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export const leadIntakeInputSchema = z
  .object({
    contactName: z.string().trim().min(1, "Enter a contact name."),
    company: z.string().trim().min(1, "Enter a company name."),
    email: z.string().trim().optional().default(""),
    phone: z.string().trim().optional().default(""),
    usdot: z.string().trim().optional().default(""),
    state: z.string().trim().optional().default(""),
    statedNeed: z.string().trim().optional().default(""),
    owner: z.string().trim().optional().default(""),
    sourceType: z.enum(["manual", "referral", "csv_import", "website_form"]),
    creationMethod: z.string().trim().min(1).default("intake"),
    sourceRef: z.string().trim().optional().nullable().default(null),
  })
  .superRefine((value, ctx) => {
    if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
      ctx.addIssue({ code: "custom", message: "Enter a valid email.", path: ["email"] });
    }
    if (value.phone && value.phone.replace(/\D/g, "").length < 10) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a phone number with at least 10 digits.",
        path: ["phone"],
      });
    }
    const usdot = value.usdot.replace(/\D/g, "");
    if (value.usdot && usdot.length < 5) {
      ctx.addIssue({
        code: "custom",
        message: "USDOT should have at least 5 digits when provided.",
        path: ["usdot"],
      });
    }
  })
  .transform((value) => ({
    contactName: value.contactName,
    company: value.company,
    email: value.email || null,
    phone: value.phone || null,
    usdot: value.usdot ? value.usdot.replace(/\D/g, "") : null,
    state: value.state ? value.state.toUpperCase().slice(0, 2) : null,
    statedNeed: value.statedNeed || null,
    owner: value.owner || null,
    sourceType: value.sourceType,
    creationMethod: value.creationMethod || "intake",
    sourceRef: value.sourceRef || null,
  }));
