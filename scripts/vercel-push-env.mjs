#!/usr/bin/env node
/**
 * Push selected .env.local keys to Vercel Production env (non-interactive).
 * Does not print secret values. Requires: npx vercel login && npx vercel link
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SKYOS_AUTH_REQUIRED",
  "NEXT_PUBLIC_SKYOS_AUTH_REQUIRED",
  "SKYOS_SUPABASE_SOT",
  "INTAKE_HASH_SALT",
  "INTAKE_RATE_LIMIT_PER_HOUR",
  "NEXT_PUBLIC_SKYOS_CONTACT_EMAIL",
  "NEXT_PUBLIC_SKYOS_CONTACT_PHONE",
  "DOGRAH_API_URL",
  "DOGRAH_API_KEY",
  "DOGRAH_WORKFLOW_UUID",
  "DOGRAH_WORKFLOW_ID",
  "DOGRAH_WEBHOOK_SECRET",
  "DOGRAH_ALLOWED_TEST_NUMBERS",
  "GEMINI_API_KEY",
  "FMCSA_WEB_KEY",
  "FMCSA_API_KEY",
  "SOCRATA_APP_TOKEN",
];

if (!existsSync(".env.local")) {
  console.error("Missing .env.local");
  process.exit(1);
}

const raw = readFileSync(".env.local", "utf8");
const env = {};
for (const line of raw.split("\n")) {
  if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
  const i = line.indexOf("=");
  const k = line.slice(0, i).trim();
  let v = line.slice(i + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  env[k] = v;
}

let pushed = 0;
let skipped = 0;
for (const key of KEYS) {
  const value = env[key]?.trim();
  if (!value) {
    console.log(`skip ${key} (not set)`);
    skipped += 1;
    continue;
  }
  const add = spawnSync(
    "npx",
    [
      "vercel",
      "env",
      "add",
      key,
      "production",
      "--value",
      value,
      "--yes",
      "--force",
      "--sensitive",
      "--non-interactive",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (add.status === 0) {
    console.log(`ok   ${key}`);
    pushed += 1;
  } else {
    const err = `${add.stderr || ""}\n${add.stdout || ""}`.trim().slice(0, 300);
    console.error(`fail ${key}: ${err}`);
    process.exitCode = 1;
  }
}

console.log(`Done. pushed=${pushed} skipped=${skipped}`);
console.log("Redeploy with: npm run deploy:prod");
