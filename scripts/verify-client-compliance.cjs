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
    label: 'client request route is registered',
    file: 'src/router.tsx',
    patterns: ["path: '/client/demandes'", 'ClientDemandes'],
  },
  {
    label: 'client layout links to request center',
    file: 'src/components/client/ClientLayout.tsx',
    patterns: ['ClipboardList', "path: '/client/demandes'", "label: 'Demandes'"],
  },
  {
    label: 'client request helper records consent snapshot',
    file: 'src/lib/client-requests.ts',
    patterns: [
      'buildConsentSnapshot',
      'loadClientConsentState',
      'create_client_portal_request',
      'get_client_portal_requests',
      'partner_cross_sell',
    ],
  },
  {
    label: 'client request center exposes contract operations',
    file: 'src/pages/client/ClientDemandes.tsx',
    patterns: [
      "type: 'endorsement_request'",
      "type: 'fleet_change'",
      "type: 'renewal_request'",
      "type: 'partner_offer_question'",
      'createClientPortalRequest',
      'consentements au moment de l envoi',
    ],
  },
  {
    label: 'client profile uses the unified request workflow',
    file: 'src/pages/client/ClientProfil.tsx',
    patterns: [
      'createClientPortalRequest',
      "requestType: 'address_change'",
      "requestType: 'payment_change'",
      "requestType: 'vehicle_change'",
    ],
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
    label: 'client access outbox worker processes queued portal invites',
    file: 'supabase/functions/process-client-access-outbox/index.ts',
    patterns: [
      'client_portal_access_outbox',
      'send-client-access',
      'status: "processing"',
      'max_attempts',
      'scheduled_at',
      'dry_run',
      'last_error',
    ],
  },
  {
    label: 'client access outbox worker is published with Supabase functions',
    file: 'scripts/publish.js',
    patterns: ['send-client-access', 'process-client-access-outbox'],
  },
  {
    label: 'database migration creates client request center and portal access outbox',
    file: 'supabase/migrations/20260802163000_client_portal_request_center.sql',
    patterns: [
      'CREATE TABLE IF NOT EXISTS public.lead_client_requests',
      'CREATE OR REPLACE FUNCTION public.create_client_portal_request',
      'CREATE OR REPLACE FUNCTION public.get_client_portal_requests',
      'CREATE TABLE IF NOT EXISTS public.client_portal_access_outbox',
      'scheduled_at timestamptz NOT NULL DEFAULT now()',
      'max_attempts integer NOT NULL DEFAULT 3',
      'CREATE OR REPLACE FUNCTION public.enqueue_client_app_access',
      'trg_enqueue_client_app_access_from_contract',
      'trg_enqueue_client_app_access_from_lead',
      'process-client-access-outbox',
      'cron.schedule',
      'does not allow hidden contact import',
    ],
  },
  {
    label: 'public hero lead form is protected by Turnstile',
    file: 'src/components/Hero.tsx',
    patterns: ['useTurnstileGuard', "action: 'hero_lead_form'", 'turnstile.verify', '!turnstile.canSubmit'],
  },
  {
    label: 'public devis form is protected by Turnstile',
    file: 'src/components/FormLead.tsx',
    patterns: ['useTurnstileGuard', "action: 'devis_form'", 'turnstile.verify', '!turnstile.canSubmit'],
  },
  {
    label: 'public contact page mounts the protected lead form',
    file: 'src/pages/Contact.tsx',
    patterns: ['LeadForm', 'canonical="/contact"'],
  },
  {
    label: 'shared public lead form is protected by Turnstile',
    file: 'src/components/LeadForm.tsx',
    patterns: ['TurnstileWidget', 'verifyTurnstileToken', 'action="lead_form"', 'isTurnstileEnabled() && !turnstileToken'],
  },
  {
    label: 'AI quote process is protected by Turnstile',
    file: 'src/components/AIQuoteProcess.tsx',
    patterns: ['useTurnstileGuard', "action: 'ai_quote_process'", 'turnstile.verify', '!turnstile.canSubmit'],
  },
  {
    label: 'enhanced lead form is protected by Turnstile',
    file: 'src/components/EnhancedFormLead.tsx',
    patterns: ['useTurnstileGuard', "action: 'enhanced_devis_form'", 'turnstile.verify', '!turnstile.canSubmit'],
  },
  {
    label: 'public quote page mounts the protected lead form',
    file: 'src/pages/DevisAssuranceTaxi.tsx',
    patterns: ['LeadForm', 'canonical="/devis-assurance-taxi"'],
  },
  {
    label: 'newsletter footer requires opt-in and Turnstile',
    file: 'src/components/NewsletterFooterWidget.tsx',
    patterns: ['marketingConsent', "action: 'newsletter_footer'", 'turnstile.verify', 'Desinscription possible'],
  },
  {
    label: 'newsletter subscription page requires opt-in and Turnstile',
    file: 'src/components/NewsletterSubscribeForm.tsx',
    patterns: ['marketingConsent', "action: 'newsletter_subscribe'", 'turnstile.verify', 'desinscrire a tout moment'],
  },
  {
    label: 'lead creation helper rejects incomplete public leads',
    file: 'src/lib/leads.ts',
    patterns: ['normalizedInput', 'Merci de renseigner votre nom', 'Adresse email invalide'],
  },
  {
    label: 'direct lead edge function rejects incomplete public leads',
    file: 'supabase/functions/create-lead-direct/index.ts',
    patterns: ['cleanText', 'Lead incomplet refuse', 'Adresse email invalide', 'normalizedEmail'],
  },
  {
    label: 'database migration skips empty lead notifications',
    file: 'supabase/migrations/20260728184500_skip_empty_lead_notifications.sql',
    patterns: [
      'CREATE OR REPLACE FUNCTION public.is_real_contact_text',
      "'undefined'",
      'CREATE OR REPLACE FUNCTION public.send_lead_email_via_brevo',
      'trg_queue_new_lead_emails',
      'CREATE OR REPLACE FUNCTION public.enqueue_sms_for_lead_notification',
      'Skipped invalid empty lead notification',
      'Skipped invalid empty lead email',
      'Skipped invalid empty lead SMS',
    ],
  },
  {
    label: 'Turnstile frontend helper calls server verification',
    file: 'src/lib/turnstile.ts',
    patterns: ['verify-turnstile', 'getTurnstileSiteKey', 'readPublicEnv', 'ENV_CONFIG'],
  },
  {
    label: 'public runtime config enables Turnstile in production',
    file: 'public/env-config.js',
    patterns: ['VITE_CAPTCHA_PROVIDER', 'turnstile', 'VITE_TURNSTILE_SITE_KEY'],
  },
  {
    label: 'Turnstile Supabase function verifies with Cloudflare',
    file: 'supabase/functions/verify-turnstile/index.ts',
    patterns: [
      'challenges.cloudflare.com/turnstile/v0/siteverify',
      'TURNSTILE_SECRET_KEY',
      'TURNSTILE_ALLOWED_HOSTNAMES',
      'token.length > 2048',
      'hostnameMatches',
    ],
  },
  {
    label: 'public privacy consent manager gates third-party tags',
    file: 'src/lib/privacy-consent.ts',
    patterns: [
      'PRIVACY_CONSENT_STORAGE_KEY',
      'hasAnalyticsConsent',
      'hasMarketingConsent',
      'hasBehavioralPersonalizationConsent',
      'loadConsentedThirdPartyTags',
      'googletagmanager.com/gtag/js',
      'googletagmanager.com/gtm.js',
    ],
  },
  {
    label: 'page tracking requires analytics consent and sanitizes URLs',
    file: 'src/hooks/usePageTracking.ts',
    patterns: [
      'hasAnalyticsConsent',
      'hasBehavioralPersonalizationConsent',
      'sanitizeUrl',
      'analytics_consent_no_behavioral_profile',
    ],
  },
  {
    label: 'referral click analytics has no external IP lookup',
    file: 'src/lib/referral-system.ts',
    patterns: [
      'hasAnalyticsConsent',
      'ip: null',
      "rewardAmount: number = 25",
      "rewardType: 'credit' | 'discount' | 'cash' | 'gift' = 'gift'",
    ],
  },
  {
    label: 'public privacy banner is mounted globally',
    file: 'src/App.tsx',
    patterns: ['PrivacyConsentBanner', '<PrivacyConsentBanner />'],
  },
  {
    label: 'privacy policy lets visitors change cookie choices',
    file: 'src/pages/Policy.tsx',
    patterns: ['openPrivacyChoices', 'taxiassur:open-privacy-consent', 'Modifier mes choix cookies'],
  },
  {
    label: 'adaptive traffic source storage requires consent',
    file: 'src/lib/adaptive-content.ts',
    patterns: ['hasAnalyticsConsent', 'hasBehavioralPersonalizationConsent', 'saveTrafficSource', 'getSavedTrafficSource'],
  },
  {
    label: 'analytics hook respects analytics and marketing consent',
    file: 'src/hooks/useAnalytics.ts',
    patterns: ['hasAnalyticsConsent', 'hasMarketingConsent', 'localStorage.setItem', 'fbq'],
  },
  {
    label: 'conversion geolocation prefill requires behavioral consent',
    file: 'src/lib/conversion.ts',
    patterns: ['hasBehavioralPersonalizationConsent', 'navigator.geolocation.getCurrentPosition', 'resolve({})'],
  },
  {
    label: 'client request center route is registered',
    file: 'src/router.tsx',
    patterns: ["path: '/client/demandes'", 'ClientDemandes'],
  },
  {
    label: 'client request center menu is registered',
    file: 'src/components/client/ClientLayout.tsx',
    patterns: ["path: '/client/demandes'", 'Demandes', 'ClipboardList'],
  },
  {
    label: 'client request center uses Turnstile and explicit consent',
    file: 'src/pages/client/ClientDemandes.tsx',
    patterns: [
      'useTurnstileGuard',
      "action: 'client_portal_request'",
      'turnstile.verify',
      '!turnstile.canSubmit',
      'recordClientConsent',
      'partner_cross_sell',
      'behavioral_personalization',
      'Aucun import de contacts telephone',
    ],
  },
  {
    label: 'client request database workflow stores consent snapshot and automation event',
    file: 'supabase/migrations/20260802163000_client_portal_request_center.sql',
    patterns: [
      'CREATE OR REPLACE FUNCTION public.create_client_portal_request',
      'CREATE OR REPLACE FUNCTION public.get_client_portal_requests',
      'consent_snapshot',
      'crm_automation_events',
      'It does not allow hidden contact import',
    ],
  },
  {
    label: 'client profile modification requests target lead id',
    file: 'src/pages/client/ClientProfil.tsx',
    patterns: [
      'const requireLeadId',
      'createClientPortalRequest',
      'lead_id: leadId',
      "requestType: 'address_change'",
      "requestType: 'payment_change'",
      "requestType: 'vehicle_change'",
    ],
  },
  {
    label: 'client access outbox worker is exposed',
    file: 'package.json',
    patterns: ['server:process-client-access-outbox', 'process-client-portal-access-outbox.cjs'],
  },
  {
    label: 'client access outbox worker processes queued access emails',
    file: 'scripts/process-client-portal-access-outbox.cjs',
    patterns: [
      'client_portal_access_outbox',
      'send-client-access',
      'claimRow',
      "status: 'processing'",
      "status: 'sent'",
      "exhausted ? 'failed' : 'pending'",
      'CLIENT_ACCESS_OUTBOX_MAX_ATTEMPTS',
      'scheduled_at',
    ],
  },
  {
    label: 'document antivirus worker and installer are exposed',
    file: 'package.json',
    patterns: ['server:install-clamav-document-scan', 'server:scan-documents-clamav'],
  },
  {
    label: 'compliance operations doc is present',
    file: 'docs/compliance/client-app-consent-security.md',
    patterns: [
      'No hidden phone contact import',
      'TaxiAssurDocumentClamAVScan',
      'Current infrastructure dependency',
      'Public analytics and marketing tags',
      'taxiassur_privacy_consent',
      'Client request center',
    ],
  },
];

