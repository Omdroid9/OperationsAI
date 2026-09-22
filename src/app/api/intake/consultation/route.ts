import { isIntakeConfigured, persistPublicIntake } from "@/lib/intake/persist";
import { checkIntakeRateLimit, recordIntakeRequest } from "@/lib/intake/rate-limit";
import { validateLeadIntake } from "@/lib/leads/intake";
import { NextResponse } from "next/server";

type ConsultationIntakeBody = {
  contactName?: string;
  company?: string;
  email?: string;
  phone?: string;
  usdot?: string;
  state?: string;
  statedNeed?: string;
  consent?: boolean;
  acknowledgeDuplicates?: boolean;
  companyWebsite?: string;
  captchaToken?: string;
};

async function verifyCaptcha(token: string | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token?.trim()) return false;

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });

  if (!response.ok) return false;
  const payload = (await response.json()) as { success?: boolean };
  return Boolean(payload.success);
}

export async function POST(request: Request) {
  if (!isIntakeConfigured()) {
    return NextResponse.json(
      { ok: false, status: "unavailable", errors: ["Consultation intake is not configured."] },
      { status: 503 },
    );
  }

  let body: ConsultationIntakeBody;
  try {
    body = (await request.json()) as ConsultationIntakeBody;
  } catch {
    return NextResponse.json(
      { ok: false, status: "invalid", errors: ["Request body must be JSON."] },
      { status: 400 },
    );
  }

  if (body.companyWebsite?.trim()) {
    await recordIntakeRequest({
      request,
      email: body.email ?? null,
      status: "honeypot",
    });
    return NextResponse.json({ ok: true, leadId: "accepted" });
  }

  if (body.consent !== true) {
    return NextResponse.json(
      { ok: false, status: "invalid", errors: ["Confirm that we may contact you about this request."] },
      { status: 400 },
    );
  }

  const captchaOk = await verifyCaptcha(body.captchaToken);
  if (!captchaOk) {
    return NextResponse.json(
      { ok: false, status: "invalid", errors: ["CAPTCHA verification failed. Try again."] },
      { status: 400 },
    );
  }

  const validated = validateLeadIntake({
    contactName: body.contactName,
    company: body.company,
    email: body.email,
    phone: body.phone,
    usdot: body.usdot,
    state: body.state,
    statedNeed: body.statedNeed,
    owner: "",
    sourceType: "website_form",
    creationMethod: "public_website_form",
  });

  if (validated.status !== "ok") {
    if (validated.status === "invalid") {
      return NextResponse.json({ ok: false, status: "invalid", errors: validated.errors }, { status: 400 });
    }
    return NextResponse.json({ ok: false, status: "invalid", errors: ["Invalid intake payload."] }, { status: 400 });
  }

  const email = validated.data.email;
  const allowed = await checkIntakeRateLimit(request, email);
  if (!allowed) {
    await recordIntakeRequest({
      request,
      email,
      status: "rate_limited",
    });
    return NextResponse.json(
      { ok: false, status: "rate_limited", errors: ["Too many requests. Try again later."] },
      { status: 429 },
    );
  }

  const result = await persistPublicIntake(validated.data, {
    acknowledgeDuplicates: body.acknowledgeDuplicates === true,
  });

  if (result.status === "invalid") {
    await recordIntakeRequest({ request, email, status: "rejected" });
    return NextResponse.json({ ok: false, status: "invalid", errors: result.errors }, { status: 400 });
  }

  if (result.status === "duplicate_warning") {
    return NextResponse.json({
      ok: false,
      status: "duplicate_warning",
      matches: result.matches,
    });
  }

  await recordIntakeRequest({
    request,
    email,
    leadId: result.leadId ?? result.opportunityId,
    status: "accepted",
  });

  return NextResponse.json({
    ok: true,
    leadId: result.leadId ?? result.opportunityId,
  });
}
