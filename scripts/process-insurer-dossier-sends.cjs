#!/usr/bin/env node

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SERVICE_ROLE_KEY ||
  "";

const args = new Set(process.argv.slice(2));
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = Math.max(1, Math.min(50, Number(limitArg?.split("=")[1] || process.env.INSURER_DOSSIER_SEND_LIMIT || 20)));
const dryRun = args.has("--dry-run") || process.env.DRY_RUN === "1";

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/process-insurer-dossier-sends`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ limit, dry_run: dryRun }),
  });

  const text = await response.text();
  let parsed = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // Keep raw text.
  }

  console.log(JSON.stringify(parsed, null, 2));

  if (!response.ok || (parsed && typeof parsed === "object" && parsed.success === false)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
