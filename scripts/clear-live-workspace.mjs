#!/usr/bin/env node
/**
 * Clear Live Mode entity tables + live snapshot using .env.local service role.
 * Does not print secrets. Does not touch demo snapshot.
 *
 * Usage: node scripts/clear-live-workspace.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

function loadEnv() {
  if (!existsSync(".env.local")) throw new Error("Missing .env.local");
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
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
  return env;
}

const env = loadEnv();
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const wipes = [
  ["regulation_matches", "regulation_id"],
  ["documents", "id"],
  ["tasks", "id"],
  ["activities", "id"],
  ["calls", "id"],
  ["live_calls", "provider_call_id"],
  ["cases", "id"],
  ["leads", "id"],
  ["signals", "id"],
  ["carrier_snapshots", "id"],
  ["carriers", "id"],
  ["regulations", "id"],
];

for (const [table, column] of wipes) {
  const { error } = await supabase.from(table).delete().neq(column, "");
  if (error) {
    console.error(`fail ${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`cleared ${table}`);
}

const empty = {
  carriers: [],
  snapshots: [],
  signals: [],
  opportunities: [],
  activities: [],
  calls: [],
  regulations: [],
  matches: {},
  cases: [],
  documents: [],
  tasks: [],
};

const { error: snapError } = await supabase.from("workspace_snapshots").upsert({
  id: "live",
  state_json: empty,
  updated_at: new Date().toISOString(),
});
if (snapError) {
  console.error(`fail live snapshot: ${snapError.message}`);
  process.exit(1);
}
console.log("cleared live snapshot");
console.log("done");