const forbiddenPatterns = [
  { pattern: /navigator\.contacts/i, label: 'browser contact import API' },
  { pattern: /contacts\.select\s*\(/i, label: 'browser contact picker API' },
  { pattern: /webkitContacts/i, label: 'webkit contact API' },
  { pattern: /scrapeContacts|harvestContacts|importPhoneContacts/i, label: 'hidden contact harvesting' },
  { pattern: /mailboxScrap|scrapeMailbox|harvestEmails/i, label: 'mailbox scraping' },
  { pattern: /(?:chrome|browser)\.history|history\.search|getVisits/i, label: 'browser history access' },
  { pattern: /navigator\.sendBeacon\s*\(/i, label: 'silent beacon tracking without consent' },
  { pattern: /api\.ipify\.org/i, label: 'external browser IP lookup' },
  {
    pattern: /googletagmanager\.com\/(?:gtm\.js|gtag\/js|ns\.html)/i,
    label: 'direct Google tag load before consent',
    allowedFiles: ['src/lib/privacy-consent.ts'],
  },
  {
    pattern: /SmartPrefill\.getLocationData\s*\(/i,
    label: 'automatic browser geolocation prefill',
    allowedFiles: ['src/lib/conversion.ts'],
  },
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
    } else if (/\.(ts|tsx|js|jsx|cjs|mjs|sql|md|json|html)$/.test(entry)) {
      out.push(relativePath.replace(/\\/g, '/'));
    }
  }
  return out;
}

function isAllowedFinding(item, file) {
  return item.allowedFiles?.includes(file) === true;
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
    'index.html',
    ...walk('src'),
    ...walk('supabase/functions'),
    ...walk('scripts'),
  ].filter((file) => file !== 'scripts/verify-client-compliance.cjs');
  const findings = [];

  for (const file of scanFiles) {
    const text = readText(file);
    for (const item of forbiddenPatterns) {
      if (isAllowedFinding(item, file)) continue;
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