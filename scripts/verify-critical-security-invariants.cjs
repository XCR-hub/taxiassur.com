#!/usr/bin/env node
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const failures = [];
const read = (file) => readFileSync(path.join(root, file), 'utf8');
function requireMatch(file, pattern, message) {
  if (!pattern.test(read(file))) failures.push(`${file}: ${message}`);
}
function forbidMatch(file, pattern, message) {
  if (pattern.test(read(file))) failures.push(`${file}: ${message}`);
}
function requireCount(file, pattern, expected, message) {
  const source = read(file);
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const count = [...source.matchAll(new RegExp(pattern.source, flags))].length;
  if (count !== expected) failures.push(`${file}: ${message} (expected ${expected}, found ${count})`);
}
const createPayment = 'supabase/functions/create-monetico-payment/index.ts';
const webhook = 'supabase/functions/monetico-webhook/index.ts';
const paymentForm = 'supabase/functions/get-monetico-payment-form/index.ts';
const paymentEmail = 'supabase/functions/send-payment-link-monetico/index.ts';
const sms = 'supabase/functions/send-sms-brevo/index.ts';
const whatsapp = 'supabase/functions/send-whatsapp/index.ts';
const publicPaymentMigration = 'supabase/migrations/20260809061000_minimize_public_payment_reference_data.sql';
const hardenedPaymentProcessingMigration = 'supabase/migrations/20260809120000_harden_monetico_payment_processing.sql';
const paymentAccessTokenMigration = 'supabase/migrations/20260809123000_add_secure_payment_access_tokens.sql';
const prospectDocumentSigner = 'supabase/functions/sign-document-url/index.ts';
const prospectDocumentUploader = 'supabase/functions/upload-client-document/index.ts';
const publishScript = 'scripts/publish.js';
requireMatch(prospectDocumentSigner, /tokenPattern[\s\S]*crm_leads[\s\S]*lead_id[\s\S]*createSignedUrl/, 'prospect document signing is not token-bound to document ownership');
requireMatch(prospectDocumentUploader, /createSignedUploadUrl[\s\S]*actualSize !== declaredSize[\s\S]*actualMime !== mimeType/, 'client uploads are not signed or verified after storage');
forbidMatch(publishScript, /SUPABASE_(?:ACCESS_TOKEN|PROJECT_REF)|functions["']?,\s*["']deploy|publishSupabase/, 'publication can still authenticate to or deploy Supabase');
requireMatch('supabase/migrations/20260815003000_restore_prospect_document_downloads.sql', /prospect_documents[\s\S]*p_token ~ '\^\[0-9A-Fa-f\]\{64\}\$'[\s\S]*lead\.access_token = p_token/, 'legacy prospect document listing is not bound to a strong access token');
for (const file of [createPayment, paymentEmail, sms, whatsapp]) {
  requireMatch(file, /admin\.auth\.getUser\(token\)/, 'missing server-side user-token validation');
  forbidMatch(file, /tokenRole|JSON\.parse\(atob|role\s*===\s*["']service_role/, 'trusts an unverified JWT payload');
}
for (const file of [createPayment, webhook, paymentForm]) {
  forbidMatch(file, /MONETICO_(?:TEST_)?MAC_KEY[^\n]*\|\|\s*["'][A-Fa-f0-9]{24,}["']/, 'contains a hard-coded MAC-key fallback');
}
requireMatch(createPayment, /crypto\.getRandomValues/, 'payment references are not cryptographically random');
requireMatch('supabase/migrations/20260810033000_add_monetico_creation_idempotency.sql', /request_id uuid[\s\S]*UNIQUE INDEX[\s\S]*request_fingerprint[\s\S]*SHA-256/i, 'payment idempotency migration lacks UUID uniqueness or fingerprint documentation');
requireMatch(createPayment, /requestId[\s\S]*requestFingerprint[\s\S]*findExistingPayment[\s\S]*23505/, 'payment creation lacks idempotency validation, lookup, or concurrent collision recovery');
for (const file of ['src/backoffice/FreeInvoicing.tsx', 'src/backoffice/LeadInvoicing.tsx']) {
  requireMatch(file, /getPaymentRequestId\(paymentSignature\)/, 'payment UI lacks a stable retry key');
  requireMatch(file, /requestId: paymentRequestId/, 'payment UI does not send its idempotency key');
  requireMatch(file, /clearPaymentRequestId\(paymentSignature\)/, 'payment UI does not clear a successful request key');
}
requireMatch('src/backoffice/FreeInvoicing.tsx', /withTimeout\(nativeAdminCreateMoneticoPayment\([\s\S]*45_000/, 'native free payment creation can spin forever');
requireMatch('src/backoffice/LeadInvoicing.tsx', /withTimeout\(nativeAdminCreateMoneticoPayment\([\s\S]*45_000/, 'native admin payment creation can spin forever');
requireMatch('server/taxiassur-platform-api.mjs', /async function adminPaymentCreate[\s\S]{0,500}?verifiedAdminSession\(req\)/, 'native payment creation is not session-authenticated');
requireMatch('server/taxiassur-platform-api.mjs', /createHmac\('sha1'/, 'native payment creation is not signed');
requireMatch('server/taxiassur-platform-api.mjs', /collection='monetico_payments'/, 'native payment creation is not persisted');
forbidMatch('server/taxiassur-platform-api.mjs', /SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|supabaseServiceKey/, 'native platform API still depends on Supabase');
forbidMatch('server/taxiassur-platform-api.mjs', /VALUES\('crm_leads',[\s\S]{0,500}?'inbox-auto'\)/, 'native inbox can still create CRM leads automatically');
requireMatch('server/taxiassur-platform-api.mjs', /action==='create_lead'\)return json\(res,origin,403,[\s\S]{0,120}?use_new_lead_form/, 'inbox can bypass the explicit new-lead form');
requireMatch(createPayment, /MAC:\s*payment\.mac_sent/, 'signed payment form does not include its persisted MAC');
requireMatch(createPayment, /if\s*\(!await isAuthorized/, 'payment creation is not staff-authorized');
forbidMatch(createPayment, /htmlForm|document\.write/, 'server still returns injectable payment HTML');
requireMatch(webhook, /cdr=1/, 'invalid callbacks do not return the required rejection code');
requireMatch(webhook, /payment\.amount|amount.*payment/i, 'callback does not compare the charged amount');
requireMatch(hardenedPaymentProcessingMigration, /FOR UPDATE[\s\S]*payment already confirmed[\s\S]*REVOKE ALL[\s\S]*FROM PUBLIC, anon, authenticated/, 'payment processing is not atomic, terminal, and service-role-only');
forbidMatch(paymentForm, /diagnostic:|keyLength|err instanceof Error \? err\.message/, 'public payment form leaks payment configuration or internal errors');
requireMatch(paymentAccessTokenMigration, /gen_random_bytes\(32\)[\s\S]*get_payment_by_access[\s\S]*REVOKE ALL ON FUNCTION public\.get_payment_by_reference\(text\) FROM PUBLIC, anon, authenticated/, 'payment access is not protected by an independent 256-bit token');
requireMatch(createPayment, /paymentAccessToken:\s*payment\.payment_access_token/, 'payment creation does not return the independent access token to the authorized creator');
requireMatch(paymentForm, /payment_access_token !== accessToken[\s\S]*leadAccessToken !== accessToken/, 'payment form is not bound to either payment or lead ownership');
forbidMatch('src/pages/PaiementLibre.tsx', /get_payment_by_reference|JSON\.stringify\(\{ reference: payment\.reference \}\)/, 'public payment page uses a reference without its access token');
forbidMatch('src/pages/PaiementLibre.tsx', /supabase|VITE_SUPABASE|get_payment_by_access|get-monetico-payment-form/i, 'public payment page still depends on Supabase');
requireMatch('src/pages/PaiementLibre.tsx', /lookupPublicPlatformPayment[\s\S]*createPublicPlatformPaymentForm/, 'public payment page is not connected to the native XCR payment API');
requireMatch('src/lib/platform-api.ts', /\/v1\/public\/payments\/lookup[\s\S]*\/v1\/public\/payments\/form/, 'native XCR payment helpers are incomplete');
forbidMatch('src/pages/NewsletterUnsubscribe.tsx', /supabase|unsubscribe_newsletter/i, 'newsletter unsubscribe page still depends on Supabase');
requireMatch('src/pages/NewsletterUnsubscribe.tsx', /\^\[0-9a-f\]\{64\}\$[\s\S]*unsubscribePublicPlatformNewsletter/i, 'newsletter unsubscribe is not bound to a strong native XCR token');
requireMatch('src/lib/platform-api.ts', /\/v1\/public\/newsletter\/unsubscribe/, 'native XCR newsletter unsubscribe helper is missing');
requireMatch('src/backoffice/FreeInvoicing.tsx', /paymentAccessToken[\s\S]*encodeURIComponent/, 'free invoice links omit their payment access token');
requireMatch('src/components/crm/DownPaymentManager.tsx', /paymentPath[\s\S]*paymentAccessToken/, 'down-payment links omit their payment access token');
forbidMatch(webhook, /sanitizedWebhookData = \{ \.\.\.webhookData \}/, 'webhook persists unnecessary card or client network fields');
for (const file of [createPayment, paymentForm, webhook]) { requireMatch(file, /\['test', 'production'\]\.includes\(MONETICO_MODE\)/, 'Monetico mode silently defaults instead of failing closed'); }
requireMatch(webhook, /constantTimeHexEqual[\s\S]*difference \|=/, 'webhook MAC comparison is not constant-time');
requireMatch(hardenedPaymentProcessingMigration, /monetico_webhook_events[\s\S]*ENABLE ROW LEVEL SECURITY[\s\S]*ON CONFLICT DO NOTHING/, 'valid payment callbacks are not recorded idempotently for audit');
requireMatch('scripts/deploy-critical-supabase-security.ps1', /'create-monetico-payment'[\s\S]*'get-monetico-payment-form'[\s\S]*'monetico-webhook'/, 'critical payment functions are missing from the deployment set');
forbidMatch(webhook, /bypass|continue.*invalid.*MAC|accept.*invalid.*MAC/i, 'contains an invalid-MAC bypass');
requireMatch(paymentEmail, /status: 'processing'[\s\S]*eq\('status', 'pending'\)[\s\S]*status: 'sent'/, 'payment email sending is not atomically claimed and completed');
requireMatch(paymentEmail, /status: 'delivery_uncertain'[\s\S]*Statut d envoi incertain[\s\S]*nextStatus = emailResponse\.ok \? 'delivery_uncertain' : 'pending'/, 'ambiguous payment e-mail delivery can be retried blindly');
requireMatch('supabase/migrations/20260810043000_harden_monetico_email_delivery_status.sql', /DROP CONSTRAINT[\s\S]*'sent'[\s\S]*'delivery_uncertain'[\s\S]*manual reconciliation/, 'Monetico status constraint rejects sent or uncertain delivery states');
requireCount('src/components/crm/MoneticoPaymentManager.tsx', /getPaymentRequestId\(paymentSignature\)/, 2, 'Monetico manager lacks stable keys for both creation actions');
requireCount('src/components/crm/MoneticoPaymentManager.tsx', /requestId: paymentRequestId/, 2, 'Monetico manager omits a creation request ID');
requireCount('src/components/crm/MoneticoPaymentManager.tsx', /nativeAdminCreateMoneticoPayment\(/, 2, 'Monetico manager does not use native creation for both actions');
requireMatch('src/lib/native-admin-data.ts', /nativeAdminCreateMoneticoPayment[\s\S]*AbortSignal\.timeout\(45_000\)/, 'native Monetico creation has no timeout');
requireMatch('src/components/crm/MoneticoPaymentManager.tsx', /form\.remove\(\)[\s\S]*clearPaymentRequestId\(paymentSignature\)/, 'Monetico manager clears its retry key before validating and submitting the payment form');
const legacyCicPayment = 'supabase/functions/create-cic-payment-link/index.ts';
requireMatch(legacyCicPayment, /numericAmount[\s\S]*canReuse[\s\S]*existingExpiry[\s\S]*PaymentTokenCreationFailed/, 'legacy CIC creation is unvalidated or creates a fresh token on every retry');
requireMatch(legacyCicPayment, /SUPABASE_SERVICE_ROLE_KEY[\s\S]*AbortSignal\.timeout\(45_000\)[\s\S]*emailResult\?\.success !== true/, 'legacy CIC e-mail uses public auth, has no timeout, or ignores relay rejection');
requireMatch(legacyCicPayment, /recipient = String\(lead\?\.email[\s\S]*safeRecipientName = escapeHtml/, 'legacy CIC trusts an invalid recipient or injects its display name');
requireMatch(legacyCicPayment, /https:\/\/taxiassur\.com\/paiement\/\$\{paymentToken\}/, 'legacy CIC uses an unpinned payment domain');
forbidMatch(legacyCicPayment, /metadata:\s*\{[\s\S]{0,220}(?:payment_token|payment_link)|SUPABASE_ANON_KEY/, 'legacy CIC persists bearer links or calls its relay anonymously');
const legacyPipeline = 'supabase/functions/pipeline-ia-orchestrator/index.ts';
forbidMatch(legacyPipeline, /access_token \|\| lead\.id|paiement\?lead=\$\{lead\.id\}|signature\?lead=\$\{lead\.id\}/, 'legacy pipeline exposes a lead UUID as a portal, payment, or signature credential');
requireMatch(legacyPipeline, /securePortalUrl[\s\S]*Signature sécurisée non créée[\s\S]*Lien de paiement sécurisé non créé/, 'legacy pipeline fabricates secure links instead of failing closed');
requireMatch('supabase/functions/pipeline-action-executor/index.ts', /Secure payment creation requires an explicit contract and amount/, 'pipeline executor still calls the incompatible legacy payment endpoint');
requireMatch(paymentEmail, /payment\.status\s*!==\s*["']pending["']/, 'can send links for a non-pending payment');
requireMatch(paymentEmail, /staffAuthorized[\s\S]*clientAccessToken !== lead\.access_token/, 'client payment email is not bound to the matching lead token');
requireMatch(paymentEmail, /\^\[0-9a-f\]\{64\}\$/i, 'client payment email accepts a weak access token');requireMatch(paymentEmail, /escapeHtml/, 'does not escape database values embedded in HTML');
requireMatch(paymentEmail, /access_token.*\{20,200\}/s, 'does not validate the prospect access token');
requireMatch(publicPaymentMigration, /NULL::text[\s\S]*NULL::text[\s\S]*NULL::text/, 'public lookup does not redact customer PII');
requireMatch(publicPaymentMigration, /NULL::uuid[\s\S]*mp\.created_at/, 'public lookup still exposes an internal lead identifier');
requireMatch(publicPaymentMigration, /REVOKE ALL[^\n]+FROM PUBLIC/i, 'public execute privileges are not reset explicitly');
for (const file of [
  'src/components/client/ClientMoneticoPayment.tsx',
  'src/components/crm/DownPaymentManager.tsx',
  'src/components/crm/MoneticoPaymentManager.tsx',
]) {
  forbidMatch(file, /document\.write|htmlForm/, 'uses server-generated HTML for payment submission');
  requireMatch(file, /p\.monetico-services\.com/, 'does not pin the payment destination hostname');
}
const inviteAdmin = 'supabase/functions/invite-admin-user/index.ts';
const legacySms = 'supabase/functions/send-sms/index.ts';
const clientAccess = 'supabase/functions/send-client-access/index.ts';
const ionosEmail = 'supabase/functions/send-email-ionos/index.ts';
const insurerDossierWorker = 'supabase/functions/process-insurer-dossier-sends/index.ts';
const genericEmail = 'supabase/functions/send-email/index.ts';
const universalEmail = 'supabase/functions/send-email-universal/index.ts';
const crmEmail = 'supabase/functions/send-crm-email/index.ts';
const teamEmailHandler = 'supabase/functions/team-email-handler/index.ts';
const claimNotifier = 'supabase/functions/notify-claim/index.ts';
const claimNotificationAuditMigration = 'supabase/migrations/20260809130000_add_claim_notification_delivery_audit.sql';
const claimNotificationTriggerMigration = 'supabase/migrations/20260809133000_trigger_secure_claim_notifications.sql';
const leadMagnetConfirmation = 'supabase/functions/send-lead-magnet-confirmation/index.ts';
const leadMagnetDeliveryMigration = 'supabase/migrations/20260809140000_add_lead_magnet_delivery_audit.sql';
const clientAccessMigration = 'supabase/migrations/20260809065500_remove_public_client_access_by_lead_id.sql';
requireMatch(genericEmail, /isAuthorized\(req, supabaseUrl, serviceKey\)/, 'generic Brevo email relay remains anonymously callable');
requireMatch(genericEmail, /subject\.length > 200[\s\S]*html\.length > 250000/, 'generic Brevo email relay does not bound attacker-controlled content');
requireMatch(genericEmail, /AbortController[\s\S]*15000/, 'generic Brevo email relay has no provider timeout');
forbidMatch(genericEmail, /details:|errorText|messageId/, 'generic Brevo email relay leaks provider responses or identifiers');
requireMatch(universalEmail, /isService[\s\S]*!isStaff && !isService/, 'universal email relay accepts anonymous internal sends');
requireMatch(universalEmail, /MAX_ATTACHMENT_BYTES[\s\S]*MAX_TOTAL_ATTACHMENT_BYTES[\s\S]*rawAttachments\.length > 10/, 'universal email attachments are not bounded');
requireMatch(universalEmail, /replyTo[\s\S]*emailPattern\.test\(replyTo\)[\s\S]*AbortSignal\.timeout\(15000\)/, 'universal email reply address or provider timeout is unsafe');
requireMatch(universalEmail, /uuidPattern\.test\(payload\.lead_id\)/, 'universal email can log interactions against malformed lead identifiers');
forbidMatch(universalEmail, /resultText|Brevo error:|error instanceof Error \? error\.message|BREVO_API_KEY not configured/, 'universal email leaks provider or internal errors');
requireMatch(crmEmail, /token === supabaseKey[\s\S]*auth\.getUser\(token\)[\s\S]*if \(!authorized\)/, 'CRM email relay accepts anonymous sends');
requireMatch(crmEmail, /status: 'processing'[\s\S]*sendEmailBrevo[\s\S]*status: 'sent'/, 'CRM email audit reports sent before provider acceptance');
requireMatch(crmEmail, /AbortSignal\.timeout\(15000\)/, 'CRM email provider request can hang indefinitely');
requireMatch(crmEmail, /error: "Envoi impossible"[\s\S]*status: 500/, 'CRM email failures return a false HTTP success');
forbidMatch(crmEmail, /RAW body received|Preparing email to|result\.messageId|errorText|error\.message \|\| String\(error\)/, 'CRM email logs PII or leaks provider errors');
requireMatch(crmEmail, /allowedBuckets[\s\S]*MAX_ATTACHMENT_BYTES[\s\S]*MAX_TOTAL_ATTACHMENT_BYTES/, 'CRM email attachments do not enforce bucket and size limits');
requireMatch(crmEmail, /url\.protocol !== "https:"[\s\S]*allowedHosts\.has[\s\S]*redirect: "error"/, 'CRM email attachments permit SSRF or redirects');
requireMatch(crmEmail, /validateAttachmentOwnership[\s\S]*\.eq\("lead_id", leadId\)[\s\S]*AttachmentOwnershipMismatch/, 'CRM email attachments are not rebound to their lead');
requireMatch(crmEmail, /status: 'processing'[\s\S]*rejected \? 'failed' : 'delivery_uncertain'[\s\S]*status: 'sent'/, 'CRM email audit has no reliable failure or uncertain-delivery transition');
forbidMatch('src/components/crm/EmailComposerModal.tsx', /getPublicUrl|VITE_SUPABASE_ANON_KEY|crm_interactions'\)\.insert/, 'CRM composer exposes private attachments or bypasses authenticated delivery audit');
requireMatch('src/components/crm/EmailComposerModal.tsx', /customPaths[\s\S]*customPaths\.some[\s\S]*nativeAdminCall[\s\S]*!sendResult\.ok \|\| !sendResult\.queued/, 'CRM composer can omit a fresh attachment or report false success');
requireMatch('src/components/crm/LeadDocumentsSelector.tsx', /file_path[\s\S]*nativeAdminDocumentUrl[\s\S]*nativeAdminStoredDocumentUrl/, 'CRM document selector still depends on public document URLs');
forbidMatch('src/backoffice/CRMCommercial.tsx', /functions\/v1\/send-crm-email[\s\S]{0,300}VITE_SUPABASE_ANON_KEY/, 'CRMCommercial still calls the email relay anonymously');
requireMatch(crmEmail, /escapeHtml\(to_name[\s\S]*escapeHtml\(a\.filename\)/, 'CRM email inserts unescaped display names or attachment names');
requireMatch(crmEmail, /new URL\(url\)[\s\S]*\["https:", "http:"\]/, 'CRM click tracking accepts unsafe URL schemes');
forbidMatch('src/components/crm/StepByStepWorkflow.tsx', /template:\s*'(?:qualification|objections_response|signature_request)'/, 'workflow sends unsupported template-only CRM emails');
requireMatch('src/components/crm/StepByStepWorkflow.tsx', /sendError \|\| !sendResult\?\.success/, 'workflow advances after a rejected CRM email');
requireMatch('src/lib/crm-production.ts', /send-payment-link-email[\s\S]*sendError \|\| !sendResult\?\.success/, 'crm-production uses an incomplete generic payment email payload');
requireMatch('src/lib/crm-production.ts', /requireHttpsUrl\(signature\.signature_url\)[\s\S]*crm_leads[\s\S]*Envoi de la demande de signature refusé/, 'crm-production signature email lacks an HTTPS link, stored recipient, or result check');
requireMatch(teamEmailHandler, /SUPABASE_SERVICE_ROLE_KEY[\s\S]*functions\/v1\/send-email[\s\S]*requireRelaySuccess\(response, 'Email'\)/, 'team email handler uses an anonymous relay token or ignores delivery failure');
requireMatch(claimNotifier, /from\("crm_claims"\)[\s\S]*from\("crm_leads"\)/, 'claim notifier does not resolve claims and leads from storage');
requireMatch(claimNotifier, /recipient = String\(lead\.email\)/, 'claim notifier trusts caller-supplied recipient identity');
requireMatch(claimNotifier, /sha256[\s\S]*claim_notification_events[\s\S]*23505/, 'claim notifications are not idempotent');
requireMatch(claimNotifier, /team_sent_at[\s\S]*client_sent_at/, 'partial claim notification delivery cannot resume safely');
requireMatch(claimNotifier, /expect\(await sendCommand\(`RCPT TO:/, 'claim notifier ignores SMTP recipient rejection');
forbidMatch(claimNotifier, /results\s*\}|error: String\(err\)|client_email\s*=\s*input/, 'claim notifier leaks delivery details or trusts supplied email');
requireMatch(claimNotificationAuditMigration, /UNIQUE \(event_key\)[\s\S]*ENABLE ROW LEVEL SECURITY[\s\S]*REVOKE ALL/, 'claim notification audit lacks deduplication or access controls');
requireMatch(claimNotificationTriggerMigration, /AFTER INSERT OR UPDATE ON public\.crm_claims/, 'tokenized claim creation is not connected to notifications');
requireMatch(claimNotificationTriggerMigration, /to_jsonb\(OLD\)[\s\S]*client_visible_notes[\s\S]*RETURN NEW/, 'claim updates notify even when no client-visible state changed');
requireMatch(claimNotificationTriggerMigration, /jsonb_build_object\('type', v_kind, 'claim_id', NEW\.id\)/, 'claim trigger sends caller-controlled PII to the notifier');
requireMatch(claimNotificationTriggerMigration, /EXCEPTION WHEN OTHERS[\s\S]*RETURN NEW/, 'notification transport can roll back claim persistence');
requireMatch(claimNotificationTriggerMigration, /REVOKE ALL ON FUNCTION public\.enqueue_secure_claim_notification\(\) FROM PUBLIC, anon, authenticated/, 'claim notification trigger helper remains web-executable');
requireMatch('src/pages/client/ClientSinistres.tsx', /createClientPlatformClaim\(accessToken/, 'client claim form bypasses token ownership or masks persistence errors');
requireMatch(leadMagnetConfirmation, /lead_magnet_downloads[\s\S]*tenMinutesAgo/, 'lead magnet email is not bound to a recent stored request');
requireMatch(leadMagnetConfirmation, /const guides = \{[\s\S]*guide-complet[\s\S]*checklist-documents/, 'lead magnet accepts attacker-controlled templates or links');
requireMatch(leadMagnetConfirmation, /lead_magnet_delivery_events[\s\S]*23505[\s\S]*status !== "failed"/, 'lead magnet lacks daily deduplication or safe retries');
requireMatch(leadMagnetConfirmation, /functions\/v1\/send-email[\s\S]*Bearer \$\{key\}/, 'lead magnet bypasses the authenticated internal email relay');
requireMatch(leadMagnetDeliveryMigration, /UNIQUE \(email_hash, guide_type, delivery_day\)[\s\S]*REVOKE ALL/, 'lead magnet delivery audit is not rate-limited or private');
forbidMatch('src/components/LeadMagnetSection.tsx', /send-email-ionos|subject:|html:/, 'lead magnet section can send arbitrary email content');
forbidMatch('src/components/LeadMagnetPopup.tsx', /send-email-ionos|subject:|html:/, 'lead magnet popup can send arbitrary email content');
requireMatch('src/components/LeadMagnetSection.tsx', /await sendConfirmationEmail[\s\S]*status: 'success'/, 'lead magnet section reports success before email acceptance');
requireMatch('src/components/LeadMagnetPopup.tsx', /await sendConfirmationEmail[\s\S]*setStatus\('success'\)/, 'lead magnet popup reports success before email acceptance');
requireMatch('supabase/functions/send-whatsapp/index.ts', /body, message, to, lead_id, leadId[\s\S]*messageBody = body \|\| message/, 'WhatsApp function breaks legacy CRM payloads');
requireMatch('supabase/functions/send-whatsapp/index.ts', /requestedLeadId[\s\S]*crm_leads[\s\S]*phone = normalizePhone\(lead\.phone\)/, 'lead WhatsApp delivery trusts the supplied phone instead of stored lead data');
requireMatch('supabase/functions/send-whatsapp/index.ts', /wa_contacts[\s\S]*upsert[\s\S]*wa_conversations[\s\S]*resolvedConversationId/, 'legacy WhatsApp delivery cannot resolve or create a conversation safely');
requireMatch('supabase/functions/send-whatsapp/index.ts', /normalizePhone[\s\S]*\+33\$\{phone\.slice\(1\)\}/, 'French WhatsApp numbers are not normalized to E.164');
requireMatch('src/backoffice/WhatsAppManager.tsx', /nativeAdminCall[\s\S]*sendResult\?\.success !== true[\s\S]*clearDeliveryRequestId[\s\S]*setMessageText\(''\)/, 'WhatsApp manager clears messages before native delivery is confirmed');
requireMatch('src/backoffice/WhatsAppManager.tsx', /templateVariables[\s\S]*sendResult\?\.success !== true[\s\S]*clearDeliveryRequestId[\s\S]*setShowTemplates\(false\)/, 'WhatsApp manager closes templates before native delivery is confirmed');
requireMatch('supabase/functions/send-sms-brevo/index.ts', /lead_id[\s\S]*crm_leads[\s\S]*to = lead\.phone/, 'lead SMS delivery trusts the supplied phone instead of stored lead data');
requireMatch('supabase/functions/send-sms-brevo/index.ts', /AbortSignal\.timeout\(15000\)/, 'Brevo SMS requests can hang without a provider timeout');
const deliveryLedgerMigration = 'supabase/migrations/20260810040000_create_communication_delivery_idempotency.sql';
requireMatch(deliveryLedgerMigration, /DROP CONSTRAINT IF EXISTS email_sends_status_check[\s\S]*'processing'[\s\S]*'delivery_uncertain'/, 'email audit status constraint rejects operational or uncertain delivery states');
requireMatch(crmEmail, /claimDelivery[\s\S]*channel: "email"[\s\S]*providerCallStarted[\s\S]*BrevoRejected[\s\S]*finishDelivery[\s\S]*"uncertain"/, 'CRM email delivery is not idempotent or cannot distinguish provider rejection from uncertainty');
requireMatch('src/components/crm/EmailComposerModal.tsx', /getDeliveryRequestId\('email'[\s\S]*requestId,[\s\S]*clearDeliveryRequestId\('email'/, 'email composer lacks a stable request key or success cleanup');
requireMatch(whatsapp, /claimDelivery[\s\S]*channel: "whatsapp"[\s\S]*providerCallStarted[\s\S]*InvalidTwilioResponse[\s\S]*WhatsAppAuditFailure[\s\S]*finishDelivery/, 'WhatsApp delivery lacks idempotency or uncertain provider/audit handling');
requireMatch('src/backoffice/WhatsAppManager.tsx', /getDeliveryRequestId\('whatsapp'[\s\S]*requestId,[\s\S]*clearDeliveryRequestId\('whatsapp'/, 'WhatsApp manager lacks stable request keys or success cleanup');
forbidMatch(whatsapp, /JSON\.stringify\(\{[\s\S]{0,180}messageSid/, 'WhatsApp public response exposes the Twilio SID');
requireMatch(deliveryLedgerMigration, /communication_delivery_requests[\s\S]*request_id uuid PRIMARY KEY[\s\S]*processing[\s\S]*uncertain[\s\S]*ENABLE ROW LEVEL SECURITY[\s\S]*REVOKE ALL/, 'communication ledger lacks private UUID claims or uncertain delivery state');
requireMatch('supabase/functions/_shared/delivery-idempotency.ts', /claimDelivery[\s\S]*23505[\s\S]*replay[\s\S]*uncertain[\s\S]*finishDelivery/, 'shared delivery helper lacks atomic claim, replay, or uncertain-state handling');
requireMatch(sms, /claimDelivery[\s\S]*channel: "sms"[\s\S]*providerCallStarted[\s\S]*finishDelivery[\s\S]*"uncertain"/, 'SMS delivery is not idempotent or cannot record uncertain provider outcomes');
for (const file of ['src/components/crm/SMSSendModal.tsx', 'src/components/crm/SMSConversationPanel.tsx']) {
  requireMatch(file, /getDeliveryRequestId\('sms'[\s\S]*requestId,[\s\S]*clearDeliveryRequestId\('sms'/, 'manual SMS UI lacks a stable delivery request key or success cleanup');
}
for (const file of [
  'src/backoffice/FreeInvoicing.tsx', 'src/backoffice/LeadInvoicing.tsx',
  'src/backoffice/WhatsAppManager.tsx', 'src/components/crm/EmailComposerModal.tsx',
  'src/components/crm/SMSSendModal.tsx', 'src/components/crm/SMSConversationPanel.tsx',
]) forbidMatch(file, /}, 45_000\);/, 'withTimeout duration is passed to the wrapped function instead of withTimeout');
requireMatch('supabase/functions/send-sms-brevo/index.ts', /const successPayload = \{ success: true \}[\s\S]*JSON\.stringify\(successPayload\)/, 'SMS success response is not normalized');
forbidMatch('supabase/functions/send-sms-brevo/index.ts', /success: true,[\s\S]{0,200}(?:messageId|creditUsed|smsCount|reference)/, 'SMS response leaks provider identifiers or credit data');
requireMatch('src/components/crm/SMSSendModal.tsx', /if \(!data\?\.ok && !data\?\.success\)[\s\S]*throw new Error[\s\S]*setSent\(true\)/, 'SMS modal reports success before checking the native response');
requireMatch('src/components/crm/SMSConversationPanel.tsx', /if \(!data\?\.ok\)[\s\S]*throw new Error[\s\S]*loadConversation/, 'SMS conversation refreshes messages after failed delivery');
requireMatch(inviteAdmin, /getAdminActor/, 'admin mutations do not validate the actor');
requireMatch(inviteAdmin, /userRole === 'master'[\s\S]*actor\.role/, 'admin can escalate another user to master');
requireMatch(inviteAdmin, /actor\.userId === user_id/, 'admin can delete their own account');
requireMatch(legacySms, /auth\.getUser\(token\)/, 'legacy SMS adapter is not authenticated');
requireMatch(legacySms, /functions\/v1\/send-sms-brevo/, 'legacy SMS bypasses the hardened provider function');
forbidMatch(legacySms, /BREVO_API_KEY/, 'legacy SMS still talks directly to Brevo');
requireMatch(sms, /uuidPattern\.test\(lead_id\)/, 'SMS can log an interaction against an invalid lead identifier');
forbidMatch(sms, /Brevo SMS error:|message: error instanceof Error|BREVO_API_KEY not configured/, 'SMS leaks provider responses, internal exceptions, or secret names');
requireMatch(sms, /brevoResponse\.status === 429 \? 429 : 502/, 'SMS provider failures are not normalized');
forbidMatch(whatsapp, /Twilio API error:|error instanceof Error \? error\.message|whatsapp:\+14155238886/, 'WhatsApp leaks provider errors or falls back to the Twilio sandbox sender');
requireMatch(whatsapp, /twilioResponse\.status === 429 \? 429 : 502/, 'WhatsApp provider failures are not normalized');
requireMatch(whatsapp, /Modele WhatsApp approuve introuvable[\s\S]*\^whatsapp:/, 'WhatsApp templates or sender configuration are not strictly validated');
requireMatch(ionosEmail, /token === serviceKey[\s\S]*auth\.getUser\(token\)/, 'IONOS email endpoint accepts anonymous send requests');
requireMatch(ionosEmail, /req\.method !== "POST"/, 'IONOS email endpoint accepts arbitrary methods');
requireMatch(ionosEmail, /url\.protocol !== "https:"[\s\S]*allowedHosts\.has[\s\S]*redirect: "error"[\s\S]*AbortSignal\.timeout\(15000\)/, 'IONOS attachments permit SSRF, redirects, or unbounded fetches');
requireMatch(ionosEmail, /MAX_ATTACHMENT_BYTES[\s\S]*MAX_TOTAL_ATTACHMENT_BYTES[\s\S]*attachmentInputs\.length > 10/, 'IONOS attachments are not bounded by file, total, and count');
requireMatch(ionosEmail, /allowedAttachmentTypes[\s\S]*normalizeAttachmentType/, 'IONOS attachments accept arbitrary MIME types');
requireMatch(ionosEmail, /RCPT TO:[\s\S]*MESSAGE/, 'IONOS relay ignores recipient or final message rejection');
forbidMatch(ionosEmail, /payload\.from\b|payload\.fromEmail\b|error: \(error as Error\)\.message/, 'IONOS relay trusts an arbitrary sender or leaks internal errors');
requireMatch(insurerDossierWorker, /resolveStoredDocuments[\s\S]*\.eq\("id", doc\.id\)\.eq\("lead_id", leadId\)/, 'insurer attachments are not re-bound to the stored lead');
requireMatch(insurerDossierWorker, /createSignedUrl\(doc\.file_path, 300\)[\s\S]*signed_url/, 'insurer attachments do not use short-lived signed URLs');
requireMatch(insurerDossierWorker, /AbortSignal\.timeout\(60000\)/, 'insurer email worker can hang indefinitely');
forbidMatch('src/components/crm/SendToInsurerModal.tsx', /file_url|p_documents:[\s\S]{0,300}url:/, 'insurer queue persists legacy public attachment URLs');
requireMatch('scripts/deploy-critical-supabase-security.ps1', /'send-email-ionos'[\s\S]*'process-insurer-dossier-sends'/, 'insurer worker and relay are not deployed together');
forbidMatch(ionosEmail, /user=\$\{SMTP_USER\}|Sent to \$\{to\}|recipient: to|details: String\(error\)/, 'IONOS email logs or returns sensitive data');
requireMatch(clientAccess, /auth\.getUser\(token\)/, 'client access email is not staff-authorized');
requireMatch(clientAccess, /lead\.access_token/, 'client access email does not use the random token');
requireMatch(clientAccess, /requestId[\s\S]*client_portal_users[\s\S]*ClientPortalPersistenceFailed[\s\S]*functions\/v1\/send-crm-email[\s\S]*AbortSignal\.timeout\(45_000\)[\s\S]*relayResult\?\.success !== true/, 'client access delivery lacks stable retry identity, strict portal persistence, timeout, or relay result validation');
forbidMatch(clientAccess, /sendEmailSMTP|crm_interactions[\s\S]*clientSpaceLink/, 'client access bypasses the hardened relay or persists its bearer token in interaction history');
for (const file of ['src/components/crm/ContratSignatureStep.tsx', 'src/components/crm/DocumentValidationComplete.tsx']) {
  requireMatch(file, /nativeAdminCall[\s\S]{0,300}?\/access-email[\s\S]{0,150}?method:\s*['"]POST['"]/, 'client access UI does not use the authenticated native access-email endpoint');
}
requireMatch('src/backoffice/LeadInvoicing.tsx', /paymentAccessToken[\s\S]*action\.hostname !== window\.location\.hostname[\s\S]*action\.pathname\.startsWith\('\/paiement\/'\)/, 'lead invoicing does not pin the native payment URL and strong access token');
forbidMatch(clientAccess, /espace-client\/\$\{lead\.id\}/, 'client access email exposes a lead UUID as a login credential');
requireMatch('src/components/crm/ContratSignatureStep.tsx', /nativeAdminUpdateLead[\s\S]{0,500}?\/access-email/, 'contract finalization does not activate the client and queue native portal access');
forbidMatch('src/components/crm/ContratSignatureStep.tsx', /access_token|espace-client\?token=/, 'contract finalization exposes the access token in the browser');
forbidMatch(clientAccess, /console\.log\([^\n]*(SMTP_PASS|base64Encode)/, 'SMTP credentials can be written to logs');
requireMatch(clientAccessMigration, /access_token = v_token/, 'public client RPC does not look up the random token');
forbidMatch(clientAccessMigration, /WHERE\s+id\s*=\s*p_token/i, 'public client RPC still accepts a lead UUID');
requireMatch(clientAccessMigration, /\{64\}/, 'public client token length is not enforced');
const portalTokenMigration = 'supabase/migrations/20260809072000_require_access_token_for_client_portal_rpcs.sql';
const portalFiles = [
  'src/pages/ClientAccessByToken.tsx',
  'src/pages/EspaceClient.tsx',
  'src/pages/client/ClientConfidentialite.tsx',
  'src/pages/client/ClientDashboard.tsx',
  'src/pages/client/ClientDemandes.tsx',
  'src/pages/client/ClientDocuments.tsx',
  'src/pages/client/ClientNotifications.tsx',
  'src/pages/client/ClientPaiements.tsx',
  'src/pages/client/ClientParrainage.tsx',
  'src/pages/client/ClientProfil.tsx',
  'src/pages/client/ClientSinistres.tsx',
  'src/lib/client-consent.ts',
  'src/lib/client-requests.ts',
];
for (const file of portalFiles) {
  forbidMatch(file, /client_email|searchParams\.get\(['"]email['"]\)|get_client_[a-z_]+_by_email|\/client\/dashboard\?email/, 'uses an email address as a client credential');
}
requireMatch('src/lib/client-access.ts', /\^\[0-9a-f\]\{64\}\$/i, 'client access token is not constrained to 256-bit hexadecimal');
requireMatch('src/pages/ClientAccessByToken.tsx', /storeClientAccessToken\(tokenOrId\)/, 'validated client token is not stored securely for the session');
forbidMatch('src/pages/client/ClientPaiements.tsx', /supabase|VITE_SUPABASE|send-payment-link-monetico/i, 'client payments page still sends links through Supabase');
forbidMatch('src/pages/AssuranceTaxiSollyAzar.tsx', /supabase|VITE_SUPABASE/i, 'Solly Azar public page still reads from Supabase');
requireMatch('src/pages/AssuranceTaxiSollyAzar.tsx', /loadPublicInsuranceCompany\('SOLLY_AZAR'\)/, 'Solly Azar public page does not use the native insurance company endpoint');
forbidMatch('src/router.tsx', /ProspectDocuments/, 'legacy Supabase prospect documents page is still bundled');
requireMatch('src/router.tsx', /path:\s*['"]\/prospect\/documents['"][\s\S]{0,100}element:\s*<EspaceProspect\s*\/>/, 'legacy prospect document links do not resolve to the native XCR portal');
forbidMatch('src/router.tsx', /AdminDashboard/, 'legacy Supabase admin dashboard is still bundled');
requireMatch('src/router.tsx', /path:\s*['"]\/old-admin['"][\s\S]{0,100}<Navigate\s+to=['"]\/backoffice['"]/, 'legacy admin URL does not redirect to the native XCR backoffice');
forbidMatch('src/router.tsx', /AuthCallbackLinkedin/, 'insecure browser-side LinkedIn OAuth callback is still bundled');
requireMatch('src/router.tsx', /path:\s*['"]\/auth\/callback\/linkedin['"][\s\S]{0,120}<Navigate\s+to=['"]\/backoffice\/social-media['"]/, 'retired LinkedIn callback does not return staff to social settings');
forbidMatch('src/backoffice/SocialMediaManager.tsx', /LinkedInOAuthButton/, 'social manager still exposes the insecure Supabase LinkedIn OAuth flow');
forbidMatch('src/backoffice/ClaimsManager.tsx', /supabase|get_all_claims_for_admin|update_claim_tracking/i, 'claims manager still depends on Supabase RPCs');
requireMatch('src/backoffice/ClaimsManager.tsx', /nativeAdminClaims\(filterStatus\)[\s\S]*nativeAdminUpdateClaim\(claimId/, 'claims manager does not use the native XCR claims endpoints');
forbidMatch('src/backoffice/InsuranceCompaniesStats.tsx', /supabase|lead_company_quotes/i, 'insurance company statistics still query Supabase');
requireMatch('src/backoffice/InsuranceCompaniesStats.tsx', /nativeAdminQuotes\(\)[\s\S]*nativeAdminInsuranceCompanies\(\)/, 'insurance company statistics do not use native XCR data');
forbidMatch('src/backoffice/InsuranceCompaniesManager.tsx', /from ['"]@\/lib\/supabase['"]|\bsupabase\./, 'insurance companies manager still uses Supabase');
forbidMatch('src/backoffice/CRMAdminSettings.tsx', /from ['"]@\/lib\/supabase['"]|\bsupabase\.|service_role|service_key/i, 'CRM settings still expose or depend on Supabase credentials');
forbidMatch('src/backoffice/MergeLeadsManager.tsx', /from ['"]@\/lib\/supabase['"]|\bsupabase\.|merge_two_leads_manual/i, 'lead merge manager still depends on Supabase');
forbidMatch('src/backoffice/WebImportManager.tsx', /from ['"]@\/lib\/supabase['"]|\bsupabase\.|start_web_import|password_encrypted/i, 'web import manager still exposes credentials or depends on Supabase');
requireMatch('server/taxiassur-platform-api.mjs', /adminWebImport[\s\S]*action==='add_credential'[\s\S]*session\.role!=='master'[\s\S]*secret_encrypted:encryptPrivateValue\(password\)/, 'insurer portal credentials are not restricted to master admins and encrypted server-side');
requireMatch('src/backoffice/InsuranceCompaniesManager.tsx', /nativeAdminInsuranceCompanies[\s\S]*nativeAdminUploadInsuranceCompanyFile/, 'insurance companies manager does not use native XCR API');
requireMatch('src/lib/crm-pipeline.ts', /getLeads[\s\S]*nativeAdminLeads\(/, 'CRM Kanban lead loading does not use the dedicated native XCR endpoint');
requireMatch('server/taxiassur-platform-api.mjs', /adminLeadsList[\s\S]*taxiassur\.records WHERE collection='crm_leads'[\s\S]*jsonb_build_object\('id',record_id\)/, 'native Kanban endpoint does not read migrated PostgreSQL leads');
forbidMatch('src/backoffice/QuotesManager.tsx', /supabase|lead_company_quotes/i, 'quotes manager still queries Supabase');
requireMatch('src/backoffice/QuotesManager.tsx', /nativeAdminQuotes\(\)/, 'quotes manager does not use the native XCR quotes endpoint');
requireMatch('src/pages/client/ClientPaiements.tsx', /emailClientPlatformPaymentLink\(accessToken, paymentId\)/, 'client payment e-mail is not bound to the native client token');
requireMatch('src/lib/client-platform-api.ts', /\/v1\/client\/payments\/\$\{encodeURIComponent\(paymentId\)\}\/email/, 'native client payment e-mail helper is missing');
forbidMatch('src/lib/two-factor-auth.ts', /Math\.random\(\)[\s\S]*send-sms\.php|sendSMSVerificationCode/, 'browser can generate and send its own SMS verification code');
forbidMatch('src/pages/EspaceClient.tsx', /\.from\(['"]client_portal_users['"]\)|\/client\/dashboard\?email/, 'public login still accepts an email without real authentication');
for (const rpc of ['portal_data', 'claims', 'documents', 'insurance_company', 'portal_requests', 'consents', 'notifications', 'payments', 'referrals']) {
  requireMatch(portalTokenMigration, new RegExp(`get_client_${rpc}_by_token`), `missing token-bound ${rpc} RPC`);
}
requireMatch(portalTokenMigration, /REVOKE ALL ON FUNCTION public\.get_client_portal_data_by_email\(text\) FROM PUBLIC, anon, authenticated/, 'legacy email-based portal RPC remains executable by web roles');
requireMatch(portalTokenMigration, /REVOKE ALL ON FUNCTION public\.record_client_consent_event[^\n]+FROM PUBLIC, anon, authenticated/, 'legacy email-based consent RPC remains executable by web roles');
forbidMatch('src/components/client/ClientLayout.tsx', /\.from\(/, 'layout queries client tables directly instead of using a token-bound RPC');
requireMatch('src/components/client/ClientLayout.tsx', /clearClientAccess\(\)/, 'client logout does not clear all legacy and token session state');
forbidMatch('src/pages/client/ClientNotifications.tsx', /\.from\(['"]crm_event_notifications/, 'notifications page mutates rows without token ownership verification');
requireMatch(portalTokenMigration, /mark_client_notification_read_by_token[\s\S]*lead_id = v_lead_id/, 'single notification update is not bound to the client lead');
const clientDocumentUpload = 'supabase/functions/upload-client-document/index.ts';
const documentSigner = 'supabase/functions/sign-document-url/index.ts';
const intelligentDocumentRequest = 'supabase/functions/send-intelligent-document-request/index.ts';
const privateDocumentBucketMigration = 'supabase/migrations/20260809100000_make_prospect_documents_bucket_private.sql';
const privateEmailAttachmentMigration = 'supabase/migrations/20260809113000_make_email_attachments_bucket_private.sql';
const privateCrmDocumentsMigration = 'supabase/migrations/20260809213000_secure_crm_documents_storage.sql';
const privateContractDocumentsMigration = 'supabase/migrations/20260809220000_make_contract_documents_private.sql';
const pendingAttachmentMigration = 'supabase/migrations/20260809110000_secure_pending_email_attachments_rpc.sql';
requireMatch(intelligentDocumentRequest, /isAuthorized\(req, supabaseUrl, supabaseKey\)/, 'document request email can be invoked without staff authorization');
requireMatch(intelligentDocumentRequest, /uuidPattern\.test\(lead_id\)/, 'document request accepts an invalid lead identifier');
forbidMatch(intelligentDocumentRequest, /portal_url:|details: error\.toString/, 'document request response leaks portal credentials or internal errors');
requireMatch(documentSigner, /auth\.getUser\(bearer\)[\s\S]*access_token/, 'document signer does not support staff and token authorization');
requireMatch(documentSigner, /eq\([\s\S]*["']lead_id["'][\s\S]*lead\.id[\s\S]*file_path[\s\S]*file_url/, 'document signer does not prove lead ownership');
requireMatch(documentSigner, /createSignedUrl\([\s\S]*path,[\s\S]*300,/, 'document URLs are not short-lived');
requireMatch(documentSigner, /allowedBuckets[\s\S]*["']lead-rib["']/, 'private RIB documents are not supported by the staff signer');
requireMatch(documentSigner, /lead-rib is intentionally staff-only/, 'RIB signing is not explicitly kept staff-only');
requireMatch(documentSigner, /["']contract-documents["'][\s\S]*lead_contract_documents/, 'contract documents are not signed with lead ownership verification');
requireMatch(privateContractDocumentsMigration, /SET public = false[\s\S]*Public can view contract documents[\s\S]*public lecture contract documents/i, 'contract documents bucket or public read policies remain public');
forbidMatch('src/components/crm/ContratSignatureStep.tsx', /getPublicUrl|access_token|espace-(?:client|prospect)\?token=/, 'contract signature exposes public documents or portal tokens');
requireMatch('src/components/crm/ContratSignatureStep.tsx', /SecureDocumentLink[\s\S]*bucket="contract-documents"/, 'contract backoffice preview bypasses the secure signer');
requireMatch('src/lib/native-admin-data.ts', /nativeAdminUploadContractDocument[\s\S]{0,600}?AbortSignal\.timeout\(60_000\)/, 'contract document upload does not use the bounded native endpoint');
forbidMatch('src/components/crm/PaiementRIBStep.tsx', /getPublicUrl/, 'back-office exposes private RIBs through public URLs');
requireMatch('src/components/crm/PaiementRIBStep.tsx', /nativeAdminRibUrl\(leadId,\s*ribId\)/, 'back-office RIB view does not use the authenticated native download');
requireMatch('server/taxiassur-platform-api.mjs', /async function adminLeadRibDownload[\s\S]{0,500}?verifiedAdminSession\(req\)/, 'native RIB download is not session protected');
requireMatch(privateEmailAttachmentMigration, /SET public = false[\s\S]*Public read access to email attachments[\s\S]*Public read access for email attachments/, 'email attachment bucket or public read policies remain public');
requireMatch(privateEmailAttachmentMigration, /SET download_url = NULL/, 'persisted public email attachment URLs are not cleared');
for (const emailAttachmentImporter of [
  'supabase/functions/extract-email-attachments/index.ts',
  'supabase/functions/sync-ionos-imap/index.ts',
  'supabase/functions/sync-ionos-imap-v2/index.ts',
  'supabase/functions/sync-all-emails-complete/index.ts',
]) {
  forbidMatch(emailAttachmentImporter, /getPublicUrl|storage_bucket:\s*["']attachments["']|\.from\(["']attachments["']\)/, 'email importer exposes confidential attachments or uses the legacy bucket');
}
requireMatch('supabase/functions/extract-email-attachments/index.ts', /storage_bucket:\s*"email-attachments"[\s\S]*download_url:\s*null/, 'attachment extractor does not persist private storage metadata');
requireMatch('supabase/functions/sync-ionos-imap-v2/index.ts', /storage_bucket:\s*"email-attachments"[\s\S]*download_url:\s*null/, 'IMAP v2 does not persist private storage metadata');
requireMatch(privateCrmDocumentsMigration, /SET public = false[\s\S]*Public can read crm documents[\s\S]*Public read access to crm documents[\s\S]*Public read crm-documents for viewing/, 'crm-documents bucket or public read policies remain public');
requireMatch(privateCrmDocumentsMigration, /SET file_path = COALESCE[\s\S]*SET file_url = NULL/, 'crm document public URLs are not migrated to internal paths');
forbidMatch('src/lib/crm-production.ts', /getPublicUrl/, 'crm-production still creates public document URLs');
requireMatch('src/lib/crm-production.ts', /storage_path: uploadData\.path[\s\S]*file_path: uploadData\.path[\s\S]*remove\(\[uploadData\.path\]\)/, 'crm-production does not persist private paths or clean orphan uploads');
forbidMatch('src/components/client/index.ts', /ClientCompleteDocuments|ClientUnifiedDashboard/, 'lead-id client document dashboards remain exported');
requireMatch(pendingAttachmentMigration, /storage_path text[\s\S]*REVOKE ALL[\s\S]*FROM PUBLIC, anon/, 'pending attachment RPC still requires public URLs or anonymous execution');
forbidMatch('src/lib/document-utils.ts', /storage\/v1\/object\/public|getDocumentUrl/, 'central document helper still creates public URLs');
forbidMatch('src/backoffice/CRMInboxMulticanal.tsx', /storage\/v1\/object\/public\/email-attachments/, 'CRM inbox exposes public email attachments');
requireMatch(privateDocumentBucketMigration, /SET public = false/, 'prospect document bucket remains public');
requireMatch(privateDocumentBucketMigration, /Public read access for prospect documents/, 'legacy public document read policy is not removed');
requireMatch(privateDocumentBucketMigration, /Public upload access for prospect documents/, 'legacy anonymous document upload policy is not removed');
requireMatch(privateDocumentBucketMigration, /TO authenticated[\s\S]*bucket_id = 'prospect-documents'/, 'staff cannot read documents after the private migration');
forbidMatch('src/components/client/index.ts', /ClientDocumentsViewer/, 'legacy lead-id document viewer remains exported');
forbidMatch('src/components/client/index.ts', /ClientClaimsManager/, 'legacy lead-id claim manager remains exported');
const clientClaimsPage = 'src/pages/client/ClientSinistres.tsx';
const clientClaimMigration = 'supabase/migrations/20260810050000_harden_client_claim_creation.sql';
requireMatch(clientClaimsPage, /createClientPlatformClaim\(accessToken[\s\S]*location:\s*form\.location/, 'client claim creation loses location or can spin forever');
requireMatch(clientClaimsPage, /loadClientPlatformSession\(accessToken\)/, 'client claim loading can spin forever');
requireMatch(clientClaimMigration, /client_email_for_access_token[\s\S]*client_portal_users[\s\S]*is_active = true/, 'claim creation is not bound to an active token portal');
requireMatch(clientClaimMigration, /ACCIDENT_RESPONSABLE[\s\S]*ASSISTANCE[\s\S]*length\(btrim\(coalesce\(p_incident_location/, 'claim type or location validation is missing');
requireMatch(clientClaimMigration, /incident_location[\s\S]*REVOKE ALL[\s\S]*FROM PUBLIC[\s\S]*GRANT EXECUTE/, 'claim location is not persisted or RPC grants are unsafe');
requireMatch('src/lib/secure-document-url.ts', /sign-document-url/, 'frontend secure URL helper bypasses the signer');
forbidMatch('src/components/crm/SecureDocumentLink.tsx', /createSignedUrl|getPublicUrl|signedUrl\)/, 'back-office document link bypasses the server signer or logs its URL');
requireMatch('src/pages/client/ClientDocuments.tsx', /openClientPlatformDocument\(accessToken[\s\S]*doc\.download_path/, 'client documents are opened without token-bound authorization');
requireMatch('supabase/functions/sign-document-url/index.ts', /lead_company_quotes[\s\S]*quote_file_url, quote_pdf_url, rc_pro_addon_file_url/, 'quote signer does not verify prospect ownership');
requireMatch('src/components/client/ClientQuotesViewer.tsx', /openProspectQuote[\s\S]*downloadProspectCompanyDocument/, 'prospect quotes do not use token-bound platform downloads');
requireMatch('server/taxiassur-platform-api.mjs', /downloadProspectQuote[\s\S]*leadByToken[\s\S]*lead_company_quotes[\s\S]*contract-documents/, 'platform quote download does not verify prospect ownership');
forbidMatch('src/components/client/ClientQuotesViewer.tsx', /href=\{(?:fileUrl|quote\.rc_pro_addon_file_url)\}|window\.open\(fileUrl/, 'prospect quotes still expose stored document URLs directly');
const submitQuoteModal = 'src/components/crm/SubmitQuoteModal.tsx';
forbidMatch(submitQuoteModal, /getPublicUrl|href=\{formData\.quote_file_url\}|upsert:\s*true|body:\s*html,/, 'quote submission exposes private files, overwrites objects, or stores a portal token in audit HTML');
requireMatch(submitQuoteModal, /nativeAdminStoredDocumentUrl[\s\S]*["']contract-documents["']/, 'staff quote preview bypasses authenticated native document delivery');
requireMatch('src/lib/native-admin-data.ts', /nativeAdminUploadQuoteDocument[\s\S]{0,700}?AbortSignal\.timeout\(60_000\)/, 'quote document upload does not have a native deadline');
requireMatch('server/taxiassur-platform-api.mjs', /adminLeadQuoteDocumentUpload[\s\S]*scanFile\(temporaryPath\)[\s\S]*safeUnlink\(finalPath\)/, 'native quote upload lacks antivirus scanning or orphan cleanup');
requireMatch(submitQuoteModal, /nativeAdminUploadQuoteDocument[\s\S]*result\.path/, 'quote documents are not persisted as private native paths');
requireMatch('server/taxiassur-platform-api.mjs', /adminLeadQuoteEmail[\s\S]*context\.lead\.email[\s\S]*context\.lead\.access_token[\s\S]*native_email_outbox/, 'quote e-mail does not use the stored recipient and prospect access token');
requireMatch(submitQuoteModal, /await sendQuoteEmail\(\)[\s\S]*sent_to_client_at:[\s\S]*sent_at:/, 'quote is marked sent before delivery succeeds');
const signedQuoteStep = 'src/components/crm/SignatureDevisStep.tsx';
forbidMatch(signedQuoteStep, /getPublicUrl|href=\{uploadedFile\.file_url\}|file_url:\s*publicUrl/, 'signed quote remains publicly accessible');
requireMatch(signedQuoteStep, /nativeAdminUploadContractDocument\(leadId,\s*["']devis_signe["']/, 'signed quote upload bypasses the bounded native document API');
requireMatch('server/taxiassur-platform-api.mjs', /uploadAdminContractDocument[\s\S]*randomUUID\(\)[\s\S]*scanFile\(temporaryPath\)[\s\S]*safeUnlink\(finalPath\)/, 'signed quote metadata is public or orphan cleanup is missing');
requireMatch(signedQuoteStep, /SecureDocumentLink[\s\S]*filePath=\{uploadedFile\.file_path\}[\s\S]*bucket="contract-documents"/, 'signed quote preview bypasses secure signing');
requireMatch(signedQuoteStep, /nativeAdminDeleteDocument\(uploadedFile\.id\)/, 'signed quote deletion bypasses native object cleanup');
const pipelineCard = 'src/components/crm/PipelineCard.tsx';
forbidMatch(pipelineCard, /getPublicUrl|quote_pdf_url:\s*publicUrl|sent_at:\s*new Date/, 'Kanban quote upload exposes a public URL or claims delivery prematurely');
requireMatch(pipelineCard, /application\/pdf[\s\S]*10 \* 1024 \* 1024[\s\S]*crypto\.randomUUID\(\)/, 'Kanban quote validation or unpredictable naming is missing');
requireMatch(pipelineCard, /withTimeout\([\s\S]*\.upload\([\s\S]*60_000[\s\S]*quote_file_url:\s*filePath[\s\S]*submitted_at/, 'Kanban quote persistence is public or unbounded');
requireMatch(pipelineCard, /if \(insertError\)[\s\S]*remove\(\[filePath\]\)/, 'Kanban quote DB failure leaves an orphan upload');
const contractSignatureManager = 'src/components/crm/ContractSignatureManager.tsx';
forbidMatch(contractSignatureManager, /getPublicUrl|\.from\(["']documents["']\)[\s\S]*\.upload|href=\{signatureData\.(?:contract_url|special_conditions_url)\}/, 'contract manager exposes private contract documents');
requireMatch(contractSignatureManager, /application\/pdf[\s\S]*10 \* 1024 \* 1024[\s\S]*nativeAdminUploadContractDocument/, 'contract upload validation or native handoff is missing');
requireMatch('src/lib/native-admin-data.ts', /nativeAdminUploadContractDocument[\s\S]*AbortSignal\.timeout\(60_000\)[\s\S]*Content-Type['"]?:['"]application\/pdf/, 'contract upload is not bounded or typed as PDF');
requireMatch('server/taxiassur-platform-api.mjs', /uploadAdminContractDocument[\s\S]*randomUUID\(\)[\s\S]*scanFile\(temporaryPath\)[\s\S]*safeUnlink\(finalPath\)[\s\S]*previousPath\.startsWith/, 'native contract storage lacks unpredictable naming, scanning, or orphan cleanup');
requireCount(contractSignatureManager, /<SecureDocumentLink/g, 2, 'contract and special conditions are not both opened through signing');
requireMatch('src/lib/secure-document-url.ts', /withTimeout[\s\S]*20_000/, 'secure document signing can spin forever');
for (const [quoteView, expectedLinks] of [
  ['src/backoffice/LeadCompanyQuotes.tsx', 2],
  ['src/components/crm/ValidationDevisStep.tsx', 1],
  ['src/backoffice/QuotesManager.tsx', 2],
]) {
  forbidMatch(quoteView, /href=\{quote\.quote_(?:file|pdf)_url|href=\{quote\.quote_pdf_url \|\| quote\.quote_file_url/, 'back-office quote view opens a stored URL directly');
  requireCount(quoteView, /<SecureDocumentLink/g, expectedLinks, 'back-office quote view does not sign every quote document');
}
forbidMatch('src/pages/EspaceProspect.tsx', /href=\{doc\.file_url\}/, 'prospect final documents expose stored URLs directly');
forbidMatch(clientDocumentUpload, /getPublicUrl/, 'new client uploads persist public document URLs');
requireMatch(clientDocumentUpload, /access_token[\s\S]*client_portal_users/, 'document upload does not validate both lead token and active portal');
requireMatch(clientDocumentUpload, /createSignedUploadUrl/, 'document upload does not issue a scoped signed upload URL');
requireMatch(clientDocumentUpload, /uploadId = crypto\.randomUUID\(\)/, 'document path is not cryptographically unpredictable');
requireMatch(clientDocumentUpload, /actualSize !== declaredSize[\s\S]*actualMime/, 'document finalization does not verify stored size and MIME type');
requireMatch(clientDocumentUpload, /await bucket\.remove\(\[path\]\)/, 'invalid or orphaned uploads are not removed');
forbidMatch(clientDocumentUpload, /\.or\(`/ , 'document authorization constructs a dynamic PostgREST OR filter');
requireMatch(clientDocumentUpload, /scope === 'client' && !portal/, 'prospect scope and client portal authorization are not separated');
requireMatch(clientDocumentUpload, /documentTypes\.has\(documentType\)/, 'document type is not constrained before upload');
for (const documentType of ['kbis', 'carte_pro_vtc', 'inscription_registre_vtc', 'controle_technique']) {
  requireMatch(clientDocumentUpload, new RegExp(`['"]${documentType}['"]`), `prospect upload rejects the ${documentType} document type exposed by the UI`);
}
requireMatch(clientDocumentUpload, /actualMime !== mimeType/, 'stored document MIME metadata is optional instead of mandatory');
forbidMatch('src/pages/EspaceProspect.tsx', /upload_prospect_document_by_token|\.upload\(fileName/, 'prospect page still uploads or writes metadata directly');
requireMatch('src/pages/EspaceProspect.tsx', /uploadProspectPlatformDocument[\s\S]*downloadProspectPlatformDocument/, 'prospect page does not use token-bound platform upload/download');
requireMatch('server/taxiassur-platform-api.mjs', /uploadProspectDocument[\s\S]*leadByToken[\s\S]*scanFile[\s\S]*insertFileObject/, 'platform prospect upload loses token authorization or antivirus scanning');
forbidMatch('src/pages/client/ClientDocuments.tsx', /supabase\.from\(['"]prospect_documents|\.getPublicUrl\(filePath\)/, 'client page writes document metadata directly');
requireMatch('src/pages/client/ClientDocuments.tsx', /uploadClientPlatformDocument\(accessToken, file\)/, 'client page does not use the native antivirus upload flow');
forbidMatch('src/pages/client/ClientDashboard.tsx', /\.from\(/, 'dashboard queries client tables directly instead of token-bound RPCs');
requireMatch('src/pages/client/ClientDashboard.tsx', /loadClientPlatformSession\(accessToken\)[\s\S]*data\.documents[\s\S]*data\.quotes[\s\S]*data\.notifications/, 'dashboard activity is not loaded through a token-bound platform session');
requireMatch(portalTokenMigration, /get_client_quotes_by_token[\s\S]*client_email_for_access_token/, 'client quotes wrapper does not require an active portal');
forbidMatch('src/router.tsx', /element:\s*<ClientInsuranceSpace/, 'legacy insurance route is still executable');
requireMatch('src/router.tsx', /path:\s*['"]\/espace-client\/assurances['"][\s\S]*Navigate to=['"]\/client\/dashboard['"]/, 'legacy insurance URL is not redirected to the token portal');
forbidMatch('src/components/client/ClientQuotesViewer.tsx', /leadId|\.from\(/, 'prospect quotes bypass token-bound RPCs');
requireMatch('src/components/client/ClientQuotesViewer.tsx', /loadProspectPlatformSession[\s\S]*session\.quotes[\s\S]*session\.company_documents/, 'prospect quotes and documents are not loaded through the token-bound platform session');
forbidMatch('src/components/client/ClientPaymentButton.tsx', /\.from\(['"]lead_contracts|leadId/, 'prospect down-payment button trusts a lead identifier');
requireMatch('src/components/client/ClientPaymentButton.tsx', /loadProspectPlatformSession\(token\)[\s\S]*payment_access_token/, 'prospect down-payment button is not token-bound');
requireMatch(portalTokenMigration, /get_client_down_payment_by_token[\s\S]*client_lead_id_for_access_token/, 'down-payment RPC does not derive lead ownership from the token');
const clientSubscription = 'supabase/functions/client-subscription/index.ts';
const clientSubscriptionForm = 'src/components/client/ClientSubscriptionForm.tsx';
requireMatch(clientSubscription, /access_token[\s\S]*deleted_at/, 'subscription does not validate the prospect token');
requireMatch(clientSubscription, /company_id\.eq\.\$\{quoteId\}[\s\S]*status['"], ['"]accepted/, 'subscription does not bind an accepted quote to the lead');
requireMatch(clientSubscription, /createSignedUploadUrl[\s\S]*storedMime !== mimeType/, 'RIB upload is not signed or verified after storage');
requireMatch(clientSubscription, /rib_file_path[\s\S]*remove\(\[existing\.rib_file_path\]\)/, 'private RIB replacement does not remove the previous object');
forbidMatch(clientSubscriptionForm, /leadId|\.from\(['"]lead_subscription_details|\.getPublicUrl/, 'subscription form trusts a lead id or writes sensitive data directly');
requireMatch(clientSubscriptionForm, /uploadClientPlatformDocument\(token, rib, 'rib'\)[\s\S]*saveClientPlatformSubscription\(token/, 'subscription form does not use the native antivirus RIB workflow');
requireMatch('src/pages/EspaceProspect.tsx', /<ClientSubscriptionForm[\s\S]{0,120}token=\{token/, 'prospect subscription is not token-bound');
requireMatch(clientDocumentUpload, /action === 'list-requests'[\s\S]*eq\('lead_id', lead\.id\)/, 'document requests can be listed across leads');
requireMatch(clientDocumentUpload, /requestId[\s\S]*eq\('id', requestId\)\.eq\('lead_id', lead\.id\)/, 'document request fulfillment is not bound to its lead');
const paymentLinkEmail = 'supabase/functions/send-payment-link-email/index.ts';
requireMatch(paymentLinkEmail, /req\.method !== "POST"/, 'generic payment email accepts methods other than POST');
requireMatch(paymentLinkEmail, /isAuthorized\(req, supabaseUrl, serviceKey\)/, 'generic payment email can be invoked without staff authorization');
requireMatch(paymentLinkEmail, /isAllowedPaymentUrl\(payment_url\)/, 'generic payment email does not validate the supplied payment URL');
requireMatch(paymentLinkEmail, /url\.protocol === "https:"[\s\S]*\^\[0-9a-f\]\{64\}/, 'generic payment email accepts a non-HTTPS or untokenized payment URL');
requireMatch(paymentLinkEmail, /lead_id[\s\S]*crm_leads[\s\S]*recipient = lead\.email/, 'lead payment email is not bound to the stored lead recipient');
requireMatch(paymentLinkEmail, /escapeHtml\(payment_url\)/, 'payment URL is injected into email HTML without escaping');
forbidMatch(paymentLinkEmail, /payment_url:\s*payment_url|error instanceof Error \? error\.message/, 'payment email response leaks a secret URL or internal provider error');
forbidMatch(paymentLinkEmail, /console\.log\(`[^`]*\$\{(?:recipient|leadEmail|payment_url)/, 'payment email logs recipient PII or its secret URL');
const notificationQueueProcessor = 'supabase/functions/process-notification-queue/index.ts';
requireMatch(notificationQueueProcessor, /Authorization[\s\S]*Bearer \$\{supabaseKey\}[\s\S]*Unauthorized/, 'notification queue processor accepts unauthenticated execution');
requireMatch(notificationQueueProcessor, /status: "processing"[\s\S]*\.eq\("status", "pending"\)[\s\S]*maybeSingle/, 'notification queue items are not claimed conditionally');
requireMatch(notificationQueueProcessor, /AbortSignal\.timeout\(30_000\)/, 'notification channel relays have no network timeout');
requireMatch(notificationQueueProcessor, /response\.ok && result\.success === true/g, 'notification channel relays accept HTTP-only or payload-only success');
forbidMatch(notificationQueueProcessor, /result\.success \|\| response\.ok/, 'notification channel relays still report false-positive sends');
const smsQueueProcessor = 'supabase/functions/process-sms-queue/index.ts';
requireMatch(smsQueueProcessor, /Authorization[\s\S]*Bearer \$\{supabaseKey\}[\s\S]*Unauthorized/, 'SMS queue processor accepts unauthenticated execution');
requireMatch(smsQueueProcessor, /AbortSignal\.timeout\(30_000\)/, 'SMS provider request has no network timeout');
requireMatch(smsQueueProcessor, /status: "processing"[\s\S]*\.eq\("status", "pending"\)[\s\S]*maybeSingle/, 'legacy SMS queue items are not claimed conditionally');
requireMatch('scripts/deploy-critical-supabase-security.ps1', /'process-notification-queue'[\s\S]*'process-sms-queue'[\s\S]*'brevo-webhook-handler'[\s\S]*'sms-inbound-webhook'[\s\S]*'whatsapp-webhook'[\s\S]*'whatsapp-status'/, 'critical messaging workers or webhooks are missing from the deployment set');
requireMatch('scripts/deploy-critical-supabase-security.ps1', /requiredRemoteSecrets[\s\S]*BREVO_WEBHOOK_TOKEN[\s\S]*BREVO_SMS_WEBHOOK_TOKEN[\s\S]*TWILIO_WHATSAPP_STATUS_URL[\s\S]*missingSecrets/, 'critical deployment does not fail closed when webhook secrets are missing');const hardenedMessagingQueuesMigration = 'supabase/migrations/20260809223000_harden_notification_and_sms_queues.sql';
requireMatch(hardenedMessagingQueuesMigration, /sms_messages[\s\S]*sent_at[\s\S]*updated_at[\s\S]*'processing'/, 'SMS messages lack distinct sent time or processing locks');
requireMatch(hardenedMessagingQueuesMigration, /row_number\(\)[\s\S]*uq_sms_messages_direction_provider_id/, 'SMS provider events are not deduplicated');
forbidMatch(notificationQueueProcessor, /processed_at/, 'notification worker writes a column absent from crm_notification_queue');
requireMatch(notificationQueueProcessor, /staleNotifications[\s\S]*retry_count[\s\S]*retryDelayMs/, 'notification worker cannot recover interrupted jobs with bounded retries');
requireMatch(smsQueueProcessor, /staleQueue[\s\S]*claimedMessage[\s\S]*sent_at/, 'SMS worker lacks stale recovery, atomic modern-message claim, or distinct sent timestamp');
const legacyTwilioWebhook = 'supabase/functions/twilio-webhook/index.ts';
requireMatch(legacyTwilioWebhook, /verifyTwilioWebhook[\s\S]*TWILIO_WEBHOOK_URL[\s\S]*Unauthorized/, 'legacy Twilio voice and SMS webhook accepts unsigned requests');
requireMatch(legacyTwilioWebhook, /escapeXml[\s\S]*requireSupabaseSuccess[\s\S]*Unsupported media type/, 'legacy Twilio webhook lacks XML escaping, strict persistence, or content-type enforcement');
forbidMatch(legacyTwilioWebhook, /Webhook received:|raw_data:\s*data|error\.message/, 'legacy Twilio webhook logs or returns sensitive provider data');
requireMatch('supabase/functions/_shared/webhook_auth_test.ts', /valid signature[\s\S]*rejects tampering/, 'webhook authentication regression tests are missing');
const twilioWebhookVerifier = 'supabase/functions/_shared/twilio-webhook.ts';
requireMatch(twilioWebhookVerifier, /TWILIO_AUTH_TOKEN[\s\S]*HMAC[\s\S]*SHA-1[\s\S]*constantTimeEqual/, 'Twilio webhooks are not cryptographically authenticated');
for (const file of ['supabase/functions/whatsapp-webhook/index.ts', 'supabase/functions/whatsapp-status/index.ts']) {
  requireMatch(file, /verifyTwilioWebhook[\s\S]*Forbidden/, 'WhatsApp webhook accepts unsigned requests');
  forbidMatch(file, /console\.log\("WhatsApp[^\n]*payload/, 'WhatsApp webhook logs raw personal data');
}
const keyyoWebhook = 'supabase/functions/keyyo-webhook/index.ts';
requireMatch(keyyoWebhook, /KEYYO_WEBHOOK_SECRET[\s\S]*constantTimeEqual[\s\S]*Unauthorized/, 'Keyyo webhook accepts requests without a strong shared secret');
requireMatch(keyyoWebhook, /allowedTypes[\s\S]*phonePattern[\s\S]*Timestamp outside accepted window/, 'Keyyo webhook does not strictly validate event type, phones, identifiers, or timestamps');
requireMatch(keyyoWebhook, /call interaction lookup[\s\S]*maybeSingle[\s\S]*Temporary processing failure[\s\S]*503/, 'Keyyo webhook is not idempotent or suppresses retryable persistence failures');
forbidMatch(keyyoWebhook, /Keyyo webhook received|console\.log|x-forwarded-for|supabase\.raw/, 'Keyyo webhook logs personal data, trusts spoofable IP headers, or uses an unsupported raw query');
requireMatch('scripts/deploy-critical-supabase-security.ps1', /KEYYO_WEBHOOK_SECRET[\s\S]*'keyyo-webhook'/, 'Keyyo secret preflight or controlled deployment coverage is missing');const brevoWebhook = 'supabase/functions/brevo-webhook-handler/index.ts';
requireMatch(brevoWebhook, /verifyBearerSecret[\s\S]*BREVO_WEBHOOK_TOKEN[\s\S]*Unauthorized/, 'Brevo delivery webhook accepts unauthenticated requests');
requireMatch(brevoWebhook, /event\.messageId[\s\S]*delivered_at[\s\S]*provider_message_id/, 'Brevo SMS delivery statuses are not persisted');
forbidMatch(brevoWebhook, /Brevo webhook received:[\s\S]*JSON\.stringify\(payload/, 'Brevo webhook logs full payloads');
const inboundSmsWebhook = 'supabase/functions/sms-inbound-webhook/index.ts';
requireMatch(inboundSmsWebhook, /BREVO_SMS_WEBHOOK_TOKEN[\s\S]*payload\.text\.length > 1600[\s\S]*AbortSignal\.timeout\(20_000\)/, 'inbound SMS webhook lacks authentication, input limits, or AI timeout');
requireMatch(inboundSmsWebhook, /insertError\?\.code === "23505"[\s\S]*duplicate: true/, 'inbound SMS replay is not idempotent');
forbidMatch(inboundSmsWebhook, /SMS INBOUND[^\n]*payload\.text/, 'inbound SMS webhook logs message content');
requireMatch('scripts/scan-secrets.cjs', /Payment-provider private key file[\s\S]*config[\s\S]*\\\.key/, 'secret scanner does not reject tracked payment-provider key files');
requireMatch('.gitignore', /supabase\/functions\/\*\*\/config\/\*\.key/, 'payment-provider key files are not ignored');
requireMatch('supabase/functions/cic-payment-webhook/index.ts', /Retired insecure demonstration endpoint[\s\S]*status: 410/, 'legacy CIC demonstration webhook can still confirm payments');
forbidMatch('src/router.tsx', /DownPaymentPage|path:\s*['"]\/down-payment['"]/, 'retired Supabase down-payment demonstration page is still routable');
forbidMatch('src/router.tsx', /TestNotifications|path:\s*['"]\/test-notifications['"]/, 'public Supabase notification diagnostic page is still routable');
requireMatch('supabase/migrations/20260809234500_restrict_down_payment_confirmation.sql', /REVOKE ALL[\s\S]*FROM anon[\s\S]*FROM authenticated[\s\S]*TO service_role/, 'payment confirmation RPC remains callable by public users');
requireMatch('scripts/deploy-critical-supabase-security.ps1', /'cic-payment-webhook'[\s\S]*'monetico-webhook'/, 'retired CIC webhook is missing from the controlled security deployment');
requireMatch('supabase/functions/send-payment-link-monetico/index.ts', /AbortSignal\.timeout\(30_000\)[\s\S]*emailResponse\.ok \|\| relayResult\?\.success !== true/, 'Monetico payment email relay lacks timeout or strict success acknowledgement');
requireMatch('supabase/functions/cic-payment-webhook/index.ts', /Retired insecure demonstration endpoint[\s\S]*status: 410/, 'legacy CIC demonstration webhook can still confirm payments');
requireMatch('supabase/migrations/20260809234500_restrict_down_payment_confirmation.sql', /REVOKE ALL[\s\S]*FROM anon[\s\S]*FROM authenticated[\s\S]*TO service_role/, 'payment confirmation RPC remains callable by public users');

requireMatch('supabase/functions/send-payment-link-monetico/index.ts', /sentError[\s\S]*audit non enregistré[\s\S]*notificationError[\s\S]*JSON\.stringify\(\{ success: true \}\)/, 'Monetico payment email audit can silently fail or response leaks payment data');
forbidMatch('src/components/crm/MoneticoPaymentManager.tsx', /console\.log|result\.details|result\.email/, 'Monetico manager logs or displays sensitive server response data');
requireMatch('src/components/crm/MoneticoPaymentManager.tsx', /nativeAdminQueuePaymentEmail\(paymentId\)[\s\S]*result\?\.success !== true/, 'Monetico manager reports email success without native queue acknowledgement');
requireMatch('src/components/crm/DownPaymentManager.tsx', /nativeAdminConfigureDownPayment[\s\S]*configured\?\.success !== true \|\| configured\?\.emailQueued !== true/, 'down-payment workflow ignores native persistence or email queue failures');
forbidMatch('src/components/crm/DownPaymentManager.tsx', /supabase/i, 'down-payment workflow still depends on Supabase');
forbidMatch('src/components/crm/DownPaymentManager.tsx', /email:\s*lead\.email|first_name:\s*lead\.first_name|last_name:\s*lead\.last_name/, 'down-payment caller sends unnecessary prospect PII to payment email function');
requireMatch('supabase/functions/whatsapp-status/index.ts', /statusMap[\s\S]*Invalid message status[\s\S]*message_status: normalizedStatus/, 'WhatsApp statuses are not allowlisted or webhook logs remain excessive');
requireMatch('supabase/functions/whatsapp-webhook/index.ts', /Invalid WhatsApp payload[\s\S]*api\.twilio\.com[\s\S]*msgError\?\.code === "23505"[\s\S]*normalizedCommand/, 'inbound WhatsApp validation, idempotence, media trust, or exact consent commands are missing');
forbidMatch('supabase/functions/whatsapp-webhook/index.ts', /payload:\s*payload|includes\("stop"\)|includes\("start"\)/, 'inbound WhatsApp stores raw payloads or uses substring consent commands');
requireMatch('supabase/functions/send-whatsapp/index.ts', /allowedMediaHost[\s\S]*AbortSignal\.timeout\(30_000\)[\s\S]*normalizedStatus[\s\S]*audit non enregistré[\s\S]*increment_wa_template_usage/, 'WhatsApp send lacks media allowlist, timeout, status normalization, strict audit, or atomic template usage');
requireMatch(hardenedMessagingQueuesMigration, /increment_wa_template_usage[\s\S]*SECURITY DEFINER[\s\S]*REVOKE ALL[\s\S]*service_role/, 'WhatsApp template usage increment is not atomic and service-only');
requireMatch('src/lib/crm-channel-engine.ts', /select\('email, phone'\)[\s\S]*message\.channel === 'sms'[\s\S]*message: message\.body[\s\S]*data\?\.success !== true/, 'generic channel engine omits recipient-specific payloads or strict success checks');
forbidMatch('src/components/crm/LeadAutomationCenter.tsx', /VITE_SUPABASE_ANON_KEY[\s\S]*functions\/v1/, 'automation center still sends through an anonymous raw Edge request');
requireMatch('src/components/crm/LeadAutomationCenter.tsx', /supabase\.functions\.invoke\(endpoint[\s\S]*sendResult\?\.success !== true/, 'automation center does not use authenticated invoke with strict success');
requireMatch('src/backoffice/QuoteManager.tsx', /remove\(\[uploadData\?\.path \|\| filePath\]\)[\s\S]*attachments[\s\S]*bucket: 'crm-documents'[\s\S]*Delivery rejected[\s\S]*status: 'sent'/, 'quote workflow leaves orphan uploads, omits private attachment, or records sent before delivery');
requireMatch('supabase/functions/team-email-handler/index.ts', /requireRelaySuccess[\s\S]*AbortSignal\.timeout\(30_000\)[\s\S]*requireRelaySuccess\(response, 'SMS'\)[\s\S]*requireRelaySuccess\(response, 'WhatsApp'\)/, 'team notification relays accept false success or have no timeout');
const internalRpcRestriction = 'supabase/migrations/20260810001500_restrict_internal_rpc_execution.sql';
requireMatch(internalRpcRestriction, /service_only_names[\s\S]*record_ai_decision[\s\S]*send_document_notification_immediately[\s\S]*REVOKE ALL[\s\S]*FROM PUBLIC, anon[\s\S]*FROM authenticated[\s\S]*TO service_role/, 'internal service RPCs retain public or ordinary authenticated execution rights');
requireMatch(internalRpcRestriction, /backoffice_names[\s\S]*get_ai_master_dashboard[\s\S]*get_document_basket[\s\S]*classify_attachment[\s\S]*has_permission/, 'backoffice RPC overloads are not covered by public-right revocation');
const privilegedRpcGuard = 'supabase/migrations/20260810002500_require_internal_staff_for_privileged_rpcs.sql';
requireMatch(privilegedRpcGuard, /auth\.role\(\) IS DISTINCT FROM 'service_role'[\s\S]*admin_users[\s\S]*auth\.uid\(\)[\s\S]*Internal staff access required/, 'privileged SECURITY DEFINER RPCs lack an internal-staff execution guard');
requireMatch(privilegedRpcGuard, /run_cron_job_now[\s\S]*merge_two_leads_manual[\s\S]*update_claim_tracking[\s\S]*safe_delete_lead[\s\S]*pg_get_functiondef[\s\S]*regexp_replace/, 'high-risk backoffice RPCs are not comprehensively guarded');
requireMatch(privilegedRpcGuard, /sync_admin_user_by_email[\s\S]*increment_social_network_posts[\s\S]*FROM PUBLIC, anon, authenticated[\s\S]*TO service_role/, 'server-only identity or counter RPCs remain callable by client roles');
forbidMatch(privilegedRpcGuard, /E'\\\\nBEGIN\\\\n'/, 'privileged RPC guard migration searches for a literal backslash-n instead of function body line breaks');requireMatch('supabase/migrations/20260810003500_revoke_default_public_function_execution.sql', /ALTER DEFAULT PRIVILEGES[\s\S]*REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC[\s\S]*p\.prosecdef[\s\S]*REVOKE ALL ON FUNCTION/, 'SECURITY DEFINER functions retain implicit PUBLIC execution or unsafe future defaults');
const internalEdgeAuth = 'supabase/functions/_shared/internal-auth.ts';
requireMatch(internalEdgeAuth, /verifyServiceBearer[\s\S]*admin\.auth\.getUser\(token\)[\s\S]*admin_users[\s\S]*is_active[\s\S]*maybeSingle/, 'shared internal Edge authentication accepts anonymous or inactive users');
for (const functionName of ['auto-deploy-improvements', 'git-auto-publisher', 'ultra-autonomous-self-healer', 'ultron-site-healer', 'web-import-executor', 'create-cic-payment-link', 'emergency-lead-recovery']) {
  const functionFile = `supabase/functions/${functionName}/index.ts`;
  requireMatch(functionFile, /isInternalRequest[\s\S]*Unauthorized/, `${functionName} accepts non-internal requests`);
  requireMatch('scripts/deploy-critical-supabase-security.ps1', new RegExp(`'${functionName}'`), `${functionName} security fix is missing from controlled deployment`);
}
requireMatch('supabase/functions/_shared/webhook_auth_test.ts', /verifyServiceBearer accepts only a strong matching service token/, 'shared internal Edge authentication regression test is missing');
for (const functionName of ['ai-code-generator', 'apply-ai-decision', 'autonomous-ai-engine', 'ia-auto-executor', 'pipeline-action-executor', 'pipeline-automation-engine', 'crm-automation-engine', 'event-processor', 'master-ai-decision-engine', 'generate-ai-decisions', 'llm-autonomous-orchestrator']) {
  const functionFile = `supabase/functions/${functionName}/index.ts`;
  requireMatch(functionFile, /isInternalRequest[\s\S]*Unauthorized/, `${functionName} automation endpoint accepts non-internal requests`);
  requireMatch('scripts/deploy-critical-supabase-security.ps1', new RegExp(`'${functionName}'`), `${functionName} security fix is missing from controlled deployment`);
}
const pipelineAutomation = 'supabase/functions/pipeline-automation-engine/index.ts';
requireMatch(pipelineAutomation, /queueEmail\(supabase, lead\.email/g, 'pipeline e-mail relays omit their Supabase queue client');
requireMatch(pipelineAutomation, /Notification queue insert failed[\s\S]*Interaction insert failed/, 'pipeline automation silently ignores notification or interaction persistence failures');
requireMatch(pipelineAutomation, /\^\[0-9a-f\]\{64\}\$[\s\S]*Lead access token missing/, 'pipeline automation falls back to a lead UUID as a public access token');
forbidMatch(pipelineAutomation, /lead\.access_token \|\| lead\.id/, 'pipeline automation exposes predictable lead identifiers as portal tokens');
forbidMatch('supabase/functions/autonomous-ai-engine/index.ts', /success: false, error: error\.message/, 'autonomous AI endpoint leaks internal exception messages');for (const caller of ['src/backoffice/CRMInboxMulticanal.tsx', 'src/backoffice/CRMPipelineKanban.tsx', 'src/backoffice/EmailAccountSettings.tsx']) {
requireMatch(caller, /internalFunctionHeaders|nativeAdminInbox|nativeAdminPipeline/, 'backoffice e-mail synchronization does not require a staff session');
  forbidMatch(caller, /VITE_SUPABASE_ANON_KEY/, 'backoffice e-mail synchronization falls back to the public anon key');
}
requireMatch('src/lib/internal-function-auth.ts', /auth\.getSession\(\)[\s\S]*Session interne expirée[\s\S]*Bearer \$\{accessToken\}/, 'frontend internal-function helper accepts a missing session');
for (const functionName of ['sync-all-emails-complete', 'sync-ionos-imap', 'auto-create-leads-from-emails', 'fetch-email-replies', 'sync-ionos-imap-documents', 'sync-ionos-imap-v2', 'auto-process-email-attachments', 'extract-email-attachments', 'sync-brevo-emails', 'sync-sendgrid-emails', 'sync-all-historical-emails', 'sync-email-history-batch']) {
  requireMatch(`supabase/functions/${functionName}/index.ts`, /isInternalRequest[\s\S]*Unauthorized/, `${functionName} accepts anonymous synchronization requests`);
  requireMatch('scripts/deploy-critical-supabase-security.ps1', new RegExp(`'${functionName}'`), `${functionName} security fix is missing from controlled deployment`);
}
requireMatch('supabase/migrations/20260810010000_disable_legacy_anonymous_internal_crons.sql', /supabase_anon_key[\s\S]*sync-all-emails-complete[\s\S]*auto-process-email-attachments/, 'legacy anonymous internal cron jobs remain active');const autoCreateEmailLeads = 'supabase/functions/auto-create-leads-from-emails/index.ts';
requireMatch(autoCreateEmailLeads, /notificationError[\s\S]*emailUpdateError[\s\S]*interactionError[\s\S]*Email classification persistence failed/, 'automatic e-mail lead creation silently ignores notification, linking, interaction, or classification failures');
forbidMatch(autoCreateEmailLeads, /NOUVEAU LEAD HIGH|\.catch\(\(\) => \{\}\)/, 'automatic e-mail lead creation logs prospect PII or swallows database failures');requireMatch('src/lib/native-admin-data.ts', /NATIVE_ADMIN_TOKEN_KEY[\s\S]*nativeAdminCall[\s\S]*localStorage\.getItem\(NATIVE_ADMIN_TOKEN_KEY\)[\s\S]*native_session_required[\s\S]*Authorization:\s*`Bearer \$\{token\}`/, 'native admin helper accepts a missing session or omits its bearer token');
for (const caller of ['src/backoffice/AutonomousSystemDashboard.tsx', 'src/backoffice/AutomationDashboard.tsx', 'src/backoffice/AIMasterDashboard.tsx', 'src/backoffice/AIAutonomousDashboard.tsx', 'src/backoffice/LLMDashboard.tsx', 'src/backoffice/CRMCommercial.tsx']) {
  requireMatch(caller, /internalFunctionHeaders|nativeAdminCall/, 'privileged backoffice automation call does not require a staff session');
  forbidMatch(caller, /VITE_SUPABASE_ANON_KEY/, 'privileged backoffice automation call falls back to the public anon key');
}
for (const functionName of ['llm-council-chat', 'clean-news-excerpts', 'send-newsletter-campaign', 'pinterest-publisher']) {
  requireMatch('supabase/functions/' + functionName + '/index.ts', /isInternalRequest[\s\S]*Unauthorized/, functionName + ' accepts anonymous privileged requests');
  requireMatch('scripts/deploy-critical-supabase-security.ps1', new RegExp("'" + functionName + "'"), functionName + ' security fix is missing from controlled deployment');
}
for (const caller of ['src/backoffice/AutomationLayout.tsx', 'src/backoffice/CityPageGenerator.tsx', 'src/backoffice/LLMCouncilDashboard.tsx', 'src/backoffice/NewsManager.tsx', 'src/backoffice/NewsletterDashboard.tsx', 'src/backoffice/SeoTools.tsx', 'src/backoffice/SocialMediaManager.tsx']) {
  requireMatch(caller, /internalFunctionHeaders|nativeAdmin[A-Z]/, 'backoffice privileged call does not require a staff session');
  forbidMatch(caller, /VITE_SUPABASE_ANON_KEY/, 'backoffice privileged call falls back to the public anon key');
}
requireMatch('supabase/functions/generate-seo-content/index.ts', /isInternalRequest[\s\S]*Unauthorized/, 'SEO content generator accepts anonymous privileged requests');
requireMatch('scripts/deploy-critical-supabase-security.ps1', /'generate-seo-content'/, 'SEO content generator security fix is missing from controlled deployment');
for (const caller of ['src/backoffice/BacklinkReports.tsx', 'src/backoffice/TestAutomationButton.tsx', 'src/backoffice/TestAutomations.tsx', 'src/backoffice/AIContentGeneratorUnified.tsx', 'src/backoffice/CampaignLauncher.tsx']) {
  requireMatch(caller, /internalFunctionHeaders|nativeAdminCall/, 'remaining backoffice privileged caller does not require a staff session');
  forbidMatch(caller, /VITE_SUPABASE_ANON_KEY/, 'remaining backoffice Edge caller falls back to the public anon key');
}
requireMatch('supabase/functions/indexnow-ping/index.ts', /isInternalRequest[\s\S]*INDEXNOW_KEY[\s\S]*taxiassur\.com[\s\S]*api\.indexnow\.org/, 'IndexNow endpoint is missing authentication, key validation, host validation, or upstream submission');
requireMatch('src/lib/universal-ping.ts', /internalFunctionHeaders/, 'universal IndexNow caller does not require a staff session');
forbidMatch('src/lib/universal-ping.ts', /VITE_SUPABASE_ANON_KEY/, 'universal IndexNow caller falls back to the public anon key');
requireMatch('scripts/deploy-critical-supabase-security.ps1', /'INDEXNOW_KEY'[\s\S]*'indexnow-ping'/, 'IndexNow deployment does not verify its secret or deploy its function');
requireMatch('scripts/configure-supabase-secrets.sh', /INDEXNOW_KEY/, 'IndexNow secret is missing from the safe configuration helper');
for (const functionName of ['generate-city-complete', 'auto-generate-city-page']) {
  requireMatch('supabase/functions/' + functionName + '/index.ts', /isInternalRequest[\s\S]*Unauthorized/, functionName + ' accepts anonymous city generation requests');
  requireMatch('scripts/deploy-critical-supabase-security.ps1', new RegExp("'" + functionName + "'"), functionName + ' is missing from controlled deployment');
}
requireMatch('supabase/functions/generate-city-complete/index.ts', /city_name[\s\S]*Nombre de taxis invalide[\s\S]*generate-seo-content[\s\S]*city_pages[\s\S]*Une page existe déjà/, 'manual city generation lacks validation, generation, persistence, or duplicate protection');
requireMatch('src/backoffice/CityPageGenerator.tsx', /generated: data.generated/, 'city generator UI discards the generated-content delivery report');
for (const functionName of ['ai-social-scraper', 'news-aggregator-master', 'ai-viral-content-generator']) {
  requireMatch('supabase/functions/' + functionName + '/index.ts', /isInternalRequest[\s\S]*Unauthorized/, functionName + ' accepts anonymous content automation requests');
  requireMatch('scripts/deploy-critical-supabase-security.ps1', new RegExp("'" + functionName + "'"), functionName + ' is missing from controlled deployment');
}
requireMatch('supabase/functions/ai-social-scraper/index.ts', /max_results[\s\S]*news-aggregator-master[\s\S]*news_articles[\s\S]*articles/, 'news scraper adapter lacks bounds, aggregation, persistence readback, or frontend response contract');
requireMatch('supabase/functions/ai-viral-content-generator/index.ts', /allowedPlatforms[\s\S]*auto_publish[\s\S]*OPENAI_API_KEY[\s\S]*posts[\s\S]*humanization_score/, 'viral content generator lacks platform validation, safe draft-only behavior, provider configuration, or frontend response contract');
requireMatch('supabase/functions/auto-seo-notifier/index.ts', /isInternalRequest[\s\S]*indexnow-ping[\s\S]*submitted/, 'automatic SEO notifier lacks authentication, IndexNow delegation, or frontend response contract');
requireMatch('src/lib/feeds.ts', /internalFunctionHeaders|nativeAdminCall/, 'feed regeneration does not require a staff session');
forbidMatch('src/lib/feeds.ts', /getSupabaseAnonKey|VITE_SUPABASE_ANON_KEY/, 'feed regeneration falls back to the public anon key');
requireMatch('scripts/deploy-critical-supabase-security.ps1', /'auto-seo-notifier'/, 'automatic SEO notifier is missing from controlled deployment');
forbidMatch('src/router.tsx', /AuthCallback(?:Twitter|Youtube|Pinterest)|\/auth\/callback\/(?:twitter|youtube|pinterest)/i, 'retired Supabase social OAuth callback is still publicly routable');
requireMatch('supabase/functions/twitter-oauth-exchange/index.ts', /isInternalRequest[\s\S]*TWITTER_CLIENT_SECRET[\s\S]*code_verifier[\s\S]*users\/me[\s\S]*social_networks/, 'Twitter OAuth exchange lacks internal auth, server secret, PKCE, identity lookup, or server-side token persistence');
requireMatch('scripts/deploy-critical-supabase-security.ps1', /'TWITTER_CLIENT_ID'[\s\S]*'TWITTER_CLIENT_SECRET'[\s\S]*'TWITTER_REDIRECT_URI'[\s\S]*'twitter-oauth-exchange'/, 'Twitter OAuth deployment lacks required secrets or function');
const safeOutreachMigration = 'supabase/migrations/20260810023000_create_safe_outreach_delivery_pipeline.sql';
requireMatch(safeOutreachMigration, /outreach_suppressions[\s\S]*outreach_delivery_queue[\s\S]*idempotency_key[\s\S]*unsubscribe_token_hash[\s\S]*FOR UPDATE SKIP LOCKED/, 'safe outreach migration lacks suppression, audit queue, idempotence, hashed unsubscribe token, or concurrent claims');
requireMatch(safeOutreachMigration, /ENABLE ROW LEVEL SECURITY[\s\S]*REVOKE ALL[\s\S]*service_role required[\s\S]*release_stale_outreach_deliveries/, 'safe outreach tables or claim functions are exposed or lack stale-claim recovery');
for (const functionName of ['partner-scraper-outreach', 'send-outreach-emails', 'backlink-auto-outreach']) {
  requireMatch('supabase/functions/' + functionName + '/index.ts', /isInternalRequest[\s\S]*Unauthorized/, functionName + ' accepts anonymous outreach requests');
  requireMatch('scripts/deploy-critical-supabase-security.ps1', new RegExp("'" + functionName + "'"), functionName + ' is missing from controlled deployment');
}
requireMatch('supabase/functions/partner-scraper-outreach/index.ts', /outreach_suppressions[\s\S]*idempotencyKey[\s\S]*unsubscribe_token_hash[\s\S]*ignoreDuplicates/, 'outreach preparation lacks suppression, idempotence, unsubscribe hashing, or duplicate protection');
requireMatch('supabase/functions/send-outreach-emails/index.ts', /claim_outreach_deliveries[\s\S]*AbortSignal\.timeout[\s\S]*List-Unsubscribe[\s\S]*delivery_uncertain[\s\S]*unsubscribe_token: null[\s\S]*next_attempt_at/, 'outreach sender lacks atomic claim, unsubscribe headers, timeout, retry backoff, or clear-token cleanup');
requireMatch('supabase/functions/unsubscribe-outreach/index.ts', /Cache-Control[\s\S]*Content-Security-Policy[\s\S]*SHA-256[\s\S]*outreach_suppressions[\s\S]*status: "suppressed"/, 'public outreach unsubscribe lacks token hashing, suppression, queue cancellation, or hardened response headers');
requireMatch('scripts/deploy-critical-supabase-security.ps1', /publicNoJwtFunctions[\s\S]*unsubscribe-outreach[\s\S]*--no-verify-jwt/, 'public unsubscribe endpoint is not deployed with its explicit token-based auth mode');
for (const functionName of ['crm-ai-assistant','realtime-monitoring-engine','llm-brain','keyyo-click-to-call','keyyo-fetch-calls','publish-unified-content','linkedin-ai-content-generator','social-media-publisher','news-auto-publisher','auto-backup-system']) {
  requireMatch('supabase/functions/' + functionName + '/index.ts', /isInternalRequest[\s\S]*Unauthorized/, functionName + ' accepts anonymous privileged requests');
  requireMatch('scripts/deploy-critical-supabase-security.ps1', new RegExp("'" + functionName + "'"), functionName + ' is missing from controlled deployment');
}
const portalTimeout = 'src/lib/promise-timeout.ts';
requireMatch(portalTimeout, /timeoutMs = 15_000/, 'portal requests do not have a bounded default timeout');
requireMatch(portalTimeout, /window\.clearTimeout\(timeout\)[\s\S]*window\.clearTimeout\(timeout\)/, 'portal timeout is not cleared on both resolve and reject');
forbidMatch('src/pages/ClientAccessByToken.tsx', /supabase|get_or_create_client_portal_access/i, 'client access-by-token page still depends on Supabase');
requireMatch('src/pages/ClientAccessByToken.tsx', /loadClientPlatformSession\(tokenOrId\)[\s\S]*storeClientAccessToken\(tokenOrId\)/, 'client access token is stored before native portal validation');
requireMatch('src/lib/platform-api.ts', /platformRequest[\s\S]*timeoutMs = 20_000[\s\S]*AbortSignal\.timeout\(timeoutMs\)/, 'prospect platform requests can spin forever');
requireMatch('src/lib/document-upload-compat.ts', /withTimeout\([\s\S]*action: 'prepare'[\s\S]*20_000[\s\S]*documentType: 'autre'[\s\S]*withTimeout\([\s\S]*action: 'prepare'[\s\S]*20_000/, 'compatible document preparation lacks bounded primary or fallback requests');
for (const file of ['src/pages/EspaceProspect.tsx', 'src/pages/ProspectDocuments.tsx']) {
  requireMatch('src/lib/platform-api.ts', /uploadProspectPlatformDocument[\s\S]*platformRequest\([\s\S]*60_000/, 'prospect document upload can spin forever');
}
forbidMatch(portalTimeout, /timeoutMs = (?:2\d|[3-9]\d|\d{3,})_000/, 'portal timeout exceeds 20 seconds');
requireMatch('src/backoffice/WhatsAppManager.tsx', /nativeAdminCall[\s\S]*\/v1\/admin\/whatsapp[\s\S]*AbortSignal\.timeout\(45_000\)/, 'native WhatsApp manual send can spin forever');
const idempotentDeliveryCaller = 'src/lib/invoke-idempotent-delivery.ts';
requireMatch(idempotentDeliveryCaller, /function canonicalize[\s\S]*\.sort\(/, 'shared frontend delivery caller lacks canonical signatures');
requireMatch(idempotentDeliveryCaller, /getDeliveryRequestId\(channel, signature\)/, 'shared frontend delivery caller lacks stable request IDs');
requireMatch(idempotentDeliveryCaller, /withTimeout\([\s\S]*client\.functions\.invoke[\s\S]*timeoutMs/, 'shared frontend delivery caller lacks an invocation timeout');
requireMatch(idempotentDeliveryCaller, /body: \{ \.\.\.body, requestId \}/, 'shared frontend delivery caller does not inject requestId');
requireMatch(idempotentDeliveryCaller, /result\.data\?\.success === true\) clearDeliveryRequestId/, 'shared frontend delivery caller clears idempotence before confirmed success');
for (const file of ['src/components/crm/DocumentReminderPanel.tsx']) {
  for (const channel of ['email', 'sms', 'whatsapp']) {
    requireMatch(file, new RegExp(`invokeIdempotentDelivery[^]{0,100}["'']${channel}["'']`), `${file} still bypasses idempotent ${channel} delivery`);
  }
}
for (const file of ['src/components/crm/CollecteDocumentsStep.tsx', 'src/components/crm/ValidationDevisStep.tsx']) {
  requireMatch(file, /getDeliveryRequestId[\s\S]*request_id[\s\S]*clearDeliveryRequestId/, `${file} lacks stable native delivery request IDs or success cleanup`);
  requireMatch(file, /\/sms/, `${file} does not route SMS through an authenticated native endpoint`);
  requireMatch(file, /\/whatsapp/, `${file} does not route WhatsApp through an authenticated native endpoint`);
}
const directDeliveryAllowlist = new Set([
  'src/components/crm/EmailComposerModal.tsx',
  'src/components/crm/SMSSendModal.tsx',
  'src/components/crm/SMSConversationPanel.tsx',
  'src/backoffice/WhatsAppManager.tsx',
]);
function sourceFiles(directory) {
  return readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = `${directory}/${entry.name}`;
    return entry.isDirectory() ? sourceFiles(relative) : /\.(?:ts|tsx)$/.test(entry.name) ? [relative] : [];
  });
}
for (const file of sourceFiles('src')) {
  const edgeReferences = [
    ...read(file).matchAll(/functions\.invoke(?:<[^>]+>)?\(\s*['"]([^'"]+)['"]/g),
    ...read(file).matchAll(/functionName:\s*['"]([^'"]+)['"]/g),
  ];
  for (const match of edgeReferences) {
    const functionName = match[1];
    const functionEntry = path.join(root, 'supabase', 'functions', functionName, 'index.ts');
    try {
      readFileSync(functionEntry, 'utf8');
    } catch {
      failures.push(`${file}: invokes missing Edge function ${functionName}`);
    }
  }
  if (/functions\.invoke\(['"](?:send-crm-email|send-sms-brevo|send-whatsapp|send-client-access)['"]/.test(read(file)) && !directDeliveryAllowlist.has(file)) {
    failures.push(`${file}: direct multichannel delivery bypasses the shared idempotent caller`);
  }
}
for (const file of [...directDeliveryAllowlist].filter((file) => ![
  'src/components/crm/SMSSendModal.tsx',
  'src/components/crm/SMSConversationPanel.tsx',
].includes(file))) {
  requireMatch(file, /getDeliveryRequestId[\s\S]*requestId[\s\S]*(?:withTimeout[\s\S]*45_000|nativeAdminCall)[\s\S]*clearDeliveryRequestId/, 'allowlisted direct delivery lacks stable request ID, timeout, or success cleanup');
}
requireMatch('src/lib/client-platform-api.ts', /uploadClientPlatformDocument[\s\S]*60_000/, 'native client document upload can spin forever');
for (const file of ['src/components/crm/SMSSendModal.tsx', 'src/components/crm/SMSConversationPanel.tsx']) {
  requireMatch(file, /getDeliveryRequestId[\s\S]*request_id: requestId[\s\S]*clearDeliveryRequestId/, 'native SMS delivery lacks stable request ID or success cleanup');
}
requireMatch('src/lib/native-admin-data.ts', /nativeAdminCall[\s\S]*AbortSignal\.timeout\(45_000\)/, 'native admin calls can spin forever');
requireMatch('server/taxiassur-platform-api.mjs', /adminLeadSms[\s\S]*request_id[\s\S]*AbortSignal\.timeout\(15_000\)/, 'native SMS delivery lacks idempotency or provider timeout');
const criticalDeploy = 'scripts/deploy-critical-supabase-security.ps1';
requireMatch(criticalDeploy, /ConfirmCriticalMigrationsApplied[\s\S]*20260810033000_add_monetico_creation_idempotency[\s\S]*20260810040000_create_communication_delivery_idempotency[\s\S]*20260810043000_harden_monetico_email_delivery_status[\s\S]*20260810050000_harden_client_claim_creation[\s\S]*Deployment aborted/, 'critical deployment does not fail closed before required migrations');
requireMatch(criticalDeploy, /'BREVO_API_KEY'[\s\S]*'TWILIO_ACCOUNT_SID'[\s\S]*'MONETICO_MAC_KEY'/, 'critical deployment omits provider secret preflight');
requireMatch(criticalDeploy, /'send-sms-brevo'[\s\S]*'send-crm-email'[\s\S]*'send-whatsapp'/, 'critical deployment omits an idempotent communication function');if (failures.length) {
  console.error(`Critical security verification failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Critical security invariants OK.');
