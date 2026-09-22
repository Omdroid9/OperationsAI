import { LIVE_MODE_SETUP, readDemoModeFromRequest } from "@/lib/mode/demo-mode";
import { isInsufficientDocumentExtraction } from "@/lib/docket/extraction";
import { extractTextFromPdf, parseLabeledDocumentFields } from "@/lib/docket/pdf-text";
import { extractJsonFromParts, type GeminiPart } from "@/lib/providers/gemini";
import { persistDocumentExtraction } from "@/lib/supabase/persist";
import { documentExtractionSchema } from "@/lib/validation/schemas";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const DOCUMENT_SCHEMA_HINT = `{
  "document_type": "cdl | medical_certificate | mvr | driver_application | drug_alcohol | vehicle_information | insurance",
  "person_name": "string or null",
  "issued_date": "YYYY-MM-DD or null",
  "expiration_date": "YYYY-MM-DD or null",
  "confidence": 0.0
}`;

function resolveMimeType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return file.type || "application/octet-stream";
}

function neutralExtraction(documentType: string) {
  return {
    document_type: documentType,
    person_name: null,
    issued_date: null,
    expiration_date: null,
    confidence: 0,
  };
}

function buildPrompt(documentType: string): string {
  return `You are extracting fields from an uploaded trucking compliance document.
Read the source carefully. Do not invent names, dates, or values that are not visible.
If a field is missing or unreadable, use null and lower confidence.

Expected document category: ${documentType}
Return JSON matching this schema exactly:
${DOCUMENT_SCHEMA_HINT}`;
}

async function buildGeminiParts(
  bytes: Buffer,
  mimeType: string,
  documentType: string,
): Promise<{ parts: GeminiPart[]; source: "pdf_text" | "pdf_image" | "image" }> {
  const prompt = buildPrompt(documentType);

  if (mimeType === "application/pdf") {
    const pdfText = extractTextFromPdf(bytes);
    if (pdfText.length >= 40) {
      return {
        parts: [{ text: `${prompt}\n\nDocument text:\n${pdfText.slice(0, 12000)}` }],
        source: "pdf_text",
      };
    }

    // Lazy-load canvas renderer only for scanned PDFs so typed PDF uploads do not
    // crash when the optional native binding fails to resolve in Turbopack.
    let renderPdfPagesToPng: (input: Buffer) => Promise<Buffer[]>;
    try {
      ({ renderPdfPagesToPng } = await import("@/lib/docket/pdf-render"));
    } catch {
      throw new Error(
        "This looks like a scanned PDF. Upload a typed PDF, or a clear PNG/JPG of the page.",
      );
    }

    let pages: Buffer[];
    try {
      pages = await renderPdfPagesToPng(bytes);
    } catch {
      throw new Error(
        "Could not render this scanned PDF. Upload a typed PDF, or a clear PNG/JPG of the page.",
      );
    }
    if (pages.length === 0) {
      throw new Error("Could not render PDF pages.");
    }
    return {
      parts: [
        { text: `${prompt}\n\nThe following image(s) are page renders of the uploaded PDF.` },
        ...pages.map((page) => ({
          inlineData: {
            mimeType: "image/png",
            data: page.toString("base64"),
          },
        })),
      ],
      source: "pdf_image",
    };
  }

  if (mimeType.startsWith("image/")) {
    return {
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType,
            data: bytes.toString("base64"),
          },
        },
      ],
      source: "image",
    };
  }

  throw new Error("Upload a PDF or image (PNG/JPG/WebP).");
}

export async function POST(request: Request) {
  const demoMode = readDemoModeFromRequest(request);
  const form = await request.formData();
  const file = form.get("file");
  const documentType = String(form.get("documentType") ?? "medical_certificate");
  const caseId = String(form.get("caseId") ?? "");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file to extract." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = resolveMimeType(file);
  const fallback = neutralExtraction(documentType);

  // Typed PDFs: parse labels locally when possible (works even if Gemini is overloaded).
  if (mimeType === "application/pdf") {
    const pdfText = extractTextFromPdf(bytes);
    const local = parseLabeledDocumentFields(pdfText, documentType);
    if (local && !isInsufficientDocumentExtraction(local)) {
      if (caseId) {
        await persistDocumentExtraction({
          caseId,
          documentType,
          fileName: file.name,
          extraction: local,
        });
      }
      return NextResponse.json({
        extraction: local,
        fileName: file.name,
        live: true,
        insufficient: false,
        source: "pdf_text_local",
      });
    }
  }

  let parts: GeminiPart[];
  let source: "pdf_text" | "pdf_image" | "image";
  try {
    ({ parts, source } = await buildGeminiParts(bytes, mimeType, documentType));
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not read this file.",
        live: false,
      },
      { status: 422 },
    );
  }

  const { value, live, error } = await extractJsonFromParts(parts, fallback, {
    allowDemoFallback: demoMode,
  });

  const parsed = documentExtractionSchema.safeParse(value);
  const extraction = parsed.success
    ? { ...parsed.data, document_type: parsed.data.document_type || documentType }
    : fallback;
  const isLive = live && parsed.success;
  const insufficient = isLive && isInsufficientDocumentExtraction(extraction);

  if (!demoMode && !isLive) {
    return NextResponse.json(
      {
        error: error ?? `Live document extraction unavailable. ${LIVE_MODE_SETUP}`,
        live: false,
      },
      { status: 503 },
    );
  }

  if (caseId && isLive && !insufficient) {
    await persistDocumentExtraction({
      caseId,
      documentType,
      fileName: file.name,
      extraction: extraction as Record<string, unknown>,
    });
  }

  return NextResponse.json({
    extraction,
    fileName: file.name,
    live: isLive,
    insufficient,
    source,
    ...(process.env.NODE_ENV === "development" && !isLive
      ? {
          hint:
            error ??
            (parsed.success ? undefined : "Gemini response did not match the expected document schema."),
        }
      : {}),
  });
}
