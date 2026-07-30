#!/usr/bin/env node

const { readdirSync, readFileSync, statSync } = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();

const requiredChecks = [
  {
    label: 'client app access is created after contract signature',
    file: 'src/components/crm/ContratSignatureStep.tsx',
    patterns: ['ensure_client_app_access', 'send-client-access'],
  },
  {
    label: 'client access email fallback exists after document validation',
    file: 'src/components/crm/DocumentValidationComplete.tsx',
    patterns: ['send-client-access'],
  },
  {
    label: 'client referral route is registered',
    file: 'src/router.tsx',
    patterns: ["path: '/client/parrainage'", 'ClientParrainage'],
  },
  {
    label: 'client privacy route is registered',
    file: 'src/router.tsx',
    patterns: ["path: '/client/confidentialite'", 'ClientConfidentialite'],
  },
  {
    label: 'client consent helper records and revokes consent',
    file: 'src/lib/client-consent.ts',
    patterns: [
      'record_client_consent_event',
      'revoke_client_marketing_consents',
      'BEHAVIORAL_CONSENT_STORAGE_KEY',
      'setLocalBehavioralPersonalizationConsent(false)',
    ],
  },
  {
    label: 'client privacy page exposes separate opt-ins and revocation',
    file: 'src/pages/client/ClientConfidentialite.tsx',
    patterns: [
      "key: 'marketing_email'",
      "key: 'marketing_sms'",
      "key: 'marketing_phone'",
      "key: 'partner_cross_sell'",
      "key: 'behavioral_personalization'",
      'Tout revoquer',
    ],
  },
  {
    label: 'client referral page requires permission and caps reward',
    file: 'src/pages/client/ClientParrainage.tsx',
    patterns: [
      'confirmed_by_referrer',
      'reward_amount: 25',
      "reward_type: 'gift'",
      'Vous devez confirmer',
    ],
  },
  {
    label: 'database migration creates consent ledger and app access function',
    file: 'supabase/migrations/20260729031500_client_app_consent_referral_security.sql',
    patterns: [
      'CREATE TABLE IF NOT EXISTS public.client_consent_events',
      'CREATE TABLE IF NOT EXISTS public.referral_codes',
      'CREATE TABLE IF NOT EXISTS public.referrals',
      'CREATE TABLE IF NOT EXISTS public.document_security_scans',
      'CREATE OR REPLACE FUNCTION public.ensure_client_app_access',
      'CREATE OR REPLACE FUNCTION public.record_client_consent_event',
      'CREATE OR REPLACE FUNCTION public.revoke_client_marketing_consents',
      'not authorize covert scraping',
    ],
  },
  {
    label: 'Turnstile frontend helper calls server verification',
    file: 'src/lib/turnstile.ts',
    patterns: ['verify-turnstile', 'getTurnstileSiteKey'],
  },
  {
    label: 'Turnstile Supabase function verifies with Cloudflare',
    file: 'supabase/functions/verify-turnstile/index.ts',
    patterns: ['challenges.cloudflare.com/turnstile/v0/siteverify', 'TURNSTILE_SECRET_KEY'],
  },
  {
    label: 'document antivirus worker and installer are exposed',
    file: 'package.json',
    patterns: ['server:install-clamav-document-scan', 'server:scan-documents-clamav'],
  },
  {
    label: 'compliance operations doc is present',
    file: 'docs/compliance/client-app-consent-security.md',
    patterns: ['No hidden phone contact import', 'TaxiAssurDocumentClamAVScan', 'Current infrastructure dependency'],
  },
];

const forbiddenPatterns = [
  { pattern: /navigator\.contacts/i, label: 'browser contact import API' },
  { pattern: /contacts\.select\s*\(/i, label: 'browser contact picker API' },
  { pattern: /webkitContacts/i, label: 'webkit contact API' },
  { pattern: /scrapeContacts|harvestContacts|importPhoneContacts/i, label: 'hidden contact harvesting' },
  { pattern: /mailboxScrap|scrapeMailbox|harvestEmails/i, label: 'mailbox scraping' },
];

function readText(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function walk(relativeDir, out = []) {
  const absoluteDir = path.join(ROOT, relativeDir);
  for (const entry of readdirSync(absoluteDir)) {
    const relativePath = path.join(relativeDir, entry);
    const absolutePath = path.join(ROOT, relativePath);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      walk(relativePath, out);
    } else if (/\.(ts|tsx|js|jsx|cjs|mjs|sql|md|json)$/.test(entry)) {
      out.push(relativePath.replace(/\\/g, '/'));
    }
  }
  return out;
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
  const scanFiles = [
    ...walk('src'),
    ...walk('supabase/functions'),
    ...walk('scripts'),
  ].filter((file) => file !== 'scripts/verify-client-compliance.cjs');
  const findings = [];

  for (const file of scanFiles) {
    const text = readText(file);
    for (const item of forbiddenPatterns) {
      if (item.pattern.test(text)) {
        findings.push({ file, label: item.label, pattern: String(item.pattern) });
      }
    }
  }

  return findings;
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
