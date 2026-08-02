#!/usr/bin/env node

const { readFileSync } = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();

const requiredChecks = [
  {
    label: "insurer dossier migration creates auditable outbox",
    file: "supabase/migrations/20260803010000_insurer_dossier_workflow.sql",
    patterns: [
      "CREATE TABLE IF NOT EXISTS public.insurer_dossier_sends",
      "CREATE OR REPLACE FUNCTION public.create_insurer_dossier_send",
      "CREATE OR REPLACE FUNCTION public.mark_insurer_dossier_responded",
      "process-insurer-dossier-sends",
      "cron.schedule",
      "does not allow hidden contact import",
      "J+2 then J+5",
    ],
  },
  {
    label: "insurer dossier worker is service-role only and sends followups",
    file: "supabase/functions/process-insurer-dossier-sends/index.ts",
    patterns: [
      "insurer_dossier_sends",
      "send-email-ionos",
      "isAuthorizedWorkerRequest",
      "Unauthorized",
      "followup_step",
      "next_followup_at",
      "dry_run",
      "crm_interactions",
    ],
  },
  {
    label: "backoffice modal queues dossier instead of sending directly",
    file: "src/components/crm/SendToInsurerModal.tsx",
    patterns: [
      "create_insurer_dossier_send",
      "p_documents",
      "p_recipient_email",
      "File auditee",
      "Relances J+2/J+5",
    ],
  },
  {
    label: "insurer dossier worker is exposed for self-hosted processing",
    file: "package.json",
    patterns: [
      "server:process-insurer-dossier-sends",
      "process-insurer-dossier-sends.cjs",
      "verify:commercial-workflow",
    ],
  },
  {
    label: "publisher deploys insurer dossier worker",
    file: "scripts/publish.js",
    patterns: ["process-insurer-dossier-sends"],
  },
  {
    label: "CI runs commercial workflow guard",
    file: ".github/workflows/deploy-cloudflare-pages.yml",
    patterns: ["Commercial workflow guard", "npm run verify:commercial-workflow"],
  },
  {
    label: "operations documentation records consent-safe dossier workflow",
    file: "docs/compliance/insurer-dossier-workflow.md",
    patterns: [
      "No hidden contact import",
      "J+2",
      "J+5",
      "mark_insurer_dossier_responded",
      "process-insurer-dossier-sends",
    ],
  },
];

const forbiddenChecks = [
  {
    label: "backoffice modal must not invoke raw SMTP function directly",
    file: "src/components/crm/SendToInsurerModal.tsx",
    pattern: /functions\.invoke\(['"]send-email-ionos['"]/,
  },
  {
    label: "no browser contact harvesting",
    file: "src/components/crm/SendToInsurerModal.tsx",
    pattern: /navigator\.contacts|contacts\.select|harvestContacts|importPhoneContacts/i,
  },
  {
    label: "no browser history collection",
    file: "src/components/crm/SendToInsurerModal.tsx",
    pattern: /chrome\.history|browser\.history|history\.search|getVisits/i,
  },
];

function readText(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function runRequiredChecks() {
  return requiredChecks.map((check) => {
    const text = readText(check.file);
    const missing = check.patterns.filter((pattern) => !text.includes(pattern));
    return {
      label: check.label,
      file: check.file,
      ok: missing.length === 0,
      missing,
    };
  });
}

function runForbiddenChecks() {
  return forbiddenChecks
    .map((check) => {
      const text = readText(check.file);
      return {
        label: check.label,
        file: check.file,
        ok: !check.pattern.test(text),
        pattern: String(check.pattern),
      };
    })
    .filter((check) => !check.ok);
}

function main() {
  const checks = runRequiredChecks();
  const forbidden = runForbiddenChecks();
  const report = {
    ok: checks.every((check) => check.ok) && forbidden.length === 0,
    checked_at: new Date().toISOString(),
    checks,
    forbidden,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exitCode = 1;
  }
}

main();
