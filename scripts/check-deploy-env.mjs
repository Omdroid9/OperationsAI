#!/usr/bin/env node
/** Print which required deploy env keys are present in .env.local (names only). */
import { readFileSync, existsSync } from "node:fs";

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SKYOS_AUTH_REQUIRED",
  "NEXT_PUBLIC_SKYOS_AUTH_REQUIRED",
  "SKYOS_SUPABASE_SOT",
  "INTAKE_HASH_SALT",
  "DOGRAH_API_KEY",
  "DOGRAH_WORKFLOW_UUID",
  "DOGRAH_WORKFLOW_ID",
  "DOGRAH_WEBHOOK_SECRET",
  "DOGRAH_ALLOWED_TEST_NUMBERS",
  "GEMINI_API_KEY",
  "FMCSA_WEB_KEY",
];

const RECOMMENDED = [
  "NEXT_PUBLIC_APP_URL",
  "INTAKE_RATE_LIMIT_PER_HOUR",
  "NEXT_PUBLIC_SKYOS_CONTACT_EMAIL",
  "DOGRAH_API_URL",
];

if (!existsSync(".env.local")) {
  console.error("Missing .env.local");
  process.exit(1);
}

const names = new Set(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => l.slice(0, l.indexOf("=")).trim()),
);

let missing = 0;
for (const k of REQUIRED) {
  const ok = names.has(k);
  console.log(`${ok ? "SET     " : "MISSING "} ${k}`);
  if (!ok) missing += 1;
}
console.log("---");
for (const k of RECOMMENDED) {
  console.log(`${names.has(k) ? "SET     " : "MISSING "} ${k} (recommended)`);
}
process.exit(missing ? 1 : 0);
