import { createServer } from 'node:http';
import { appendFileSync, createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import tls from 'node:tls';
import { createCipheriv, createDecipheriv, createHash, createHmac, createSign, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { createSession, hashPassword, verifyPassword, verifySession } from './native-auth.mjs';

process.on('uncaughtException', (error) => {
  console.log(`[taxiassur-platform-api] fatal uncaughtException: ${error?.stack || error}`);
  process.exit(1);
});
process.on('unhandledRejection', (error) => {
  console.log(`[taxiassur-platform-api] fatal unhandledRejection: ${error?.stack || error}`);
  process.exit(1);
});

const env = loadEnv([
  process.env.TAXIASSUR_PLATFORM_ENV_FILE,
  'F:/TaxiAssur/Secrets/taxiassur-platform-api.env',
  'F:/TaxiAssur/Secrets/postgresql.env',
  'F:/TaxiAssur/Secrets/mailxcr.env',
  'F:/TaxiAssur/Secrets/smtp.env',
  'F:/TaxiAssur/Secrets/email.env',
  'F:/TaxiAssur/Secrets/taxiassur-sms-api.env',
].filter(Boolean));

const config = {
  host: env.TAXIASSUR_PLATFORM_API_HOST || '127.0.0.1',
  port: positiveInt(env.TAXIASSUR_PLATFORM_API_PORT, 8796, 65535),
  dbHost: env.POSTGRES_HOST || '127.0.0.1',
  dbPort: env.POSTGRES_PORT || '5432',
  dbName: env.POSTGRES_DB || 'taxiassur',
  dbUser: env.TAXIASSUR_APP_USER || 'taxiassur_app',
  dbPassword: env.TAXIASSUR_APP_PASSWORD || '',
  psqlPath: env.ASSUR_LOCAL_PSQL_PATH || 'F:/TaxiAssur/PostgreSQL/runtime/pgsql/bin/psql.exe',
  internalToken: env.TAXIASSUR_PLATFORM_API_TOKEN || '',
  sessionSecret: env.TAXIASSUR_NATIVE_AUTH_SESSION_SECRET || env.TAXIASSUR_PLATFORM_API_TOKEN || '',
  documentRoot: env.TAXIASSUR_DOCUMENT_ROOT || 'F:/TaxiAssur/Documents',
  legacyDocumentRoot: env.TAXIASSUR_LEGACY_DOCUMENT_ROOT || 'F:/TaxiAssur/Documents/legacy',
  clamScanPath: env.CLAMSCAN_PATH || 'C:/Program Files/ClamAV/clamscan.exe',
  clamdScanPath: env.CLAMDSCAN_PATH || 'C:/Program Files/ClamAV/clamdscan.exe',
  clamdConfigPath: env.CLAMD_CONFIG_PATH || 'F:/TaxiAssur/ClamAV/clamd.conf',
  clamDatabasePath: env.CLAMSCAN_DATABASE_PATH || 'F:/TaxiAssur/ClamAV/db',
  smtpHost: env.SMTP_HOST || env.HMAIL_SMTP_HOST || env.IONOS_SMTP_HOST || 'mail.xcr.fr',
  smtpPort: positiveInt(env.SMTP_PORT || env.HMAIL_SMTP_PORT || env.IONOS_SMTP_PORT, 587, 65535),
  smtpUser: env.SMTP_USER || env.HMAIL_SMTP_USER || env.IONOS_EMAIL_USER || env.IONOS_SMTP_USER || 'team@taxiassur.com',
  smtpPassword: env.SMTP_PASS || env.HMAIL_SMTP_PASS || env.HMAIL_EMAIL_PASSWORD || env.IONOS_EMAIL_PASSWORD || env.IONOS_SMTP_PASSWORD || '',
  imapHost: env.IMAP_HOST || env.STALWART_IMAP_HOST || env.IONOS_IMAP_HOST || env.SMTP_HOST || env.HMAIL_SMTP_HOST || 'mail.xcr.fr',
  imapPort: positiveInt(env.IMAP_PORT || env.STALWART_IMAP_PORT || env.IONOS_IMAP_PORT, 993, 65535),
  imapUser: env.IMAP_USER || env.IMAP_USERNAME || env.IONOS_IMAP_USER || env.SMTP_USER || env.HMAIL_SMTP_USER || 'team@taxiassur.com',
  imapPassword: env.IMAP_PASS || env.IMAP_PASSWORD || env.IONOS_IMAP_PASSWORD || env.SMTP_PASS || env.HMAIL_SMTP_PASS || env.HMAIL_EMAIL_PASSWORD || '',
  openAiKey: env.OPENAI_API_KEY || '',
  indexNowKey: env.INDEXNOW_KEY || '',
  turnstileSecret: env.TURNSTILE_SECRET_KEY || '',
  smsEnabled: String(env.TAXIASSUR_SMS_ENABLED || '').toLowerCase() === 'true' && Boolean(env.BREVO_API_KEY),
  brevoApiKey: env.BREVO_API_KEY || '',
  smsSender: String(env.TAXIASSUR_SMS_SENDER || 'TaxiAssur').slice(0, 11),
  whatsappAccountSid: env.TWILIO_ACCOUNT_SID || '',
  whatsappAuthToken: env.TWILIO_AUTH_TOKEN || '',
  whatsappFrom: env.TWILIO_WHATSAPP_FROM || '',
  whatsappEnabled: Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM),
  turnstileAllowedHostnames: new Set((env.TURNSTILE_ALLOWED_HOSTNAMES || 'taxiassur.com,www.taxiassur.com,localhost').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)),
  moneticoMode: String(env.MONETICO_MODE || '').trim().toLowerCase(),
  moneticoTpe: env.MONETICO_MODE?.trim().toLowerCase() === 'test' ? (env.MONETICO_TEST_TPE || '') : (env.MONETICO_TPE || ''),
  moneticoCompany: env.MONETICO_MODE?.trim().toLowerCase() === 'test' ? (env.MONETICO_TEST_SOCIETE || '') : (env.MONETICO_SOCIETE || ''),
  moneticoKey: env.MONETICO_MODE?.trim().toLowerCase() === 'test' ? (env.MONETICO_TEST_MAC_KEY || '') : (env.MONETICO_MAC_KEY || env.MONETICO_KEY || ''),
  allowedOrigins: new Set((env.TAXIASSUR_PLATFORM_ALLOWED_ORIGINS || 'https://taxiassur.com,https://www.taxiassur.com,https://aviationassur.com,https://www.aviationassur.com,http://localhost:5173,http://localhost:4173').split(',').map((value) => value.trim().replace(/\/$/, '')).filter(Boolean)),
};

if (!config.dbPassword || config.internalToken.length < 32 || !existsSync(config.psqlPath)) {
  console.error('[taxiassur-platform-api] Invalid database, token, or psql configuration.');
  process.exit(1);
}

const maxUploadBytes = 10 * 1024 * 1024;
const tokenPattern = /^[0-9a-f]{64}$/i;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedMimeTypes = new Map([
  ['application/pdf', 'pdf'], ['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'],
  ['text/html', 'html'],
  ['application/msword', 'doc'], ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
]);
const allowedDocumentTypes = new Set(['licence_taxi', 'permis_conduire', 'piece_identite', 'carte_identite', 'carte_professionnelle', 'custom', 'carte_grise', 'releve_information', 'autorisation_stationnement', 'rib', 'kbis', 'carte_pro_vtc', 'inscription_registre_vtc', 'controle_technique', 'autre']);
const rateBuckets = new Map();
mkdirSync(config.documentRoot, { recursive: true });
mkdirSync(path.join(config.documentRoot, '.tmp'), { recursive: true });
mkdirSync(path.join(config.documentRoot, 'quarantine'), { recursive: true });

const server = createServer(async (req, res) => {
  const origin = String(req.headers.origin || '').replace(/\/$/, '');
  const requestId = randomUUID();
  try {
    if (req.method === 'OPTIONS') return await send(res, origin, 204, '', {}, requestId);
    if (!originAllowed(origin)) return await json(res, origin, 403, { ok: false, error: 'origin_not_allowed' }, requestId);
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (!takeRateSlot(`${clientIp(req)}:${rateLimitScope(url.pathname)}`)) return await json(res, origin, 429, { ok: false, error: 'rate_limited' }, requestId);
    if (req.method === 'GET' && url.pathname === '/health') {
      return await json(res, origin, 200, { ok: true, service: 'taxiassur-platform-api', storage: 'local', database: config.dbName, password_reset_mail: Boolean(config.smtpHost && config.smtpUser && config.smtpPassword), checked_at: new Date().toISOString() }, requestId);
    }
    if (req.method === 'POST' && url.pathname === '/v1/public/leads') return await createPublicLead(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/public/partnerships') return await createPublicPartnership(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/public/newsletter') return await publicNewsletter(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/public/newsletter/unsubscribe') return await publicNewsletterUnsubscribe(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/public/lead-magnet') return await publicLeadMagnet(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/public/analytics') return await publicAnalytics(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/public/page-views') return await publicAggregatePageView(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/public/conversions') return await publicConversion(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/public/chat') return await publicChat(req, res, origin, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/public/insurance-company') return await publicInsuranceCompany(res, origin, requestId, url);
    const publicCompanyLogoMatch = url.pathname.match(/^\/v1\/public\/company-logos\/([0-9a-f-]{36})$/i);
    if (req.method === 'GET' && publicCompanyLogoMatch) return await publicCompanyLogo(res, origin, requestId, publicCompanyLogoMatch[1]);
    const publicContentMatch = url.pathname.match(/^\/v1\/public\/content(?:\/([a-z0-9_]+))?$/i);
    if (req.method === 'GET' && publicContentMatch) return await publicNativeContent(res, origin, requestId, url, publicContentMatch[1] || '');
    if (req.method === 'POST' && url.pathname === '/v1/public/turnstile/verify') return await publicTurnstileVerify(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/public/payments/lookup') return await publicPaymentLookup(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/public/payments/form') return await publicPaymentForm(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/public/payments/webhook') return await publicPaymentWebhook(req, res, origin, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/prospect/session') return await prospectSession(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/prospect/access-email') return await prospectAccessEmail(req, res, origin, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/client/session') return await clientSession(req, res, origin, requestId);
    if (req.method === 'PATCH' && url.pathname === '/v1/client/notifications') return await clientNotificationsRead(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/client/requests') return await clientRequestCreate(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/client/referrals') return await clientReferralCreate(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/client/claims') return await clientClaimCreate(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/client/subscription') return await clientSubscriptionSave(req, res, origin, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/client/consents') return await clientConsentsGet(req, res, origin, requestId);
    if (req.method === 'PATCH' && url.pathname === '/v1/client/consents') return await clientConsentsPatch(req, res, origin, requestId);
    const clientPaymentEmailMatch=url.pathname.match(/^\/v1\/client\/payments\/([0-9a-f-]{36})\/email$/i);
    if (req.method === 'POST' && clientPaymentEmailMatch) return await clientPaymentEmail(req, res, origin, requestId, clientPaymentEmailMatch[1]);
    if (req.method === 'POST' && url.pathname === '/v1/auth/login') return await adminLogin(req, res, origin, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/auth/session') return await adminSession(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/auth/logout') return await adminLogout(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/auth/change-password') return await adminChangePassword(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/auth/request-password-reset') return await requestAdminPasswordReset(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/auth/reset-password') return await resetAdminPassword(req, res, origin, requestId);
    if (['GET','PATCH'].includes(req.method) && url.pathname === '/v1/admin/dashboard') return await adminDashboard(req, res, origin, requestId, url);
    if (req.method === 'GET' && url.pathname === '/v1/admin/crm-analytics') return await adminCrmAnalytics(req, res, origin, requestId, url);
    if (req.method === 'GET' && url.pathname === '/v1/admin/conversion-analytics') return await adminConversionAnalytics(req, res, origin, requestId, url);
    if (req.method === 'GET' && url.pathname === '/v1/admin/content') return await adminContent(req, res, origin, requestId, url);
    if (url.pathname === '/v1/admin/content-editor' && ['POST','PUT','DELETE'].includes(req.method)) return await adminContentEditor(req,res,origin,requestId,url);
    if (url.pathname === '/v1/admin/news' && ['GET','PATCH'].includes(req.method)) return await adminNews(req,res,origin,requestId,url);
    if (url.pathname === '/v1/admin/content-scheduler' && ['GET','PATCH'].includes(req.method)) return await adminContentScheduler(req,res,origin,requestId);
    if (url.pathname === '/v1/admin/content-scheduler/generate' && req.method === 'POST') return await adminSchedulerGenerate(req,res,origin,requestId);
    if (req.method === 'POST' && url.pathname === '/v1/admin/ai-content') return await adminAiContent(req,res,origin,requestId);
    if (req.method === 'GET' && url.pathname === '/v1/admin/qr-codes') return await adminQrCodes(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/admin/qr-codes/usage') return await adminQrUsage(req, res, origin, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/admin/notification-configs') return await adminNotificationConfigs(req, res, origin, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/admin/email-blacklist') return await adminEmailBlacklist(req, res, origin, requestId);
    if (url.pathname === '/v1/admin/ab-tests' && ['GET','POST','PATCH','DELETE'].includes(req.method)) return await adminAbTests(req,res,origin,requestId,url);
    if (url.pathname === '/v1/admin/newsletter-dashboard' && ['GET','POST'].includes(req.method)) return await adminNewsletterDashboard(req,res,origin,requestId,url);
    if (req.method === 'GET' && url.pathname === '/v1/admin/newsletter-subscribers') return await adminNewsletterSubscribers(req, res, origin, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/admin/email-advanced-analytics') return await adminEmailAdvancedAnalytics(req,res,origin,requestId,url);
    if (req.method === 'GET' && url.pathname === '/v1/admin/email-marketing-dashboard') return await adminEmailMarketingDashboard(req,res,origin,requestId);
    if (url.pathname === '/v1/admin/smart-templates' && ['GET','POST','PATCH','DELETE'].includes(req.method)) return await adminSmartTemplates(req,res,origin,requestId,url);
    if (url.pathname === '/v1/admin/content-opportunities' && ['GET','POST'].includes(req.method)) return await adminContentOpportunities(req,res,origin,requestId);
    if (url.pathname === '/v1/admin/email-tracking' && ['GET','POST'].includes(req.method)) return await adminEmailTracking(req, res, origin, requestId);
    if (req.method === 'PATCH' && url.pathname === '/v1/admin/newsletter-subscribers') return await adminNewsletterSubscribersPatch(req, res, origin, requestId);
    if (req.method === 'DELETE' && url.pathname === '/v1/admin/newsletter-subscribers') return await adminNewsletterSubscribersDelete(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/admin/email-blacklist') return await adminEmailBlacklistCreate(req, res, origin, requestId);
    const emailBlacklistMatch=url.pathname.match(/^\/v1\/admin\/email-blacklist\/([0-9a-f-]{36})$/i);
    if(emailBlacklistMatch&&req.method==='PATCH')return await adminEmailBlacklistPatch(req,res,origin,requestId,emailBlacklistMatch[1]);
    if(emailBlacklistMatch&&req.method==='DELETE')return await adminEmailBlacklistDelete(req,res,origin,requestId,emailBlacklistMatch[1]);
    const notificationConfigMatch=url.pathname.match(/^\/v1\/admin\/notification-configs\/([0-9a-f-]{36})$/i);
    if(notificationConfigMatch&&req.method==='PATCH')return await adminNotificationConfigPatch(req,res,origin,requestId,notificationConfigMatch[1]);
    if (url.pathname === '/v1/admin/crm-settings' && ['GET','PUT'].includes(req.method)) return await adminCrmSettings(req, res, origin, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/admin/access-control') return await adminAccessControl(req, res, origin, requestId, url);
    if (req.method === 'PUT' && url.pathname === '/v1/admin/access-control/user') return await adminUserUiPermissionPut(req, res, origin, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/admin/integrations') return await adminIntegrationsGet(req, res, origin, requestId);
    if (req.method === 'PUT' && url.pathname === '/v1/admin/integrations') return await adminIntegrationsPut(req, res, origin, requestId);
    if (url.pathname === '/v1/admin/gsc-autonomous' && ['GET','POST'].includes(req.method)) return await adminGscAutonomous(req,res,origin,requestId);
    if (req.method === 'GET' && url.pathname === '/v1/admin/gsc') return await adminGscData(req, res, origin, requestId, url);
    if (req.method === 'POST' && url.pathname === '/v1/admin/gsc/sync') return await adminGscSync(req, res, origin, requestId);
    if (url.pathname === '/v1/admin/ga4-seo' && ['GET','POST'].includes(req.method)) return await adminGa4Seo(req,res,origin,requestId);
    if (req.method === 'POST' && url.pathname === '/v1/admin/indexnow') return await adminIndexNow(req,res,origin,requestId);
    if (url.pathname === '/v1/admin/insurance-companies' && ['GET','POST'].includes(req.method)) return await adminInsuranceCompanies(req,res,origin,requestId);
    const insuranceCompanyMatch=url.pathname.match(/^\/v1\/admin\/insurance-companies\/([0-9a-f-]{36})(?:\/(logo|documents))?$/i);
    if(insuranceCompanyMatch&&['PATCH','DELETE','POST'].includes(req.method))return await adminInsuranceCompany(req,res,origin,requestId,insuranceCompanyMatch[1],insuranceCompanyMatch[2]||'');
    const companyDocumentMatchAdmin=url.pathname.match(/^\/v1\/admin\/company-documents\/([0-9a-f-]{36})(?:\/(download))?$/i);
    if(companyDocumentMatchAdmin&&['GET','PATCH','DELETE'].includes(req.method))return await adminCompanyDocument(req,res,origin,requestId,companyDocumentMatchAdmin[1],companyDocumentMatchAdmin[2]||'');    if (url.pathname === '/v1/admin/compliance' && ['GET','POST'].includes(req.method)) return await adminCompliance(req,res,origin,requestId);
    if (url.pathname === '/v1/admin/whatsapp' && ['GET','POST','PATCH'].includes(req.method)) return await adminWhatsapp(req,res,origin,requestId,url);
    if (req.method === 'GET' && url.pathname === '/v1/admin/capabilities') return await adminCapabilities(req, res, origin, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/admin/clients') return await adminClientsList(req, res, origin, requestId);
    if (url.pathname === '/v1/admin/web-import' && ['GET','POST'].includes(req.method)) return await adminWebImport(req,res,origin,requestId);
    const adminClientDetailMatch = url.pathname.match(/^\/v1\/admin\/clients\/([0-9a-f-]{36})\/detail$/i);
    if (adminClientDetailMatch && req.method === 'GET') return await adminClientDetail(req, res, origin, requestId, adminClientDetailMatch[1]);
    const adminClientResourceMatch = url.pathname.match(/^\/v1\/admin\/clients\/([0-9a-f-]{36})\/(profile|tasks|contracts|claims|alerts)(?:\/([0-9a-f-]{36}))?$/i);
    if (adminClientResourceMatch && ['POST','PUT','PATCH','DELETE'].includes(req.method)) return await adminClientResource(req, res, origin, requestId, adminClientResourceMatch[1], adminClientResourceMatch[2], adminClientResourceMatch[3] || '');
    if (req.method === 'GET' && url.pathname === '/v1/admin/claims') return await adminClaimsList(req, res, origin, requestId, url);
    if (req.method === 'GET' && url.pathname === '/v1/admin/quote-queue') return await adminQuoteQueue(req,res,origin,requestId);
    const quoteQueueMatch=url.pathname.match(/^\/v1\/admin\/quote-queue\/([0-9a-f-]{36})$/i);
    if(quoteQueueMatch&&req.method==='PATCH')return await adminQuoteQueuePatch(req,res,origin,requestId,quoteQueueMatch[1]);
    if (req.method === 'GET' && url.pathname === '/v1/admin/quotes') return await adminQuotesList(req, res, origin, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/admin/payments') return await adminPaymentsList(req, res, origin, requestId, url);
    if (req.method === 'POST' && url.pathname === '/v1/admin/payments') return await adminPaymentCreate(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/admin/payments/report-email') return await adminPaymentReportEmail(req, res, origin, requestId);
    const adminPaymentMatch = url.pathname.match(/^\/v1\/admin\/payments\/([0-9a-f-]{36})(?:\/(email))?$/i);
    if (adminPaymentMatch && req.method === 'POST' && adminPaymentMatch[2] === 'email') return await adminPaymentEmail(req, res, origin, requestId, adminPaymentMatch[1]);
    if (adminPaymentMatch && req.method === 'PATCH' && !adminPaymentMatch[2]) return await adminPaymentPatch(req, res, origin, requestId, adminPaymentMatch[1]);
    if (adminPaymentMatch && req.method === 'DELETE' && !adminPaymentMatch[2]) return await adminPaymentDelete(req, res, origin, requestId, adminPaymentMatch[1]);
    const adminClaimMatch = url.pathname.match(/^\/v1\/admin\/claims\/([0-9a-f-]{36})$/i);
    if (adminClaimMatch && req.method === 'PATCH') return await adminClaimPatch(req, res, origin, requestId, adminClaimMatch[1]);
    if (url.pathname === '/v1/admin/retention' && ['GET','PATCH'].includes(req.method)) return await adminRetention(req, res, origin, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/admin/commercial/notifications') return await adminCommercialNotifications(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/admin/commercial/ai-assistant') return await adminCommercialAiAssistant(req, res, origin, requestId);
    const commercialEmailMatch=url.pathname.match(/^\/v1\/admin\/leads\/([^/]{1,200})\/commercial-email$/i);
    if(commercialEmailMatch&&req.method==='POST')return await adminLeadCommercialEmail(req,res,origin,requestId,decodeURIComponent(commercialEmailMatch[1]));
    const commercialSuggestionMatch=url.pathname.match(/^\/v1\/admin\/commercial\/suggestions\/([^/]+)$/i);
    if(commercialSuggestionMatch&&req.method==='PATCH')return await adminCommercialSuggestion(req,res,origin,requestId,commercialSuggestionMatch[1]);
    if (url.pathname === '/v1/admin/inbox' && ['GET','PATCH'].includes(req.method)) return await adminInbox(req, res, origin, requestId, url);
    if (url.pathname === '/v1/admin/inbox/sync' && req.method === 'POST') return await adminInboxSync(req,res,origin,requestId);
    if (url.pathname === '/v1/admin/inbox/intelligent' && ['GET','POST'].includes(req.method)) return await adminInboxIntelligent(req,res,origin,requestId,url);
    if (req.method === 'POST' && url.pathname === '/v1/admin/inbox/workflow') return await adminInboxWorkflow(req, res, origin, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/admin/pipeline/notifications') return await adminPipelineNotifications(req, res, origin, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/admin/leads/duplicates') return await adminLeadDuplicates(req,res,origin,requestId);
    if (req.method === 'POST' && url.pathname === '/v1/admin/leads/merge') return await adminMergeLeads(req, res, origin, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/admin/leads') return await adminLeadsList(req, res, origin, requestId, url);
    if (req.method === 'POST' && url.pathname === '/v1/admin/leads') return await adminLeadCreate(req, res, origin, requestId);
    if (req.method === 'GET' && url.pathname === '/v1/admin/users') return await adminUsersList(req, res, origin, requestId);
    if (req.method === 'POST' && url.pathname === '/v1/admin/users') return await adminUserCreate(req, res, origin, requestId);
    const adminUserAction=url.pathname.match(/^\/v1\/admin\/users\/([0-9a-f-]{36})(?:\/(permissions|invite|password-reset))?$/i);
    if(adminUserAction&&req.method==='PATCH'&&!adminUserAction[2])return await adminUserPatch(req,res,origin,requestId,adminUserAction[1]);
    if(adminUserAction&&req.method==='DELETE'&&!adminUserAction[2])return await adminUserDelete(req,res,origin,requestId,adminUserAction[1]);
    if(adminUserAction&&req.method==='PUT'&&adminUserAction[2]==='permissions')return await adminUserPermissionsPut(req,res,origin,requestId,adminUserAction[1]);
    if(adminUserAction&&req.method==='POST'&&adminUserAction[2]==='invite')return await adminUserInvite(req,res,origin,requestId,adminUserAction[1]);
    if(adminUserAction&&req.method==='POST'&&adminUserAction[2]==='password-reset')return await adminUserPasswordReset(req,res,origin,requestId,adminUserAction[1]);
    if (url.pathname === '/v1/admin/ai-autonomous' && ['GET','POST','PATCH'].includes(req.method)) return await adminAiAutonomous(req,res,origin,requestId);
    if (url.pathname === '/v1/admin/master-ai' && ['GET','POST'].includes(req.method)) return await adminMasterAi(req,res,origin,requestId);
    if (url.pathname === '/v1/admin/automation-center' && ['GET','POST','PATCH'].includes(req.method)) return await adminAutomationCenter(req,res,origin,requestId);
    if (url.pathname === '/v1/admin/automation-dashboard' && ['GET','POST','PATCH'].includes(req.method)) return await adminAutomationDashboard(req,res,origin,requestId);
    if (url.pathname === '/v1/admin/ultron' && req.method === 'POST') return await adminUltron(req,res,origin,requestId);
    if (url.pathname === '/v1/admin/backlinks/prepare' && req.method === 'POST') return await adminBacklinksPrepare(req,res,origin,requestId);
    if (url.pathname === '/v1/admin/backlinks' && ['GET','POST','PATCH'].includes(req.method)) return await adminBacklinks(req,res,origin,requestId);
    if (url.pathname === '/v1/admin/backlinks/dashboard' && req.method === 'GET') return await adminBacklinksDashboard(req,res,origin,requestId);
    if (url.pathname === '/v1/admin/seo' && req.method === 'GET') return await adminSeo(req,res,origin,requestId);
    if (url.pathname === '/v1/admin/outreach/prepare' && req.method === 'POST') return await adminOutreachPrepare(req,res,origin,requestId);
    if (url.pathname === '/v1/admin/llm' && req.method === 'POST') return await adminLlm(req,res,origin,requestId);
    if (url.pathname === '/v1/admin/ai-governance' && req.method === 'GET') return await adminAiGovernance(req, res, origin, requestId, url);
    if (url.pathname === '/v1/admin/ai-governance/settings' && ['GET','PATCH'].includes(req.method)) return await adminAiGovernanceSettings(req, res, origin, requestId);
    if (url.pathname === '/v1/admin/ai-governance/generate' && req.method === 'POST') return await adminAiGovernanceGenerate(req, res, origin, requestId);
    const aiDecisionMatch = url.pathname.match(/^\/v1\/admin\/ai-decisions\/([0-9a-f-]{36})$/i);
    if (aiDecisionMatch && req.method === 'PATCH') return await adminAiDecisionPatch(req, res, origin, requestId, aiDecisionMatch[1]);
    const adminDocumentCollectionMatch = url.pathname.match(/^\/v1\/admin\/leads\/([^/]{1,200})\/document-collection$/i);
    if (adminDocumentCollectionMatch && ['GET','POST'].includes(req.method)) return await adminDocumentCollection(req, res, origin, requestId, decodeURIComponent(adminDocumentCollectionMatch[1]));
    const adminDocumentWorkspaceMatch = url.pathname.match(/^\/v1\/admin\/leads\/([^/]{1,200})\/document-workspace$/i);
    if (adminDocumentWorkspaceMatch && ['GET','POST'].includes(req.method)) return await adminDocumentWorkspace(req, res, origin, requestId, decodeURIComponent(adminDocumentWorkspaceMatch[1]));
    const adminDocumentWorkspaceUploadMatch = url.pathname.match(/^\/v1\/admin\/leads\/([^/]{1,200})\/document-workspace\/upload$/i);
    if (adminDocumentWorkspaceUploadMatch && req.method === 'POST') return await adminDocumentWorkspaceUpload(req, res, origin, requestId, decodeURIComponent(adminDocumentWorkspaceUploadMatch[1]));
    const adminLeadContractUploadMatch = url.pathname.match(/^\/v1\/admin\/leads\/([^/]{1,200})\/contract-documents$/i);
    if (adminLeadContractUploadMatch && req.method === 'POST') return await uploadAdminContractDocument(req, res, origin, requestId, decodeURIComponent(adminLeadContractUploadMatch[1]));
    const adminLeadRibsMatch = url.pathname.match(/^\/v1\/admin\/leads\/([^/]{1,200})\/ribs(?:\/([0-9a-f-]{36}))?(?:\/(download))?$/i);
    if (adminLeadRibsMatch) adminLeadRibsMatch[1] = decodeURIComponent(adminLeadRibsMatch[1]);
    if (adminLeadRibsMatch && req.method === 'GET' && !adminLeadRibsMatch[2]) return await adminLeadRibsList(req, res, origin, requestId, adminLeadRibsMatch[1]);
    if (adminLeadRibsMatch && req.method === 'POST' && !adminLeadRibsMatch[2]) return await adminLeadRibUpload(req, res, origin, requestId, adminLeadRibsMatch[1]);
    if (adminLeadRibsMatch && req.method === 'PATCH' && adminLeadRibsMatch[2]) return await adminLeadRibPatch(req, res, origin, requestId, adminLeadRibsMatch[1], adminLeadRibsMatch[2]);
    if (adminLeadRibsMatch && req.method === 'DELETE' && adminLeadRibsMatch[2]) return await adminLeadRibDelete(req, res, origin, requestId, adminLeadRibsMatch[1], adminLeadRibsMatch[2]);
    if (adminLeadRibsMatch && req.method === 'GET' && adminLeadRibsMatch[2] && adminLeadRibsMatch[3] === 'download') return await adminLeadRibDownload(req, res, origin, requestId, adminLeadRibsMatch[1], adminLeadRibsMatch[2]);
    const adminLeadRibEmailMatch = url.pathname.match(/^\/v1\/admin\/leads\/([^/]{1,200})\/ribs\/email-request$/i);
    if (adminLeadRibEmailMatch && req.method === 'POST') return await adminLeadRibEmailRequest(req, res, origin, requestId, decodeURIComponent(adminLeadRibEmailMatch[1]));
    // Restored PostgreSQL records can use historical non-UUID record_id values.
    // This exact detail route accepts one encoded path segment; SQL quoting and
    // authenticated access remain enforced by adminLeadGet/adminLeadPatch.
    const adminLeadMatch = url.pathname.match(/^\/v1\/admin\/leads\/([^/]{1,200})$/i);
    const adminLeadSummaryMatch = url.pathname.match(/^\/v1\/admin\/leads\/([0-9a-f-]{36})\/summary$/i);
    if (adminLeadSummaryMatch && req.method === 'GET') return await adminLeadSummary(req, res, origin, requestId, adminLeadSummaryMatch[1]);
    const adminLeadAccessEmailMatch = url.pathname.match(/^\/v1\/admin\/leads\/([0-9a-f-]{36})\/access-email$/i);
    if (adminLeadAccessEmailMatch && req.method === 'POST') return await adminLeadAccessEmail(req, res, origin, requestId, adminLeadAccessEmailMatch[1]);
    if(url.pathname==='/v1/admin/insurer-dossiers'&&req.method==='GET')return await adminInsurerDossiersList(req,res,origin,requestId);
    const adminInsurerDossierMatch=url.pathname.match(/^\/v1\/admin\/leads\/([0-9a-f-]{36})\/insurer-dossier$/i);
    if(adminInsurerDossierMatch&&['GET','POST','PATCH'].includes(req.method))return await adminInsurerDossier(req,res,origin,requestId,adminInsurerDossierMatch[1]);
    const adminLeadQuoteSignatureMatch=url.pathname.match(/^\/v1\/admin\/leads\/([^/]{1,200})\/quote-signature$/i);
    if(adminLeadQuoteSignatureMatch&&['GET','PATCH'].includes(req.method))return await adminLeadQuoteSignature(req,res,origin,requestId,decodeURIComponent(adminLeadQuoteSignatureMatch[1]));
    const adminLeadContractSignatureMatch=url.pathname.match(/^\/v1\/admin\/leads\/([^/]{1,200})\/contract-signature$/i);
    if(adminLeadContractSignatureMatch&&['GET','PATCH'].includes(req.method))return await adminLeadContractSignature(req,res,origin,requestId,decodeURIComponent(adminLeadContractSignatureMatch[1]));
    const adminLeadTimelineMatch=url.pathname.match(/^\/v1\/admin\/leads\/([0-9a-f-]{36})\/timeline$/i);
    if(adminLeadTimelineMatch&&['GET','POST'].includes(req.method))return await adminLeadTimeline(req,res,origin,requestId,adminLeadTimelineMatch[1]);
    const adminLeadSmsMatch=url.pathname.match(/^\/v1\/admin\/leads\/([^/]{1,200})\/sms$/i);
    if(adminLeadSmsMatch&&['GET','POST'].includes(req.method))return await adminLeadSms(req,res,origin,requestId,decodeURIComponent(adminLeadSmsMatch[1]));
    const adminLeadWhatsAppMatch=url.pathname.match(/^\/v1\/admin\/leads\/([^/]{1,200})\/whatsapp$/i);
    if(adminLeadWhatsAppMatch&&req.method==='POST')return await adminLeadWhatsApp(req,res,origin,requestId,decodeURIComponent(adminLeadWhatsAppMatch[1]));
    const adminLeadQuotesWorkspaceMatch = url.pathname.match(/^\/v1\/admin\/leads\/([^/]{1,200})\/quotes-workspace$/i);
    if (adminLeadQuotesWorkspaceMatch && req.method === 'GET') return await adminLeadQuotesWorkspace(req, res, origin, requestId, decodeURIComponent(adminLeadQuotesWorkspaceMatch[1]));
    const adminLeadQuoteMatch = url.pathname.match(/^\/v1\/admin\/leads\/([^/]{1,200})\/quotes\/([0-9a-f-]{36})$/i);
    if (adminLeadQuoteMatch && req.method === 'PATCH') return await adminLeadQuotePatch(req, res, origin, requestId, decodeURIComponent(adminLeadQuoteMatch[1]), adminLeadQuoteMatch[2]);
    const adminLeadQuoteDocumentMatch=url.pathname.match(/^\/v1\/admin\/leads\/([^/]{1,200})\/quotes\/([0-9a-f-]{36})\/document$/i);
    if(adminLeadQuoteDocumentMatch)adminLeadQuoteDocumentMatch[1]=decodeURIComponent(adminLeadQuoteDocumentMatch[1]);
    if(adminLeadQuoteDocumentMatch&&req.method==='POST')return await adminLeadQuoteDocumentUpload(req,res,origin,requestId,adminLeadQuoteDocumentMatch[1],adminLeadQuoteDocumentMatch[2]);
    if(adminLeadQuoteDocumentMatch&&req.method==='GET')return await adminLeadQuoteDocumentDownload(req,res,origin,requestId,adminLeadQuoteDocumentMatch[1],adminLeadQuoteDocumentMatch[2]);
    if(adminLeadQuoteDocumentMatch&&req.method==='DELETE')return await adminLeadQuoteDocumentDelete(req,res,origin,requestId,adminLeadQuoteDocumentMatch[1],adminLeadQuoteDocumentMatch[2]);
    const adminLeadQuoteEmailMatch=url.pathname.match(/^\/v1\/admin\/leads\/([^/]{1,200})\/quotes\/([0-9a-f-]{36})\/email$/i);
    if(adminLeadQuoteEmailMatch&&req.method==='POST')return await adminLeadQuoteEmail(req,res,origin,requestId,decodeURIComponent(adminLeadQuoteEmailMatch[1]),adminLeadQuoteEmailMatch[2]);
    if (adminLeadMatch && req.method === 'GET') return await adminLeadGet(req, res, origin, requestId, decodeURIComponent(adminLeadMatch[1]));
    if (adminLeadMatch && req.method === 'PATCH') return await adminLeadPatch(req, res, origin, requestId, decodeURIComponent(adminLeadMatch[1]));
    if (adminLeadMatch && req.method === 'DELETE') return await adminLeadDelete(req, res, origin, requestId, decodeURIComponent(adminLeadMatch[1]));
    if (req.method === 'GET' && url.pathname === '/v1/admin/documents') return await adminDocuments(req, res, origin, requestId, url);
    if (req.method === 'POST' && url.pathname === '/v1/admin/documents/open') return await adminDocumentOpen(req, res, origin, requestId);
    const adminDocumentMatch=url.pathname.match(/^\/v1\/admin\/documents\/([0-9a-f-]{36})(\/download)?$/i);
    if(adminDocumentMatch&&req.method==='PATCH'&&!adminDocumentMatch[2])return await adminDocumentPatch(req,res,origin,requestId,adminDocumentMatch[1]);
    if(adminDocumentMatch&&req.method==='DELETE'&&!adminDocumentMatch[2])return await adminDocumentDelete(req,res,origin,requestId,adminDocumentMatch[1]);
    if(adminDocumentMatch&&req.method==='GET'&&adminDocumentMatch[2])return await adminDocumentDownload(req,res,origin,requestId,adminDocumentMatch[1]);
    if (req.method === 'POST' && url.pathname === '/v1/prospect/documents') return await uploadProspectDocument(req, res, origin, requestId);
    const downloadMatch = url.pathname.match(/^\/v1\/prospect\/documents\/([0-9a-f-]{36})\/download$/i);
    if (req.method === 'GET' && downloadMatch) return await downloadProspectDocument(req, res, origin, requestId, downloadMatch[1]);
    const finalDownloadMatch = url.pathname.match(/^\/v1\/prospect\/final-documents\/([0-9a-f-]{36})\/download$/i);
    if (req.method === 'GET' && finalDownloadMatch) return await downloadProspectFinalDocument(req, res, origin, requestId, finalDownloadMatch[1]);
    const quoteMatch = url.pathname.match(/^\/v1\/prospect\/quotes\/([0-9a-f-]{36})(\/download)?$/i);
    if (req.method === 'PATCH' && quoteMatch && !quoteMatch[2]) return await updateProspectQuote(req, res, origin, requestId, quoteMatch[1]);
    if (req.method === 'GET' && quoteMatch?.[2]) return await downloadProspectQuote(req, res, origin, requestId, quoteMatch[1]);
    const companyDocumentMatch = url.pathname.match(/^\/v1\/prospect\/company-documents\/([0-9a-f-]{36})\/download$/i);
    if (req.method === 'GET' && companyDocumentMatch) return await downloadProspectCompanyDocument(req, res, origin, requestId, companyDocumentMatch[1]);
    const nativeAutomationMatch = url.pathname.match(/^\/v1\/automations\/([a-z0-9-]+)$/i);
    if (nativeAutomationMatch && req.method === 'POST') return await nativeAutomationUnavailable(req, res, origin, requestId, nativeAutomationMatch[1]);
    if (url.pathname.startsWith('/v1/internal/') && !internalAuthorized(req)) return await json(res, origin, 401, { ok: false, error: 'unauthorized' }, requestId);
    return await json(res, origin, 404, { ok: false, error: 'not_found' }, requestId);
  } catch (error) {
    console.error('[taxiassur-platform-api]', { requestId, method: req.method, url: req.url, error: error instanceof Error ? error.message : 'unknown' });
    try {
      appendFileSync('F:/TaxiAssur/Logs/platform-api-errors.log', `${JSON.stringify({ at: new Date().toISOString(), requestId, method: req.method, url: req.url, error: error instanceof Error ? error.message : 'unknown' })}\n`, 'utf8');
    } catch {}
    return await json(res, origin, error.statusCode || 500, { ok: false, error: error.publicCode || 'server_error' }, requestId);
  }
});

async function hydrateStoredIntegrations(){
  try{
    for(const name of ['brevo','openai','monetico','smtp','turnstile']){
      const row=await integrationRecord(name);
      if(!row?.secret_encrypted)continue;
      const secret=decryptPrivateValue(row.secret_encrypted);
      if(!secret)continue;
      const fields=row.fields||{};
      if(name==='brevo'){config.brevoApiKey=secret;config.smsSender=String(fields.sms_sender||config.smsSender||'TaxiAssur').slice(0,11);config.smsEnabled=true;}
      if(name==='openai')config.openAiKey=secret;
      if(name==='monetico'){config.moneticoMode=String(fields.mode||config.moneticoMode||'production').toLowerCase();config.moneticoTpe=String(fields.tpe||config.moneticoTpe||'');config.moneticoCompany=String(fields.company||config.moneticoCompany||'');config.moneticoKey=secret;}
      if(name==='smtp'){config.smtpHost=String(fields.host||config.smtpHost);config.smtpPort=positiveInt(fields.port,config.smtpPort,65535);config.smtpUser=String(fields.user||config.smtpUser);config.smtpPassword=secret;}
      if(name==='turnstile')config.turnstileSecret=secret;
    }
  }catch(error){console.error('[taxiassur-platform-api] integration hydration failed',error instanceof Error?error.message:'unknown');}
}

hydrateStoredIntegrations().then(reclassifyKnownPartners).then(cleanupAutoEmailLeads).catch(error=>console.error('[startup-maintenance]',error?.message||error)).finally(()=>server.listen(config.port, config.host, () => console.log(`[taxiassur-platform-api] listening on http://${config.host}:${config.port}`)));

let quoteQueueCache=null;
async function adminQuoteQueue(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) SELECT 'ready_for_quote_queue',md5('quote-queue:'||l.record_id)::uuid,jsonb_build_object('id',md5('quote-queue:'||l.record_id)::uuid,'lead_id',l.record_id,'priority_score',CASE WHEN COALESCE(l.data->>'ai_qualification_score','')~'^[0-9]+(\\.[0-9]+)?$' THEN (l.data->>'ai_qualification_score')::numeric ELSE 50 END,'estimated_value',0,'documents_verified',true,'recommended_companies','[]'::jsonb,'status','waiting','added_at',COALESCE(l.data->>'updated_at',l.data->>'created_at',now()::text)),'native-auto' FROM taxiassur.records l WHERE l.collection='crm_leads' AND lower(COALESCE(l.data->>'current_stage_key',l.data->>'pipeline_stage',''))='ready_for_quote' AND COALESCE(l.data->>'deleted_at','')='' AND COALESCE((l.data->>'is_archived')::boolean,false)=false ON CONFLICT(collection,record_id) DO NOTHING;`);
  let payload=quoteQueueCache&&Date.now()-quoteQueueCache.createdAt<15_000?quoteQueueCache.payload:null;
  if(!payload)payload=parseJsonLine(await runPsql(`
    WITH active AS (
      SELECT record_id,data,lower(COALESCE(data->>'current_stage_key',data->>'pipeline_stage','unknown')) stage
      FROM taxiassur.records
      WHERE collection='crm_leads' AND COALESCE(data->>'deleted_at','')='' AND COALESCE((data->>'is_archived')::boolean,false)=false
    ), queue_rows AS (
      SELECT q.data||jsonb_build_object(
        'priority_score',CASE WHEN q.data->>'priority_score'~'^-?[0-9]+(\\.[0-9]+)?$' THEN (q.data->>'priority_score')::numeric ELSE 0 END,
        'estimated_value',CASE WHEN q.data->>'estimated_value'~'^-?[0-9]+(\\.[0-9]+)?$' THEN (q.data->>'estimated_value')::numeric ELSE 0 END,
        'added_at',COALESCE(q.data->>'added_at',q.data->>'created_at','1970-01-01T00:00:00.000Z'),
        'status',lower(COALESCE(q.data->>'status','waiting')),
        'lead',a.data
      ) item
      FROM taxiassur.records q JOIN active a ON a.record_id=q.data->>'lead_id'
      WHERE q.collection='ready_for_quote_queue' AND COALESCE(q.data->>'id','')<>'' AND COALESCE(q.data->>'lead_id','')<>'' AND lower(COALESCE(q.data->>'status','waiting')) IN ('waiting','claimed','in_progress')
      ORDER BY CASE WHEN q.data->>'priority_score'~'^-?[0-9]+(\\.[0-9]+)?$' THEN (q.data->>'priority_score')::numeric ELSE 0 END DESC,COALESCE(q.data->>'added_at',q.data->>'created_at','') ASC
      LIMIT 100
    ), stage_rows AS (SELECT stage,count(*) count FROM active GROUP BY stage), approaching AS (
      SELECT data FROM active WHERE COALESCE((data->>'documents_complete')::boolean,false)=false AND stage IN('collecte_documents','documents_required','documents_partial') ORDER BY COALESCE(data->>'created_at','') ASC LIMIT 8
    ) SELECT jsonb_build_object(
      'queue',COALESCE((SELECT jsonb_agg(item) FROM queue_rows),'[]'::jsonb),
      'total_leads',(SELECT count(*) FROM active),
      'stage_counts',COALESCE((SELECT jsonb_object_agg(stage,count) FROM stage_rows),'{}'::jsonb),
      'approaching_leads',COALESCE((SELECT jsonb_agg(data) FROM approaching),'[]'::jsonb)
    )::text;
  `))||{};
  if(!quoteQueueCache||quoteQueueCache.payload!==payload)quoteQueueCache={createdAt:Date.now(),payload};
  const stageCounts=payload.stage_counts||{},quotePending=Number(stageCounts.quote_pending||0)+Number(stageCounts.quote_sent||0)+Number(stageCounts.devis||0),docs=Number(stageCounts.collecte_documents||0)+Number(stageCounts.documents_required||0)+Number(stageCounts.documents_partial||0);
  return json(res,origin,200,{ok:true,queue:payload.queue||[],current_user_id:session.sub,stats:{total_leads:Number(payload.total_leads||0),ready_for_quote:Number(stageCounts.ready_for_quote||0),quote_pending:quotePending,documents_collecting:docs,avg_time_to_quote_hours:0},stage_counts:stageCounts,approaching_leads:payload.approaching_leads||[]},requestId);
}
async function adminQuoteQueuePatch(req,res,origin,requestId,id){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const body=await readJsonBody(req),action=String(body.action||'');const item=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='ready_for_quote_queue' AND record_id=${quoteLiteral(id)} LIMIT 1;`));if(!item)return json(res,origin,404,{ok:false,error:'not_found'},requestId);const now=new Date().toISOString();if(action==='claim'){const updates={claimed_by:session.sub,claimed_at:now,status:'claimed'};await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='ready_for_quote_queue' AND record_id=${quoteLiteral(id)};`);quoteQueueCache=null;return json(res,origin,200,{ok:true},requestId);}if(action==='start'){const updates={status:'in_progress',started_by:session.sub,started_at:now};await runPsql(`BEGIN;UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='ready_for_quote_queue' AND record_id=${quoteLiteral(id)};UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({current_stage_key:'quote_pending',updated_at:now}))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='crm_leads' AND record_id=${quoteLiteral(String(item.lead_id))};COMMIT;`);quoteQueueCache=null;return json(res,origin,200,{ok:true},requestId);}return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);}
async function adminQuotesList(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);
  if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const [quotes,leads,companies]=await Promise.all([recordsAll('lead_company_quotes'),recordsAll('crm_leads'),recordsAll('insurance_companies')]);
  const result=quotes.map(function(row){
    const lead=leads.find(function(item){return String(item.id)===String(row.lead_id);})||null;
    const company=companies.find(function(item){return String(item.id)===String(row.company_id||row.insurance_company_id);})||null;
    return Object.assign({},row,{lead:lead?{first_name:lead.first_name||'',last_name:lead.last_name||'',email:lead.email||'',phone:lead.phone||'',vehicle_type:lead.vehicle_type||'',status:lead.status||lead.lead_status||'',pipeline_stage:lead.pipeline_stage||''}:null,company:company?{name:company.name||company.company_name||'',logo_url:company.logo_url||null}:null});
  }).sort(function(a,b){return String(b.created_at||'').localeCompare(String(a.created_at||''));});
  return json(res,origin,200,{ok:true,quotes:result},requestId);
}
async function adminClientDetail(req,res,origin,requestId,leadId){
  const session=await verifiedAdminSession(req);
  if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const client=(await recordsAllWithMirror('crm_leads')).find(row=>String(row.id)===String(leadId));
  if(!client)return json(res,origin,404,{ok:false,error:'not_found'},requestId);
  const names=['client_taxi_profiles','insurance_contracts','crm_lead_documents','insurance_claims','client_tasks','client_alerts','monetico_payments','crm_interactions','crm_event_notifications'];
  const rows={};
  await Promise.all(names.map(async function(name){rows[name]=await recordsWhereWithMirror(name,'lead_id',leadId);}));
  const sortDesc=function(items,key){return items.sort(function(a,b){return String(b[key]||b.created_at||'').localeCompare(String(a[key]||a.created_at||''));});};
  const tasks=rows.client_tasks.filter(function(row){return row.status!=='completed';}).sort(function(a,b){return String(a.due_date||'9999').localeCompare(String(b.due_date||'9999'));});
  const alerts=rows.client_alerts.filter(function(row){return row.dismissed!==true;}).sort(function(a,b){return String(a.trigger_date||'').localeCompare(String(b.trigger_date||''));});
  return json(res,origin,200,{ok:true,detail:{client:client,taxi_profile:rows.client_taxi_profiles[0]||{},contracts:sortDesc(rows.insurance_contracts,'created_at'),documents:sortDesc(rows.crm_lead_documents,'created_at'),claims:sortDesc(rows.insurance_claims,'claim_date'),tasks:tasks,alerts:alerts,payments:sortDesc(rows.monetico_payments,'created_at'),interactions:sortDesc(rows.crm_interactions,'created_at').slice(0,50),notifications:sortDesc(rows.crm_event_notifications,'created_at').slice(0,50)}},requestId);
}

async function adminClientResource(req,res,origin,requestId,leadId,resource,resourceId){
  const session=await verifiedAdminSession(req);
  if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const map={profile:'client_taxi_profiles',tasks:'client_tasks',contracts:'insurance_contracts',claims:'insurance_claims',alerts:'client_alerts'};
  const collection=map[resource];
  if(!collection)return json(res,origin,404,{ok:false,error:'not_found'},requestId);
  const body=req.method==='DELETE'?{}:await readJsonBody(req);
  if(resource==='profile'){
    const current=(await recordsWhere(collection,'lead_id',leadId))[0];
    const id=String(current?.id||randomUUID()),now=new Date().toISOString();
    const row=Object.assign({},current||{id:id,lead_id:leadId,created_at:now},body,{id:id,lead_id:leadId,updated_at:now});
    await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES(${quoteLiteral(collection)},${quoteLiteral(id)},${quoteLiteral(JSON.stringify(row))}::jsonb,'admin') ON CONFLICT(collection,record_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now(),revision=taxiassur.records.revision+1;`);
    return json(res,origin,200,{ok:true,resource:row},requestId);
  }
  if(req.method==='POST'){
    const id=randomUUID(),now=new Date().toISOString(),row=Object.assign({},body,{id:id,lead_id:leadId,created_at:now,updated_at:now});
    await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES(${quoteLiteral(collection)},${quoteLiteral(id)},${quoteLiteral(JSON.stringify(row))}::jsonb,'admin');`);
    return json(res,origin,201,{ok:true,resource:row},requestId);
  }
  if(!resourceId)return json(res,origin,400,{ok:false,error:'resource_id_required'},requestId);
  const current=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection=${quoteLiteral(collection)} AND record_id=${quoteLiteral(resourceId)} AND data->>'lead_id'=${quoteLiteral(leadId)} LIMIT 1;`));
  if(!current)return json(res,origin,404,{ok:false,error:'not_found'},requestId);
  if(req.method==='DELETE'){
    await runPsql(`DELETE FROM taxiassur.records WHERE collection=${quoteLiteral(collection)} AND record_id=${quoteLiteral(resourceId)} AND data->>'lead_id'=${quoteLiteral(leadId)};`);
    return json(res,origin,200,{ok:true},requestId);
  }
  const row=Object.assign({},current,body,{id:resourceId,lead_id:leadId,updated_at:new Date().toISOString()});
  await runPsql(`UPDATE taxiassur.records SET data=${quoteLiteral(JSON.stringify(row))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection=${quoteLiteral(collection)} AND record_id=${quoteLiteral(resourceId)};`);
  return json(res,origin,200,{ok:true,resource:row},requestId);
}
async function adminCapabilities(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);
  if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  return json(res,origin,200,{ok:true,capabilities:{email:Boolean(config.smtpHost&&config.smtpUser&&config.smtpPassword),sms:config.smsEnabled,whatsapp:config.whatsappEnabled}},requestId);
}
async function adminLeadQuotesWorkspace(req,res,origin,requestId,leadId){
  const session=await verifiedAdminSession(req);
  if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const lead=parseJsonLine(await runPsql(`SELECT (data || jsonb_build_object('id',record_id))::text
    FROM taxiassur.records
    WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)}
    LIMIT 1;`));
  if(!lead)return json(res,origin,404,{ok:false,error:'not_found'},requestId);
  const [allCompanies,reasons,companyDocuments]=await Promise.all([recordsAll('insurance_companies'),recordsAll('company_quote_refusal_reasons'),recordsAll('company_documents')]);
  const companies=allCompanies.filter(function(row){return row.is_mandatory===true&&row.is_active!==false;}).sort(function(a,b){return Number(a.priority_order||999)-Number(b.priority_order||999);});
  let quotes=await preferredQuotesForLead(leadId);
  const existing=new Set(quotes.map(function(row){return String(row.company_id||row.insurance_company_id||'');}));
  const now=new Date().toISOString();
  for(const company of companies){
    if(existing.has(String(company.id)))continue;
    const id=randomUUID(),row={id:id,lead_id:leadId,company_id:String(company.id),status:'pending',created_at:now,updated_at:now};
    await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('lead_company_quotes',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(row))}::jsonb,'admin');`);
    quotes.push(row);
  }
  quotes=quotes.map(function(row){const company=allCompanies.find(function(candidate){return String(candidate.id)===String(row.company_id||row.insurance_company_id);})||null;return Object.assign({},row,{company:company?withPublicCompanyLogo(company,companyDocuments):null});}).sort(function(a,b){return String(a.created_at||'').localeCompare(String(b.created_at||''));});
  const mandatoryQuotes=quotes.filter(function(row){return row.company&&row.company.is_mandatory===true;});
  const allMandatoryProcessed=mandatoryQuotes.length>0&&mandatoryQuotes.every(function(row){return row.status!=='pending';});
  return json(res,origin,200,{ok:true,workspace:{lead:lead,quotes:quotes,refusal_reasons:reasons.filter(function(row){return row.is_active!==false;}).sort(function(a,b){return Number(a.display_order||999)-Number(b.display_order||999);}),company_documents:companyDocuments.filter(function(row){return row.send_with_quote===true;}),all_mandatory_processed:allMandatoryProcessed}},requestId);
}

async function adminLeadQuotePatch(req,res,origin,requestId,leadId,quoteId){
  const session=await verifiedAdminSession(req);
  if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const body=await readJsonBody(req),allowed=['status','quote_amount','monthly_price','quote_file_url','quote_pdf_url','coverage_type','includes_immobilisation','includes_assistance_0km','includes_rc_pro','includes_depannage_remorquage','coverage_details','notes','refusal_reason','refusal_reason_code','refusal_screenshot_url','submitted_at','sent_to_client_at','last_sent_at','sent_at','quote_status','enrollment_fee','quote_options','rc_pro_addon','rc_pro_addon_annual','rc_pro_addon_monthly','rc_pro_addon_file_url','rc_pro_addon_company_id'];
  const updates={updated_at:new Date().toISOString(),submitted_by:session.sub};
  for(const key of allowed)if(Object.prototype.hasOwnProperty.call(body,key))updates[key]=body[key];
  const relatedSql=(await stronglyRelatedLeadIds(leadId)).map(quoteLiteral).join(',');
  const quote=parseJsonLine(await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='lead_company_quotes' AND record_id=${quoteLiteral(quoteId)} AND data->>'lead_id' IN (${relatedSql}) RETURNING data::text;`));
  if(!quote)return json(res,origin,404,{ok:false,error:'not_found'},requestId);
  await runPsql(`INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata) VALUES('admin',${quoteLiteral(session.sub)},'lead_quote_updated','lead_company_quote',${quoteLiteral(quoteId)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({lead_id:leadId,status:updates.status||null}))}::jsonb);`);
  return json(res,origin,200,{ok:true,quote:quote},requestId);
}
async function adminQuoteContext(leadId,quoteId){const relatedSql=(await stronglyRelatedLeadIds(leadId)).map(quoteLiteral).join(',');return parseJsonLine(await runPsql(`SELECT jsonb_build_object('quote',q.data,'lead',l.data,'company',c.data)::text FROM taxiassur.records q JOIN taxiassur.records l ON l.collection='crm_leads' AND l.record_id=${quoteLiteral(leadId)} LEFT JOIN taxiassur.records c ON c.collection='insurance_companies' AND c.record_id=COALESCE(q.data->>'company_id',q.data->>'insurance_company_id') WHERE q.collection='lead_company_quotes' AND q.record_id=${quoteLiteral(quoteId)} AND q.data->>'lead_id' IN (${relatedSql}) LIMIT 1;`));}
async function adminLeadQuoteDocumentUpload(req,res,origin,requestId,leadId,quoteId){
 const session=await verifiedAdminSession(req);if(!session)return drainAndJson(req,res,origin,401,{ok:false,error:'invalid_session'},requestId);const context=await adminQuoteContext(leadId,quoteId);if(!context)return drainAndJson(req,res,origin,404,{ok:false,error:'not_found'},requestId);
 const relatedSql=(await stronglyRelatedLeadIds(leadId)).map(quoteLiteral).join(',');
 const mime=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase(),name=safeFileName(decodeHeader(req.headers['x-file-name'])),size=Number(req.headers['content-length']||0);if(mime!=='application/pdf'||!name||!Number.isInteger(size)||size<1||size>maxUploadBytes)return drainAndJson(req,res,origin,400,{ok:false,error:'invalid_quote_file'},requestId);
 const kind=new URL(req.url||'/','http://localhost').searchParams.get('kind')==='rc_pro'?'rc_pro':'quote',fileId=randomUUID(),relativePath=kind==='rc_pro'?`${leadId}/quotes/rc-pro/${fileId}.pdf`:`${leadId}/quotes/${fileId}.pdf`,finalPath=safeStoragePath(relativePath),temporaryPath=path.join(config.documentRoot,'.tmp',`${fileId}.upload`);mkdirSync(path.dirname(finalPath),{recursive:true});const upload=await receiveFile(req,temporaryPath,maxUploadBytes);if(upload.size!==size){safeUnlink(temporaryPath);return json(res,origin,400,{ok:false,error:'size_mismatch'},requestId);}const scan=await scanFile(temporaryPath);if(scan.status!=='clean'){renameSync(temporaryPath,path.join(config.documentRoot,'quarantine',`${fileId}.pdf`));return json(res,origin,422,{ok:false,error:scan.status==='infected'?'infected_file':'scan_failed'},requestId);}renameSync(temporaryPath,finalPath);
 const now=new Date().toISOString(),previous=String(kind==='rc_pro'?context.quote.rc_pro_addon_file_url:(context.quote.quote_file_url||context.quote.quote_pdf_url)||''),updates=kind==='rc_pro'?{rc_pro_addon_file_url:relativePath,updated_at:now,submitted_by:session.sub}:{quote_file_url:relativePath,quote_pdf_url:relativePath,file_name:name,mime_type:mime,status:'quote_submitted',quote_status:'quote_submitted',submitted_at:now,sent_at:now,updated_at:now,submitted_by:session.sub};
 try{await runPsql(`BEGIN;INSERT INTO taxiassur.file_objects(id,owner_type,owner_id,document_type,original_name,storage_path,mime_type,size_bytes,sha256_hex,scan_status,scan_engine,scan_checked_at,status) VALUES(${quoteLiteral(fileId)}::uuid,'crm',${quoteLiteral(leadId)},${quoteLiteral(kind==='rc_pro'?'devis_rc_pro':'devis')},${quoteLiteral(name)},${quoteLiteral(relativePath)},'application/pdf',${upload.size},${quoteLiteral(upload.sha256)},'clean','clamav',now(),'validated');UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='lead_company_quotes' AND record_id=${quoteLiteral(quoteId)} AND data->>'lead_id' IN (${relatedSql});INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id) VALUES('admin',${quoteLiteral(session.sub)},'lead_quote_document_uploaded','lead_company_quote',${quoteLiteral(quoteId)},${quoteLiteral(requestId)}::uuid);COMMIT;`);}catch(error){safeUnlink(finalPath);throw error;}if(previous.startsWith(`${leadId}/quotes/`)&&previous!==relativePath)safeUnlink(safeStoragePath(previous));const notify=new URL(req.url||'/','http://localhost').searchParams.get('notify')!=='false',emailQueued=kind==='quote'&&notify?await queueProspectEventEmail(context.lead,`Nouveau devis ${String(context.company?.name||'')} disponible - TaxiAssur`,`Un nouveau devis est disponible dans votre espace TaxiAssur.`, 'devis', {lead_id:leadId,quote_id:quoteId}):false;return json(res,origin,201,{ok:true,path:relativePath,quote:Object.assign({},context.quote,updates),email_queued:emailQueued},requestId);
}

async function adminLeadQuoteDocumentDownload(req,res,origin,requestId,leadId,quoteId){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const context=await adminQuoteContext(leadId,quoteId);if(!context)return json(res,origin,404,{ok:false,error:'not_found'},requestId);const kind=new URL(req.url||'/', 'http://localhost').searchParams.get('kind')==='rc_pro'?'rc_pro':'quote',storagePath=String(kind==='rc_pro'?context.quote.rc_pro_addon_file_url:(context.quote.quote_file_url||context.quote.quote_pdf_url)||'');if(!storagePath)return json(res,origin,404,{ok:false,error:'not_found'},requestId);const objectPath=storageObjectPath(storagePath,'contract-documents');if(!objectPath)return json(res,origin,404,{ok:false,error:'not_found'},requestId);const nativePath=safeStoragePath(objectPath),legacyPath=safeLegacyStoragePath('contract-documents',objectPath),filePath=existsSync(nativePath)?nativePath:legacyPath;if(!existsSync(filePath))return json(res,origin,404,{ok:false,error:'file_missing'},requestId);res.writeHead(200,responseHeaders(origin,requestId,{'Content-Type':'application/pdf','Content-Length':String(statSync(filePath).size),'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(context.quote.file_name||path.basename(objectPath)||'devis.pdf')}`,'Cache-Control':'private, no-store'}));createReadStream(filePath).pipe(res);}
async function adminLeadQuoteDocumentDelete(req,res,origin,requestId,leadId,quoteId){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const context=await adminQuoteContext(leadId,quoteId);if(!context)return json(res,origin,404,{ok:false,error:'not_found'},requestId);const relatedSql=(await stronglyRelatedLeadIds(leadId)).map(quoteLiteral).join(',');const storagePath=String(context.quote.quote_file_url||context.quote.quote_pdf_url||''),updates={quote_file_url:null,quote_pdf_url:null,file_name:null,status:'pending',quote_status:'pending',submitted_at:null,updated_at:new Date().toISOString()};await runPsql(`BEGIN;UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='lead_company_quotes' AND record_id=${quoteLiteral(quoteId)} AND data->>'lead_id' IN (${relatedSql});INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('admin',${quoteLiteral(session.sub)},'lead_quote_document_deleted','lead_company_quote',${quoteLiteral(quoteId)},${quoteLiteral(requestId)}::uuid);COMMIT;`);if(storagePath.startsWith(`${leadId}/quotes/`))safeUnlink(safeStoragePath(storagePath));return json(res,origin,200,{ok:true},requestId);}
async function adminLeadQuoteEmail(req,res,origin,requestId,leadId,quoteId){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const context=await adminQuoteContext(leadId,quoteId);if(!context)return json(res,origin,404,{ok:false,error:'not_found'},requestId);const recipient=String(context.lead.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))return json(res,origin,400,{ok:false,error:'invalid_email'},requestId);const id=randomUUID(),now=new Date().toISOString(),company=String(context.company?.name||'votre assureur'),access=String(context.lead.access_token||''),link=access?`https://taxiassur.com/espace-prospect/${encodeURIComponent(access)}?tab=devis`:'https://taxiassur.com/espace-prospect?tab=devis',mail={id,recipient,subject:`Nouveau devis ${company} disponible - TaxiAssur`,body:`Bonjour ${context.lead.first_name||''},\n\nVotre devis ${company} est disponible dans votre espace securise :\n${link}\n\nTaxiAssur`,status:'pending',attempts:0,next_attempt_at:now,created_at:now};await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('native_email_outbox',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(mail))}::jsonb,'admin');UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({last_sent_at:now,updated_at:now}))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='lead_company_quotes' AND record_id=${quoteLiteral(quoteId)} AND data->>'lead_id'=${quoteLiteral(leadId)};INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('admin',${quoteLiteral(session.sub)},'lead_quote_email_queued','lead_company_quote',${quoteLiteral(quoteId)},${quoteLiteral(requestId)}::uuid);COMMIT;`);return json(res,origin,200,{ok:true,email_queued:true,last_sent_at:now},requestId);}

async function adminInsurerDossiersList(req,res,origin,requestId){
 const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
 const [dossiers,leads,companies]=await Promise.all([recordsAll('insurer_dossier_sends'),recordsAll('crm_leads'),recordsAll('insurance_companies')]);
 const normalized=dossiers.map(row=>Object.assign({},row,{insurance_company_id:row.insurance_company_id||row.company_id||null,status:row.status||'pending'})).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,200);
 const leadIds=new Set(normalized.map(row=>String(row.lead_id||''))),companyIds=new Set(normalized.map(row=>String(row.insurance_company_id||'')));
 return json(res,origin,200,{ok:true,dossiers:normalized,leads:leads.filter(row=>leadIds.has(String(row.id))),companies:companies.filter(row=>companyIds.has(String(row.id)))},requestId);
}
async function adminInsurerDossier(req,res,origin,requestId,leadId){
 const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
 const lead=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)} LIMIT 1;`));if(!lead)return json(res,origin,404,{ok:false,error:'not_found'},requestId);
 if(req.method==='GET'){const [contacts,companies,prospect,crm]=await Promise.all([recordsAll('insurance_company_contacts'),recordsAll('insurance_companies'),recordsWhere('prospect_documents','lead_id',leadId),recordsWhere('crm_lead_documents','lead_id',leadId)]);const activeContacts=contacts.filter(row=>row.is_active!==false).map(row=>Object.assign({},row,{company_name:companies.find(company=>String(company.id)===String(row.company_id))?.name||''})).sort((a,b)=>String(a.full_name||'').localeCompare(String(b.full_name||'')));const documents=prospect.concat(crm).filter(row=>row.file_path).map(row=>Object.assign({},row,{source:prospect.includes(row)?'prospect':'crm'}));return json(res,origin,200,{ok:true,workspace:{lead,contacts:activeContacts,documents}},requestId);}
 if(req.method==='PATCH'){const body=await readJsonBody(req),sendId=String(body.send_id||''),action=String(body.action||'');if(!uuidPattern.test(sendId)||!['mark_responded','retry','cancel'].includes(action))return json(res,origin,400,{ok:false,error:'invalid_request'},requestId);const dossier=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='insurer_dossier_sends' AND record_id=${quoteLiteral(sendId)} AND data->>'lead_id'=${quoteLiteral(leadId)} LIMIT 1;`));if(!dossier)return json(res,origin,404,{ok:false,error:'dossier_not_found'},requestId);const status=String(dossier.status||'');if(action!=='retry'&&['cancelled','closed'].includes(status))return json(res,origin,409,{ok:false,error:'dossier_closed'},requestId);if(action==='retry'&&!['failed','cancelled'].includes(status))return json(res,origin,409,{ok:false,error:'retry_not_allowed'},requestId);const now=new Date().toISOString(),note=String(body.note||'').trim().slice(0,2000)||null,updates=action==='mark_responded'?{status:'responded',responded_at:now,response_note:note,next_followup_at:null,processed_at:now,last_error:null,updated_at:now}:action==='retry'?{status:'pending',attempts:0,scheduled_at:now,processed_at:null,last_error:null,next_followup_at:null,retry_requested_at:now,updated_at:now}:{status:'cancelled',next_followup_at:null,processed_at:now,cancelled_at:now,updated_at:now};const auditAction=action==='mark_responded'?'insurer_dossier_responded':action==='retry'?'insurer_dossier_retry_requested':'insurer_dossier_cancelled';await runPsql(`BEGIN;UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='insurer_dossier_sends' AND record_id=${quoteLiteral(sendId)};INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},${quoteLiteral(auditAction)},'insurer_dossier_send',${quoteLiteral(sendId)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({lead_id:leadId,previous_status:status,note_present:Boolean(note)}))}::jsonb);COMMIT;`);return json(res,origin,200,{ok:true,dossier:{...dossier,...updates}},requestId);}
 const body=await readJsonBody(req),recipient=String(body.recipient_email||'').trim().toLowerCase(),documentIds=Array.isArray(body.document_ids)?[...new Set(body.document_ids.map(String))]:[];if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)||documentIds.length<1||documentIds.length>30)return json(res,origin,400,{ok:false,error:'invalid_request'},requestId);
 const [prospect,crm]=await Promise.all([recordsWhere('prospect_documents','lead_id',leadId),recordsWhere('crm_lead_documents','lead_id',leadId)]),available=prospect.concat(crm).filter(row=>row.file_path),selected=available.filter(row=>documentIds.includes(String(row.id)));if(selected.length!==documentIds.length)return json(res,origin,400,{ok:false,error:'invalid_documents'},requestId);
 const contactId=String(body.contact_id||''),companyId=String(body.company_id||''),id=randomUUID(),mailId=randomUUID(),now=new Date().toISOString(),subject=String(body.subject||`Demande de saisie devis - ${lead.first_name||''} ${lead.last_name||''}`).slice(0,200),message=String(body.message||'').slice(0,4000),row={id,lead_id:leadId,company_id:uuidPattern.test(companyId)?companyId:null,contact_id:uuidPattern.test(contactId)?contactId:null,recipient_email:recipient,recipient_name:String(body.recipient_name||'').slice(0,200),company_name:String(body.company_name||'Assureur').slice(0,200),subject,message,documents:selected.map(doc=>({id:doc.id,file_name:doc.file_name,file_path:doc.file_path,mime_type:doc.mime_type,source:prospect.includes(doc)?'prospect':'crm'})),status:'pending',reminder_j2_at:new Date(Date.now()+2*86400000).toISOString(),reminder_j5_at:new Date(Date.now()+5*86400000).toISOString(),created_by:session.sub,created_at:now,updated_at:now},mail={id:mailId,recipient,subject,body:`${message}\n\nDossier TaxiAssur : ${selected.length} piece(s) securisee(s) referencee(s).`,status:'pending',attempts:0,next_attempt_at:now,attachments:row.documents,created_at:now};
 await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('insurer_dossier_sends',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(row))}::jsonb,'admin'),('native_email_outbox',${quoteLiteral(mailId)},${quoteLiteral(JSON.stringify(mail))}::jsonb,'admin');INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},'insurer_dossier_queued','crm_lead',${quoteLiteral(leadId)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({send_id:id,recipient,document_count:selected.length}))}::jsonb);COMMIT;`);return json(res,origin,201,{ok:true,send_id:id,email_queued:true},requestId);
}

async function adminLeadSms(req,res,origin,requestId,leadId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  let lead=parseJsonLine(await runPsql("SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id="+quoteLiteral(leadId)+" LIMIT 1;"));
  if(!lead){try{lead=parseJsonLine(await runPsql("SELECT data::text FROM supabase_rest.crm_leads WHERE data->>'id'="+quoteLiteral(leadId)+" LIMIT 1;"));}catch(error){console.warn('[crm-lead-mirror-fallback]',{leadId,error:error instanceof Error?error.message:'unknown'});}}
  if(!lead)return json(res,origin,404,{ok:false,error:'lead_not_found'},requestId);
  if(req.method==='GET'){
    const conversation=parseJsonLine(await runPsql("SELECT data::text FROM taxiassur.records WHERE collection='sms_conversations' AND data->>'lead_id'="+quoteLiteral(leadId)+" AND COALESCE(data->>'status','active')='active' ORDER BY COALESCE(data->>'last_message_at',data->>'created_at','') DESC LIMIT 1;"));
    const messages=parseJsonLine(await runPsql("SELECT COALESCE(jsonb_agg(data ORDER BY COALESCE(data->>'created_at','')),'[]'::jsonb)::text FROM taxiassur.records WHERE collection='sms_messages' AND data->>'lead_id'="+quoteLiteral(leadId)+";"))||[];
    if(conversation&&Number(conversation.unread_count||0)>0)await runPsql("UPDATE taxiassur.records SET data=data||'{\"unread_count\":0}'::jsonb,updated_at=now(),revision=revision+1 WHERE collection='sms_conversations' AND record_id="+quoteLiteral(String(conversation.id))+";");
    const brevo=await effectiveBrevo();return json(res,origin,200,{ok:true,conversation:conversation?{...conversation,unread_count:0}:null,messages,enabled:Boolean(brevo.key)},requestId);
  }
  const body=await readJsonBody(req),action=String(body.action||'send');
  if(action==='suggest'){
    const openai=await effectiveOpenAi();if(!openai.key)return json(res,origin,503,{ok:false,error:'ai_unavailable'},requestId);const messages=Array.isArray(body.messages)?body.messages.slice(-5):[],context=messages.map(item=>(item?.direction==='inbound'?'Client: ':'TaxiAssur: ')+String(item?.content||'').slice(0,500)).join('\n');
    const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+openai.key,'Content-Type':'application/json'},body:JSON.stringify({model:openai.model,temperature:0.3,max_tokens:100,messages:[{role:'system',content:'Rédige une réponse SMS professionnelle en français, 160 caractères maximum, pour TaxiAssur. Ne promets ni tarif ni garantie.'},{role:'user',content:context||'Rédige un SMS de suivi assurance taxi pour '+String(lead.first_name||'le prospect')}]})});const payload=await response.json().catch(()=>null);if(!response.ok)return json(res,origin,502,{ok:false,error:'ai_provider_error'},requestId);return json(res,origin,200,{ok:true,response:String(payload?.choices?.[0]?.message?.content||'').trim().slice(0,160)},requestId);
  }
  if(action!=='send')return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);const brevo=await effectiveBrevo();if(!brevo.key)return json(res,origin,503,{ok:false,error:'sms_unavailable'},requestId);
  const content=String(body.content||'').normalize('NFKC').trim().slice(0,480),requestKey=String(body.request_id||'');let phone=String(lead.phone||'').replace(/[\s().-]/g,'');if(/^0[1-9][0-9]{8}$/.test(phone))phone='+33'+phone.slice(1);if(!content||!uuidPattern.test(requestKey)||!(/^\+?[1-9][0-9]{7,14}$/).test(phone))return json(res,origin,400,{ok:false,error:'invalid_sms'},requestId);
  const previous=parseJsonLine(await runPsql("SELECT data::text FROM taxiassur.records WHERE collection='sms_messages' AND data->>'request_id'="+quoteLiteral(requestKey)+" LIMIT 1;"));if(previous)return json(res,origin,200,{ok:true,message:previous,idempotent:true},requestId);
  const response=await fetch('https://api.brevo.com/v3/transactionalSMS/sms',{method:'POST',signal:AbortSignal.timeout(15_000),headers:{'api-key':brevo.key,'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({sender:brevo.sender,recipient:phone,content,type:'transactional',tag:'crm-manual'})});const provider=await response.json().catch(()=>null);if(!response.ok)return json(res,origin,502,{ok:false,error:'sms_provider_error'},requestId);
  let conversation=parseJsonLine(await runPsql("SELECT data::text FROM taxiassur.records WHERE collection='sms_conversations' AND data->>'lead_id'="+quoteLiteral(leadId)+" AND COALESCE(data->>'status','active')='active' LIMIT 1;"));const now=new Date().toISOString();if(!conversation)conversation={id:randomUUID(),lead_id:leadId,phone_number:phone,status:'active',unread_count:0,created_at:now};
  const message={id:randomUUID(),conversation_id:conversation.id,lead_id:leadId,direction:'outbound',from_number:config.smsSender,to_number:phone,content,status:'sent',provider_message_id:String(provider?.messageId||provider?.reference||''),request_id:requestKey,is_automated:false,created_at:now,delivered_at:now};conversation={...conversation,last_message_at:now,last_message_preview:content.slice(0,120),updated_at:now};
  let historyRecorded=true;
  try{await runPsql("BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('sms_conversations',"+quoteLiteral(String(conversation.id))+","+quoteLiteral(JSON.stringify(conversation))+"::jsonb,'admin') ON CONFLICT(collection,record_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now(),revision=taxiassur.records.revision+1;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('sms_messages',"+quoteLiteral(message.id)+","+quoteLiteral(JSON.stringify(message))+"::jsonb,'admin');INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',"+quoteLiteral(session.sub)+",'crm_sms_sent','crm_lead',"+quoteLiteral(leadId)+","+quoteLiteral(requestId)+"::uuid,"+quoteLiteral(JSON.stringify({message_id:message.id,provider_message_id:message.provider_message_id}))+"::jsonb);COMMIT;");}catch(error){historyRecorded=false;console.error('[crm-sms-history]',{leadId,requestKey,error:error instanceof Error?error.message:'unknown'});}
  return json(res,origin,201,{ok:true,message,conversation,history_recorded:historyRecorded},requestId);
}
async function effectiveWhatsApp(){
  if(config.whatsappAccountSid&&config.whatsappAuthToken&&config.whatsappFrom)return {accountSid:config.whatsappAccountSid,authToken:config.whatsappAuthToken,from:config.whatsappFrom};
  const row=await integrationRecord('whatsapp');
  return {accountSid:String(row?.fields?.account_sid||''),authToken:decryptPrivateValue(row?.secret_encrypted),from:String(row?.fields?.phone_number||'')};
}
async function adminLeadWhatsApp(req,res,origin,requestId,leadId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const lead=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)} LIMIT 1;`));if(!lead)return json(res,origin,404,{ok:false,error:'lead_not_found'},requestId);
  const body=await readJsonBody(req),content=String(body.content||body.message||'').normalize('NFKC').trim().slice(0,4000),credentials=await effectiveWhatsApp();let phone=String(lead.phone||'').replace(/[\s().-]/g,'');if(/^0[1-9][0-9]{8}$/.test(phone))phone='+33'+phone.slice(1);
  if(!credentials.accountSid||!credentials.authToken||!credentials.from)return json(res,origin,503,{ok:false,error:'whatsapp_unavailable'},requestId);if(!content||!(/^\+?[1-9][0-9]{7,14}$/).test(phone))return json(res,origin,400,{ok:false,error:'invalid_whatsapp'},requestId);
  const from=credentials.from.startsWith('whatsapp:')?credentials.from:`whatsapp:${credentials.from}`,to=phone.startsWith('whatsapp:')?phone:`whatsapp:${phone}`,form=new URLSearchParams({From:from,To:to,Body:content});
  const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(credentials.accountSid)}/Messages.json`,{method:'POST',signal:AbortSignal.timeout(15_000),headers:{Authorization:`Basic ${Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:form});const provider=await response.json().catch(()=>null);if(!response.ok)return json(res,origin,502,{ok:false,error:'whatsapp_provider_error'},requestId);
  const id=randomUUID(),now=new Date().toISOString(),interaction={id,lead_id:leadId,type:'whatsapp',channel:'whatsapp',direction:'outbound',content,status:'sent',metadata:{provider:'twilio',provider_message_id:String(provider?.sid||'')},created_by:session.sub,created_at:now,updated_at:now};await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('crm_interactions',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(interaction))}::jsonb,'admin');INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},'crm_whatsapp_sent','crm_lead',${quoteLiteral(leadId)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({provider_message_id:provider?.sid||null}))}::jsonb);COMMIT;`);return json(res,origin,201,{ok:true,success:true,interaction},requestId);
}
async function adminLeadTimeline(req,res,origin,requestId,leadId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const lead=parseJsonLine(await runPsql("SELECT data::text FROM (SELECT data,0 priority FROM taxiassur.records WHERE collection='crm_leads' AND record_id="+quoteLiteral(leadId)+" UNION ALL SELECT data,1 priority FROM supabase_rest.crm_leads WHERE data->>'id'="+quoteLiteral(leadId)+") lead_sources ORDER BY priority LIMIT 1;"));if(!lead)return json(res,origin,404,{ok:false,error:'lead_not_found'},requestId);
  if(req.method==='POST'){
    const body=await readJsonBody(req),content=String(body.content||'').normalize('NFKC').trim().slice(0,5000);if(!content)return json(res,origin,400,{ok:false,error:'invalid_note'},requestId);
    const channel=['note','phone','call','email','sms','whatsapp'].includes(String(body.channel||''))?String(body.channel):'note',direction=['inbound','outbound'].includes(String(body.direction||''))?String(body.direction):'outbound',id=randomUUID(),now=new Date().toISOString(),interaction={id,lead_id:leadId,type:String(body.type||channel).slice(0,80),channel,direction,subject:String(body.subject||'').slice(0,250),content,notes:String(body.notes||'').slice(0,5000),status:String(body.status||'completed').slice(0,80),metadata:body.metadata&&typeof body.metadata==='object'?body.metadata:{},created_by:session.sub,created_at:now,updated_at:now};
    await runPsql("BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('crm_interactions',"+quoteLiteral(id)+","+quoteLiteral(JSON.stringify(interaction))+"::jsonb,'admin');INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('admin',"+quoteLiteral(session.sub)+","+quoteLiteral(channel==='note'?'crm_note_added':'crm_interaction_added')+",'crm_lead',"+quoteLiteral(leadId)+","+quoteLiteral(requestId)+"::uuid);COMMIT;");
    return json(res,origin,201,{ok:true,interaction,note:interaction},requestId);
  }
  const email=String(lead.email||'').trim().toLowerCase(),idsSql=email?"SELECT record_id FROM taxiassur.records WHERE collection='crm_leads' AND lower(data->>'email')="+quoteLiteral(email):"SELECT "+quoteLiteral(leadId)+" AS record_id";
  const sql="WITH lead_ids AS ("+idsSql+"), selected AS (SELECT collection,data FROM taxiassur.records WHERE collection IN ('email_messages','crm_interactions','crm_lead_documents','crm_ai_decisions','crm_ai_suggestions','crm_event_notifications') AND data->>'lead_id' IN (SELECT record_id FROM lead_ids)) SELECT jsonb_build_object('emails',COALESCE(jsonb_agg(data) FILTER(WHERE collection='email_messages'),'[]'::jsonb),'interactions',COALESCE(jsonb_agg(data) FILTER(WHERE collection='crm_interactions'),'[]'::jsonb),'documents',COALESCE(jsonb_agg(data) FILTER(WHERE collection='crm_lead_documents'),'[]'::jsonb),'ai_decisions',COALESCE(jsonb_agg(data) FILTER(WHERE collection='crm_ai_decisions'),'[]'::jsonb),'notifications',COALESCE(jsonb_agg(data) FILTER(WHERE collection='crm_event_notifications'),'[]'::jsonb))::text FROM selected;";
  return json(res,origin,200,{ok:true,timeline:parseJsonLine(await runPsql(sql))||{emails:[],interactions:[],documents:[],ai_decisions:[],notifications:[]}},requestId);
}
async function adminLeadQuoteSignature(req,res,origin,requestId,leadId){
 const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
 const lead=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)} LIMIT 1;`));if(!lead)return json(res,origin,404,{ok:false,error:'not_found'},requestId);
 if(req.method==='GET'){const signatures=(await recordsWhere('lead_signature_history','lead_id',leadId)).filter(row=>row.signature_type==='devis').sort((a,b)=>String(b.created_at||b.confirmed_at||'').localeCompare(String(a.created_at||a.confirmed_at||'')));const documents=(await recordsWhere('crm_lead_documents','lead_id',leadId)).filter(row=>row.document_type==='devis_signe'&&row.status==='validated').sort((a,b)=>String(b.uploaded_at||b.created_at||'').localeCompare(String(a.uploaded_at||a.created_at||'')));return json(res,origin,200,{ok:true,signature:signatures[0]||null,document:documents[0]||null},requestId);}
 const body=await readJsonBody(req),signed=body.is_signed===true,now=new Date().toISOString(),existing=(await recordsWhere('lead_signature_history','lead_id',leadId)).filter(row=>row.signature_type==='devis').sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0],id=existing?.id||randomUUID(),row=Object.assign({},existing||{id,lead_id:leadId,signature_type:'devis',created_at:now},{is_signed:signed,signed_at:signed?now:null,external_signature_url:String(body.external_signature_url||'').slice(0,1000)||null,notes:String(body.notes||'').slice(0,4000)||null,confirmed_at:now,confirmed_by:session.sub,updated_at:now});
 if(existing)await runPsql(`UPDATE taxiassur.records SET data=${quoteLiteral(JSON.stringify(row))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='lead_signature_history' AND record_id=${quoteLiteral(id)};`);else await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('lead_signature_history',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(row))}::jsonb,'admin');`);
 await runPsql(`INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},'lead_quote_signature_updated','crm_lead',${quoteLiteral(leadId)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({is_signed:signed,signature_id:id}))}::jsonb);`);return json(res,origin,200,{ok:true,signature:row},requestId);
}

async function adminClientsList(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);
  if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const [leads,contracts,claims]=await Promise.all([recordsAllWithMirror('crm_leads'),recordsAllWithMirror('insurance_contracts'),recordsAllWithMirror('insurance_claims')]);
  const active=new Set(['CLIENT_ACTIF','ACTIVE_CLIENT','client_actif','active_client']);
  const clients=leads.filter(function(lead){return active.has(String(lead.status||lead.lead_status||''))&&!lead.deleted_at;}).map(function(lead){
    return Object.assign({},lead,{
      insurance_contracts:contracts.filter(function(row){return String(row.lead_id)===String(lead.id);}),
      insurance_claims:claims.filter(function(row){return String(row.lead_id)===String(lead.id);}).map(function(row){return {id:row.id,status:row.status||row.claim_status};})
    });
  }).sort(function(a,b){return String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''));});
  return json(res,origin,200,{ok:true,clients:clients},requestId);
}

async function adminClaimsList(req,res,origin,requestId,url){
  const session=await verifiedAdminSession(req);
  if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const status=String(url.searchParams.get('status')||'');
  const [claims,leads,events]=await Promise.all([recordsAll('insurance_claims'),recordsAll('crm_leads'),recordsAll('claim_tracking_events')]);
  const result=claims.filter(function(row){return !status||String(row.claim_status||row.status)===status;}).map(function(row){
    const lead=leads.find(function(item){return String(item.id)===String(row.lead_id);})||{};
    return Object.assign({},row,{
      claim_status:row.claim_status||row.status||'declared',
      client_first_name:lead.first_name||'',
      client_last_name:lead.last_name||'',
      client_email:row.client_email||lead.email||'',
      client_phone:lead.phone||'',
      events:events.filter(function(item){return String(item.claim_id)===String(row.id);})
    });
  }).sort(function(a,b){return String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''));});
  return json(res,origin,200,{ok:true,claims:result},requestId);
}

async function adminClaimPatch(req,res,origin,requestId,claimId){
  const session=await verifiedAdminSession(req);
  if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const body=await readJsonBody(req);
  const allowed=['claim_status','client_visible_status','client_visible_notes','expert_name','expert_company','expert_phone','expert_email','expert_mission_date','expert_appointment_date','expertise_garage_name','expertise_garage_address','expertise_garage_phone','expertise_date','repair_garage_name','repair_garage_address','repair_garage_phone','repair_start_date','repair_end_date','indemnisation_amount','indemnisation_date','indemnisation_paid_at','internal_notes'];
  const updates={updated_at:new Date().toISOString()};
  for(const key of allowed)if(Object.prototype.hasOwnProperty.call(body,key))updates[key]=body[key];
  if(updates.claim_status)updates.status=updates.claim_status;
  const sql="UPDATE taxiassur.records SET data=data||"+quoteLiteral(JSON.stringify(updates))+"::jsonb,updated_at=now(),revision=revision+1 WHERE collection='insurance_claims' AND record_id="+quoteLiteral(claimId)+" RETURNING data::text;";
  const claim=parseJsonLine(await runPsql(sql));
  if(!claim)return json(res,origin,404,{ok:false,error:'not_found'},requestId);
  if(body.event&&String(body.event.title||'').trim()){
    const eventId=randomUUID(),now=new Date().toISOString(),event={id:eventId,claim_id:claimId,title:String(body.event.title).trim().slice(0,200),description:String(body.event.description||'').trim().slice(0,2000),event_type:String(body.event.type||'status_update').slice(0,80),visible_to_client:body.event.visible!==false,created_by:session.sub,created_at:now};
    await runPsql("INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('claim_tracking_events',"+quoteLiteral(eventId)+","+quoteLiteral(JSON.stringify(event))+"::jsonb,'admin');");
  }
  return json(res,origin,200,{ok:true,claim:claim},requestId);
}
async function adminLogin(req, res, origin, requestId) {
  const body = await readJsonBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 1) return json(res, origin, 400, { ok: false, error: 'invalid_credentials' }, requestId);
  const sql = `SELECT json_build_object('id',id,'email',email,'name',full_name,'role',role,'password_hash',password_hash,'locked',locked_until > now())::text FROM taxiassur.auth_users WHERE lower(email)=${quoteLiteral(email)} AND is_active=true LIMIT 1;`;
  const user = parseJsonLine(await runPsql(sql));
  if (!user || user.locked || !user.password_hash || !verifyPassword(password, user.password_hash)) {
    if (user?.id) await runPsql(`UPDATE taxiassur.auth_users SET failed_login_count=failed_login_count+1, locked_until=CASE WHEN failed_login_count+1 >= 5 THEN now()+interval '15 minutes' ELSE locked_until END WHERE id=${quoteLiteral(user.id)}::uuid;`);
    return json(res, origin, 401, { ok: false, error: 'invalid_credentials' }, requestId);
  }
  const token = createSession(user, config.sessionSecret, { ttlSeconds: 8 * 60 * 60 });
  await runPsql(`UPDATE taxiassur.auth_users SET failed_login_count=0, locked_until=NULL, last_login_at=now(), updated_at=now() WHERE id=${quoteLiteral(user.id)}::uuid;`);
  return json(res, origin, 200, { ok: true, access_token: token, expires_in: 86400, user: publicAdmin(user), permissions: await adminPermissions(user.id) }, requestId);
}
async function adminSession(req, res, origin, requestId) {
  const session = await verifiedAdminSession(req);
  return session ? json(res, origin, 200, { ok: true, user: publicAdmin(session), permissions: await adminPermissions(session.sub) }, requestId) : json(res, origin, 401, { ok: false, error: 'invalid_session' }, requestId);
}
async function adminLogout(req, res, origin, requestId) {
  const session = await verifiedAdminSession(req);
  if (session) await runPsql(`INSERT INTO taxiassur.revoked_sessions(session_id,user_id,expires_at) VALUES(${quoteLiteral(session.jti)},${quoteLiteral(session.sub)}::uuid,to_timestamp(${Number(session.exp)})) ON CONFLICT(session_id) DO NOTHING;`);
  return json(res, origin, 200, { ok: true }, requestId);
}
async function adminChangePassword(req, res, origin, requestId) {
  const session = await verifiedAdminSession(req);
  if (!session) return json(res, origin, 401, { ok: false, error: 'invalid_session' }, requestId);
  const body = await readJsonBody(req);
  const currentPassword = String(body.current_password || '');
  const newPassword = String(body.new_password || '');
  if (newPassword.length < 14 || newPassword.length > 1024 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) return json(res, origin, 400, { ok: false, error: 'weak_password' }, requestId);
  const row = parseJsonLine(await runPsql(`SELECT json_build_object('password_hash',password_hash)::text FROM taxiassur.auth_users WHERE id=${quoteLiteral(session.sub)}::uuid AND is_active=true LIMIT 1;`));
  if (!row?.password_hash || !verifyPassword(currentPassword, row.password_hash)) return json(res, origin, 401, { ok: false, error: 'invalid_current_password' }, requestId);
  const encoded = hashPassword(newPassword);
  await runPsql(`BEGIN; UPDATE taxiassur.auth_users SET password_hash=${quoteLiteral(encoded)},password_initialized_at=now(),updated_at=now() WHERE id=${quoteLiteral(session.sub)}::uuid; INSERT INTO taxiassur.revoked_sessions(session_id,user_id,expires_at) VALUES(${quoteLiteral(session.jti)},${quoteLiteral(session.sub)}::uuid,to_timestamp(${Number(session.exp)})) ON CONFLICT(session_id) DO NOTHING; INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id) VALUES('admin',${quoteLiteral(session.sub)},'password_changed','auth_user',${quoteLiteral(session.sub)},${quoteLiteral(requestId)}::uuid); COMMIT;`);
  return json(res, origin, 200, { ok: true, session_revoked: true }, requestId);
}
async function requestAdminPasswordReset(req, res, origin, requestId) {
  const body = await readJsonBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, origin, 200, { ok: true }, requestId);
  const user = parseJsonLine(await runPsql(`SELECT json_build_object('id',id,'email',email)::text FROM taxiassur.auth_users WHERE lower(email)=${quoteLiteral(email)} AND is_active=true LIMIT 1;`));
  if (!user) return json(res, origin, 200, { ok: true }, requestId);
  const token = randomBytes(32).toString('hex');
  const resetId = randomUUID();
  const outboxId = randomUUID();
  const now = new Date();
  const reset = { id: resetId, user_id: user.id, email, token_hash: createHash('sha256').update(token).digest('hex'), expires_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), used_at: null, created_at: now.toISOString() };
  const resetUrl = `https://taxiassur.com/auth/set-password?token=${token}`;
  const outbox = { id: outboxId, reset_id: resetId, recipient: email, subject: 'Réinitialisation de votre mot de passe TaxiAssur', body: `Un changement de mot de passe a été demandé pour votre compte TaxiAssur.\n\nOuvrez ce lien dans l’heure :\n${resetUrl}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez cet email.`, status: 'pending', attempts: 0, next_attempt_at: now.toISOString(), created_at: now.toISOString() };
  await runPsql(`BEGIN; DELETE FROM taxiassur.records WHERE collection='auth_password_resets' AND data->>'user_id'=${quoteLiteral(String(user.id))} AND COALESCE(data->>'used_at','')=''; INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('auth_password_resets',${quoteLiteral(resetId)},${quoteLiteral(JSON.stringify(reset))}::jsonb,'local'),('native_email_outbox',${quoteLiteral(outboxId)},${quoteLiteral(JSON.stringify(outbox))}::jsonb,'local'); INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id) VALUES('system',${quoteLiteral(String(user.id))},'password_reset_queued','auth_user',${quoteLiteral(String(user.id))},${quoteLiteral(requestId)}::uuid); COMMIT;`);
  return json(res, origin, 200, { ok: true }, requestId);
}

async function resetAdminPassword(req, res, origin, requestId) {
  const body = await readJsonBody(req);
  const token = String(body.token || '').trim();
  const password = String(body.password || '');
  if (!tokenPattern.test(token)) return json(res, origin, 400, { ok: false, error: 'invalid_reset_token' }, requestId);
  if (password.length < 14 || password.length > 1024 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) return json(res, origin, 400, { ok: false, error: 'weak_password' }, requestId);
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const encoded = hashPassword(password);
  const changed = String(await runPsql(`WITH reset AS (SELECT record_id,data FROM taxiassur.records WHERE collection='auth_password_resets' AND data->>'token_hash'=${quoteLiteral(tokenHash)} AND COALESCE(data->>'used_at','')='' AND (data->>'expires_at')::timestamptz>now() LIMIT 1 FOR UPDATE), changed AS (UPDATE taxiassur.auth_users u SET password_hash=${quoteLiteral(encoded)},password_initialized_at=now(),updated_at=now(),failed_login_count=0,locked_until=NULL FROM reset WHERE u.id=(reset.data->>'user_id')::uuid RETURNING u.id), consumed AS (UPDATE taxiassur.records r SET data=r.data||jsonb_build_object('used_at',now()::text),updated_at=now(),revision=revision+1 FROM reset,changed WHERE r.collection='auth_password_resets' AND r.record_id=reset.record_id RETURNING changed.id) INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id) SELECT 'system',id::text,'password_reset_completed','auth_user',id::text,${quoteLiteral(requestId)}::uuid FROM consumed RETURNING target_id;`)).trim();
  return changed ? json(res, origin, 200, { ok: true }, requestId) : json(res, origin, 400, { ok: false, error: 'invalid_reset_token' }, requestId);
}
async function adminDashboard(req, res, origin, requestId, url) {
  const session=await verifiedAdminSession(req);if (!session) return json(res, origin, 401, { ok: false, error: 'invalid_session' }, requestId);
  if(req.method==='PATCH'){
    const body=await readJsonBody(req),action=String(body.action||''),now=new Date().toISOString();
    if(action==='toggle_ai_master'){const rows=await recordsAll('ai_master_status'),current=rows[0],id=String(current?.id||randomUUID()),item={...(current||{id,mode:'auto_total_24_7'}),is_active:body.enabled===true,last_update:now,updated_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('ai_master_status',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(item))}::jsonb,'admin') ON CONFLICT(collection,record_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now(),revision=taxiassur.records.revision+1;`);return json(res,origin,200,{ok:true,item},requestId);}
    if(action==='toggle_automation'){const id=String(body.id||''),item=parseJsonLine(await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({enabled:body.enabled===true,is_enabled:body.enabled===true,is_active:body.enabled===true,updated_at:now}))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection IN ('automation_status','cron_jobs_config') AND record_id=${quoteLiteral(id)} RETURNING data::text;`));return item?json(res,origin,200,{ok:true,item},requestId):json(res,origin,404,{ok:false,error:'not_found'},requestId);}
    return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);
  }
  const compact=url?.searchParams?.get('compact')==='1',crmSummary=url?.searchParams?.get('crm_summary')==='1';
  const sql = `SELECT json_build_object(
    'leads',${compact?`'[]'::jsonb`:crmSummary?`COALESCE((SELECT jsonb_agg(data ORDER BY COALESCE(data->>'created_at','') DESC) FROM (SELECT data FROM taxiassur.records WHERE collection='crm_leads' AND COALESCE(data->>'deleted_at','')='' ORDER BY COALESCE(data->>'created_at','') DESC LIMIT 6) recent_leads),'[]'::jsonb)`:`COALESCE((SELECT jsonb_agg(data ORDER BY COALESCE(data->>'created_at','') DESC) FROM taxiassur.records WHERE collection='crm_leads' AND COALESCE(data->>'deleted_at','')=''),'[]'::jsonb)`},
    'lead_stats',(SELECT jsonb_build_object('total',count(*),'active_contracts',count(*) FILTER(WHERE COALESCE(data->>'status','') IN ('won','ACTIVE_CLIENT','active_client','CLIENT_ACTIF') OR data->>'current_stage_key'='active_client' OR lower(COALESCE(data#>>'{metadata,is_active_client}','false'))='true'),'pending_documents',count(*) FILTER(WHERE data->>'current_stage_key'='document_collection'),'pending_payments',count(*) FILTER(WHERE data->>'current_stage_key'='payment_pending'),'renewal_opportunities',count(*) FILTER(WHERE data->>'status'='CROSS_SELLING'),'new_today',count(*) FILTER(WHERE left(COALESCE(data->>'created_at',''),10)=to_char(now() AT TIME ZONE 'Europe/Paris','YYYY-MM-DD')),'new_week',count(*) FILTER(WHERE COALESCE(data->>'created_at','')>=to_char((now() AT TIME ZONE 'Europe/Paris')-interval '7 days','YYYY-MM-DD')),'won_month',count(*) FILTER(WHERE COALESCE(data->>'status','') IN ('won','ACTIVE_CLIENT','active_client','CLIENT_ACTIF') AND COALESCE(data->>'updated_at','')>=to_char(date_trunc('month',now() AT TIME ZONE 'Europe/Paris'),'YYYY-MM-DD')),'lost_month',count(*) FILTER(WHERE data->>'status'='lost' AND COALESCE(data->>'updated_at','')>=to_char(date_trunc('month',now() AT TIME ZONE 'Europe/Paris'),'YYYY-MM-DD')),'lost_total',count(*) FILTER(WHERE data->>'status'='lost'),'quote_pending',count(*) FILTER(WHERE data->>'current_stage_key'='quote_pending')) FROM taxiassur.records WHERE collection='crm_leads' AND COALESCE(data->>'deleted_at','')=''),
    'ai_decisions',COALESCE((SELECT jsonb_agg(data ORDER BY COALESCE(data->>'created_at','') DESC) FROM (SELECT data FROM taxiassur.records WHERE collection='ai_decisions' ORDER BY COALESCE(data->>'created_at','') DESC LIMIT 5) q),'[]'::jsonb),
    'unread_messages',(SELECT count(*) FROM taxiassur.records WHERE collection='email_messages' AND COALESCE(data->>'is_read','false')='false'),
    'critical_alerts',(SELECT count(*) FROM taxiassur.records WHERE collection='crm_retention_alerts' AND data->>'alert_type'='churn_risk'),
    'ready_for_quote',(SELECT count(*) FROM taxiassur.records WHERE collection='ready_for_quote_queue' AND data->>'status'='waiting'),
    'automation_metrics',jsonb_build_object(
      'emails_sent',(SELECT count(*) FROM taxiassur.records WHERE collection IN ('email_messages','native_email_outbox') AND COALESCE(data->>'direction','outbound')='outbound'),
      'interactions',(SELECT count(*) FROM taxiassur.records WHERE collection='crm_interactions')
    ),
    'lead_performance',jsonb_build_object(
      'daily_goal',10,
      'today',(SELECT count(*) FROM taxiassur.records WHERE collection='crm_leads' AND left(COALESCE(data->>'created_at',''),10)=to_char(now() AT TIME ZONE 'Europe/Paris','YYYY-MM-DD')),
      'yesterday',(SELECT count(*) FROM taxiassur.records WHERE collection='crm_leads' AND left(COALESCE(data->>'created_at',''),10)=to_char((now() AT TIME ZONE 'Europe/Paris')::date-1,'YYYY-MM-DD')),
      'average_7_days',(SELECT round(count(*)::numeric/7,1) FROM taxiassur.records WHERE collection='crm_leads' AND left(COALESCE(data->>'created_at',''),10)>=to_char((now() AT TIME ZONE 'Europe/Paris')::date-6,'YYYY-MM-DD')),
      'daily_history',(SELECT COALESCE(jsonb_agg(jsonb_build_object('date',d.day::date,'count',COALESCE(c.total,0)) ORDER BY d.day),'[]'::jsonb) FROM generate_series((now() AT TIME ZONE 'Europe/Paris')::date-13,(now() AT TIME ZONE 'Europe/Paris')::date,interval '1 day') d(day) LEFT JOIN (SELECT left(data->>'created_at',10) AS lead_date,count(*) total FROM taxiassur.records WHERE collection='crm_leads' AND left(COALESCE(data->>'created_at',''),10)>=to_char((now() AT TIME ZONE 'Europe/Paris')::date-14,'YYYY-MM-DD') GROUP BY 1)c ON c.lead_date=to_char(d.day,'YYYY-MM-DD'))
    ),
    'admin_users',COALESCE((SELECT json_agg(json_build_object('id',id,'email',email,'full_name',full_name,'role',role) ORDER BY full_name) FROM taxiassur.auth_users WHERE is_active=true),'[]'::json),
    'content_stats',jsonb_build_object(
      'total_blog_posts',(SELECT count(*) FROM taxiassur.records WHERE collection='blog_posts'),
      'total_news',(SELECT count(*) FROM taxiassur.records WHERE collection='news_articles'),
      'total_faqs',(SELECT count(*) FROM taxiassur.records WHERE collection='faqs'),
      'total_leads',(SELECT count(*) FROM taxiassur.records WHERE collection='crm_leads' AND COALESCE(data->>'deleted_at','')=''),
      'new_leads_today',(SELECT count(*) FROM taxiassur.records WHERE collection='crm_leads' AND left(COALESCE(data->>'created_at',''),10)=to_char(now(),'YYYY-MM-DD')),
      'new_leads_week',(SELECT count(*) FROM taxiassur.records WHERE collection='crm_leads' AND left(COALESCE(data->>'created_at',''),10)>=to_char(now()::date-7,'YYYY-MM-DD')),
      'leads_by_status',COALESCE((SELECT jsonb_object_agg(status,total) FROM (SELECT COALESCE(NULLIF(data->>'status',''),'inconnu') status,count(*) total FROM taxiassur.records WHERE collection='crm_leads' GROUP BY 1) s),'{}'::jsonb),
      'recent_blog_posts',COALESCE((SELECT jsonb_agg(data ORDER BY COALESCE(data->>'published_at',data->>'created_at','') DESC) FROM (SELECT data FROM taxiassur.records WHERE collection='blog_posts' ORDER BY COALESCE(data->>'published_at',data->>'created_at','') DESC LIMIT 5) b),'[]'::jsonb)
    ))::text;`;
  const payload=parseJsonLine(await runPsql(sql))||{},today=new Date().toISOString().slice(0,10);
  const [masters,automationStatus,cronConfigs,actions,learning,emails,blogs,news,social,cities,faqs,history]=await Promise.all(['ai_master_status','automation_status','cron_jobs_config','ai_autonomous_actions','ai_learning_events','email_responses','blog_posts','news_articles','social_posts','city_pages','faq_items','cron_execution_history'].map(recordsAll));
  const automations=(automationStatus.length?automationStatus:cronConfigs).map(row=>({...row,enabled:row.enabled??row.is_enabled??row.is_active??false}));
  const createdToday=row=>String(row.created_at||row.sent_at||'').slice(0,10)===today;
  return json(res, origin, 200, { ok: true, ...payload,ai_master_status:masters[0]||null,automations,ai_metrics:{decisionsToday:(payload.ai_decisions||[]).filter(createdToday).length,autonomousActions:actions.filter(createdToday).length,emailsProcessed:emails.filter(createdToday).length,learningEvents:learning.filter(createdToday).length},publication_stats:{blogPostsToday:blogs.filter(createdToday).length,blogPostsTotal:blogs.length,newsToday:news.filter(createdToday).length,newsTotal:news.length,socialPostsToday:social.filter(createdToday).length,socialPostsTotal:social.length,citypagesTotal:cities.length,faqTotal:faqs.length},ai_logs:history.filter(row=>row.status==='failed').sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,10),system_stats:{cronJobs:automations.length,apiCalls:(payload.ai_decisions||[]).filter(createdToday).length,storageUsed:'Stockage natif',databaseSize:'PostgreSQL natif'} }, requestId);
}

async function adminConversionAnalytics(req, res, origin, requestId, url) {
  if (!await verifiedAdminSession(req)) return json(res, origin, 401, { ok: false, error: 'invalid_session' }, requestId);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days')) || 7));
  const sql = `WITH
    lead_rows AS (
      SELECT data FROM taxiassur.records
      WHERE collection='crm_leads'
        AND COALESCE(data->>'deleted_at','')=''
        AND COALESCE(data->>'created_at','1970-01-01')::timestamptz >= now() - interval '${days} days'
    ),
    qualified_rows AS (
      SELECT data FROM lead_rows
      WHERE data->>'email' ~* '^[^@ ]+@[^@ ]+\.[^@ ]+$'
        AND regexp_replace(COALESCE(data->>'phone',''),'\D','','g') ~ '^(33|0)[1-9][0-9]{8}$'
        AND (COALESCE(NULLIF(data->>'city',''),'')<>'' OR COALESCE(NULLIF(data->>'vehicle_type',''),'')<>'')
        AND COALESCE(NULLIF(data->>'spam_score','')::numeric,0)<50
        AND lower(COALESCE(data->>'status','')) NOT IN ('spam','rejected','lost')
    ),    view_rows AS (
      SELECT data FROM taxiassur.records
      WHERE collection='page_analytics'
        AND COALESCE(data->>'created_at','1970-01-01')::timestamptz >= now() - interval '${days} days'
    ),
    aggregate_view_rows AS (
      SELECT data FROM taxiassur.records
      WHERE collection='public_page_views'
        AND COALESCE(data->>'date','1970-01-01')::date >= current_date - (${days} - 1)
    ),    conversion_rows AS (
      SELECT data FROM taxiassur.records
      WHERE collection='conversion_events'
        AND COALESCE(data->>'created_at','1970-01-01')::timestamptz >= now() - interval '${days} days'
    ),
    daily_qualified AS (SELECT date_trunc('day',(data->>'created_at')::timestamptz AT TIME ZONE 'Europe/Paris')::date AS lead_day,count(*) AS leads FROM qualified_rows GROUP BY 1),
    totals AS (SELECT (SELECT count(*) FROM lead_rows) leads, (SELECT count(*) FROM qualified_rows) qualified_leads, (SELECT COALESCE(NULLIF(sum(COALESCE(NULLIF(data->>'views','')::integer,0)),0),(SELECT count(*) FROM view_rows)) FROM aggregate_view_rows) page_views, (SELECT count(DISTINCT NULLIF(data->>'session_id','')) FROM view_rows) unique_visitors, (SELECT count(*) FROM conversion_rows WHERE data->>'event_type'='form_start') form_starts, (SELECT count(*) FROM conversion_rows WHERE data->>'event_type' LIKE 'form_%error') form_errors),
    source_rows AS (
      SELECT COALESCE(NULLIF(data#>>'{acquisition,utm_source}',''), CASE WHEN NULLIF(data#>>'{acquisition,gclid}','') IS NOT NULL THEN 'google_ads' WHEN lower(COALESCE(data#>>'{acquisition,referrer}','')) ~ '(^|[./])google\\.' THEN 'google_organic' WHEN lower(COALESCE(data#>>'{acquisition,referrer}','')) ~ '(^|[./])bing\\.' THEN 'bing_organic' END, NULLIF(NULLIF(data->>'source',''),'website'), 'direct') source, count(*) conversions
      FROM lead_rows GROUP BY 1 ORDER BY 2 DESC
    ),
    city_rows AS (SELECT COALESCE(NULLIF(data->>'city',''),'Inconnu') city, count(*) leads FROM lead_rows GROUP BY 1 ORDER BY 2 DESC LIMIT 10),
    hour_rows AS (SELECT extract(hour FROM (data->>'created_at')::timestamptz AT TIME ZONE 'Europe/Paris')::int AS lead_hour, count(*) conversions FROM lead_rows GROUP BY 1),
    device_rows AS (
      SELECT CASE WHEN lower(COALESCE(data->>'user_agent','')) ~ 'ipad|tablet' THEN 'Tablet' WHEN lower(COALESCE(data->>'user_agent','')) ~ 'mobile|android|iphone' THEN 'Mobile' ELSE 'Desktop' END device, count(*) views
      FROM view_rows GROUP BY 1
    ),
    landing_rows AS (
      SELECT COALESCE(NULLIF(data#>>'{acquisition,landing_page}',''),NULLIF(data#>>'{acquisition,page_url}',''),'non_attribue') landing_page,count(*) leads
      FROM lead_rows GROUP BY 1 ORDER BY 2 DESC LIMIT 10
    )
  SELECT jsonb_build_object(
    'period_days',${days},
    'goal',jsonb_build_object('target_per_day',10,'target_total',${days}*10,'qualified_leads',(SELECT qualified_leads FROM totals),'average_per_day',round((SELECT qualified_leads FROM totals)::numeric/${days},2),'gap_per_day',greatest(0,round(10-(SELECT qualified_leads FROM totals)::numeric/${days},2)),'achievement_percent',round(least(100,(SELECT qualified_leads FROM totals)::numeric*100/(${days}*10)),1),'days_at_target',(SELECT count(*) FROM daily_qualified WHERE leads>=10)),
    'qualifiedDaily',COALESCE((SELECT jsonb_agg(jsonb_build_object('date',lead_day,'leads',leads) ORDER BY lead_day) FROM daily_qualified),'[]'::jsonb),
    'measured',jsonb_build_object('page_views',(SELECT page_views FROM totals),'unique_visitors',(SELECT unique_visitors FROM totals),'leads',(SELECT leads FROM totals),'qualified_leads',(SELECT qualified_leads FROM totals),'form_starts',(SELECT form_starts FROM totals),'form_errors',(SELECT form_errors FROM totals),'average_page_duration_seconds',COALESCE((SELECT round(avg(NULLIF(data->>'duration_seconds','')::numeric),1) FROM view_rows),0)),
    'funnelSteps',jsonb_build_array(
      jsonb_build_object('step','Visiteurs uniques','visitors',(SELECT unique_visitors FROM totals),'conversions',(SELECT unique_visitors FROM totals),'rate',CASE WHEN (SELECT unique_visitors FROM totals)>0 THEN 100 ELSE 0 END),
      jsonb_build_object('step','Pages vues','visitors',(SELECT page_views FROM totals),'conversions',(SELECT page_views FROM totals),'rate',CASE WHEN (SELECT unique_visitors FROM totals)>0 THEN round((SELECT page_views FROM totals)::numeric*100/(SELECT unique_visitors FROM totals),1) ELSE 0 END),
      jsonb_build_object('step','Formulaires commencés','visitors',(SELECT unique_visitors FROM totals),'conversions',(SELECT form_starts FROM totals),'rate',CASE WHEN (SELECT unique_visitors FROM totals)>0 THEN round((SELECT form_starts FROM totals)::numeric*100/(SELECT unique_visitors FROM totals),1) ELSE 0 END),
      jsonb_build_object('step','Leads envoyés','visitors',(SELECT unique_visitors FROM totals),'conversions',(SELECT leads FROM totals),'rate',CASE WHEN (SELECT unique_visitors FROM totals)>0 THEN round((SELECT leads FROM totals)::numeric*100/(SELECT unique_visitors FROM totals),2) ELSE 0 END)
    ),
    'topSources',COALESCE((SELECT jsonb_agg(jsonb_build_object('source',source,'visitors',0,'conversions',conversions,'rate',CASE WHEN (SELECT leads FROM totals)>0 THEN round(conversions::numeric*100/(SELECT leads FROM totals),1) ELSE 0 END)) FROM source_rows),'[]'::jsonb),
    'cityPerformance',COALESCE((SELECT jsonb_agg(jsonb_build_object('city',city,'leads',leads,'rate',CASE WHEN (SELECT leads FROM totals)>0 THEN round(leads::numeric*100/(SELECT leads FROM totals),1) ELSE 0 END)) FROM city_rows),'[]'::jsonb),
    'timeAnalysis',(SELECT jsonb_agg(jsonb_build_object('hour',hours.hour_value,'conversions',COALESCE(hr.conversions,0)) ORDER BY hours.hour_value) FROM generate_series(0,23) AS hours(hour_value) LEFT JOIN hour_rows hr ON hr.lead_hour=hours.hour_value),
    'deviceBreakdown',COALESCE((SELECT jsonb_agg(jsonb_build_object('device',device,'percentage',CASE WHEN (SELECT page_views FROM totals)>0 THEN round(views::numeric*100/(SELECT page_views FROM totals),1) ELSE 0 END,'conversions',views) ORDER BY views DESC) FROM device_rows),'[]'::jsonb),
    'formAnalytics',jsonb_build_object('averageTime',0,'starts',(SELECT form_starts FROM totals),'errors',(SELECT form_errors FROM totals),'dropoffPoints',jsonb_build_array(jsonb_build_object('field','Erreurs observées','dropoffRate',CASE WHEN (SELECT form_starts FROM totals)>0 THEN round((SELECT form_errors FROM totals)::numeric*100/(SELECT form_starts FROM totals),1) ELSE 0 END)),'completionRate',CASE WHEN (SELECT form_starts FROM totals)>0 THEN round((SELECT leads FROM totals)::numeric*100/(SELECT form_starts FROM totals),2) ELSE 0 END),
    'landingPages',COALESCE((SELECT jsonb_agg(jsonb_build_object('page',landing_page,'leads',leads)) FROM landing_rows),'[]'::jsonb)
  )::text;`;
  return json(res, origin, 200, { ok: true, analytics: parseJsonLine(await runPsql(sql)) }, requestId);
}
async function adminCrmAnalytics(req,res,origin,requestId,url){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const days=Math.min(365,Math.max(1,Number.parseInt(url.searchParams.get('days')||'30',10)||30));
  const now=Date.now(),periodStart=now-days*86400000,previousStart=now-days*2*86400000;
  const [leads,interactions]=await Promise.all([recordsAllWithMirror('crm_leads'),recordsAllWithMirror('crm_interactions')]);
  const timestamp=row=>{const value=Date.parse(String(row.created_at||''));return Number.isFinite(value)?value:0;};
  const currentLeads=leads.filter(row=>timestamp(row)>=periodStart).length;
  const previousLeads=leads.filter(row=>timestamp(row)>=previousStart&&timestamp(row)<periodStart).length;
  const currentInteractions=interactions.filter(row=>timestamp(row)>=periodStart).length;
  const previousInteractions=interactions.filter(row=>timestamp(row)>=previousStart&&timestamp(row)<periodStart).length;
  const statusCounts={};for(const lead of leads){const status=String(lead.status||'NOUVEAU_LEAD');statusCounts[status]=(statusCounts[status]||0)+1;}
  return json(res,origin,200,{ok:true,analytics:{currentLeads,previousLeads,currentInteractions,previousInteractions,totalLeads:leads.length,statusCounts,periodDays:days}},requestId);
}
async function adminContentEditor(req,res,origin,requestId,url){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const body=await readJsonBody(req),kind=String(body.kind||url.searchParams.get('kind')||''),collection=kind==='blog'?'blog_posts':kind==='faq'?'faqs':'';if(!collection)return json(res,origin,400,{ok:false,error:'invalid_kind'},requestId);const id=String(body.id||url.searchParams.get('id')||'');
  if(req.method==='DELETE'){if(!uuidPattern.test(id))return json(res,origin,400,{ok:false,error:'invalid_id'},requestId);const deleted=parseJsonLine(await runPsql(`DELETE FROM taxiassur.records WHERE collection=${quoteLiteral(collection)} AND record_id=${quoteLiteral(id)} RETURNING data::text;`));return deleted?json(res,origin,200,{ok:true},requestId):json(res,origin,404,{ok:false,error:'not_found'},requestId);}
  const now=new Date().toISOString(),status=body.status==='published'?'published':'draft',record=kind==='blog'?{title:String(body.title||'').trim().slice(0,250),summary:String(body.summary||'').slice(0,2000),excerpt:String(body.summary||'').slice(0,2000),content:String(body.content||'').slice(0,250000),tags:Array.isArray(body.tags)?body.tags.map(x=>String(x).slice(0,80)).slice(0,20):[],image:String(body.image||'').slice(0,1000),status,published:status==='published',updated_at:now}:{question:String(body.question||'').trim().slice(0,500),answer:String(body.answer||'').slice(0,10000),category:String(body.category||'general').slice(0,100),order:Number(body.order)||1,status,published:status==='published',is_active:status==='published',updated_at:now};if((kind==='blog'&&!record.title)||(kind==='faq'&&!record.question))return json(res,origin,400,{ok:false,error:'invalid_content'},requestId);
  if(req.method==='POST'){const recordId=randomUUID(),item={id:recordId,...record,created_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES(${quoteLiteral(collection)},${quoteLiteral(recordId)},${quoteLiteral(JSON.stringify(item))}::jsonb,'admin');`);return json(res,origin,201,{ok:true,item},requestId);}if(!uuidPattern.test(id))return json(res,origin,400,{ok:false,error:'invalid_id'},requestId);const item=parseJsonLine(await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(record))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection=${quoteLiteral(collection)} AND record_id=${quoteLiteral(id)} RETURNING data::text;`));return item?json(res,origin,200,{ok:true,item},requestId):json(res,origin,404,{ok:false,error:'not_found'},requestId);
}
async function adminContent(req,res,origin,requestId,url){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const kind=String(url.searchParams.get('kind')||'');const collections={blog:'blog_posts',news:'news_articles',faq:'faqs',leads:'crm_leads'};
  const collection=collections[kind];if(!collection)return json(res,origin,400,{ok:false,error:'invalid_content_kind'},requestId);
  const limit=Math.min(200,Math.max(1,Number(url.searchParams.get('limit'))||50));const offset=Math.max(0,Number(url.searchParams.get('offset'))||0);
  const category=String(url.searchParams.get('category')||'').trim(),status=String(url.searchParams.get('status')||'').trim();
  let items=await recordsAllWithMirror(collection);items=items.filter(item=>(!category||String(item.category||'')===category)&&(!status||String(item.status||'')===status)).sort((a,b)=>String(b.published_at||b.created_at||'').localeCompare(String(a.published_at||a.created_at||'')));
  return json(res,origin,200,{ok:true,items:items.slice(offset,offset+limit),total:items.length},requestId);
}

async function adminQrCodes(req,res,origin,requestId){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const sql=`SELECT jsonb_build_object('ambassadors',COALESCE((SELECT jsonb_agg(data ORDER BY COALESCE(data->>'created_at','') DESC) FROM taxiassur.records WHERE collection='ambassadors'),'[]'::jsonb),'usage',COALESCE((SELECT jsonb_agg(data ORDER BY COALESCE(data->>'created_at','') DESC) FROM (SELECT data FROM taxiassur.records WHERE collection='qr_code_usage' ORDER BY COALESCE(data->>'created_at','') DESC LIMIT 100) q),'[]'::jsonb))::text;`;
  return json(res,origin,200,{ok:true,...parseJsonLine(await runPsql(sql))},requestId);
}
async function adminQrUsage(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const body=await readJsonBody(req);const code=String(body.ambassador_code||'').trim().slice(0,80);const template=String(body.template||'basic').trim().slice(0,40);
  if(!code)return json(res,origin,400,{ok:false,error:'invalid_code'},requestId);
  const id=randomUUID();const usage={id,ambassador_code:code,action:'generate',template,created_by:session.sub,created_at:new Date().toISOString()};
  await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('qr_code_usage',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(usage))}::jsonb,'admin');`);
  return json(res,origin,201,{ok:true,usage},requestId);
}

async function adminNotificationConfigs(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  let configs=parseJsonLine(await runPsql(`SELECT COALESCE(jsonb_agg(data ORDER BY data->>'notification_type'),'[]'::jsonb)::text FROM taxiassur.records WHERE collection='email_notifications_config' AND data->>'user_id'=${quoteLiteral(session.sub)};`))||[];
  if(!configs.length){const defaults=[['vip_open',true,{min_score:70}],['first_open',true,{}],['click',false,{}],['reply',true,{}],['engagement_drop',false,{threshold:30}]];for(const [type,enabled,conditions] of defaults){const id=randomUUID();const row={id,user_id:session.sub,notification_type:type,enabled,conditions,channels:['email'],created_at:new Date().toISOString()};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('email_notifications_config',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(row))}::jsonb,'admin');`);configs.push(row);}}
  return json(res,origin,200,{ok:true,configs},requestId);
}
async function adminNotificationConfigPatch(req,res,origin,requestId,configId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const body=await readJsonBody(req);
  if(typeof body.enabled!=='boolean')return json(res,origin,400,{ok:false,error:'invalid_enabled'},requestId);
  const config=parseJsonLine(await runPsql(`UPDATE taxiassur.records SET data=data||jsonb_build_object('enabled',${body.enabled?'true':'false'}::boolean,'updated_at',now()::text),updated_at=now(),revision=revision+1 WHERE collection='email_notifications_config' AND record_id=${quoteLiteral(configId)} AND data->>'user_id'=${quoteLiteral(session.sub)} RETURNING data::text;`));
  return config?json(res,origin,200,{ok:true,config},requestId):json(res,origin,404,{ok:false,error:'not_found'},requestId);
}

async function adminEmailBlacklist(req,res,origin,requestId){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const sql=`SELECT jsonb_build_object('blacklist',COALESCE((SELECT jsonb_agg(data ORDER BY COALESCE(data->>'created_at','') DESC) FROM taxiassur.records WHERE collection='email_blacklist'),'[]'::jsonb),'deletion_logs',COALESCE((SELECT jsonb_agg(data ORDER BY COALESCE(data->>'deleted_at','') DESC) FROM (SELECT data FROM taxiassur.records WHERE collection='lead_deletion_log' ORDER BY COALESCE(data->>'deleted_at','') DESC LIMIT 100) q),'[]'::jsonb))::text;`;
  return json(res,origin,200,{ok:true,...parseJsonLine(await runPsql(sql))},requestId);
}
async function adminEmailBlacklistCreate(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const body=await readJsonBody(req);
  const emailPattern=String(body.email_pattern||'').trim().toLowerCase().slice(0,320);const patternType=String(body.pattern_type||'');const reason=String(body.reason||'').trim().slice(0,500);
  if(!emailPattern||!['exact','domain','contains'].includes(patternType)||!reason)return json(res,origin,400,{ok:false,error:'invalid_pattern'},requestId);
  const id=randomUUID();const row={id,email_pattern:emailPattern,pattern_type:patternType,reason,is_active:true,created_by:session.sub,created_at:new Date().toISOString()};
  await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('email_blacklist',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(row))}::jsonb,'admin');`);
  return json(res,origin,201,{ok:true,entry:row},requestId);
}
async function adminEmailBlacklistPatch(req,res,origin,requestId,id){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const body=await readJsonBody(req);
  if(typeof body.is_active!=='boolean')return json(res,origin,400,{ok:false,error:'invalid_state'},requestId);
  const row=parseJsonLine(await runPsql(`UPDATE taxiassur.records SET data=data||jsonb_build_object('is_active',${body.is_active?'true':'false'}::boolean,'updated_at',now()::text),updated_at=now(),revision=revision+1 WHERE collection='email_blacklist' AND record_id=${quoteLiteral(id)} RETURNING data::text;`));
  return row?json(res,origin,200,{ok:true,entry:row},requestId):json(res,origin,404,{ok:false,error:'not_found'},requestId);
}
async function adminEmailBlacklistDelete(req,res,origin,requestId,id){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const deleted=String(await runPsql(`WITH deleted AS(DELETE FROM taxiassur.records WHERE collection='email_blacklist' AND record_id=${quoteLiteral(id)} RETURNING record_id)INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)SELECT 'admin',${quoteLiteral(session.sub)},'email_blacklist_deleted','email_blacklist',record_id,${quoteLiteral(requestId)}::uuid FROM deleted RETURNING target_id;`)).trim();
  return deleted?json(res,origin,200,{ok:true},requestId):json(res,origin,404,{ok:false,error:'not_found'},requestId);
}

async function adminAbTests(req,res,origin,requestId,url){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const tests=await recordsAll('email_ab_tests');if(req.method==='GET'){const [variants,opens,clicks]=await Promise.all([recordsAll('email_ab_variants'),recordsAll('email_opens'),recordsAll('email_clicks')]),stats={};for(const test of tests){const rows=variants.filter(x=>String(x.ab_test_id)===String(test.id)),calc=v=>{const ids=new Set(rows.filter(x=>x.variant===v).map(x=>String(x.email_send_id)));return {sent:ids.size,opens:opens.filter(x=>ids.has(String(x.email_send_id))).length,clicks:clicks.filter(x=>ids.has(String(x.email_send_id))).length};},a=calc('A'),b=calc('B');stats[test.id]={variant_a_sent:a.sent,variant_b_sent:b.sent,variant_a_opens:a.opens,variant_b_opens:b.opens,variant_a_clicks:a.clicks,variant_b_clicks:b.clicks};}return json(res,origin,200,{ok:true,tests:tests.sort((a,b)=>Date.parse(String(b.created_at||''))-Date.parse(String(a.created_at||''))),stats},requestId);}const body=await readJsonBody(req),action=String(body.action||''),id=String(body.id||'');if(req.method==='POST'&&action==='create'){const testId=randomUUID(),now=new Date().toISOString(),record={id:testId,name:String(body.name||'').slice(0,180),description:String(body.description||'').slice(0,1000),variant_a_subject:String(body.variant_a_subject||'').slice(0,250),variant_b_subject:String(body.variant_b_subject||'').slice(0,250),variant_a_content:String(body.variant_a_content||'').slice(0,100000),variant_b_content:String(body.variant_b_content||'').slice(0,100000),sample_size:Math.max(10,Math.min(1000,Number(body.sample_size)||100)),winner_variant:null,status:'draft',started_at:null,ended_at:null,created_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('email_ab_tests',${quoteLiteral(testId)},${quoteLiteral(JSON.stringify(record))}::jsonb,'admin');`);return json(res,origin,201,{ok:true,test:record},requestId);}const test=tests.find(x=>String(x.id)===id);if(!test)return json(res,origin,404,{ok:false,error:'not_found'},requestId);if(action==='launch'){const subs=(await recordsAll('newsletter_subscribers')).filter(x=>x.status==='active').slice(0,Number(test.sample_size)||100),now=new Date().toISOString(),q=[];subs.forEach((sub,i)=>{const sendId=randomUUID(),variant=i%2?'B':'A',mail={id:sendId,recipient:sub.email,subject:variant==='A'?test.variant_a_subject:test.variant_b_subject,body_html:variant==='A'?test.variant_a_content:test.variant_b_content,status:'pending',created_at:now,ab_test_id:id,variant};q.push(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('native_email_outbox',${quoteLiteral(sendId)},${quoteLiteral(JSON.stringify(mail))}::jsonb,'ab-test'),('email_ab_variants',${quoteLiteral(randomUUID())},${quoteLiteral(JSON.stringify({ab_test_id:id,variant,email_send_id:sendId}))}::jsonb,'ab-test');`);});q.push(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({status:'running',started_at:now}))}::jsonb WHERE collection='email_ab_tests' AND record_id=${quoteLiteral(id)};`);await runPsql('BEGIN;'+q.join('')+'COMMIT;');return json(res,origin,202,{ok:true,success:true,sent_a:Math.ceil(subs.length/2),sent_b:Math.floor(subs.length/2)},requestId);}if(req.method==='PATCH'&&action==='complete'){await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({status:'completed',winner_variant:String(body.winner||''),ended_at:new Date().toISOString()}))}::jsonb WHERE collection='email_ab_tests' AND record_id=${quoteLiteral(id)};`);return json(res,origin,200,{ok:true},requestId);}if(req.method==='DELETE'){await runPsql(`DELETE FROM taxiassur.records WHERE collection='email_ab_tests' AND record_id=${quoteLiteral(id)};`);return json(res,origin,200,{ok:true},requestId);}return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);}
async function adminNewsletterDashboard(req,res,origin,requestId,url){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);if(req.method==='GET'){const [campaigns,subscribers,articles]=await Promise.all([recordsAll('newsletter_campaigns'),recordsAll('newsletter_subscribers'),recordsAll('blog_posts')]);const status=String(url.searchParams.get('status')||'active'),search=String(url.searchParams.get('search')||'').toLowerCase();let visible=subscribers.filter(x=>(status==='all'||x.status===status)&&(!search||String(x.email||'').toLowerCase().includes(search)||String(x.first_name||'').toLowerCase().includes(search))).sort((a,b)=>Date.parse(String(b.subscribed_at||b.created_at||''))-Date.parse(String(a.subscribed_at||a.created_at||''))).slice(0,100);const active=subscribers.filter(x=>x.status==='active'),sent=campaigns.filter(x=>x.status==='sent'),totalSent=sent.reduce((n,x)=>n+Number(x.total_sent||0),0),totalOpened=sent.reduce((n,x)=>n+Number(x.total_opened||0),0),totalClicked=sent.reduce((n,x)=>n+Number(x.total_clicked||0),0),month=new Date();month.setDate(1);month.setHours(0,0,0,0);return json(res,origin,200,{ok:true,campaigns:campaigns.sort((a,b)=>Date.parse(String(b.created_at||''))-Date.parse(String(a.created_at||''))).slice(0,30),subscribers:visible,articles:articles.filter(x=>x.published===true).sort((a,b)=>Date.parse(String(b.created_at||''))-Date.parse(String(a.created_at||''))).slice(0,5),stats:{activeSubscribers:active.length,totalCampaigns:campaigns.length,sentCampaigns:sent.length,avgOpenRate:totalSent?totalOpened/totalSent*100:0,avgClickRate:totalOpened?totalClicked/totalOpened*100:0,totalSent,newThisMonth:active.filter(x=>Date.parse(String(x.subscribed_at||x.created_at||''))>=month.getTime()).length}},requestId);}const body=await readJsonBody(req),action=String(body.action||'');if(action==='create'){const id=randomUUID(),now=new Date().toISOString(),record={id,name:String(body.name||'').trim().slice(0,180),subject:String(body.subject||'').trim().slice(0,250),content_html:String(body.content_html||'').slice(0,250000),status:'draft',scheduled_at:now,created_at:now,total_sent:0,total_opened:0,total_clicked:0};if(!record.name||!record.subject||!record.content_html)return json(res,origin,400,{ok:false,error:'invalid_campaign'},requestId);await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('newsletter_campaigns',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(record))}::jsonb,'admin');`);return json(res,origin,201,{ok:true,campaign:record},requestId);}if(action==='send'){const id=String(body.campaign_id||''),campaign=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='newsletter_campaigns' AND record_id=${quoteLiteral(id)} LIMIT 1;`));if(!campaign||campaign.status==='sent')return json(res,origin,409,{ok:false,error:'campaign_unavailable'},requestId);const subs=(await recordsAll('newsletter_subscribers')).filter(x=>x.status==='active'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(x.email||''))),now=new Date().toISOString(),statements=[];for(const sub of subs){const mailId=randomUUID(),mail={id:mailId,recipient:String(sub.email).toLowerCase(),subject:campaign.subject,body_html:campaign.content_html,status:'pending',attempts:0,next_attempt_at:now,created_at:now,campaign_id:id};statements.push(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('native_email_outbox',${quoteLiteral(mailId)},${quoteLiteral(JSON.stringify(mail))}::jsonb,'newsletter');`);}statements.push(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({status:'sending',queued_at:now,total_subscribers:subs.length,total_sent:0}))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='newsletter_campaigns' AND record_id=${quoteLiteral(id)};`);await runPsql('BEGIN;'+statements.join('')+'COMMIT;');return json(res,origin,202,{ok:true,success:true,sent_count:subs.length,queued:true},requestId);}return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);}
async function adminNewsletterSubscribers(req,res,origin,requestId){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const rows=parseJsonLine(await runPsql(`SELECT COALESCE(jsonb_agg(data||jsonb_build_object('subscribed_at',COALESCE(data->>'subscribed_at',data->>'created_at')) ORDER BY COALESCE(data->>'subscribed_at',data->>'created_at','') DESC),'[]'::jsonb)::text FROM taxiassur.records WHERE collection='newsletter_subscribers';`))||[];
  return json(res,origin,200,{ok:true,subscribers:rows},requestId);
}
async function adminEmailAdvancedAnalytics(req,res,origin,requestId,url){if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const days=Math.max(7,Math.min(365,Number(url.searchParams.get('days'))||30)),cut=Date.now()-days*86400000,[campaigns,subs,engaged,geos,tests,variants,opens]=await Promise.all([recordsAll('newsletter_campaigns'),recordsAll('newsletter_subscribers'),recordsAll('lead_engagement_scores'),recordsAll('email_geolocation'),recordsAll('email_ab_tests'),recordsAll('email_ab_variants'),recordsAll('email_opens')]);const recent=campaigns.filter(x=>Date.parse(String(x.created_at||''))>=cut).slice(0,20),rows=recent.map(x=>{const sent=Number(x.sent_count||x.total_sent||0),open=Number(x.open_count||x.total_opened||0),click=Number(x.click_count||x.total_clicked||0);return {id:x.id,name:x.name,status:x.status,subject:x.subject,sent_count:sent,open_rate:sent?open/sent*100:0,click_rate:sent?click/sent*100:0,sent_at:x.sent_at};}),sent=rows.reduce((n,x)=>n+x.sent_count,0),opened=recent.reduce((n,x)=>n+Number(x.open_count||x.total_opened||0),0),clicked=recent.reduce((n,x)=>n+Number(x.click_count||x.total_clicked||0),0),active=subs.filter(x=>x.status==='active'),newSubs=subs.filter(x=>Date.parse(String(x.subscribed_at||x.created_at||''))>=cut),months={};for(const x of newSubs){const d=new Date(x.subscribed_at||x.created_at),k=d.toLocaleDateString('fr-FR',{month:'short',year:'2-digit'});months[k]=(months[k]||0)+1;}const geoCounts={};for(const x of geos.filter(x=>Date.parse(String(x.created_at||''))>=cut&&x.country_name))geoCounts[x.country_name]=(geoCounts[x.country_name]||0)+1;const geoTotal=Object.values(geoCounts).reduce((a,b)=>a+b,0),ab=tests.slice(0,4).map(t=>{const ids=v=>new Set(variants.filter(x=>x.ab_test_id===t.id&&x.variant===v).map(x=>x.email_send_id)),a=ids('A'),b=ids('B'),ao=opens.filter(x=>a.has(x.email_send_id)).length,bo=opens.filter(x=>b.has(x.email_send_id)).length;return {name:t.name,status:t.status,variant_a_opens:ao,variant_b_opens:bo,winner:t.status==='completed'?(ao>=bo?'A':'B'):null};});return json(res,origin,200,{ok:true,campaigns:rows,engaged:engaged.sort((a,b)=>Number(b.engagement_score)-Number(a.engagement_score)).slice(0,8),geo:Object.entries(geoCounts).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([country_name,count])=>({country_name,count,pct:geoTotal?count/geoTotal*100:0})),ab_tests:ab,sub_series:Object.entries(months).map(([month,count])=>({month,count})),funnel:{sent,opened,clicked,replied:0},summary:{active_subscribers:active.length,new_subscribers:newSubs.length,total_sent:sent,avg_open_rate:rows.length?rows.reduce((n,x)=>n+x.open_rate,0)/rows.length:0,avg_click_rate:rows.length?rows.reduce((n,x)=>n+x.click_rate,0)/rows.length:0,campaigns:rows.length}},requestId);}
async function adminEmailMarketingDashboard(req,res,origin,requestId){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const names=['email_queue','native_email_outbox','email_messages','email_sends','email_opens','email_clicks','email_replies','newsletter_subscribers','email_templates_smart','email_ab_tests','newsletter_campaigns'];const groups={};await Promise.all(names.map(async name=>{groups[name]=await recordsAll(name);}));
  const queue=[...groups.email_queue,...groups.native_email_outbox].sort((a,b)=>Date.parse(String(b.created_at||''))-Date.parse(String(a.created_at||''))),sent=queue.filter(x=>x.status==='sent'),now=Date.now(),messages=groups.email_messages;
  const byType={};for(const e of queue){const key=String(e.email_type||e.type||'autre');if(!byType[key])byType[key]={email_type:key,total:0,sent:0,pending:0,failed:0,last_sent_at:null};const x=byType[key];x.total++;if(e.status==='sent')x.sent++;else if(e.status==='failed')x.failed++;else x.pending++;const at=e.sent_at||null;if(at&&(!x.last_sent_at||at>x.last_sent_at))x.last_sent_at=at;}
  const metrics={queue_total:queue.length,queue_sent:sent.length,unique_recipients:new Set(sent.map(x=>String(x.to_email||x.recipient||'').toLowerCase()).filter(Boolean)).size,sent_7d:sent.filter(x=>now-Date.parse(String(x.sent_at||x.created_at||''))<=7*86400000).length,sent_30d:sent.filter(x=>now-Date.parse(String(x.sent_at||x.created_at||''))<=30*86400000).length,inbox_total:messages.length,inbox_unread:messages.filter(x=>x.is_read!==true).length,inbox_linked:messages.filter(x=>x.lead_id).length,inbox_attachments:messages.filter(x=>Array.isArray(x.attachments)&&x.attachments.length).length,tracking_sends:groups.email_sends.length,tracking_opens:groups.email_opens.length,tracking_clicks:groups.email_clicks.length,tracking_replies:groups.email_replies.length,active_subscribers:groups.newsletter_subscribers.filter(x=>x.status==='active').length,active_templates:groups.email_templates_smart.filter(x=>x.is_active===true).length,active_tests:groups.email_ab_tests.filter(x=>x.status==='running').length};
  const campaigns=groups.newsletter_campaigns.sort((a,b)=>Date.parse(String(b.created_at||''))-Date.parse(String(a.created_at||''))).slice(0,5),recent_emails=queue.slice(0,15).map(x=>({...x,to_email:x.to_email||x.recipient||'',to_name:x.to_name||'',email_type:x.email_type||x.type||'autre'}));return json(res,origin,200,{ok:true,metrics,email_types:Object.values(byType),campaigns,recent_emails},requestId);
}
async function adminNews(req,res,origin,requestId,url){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  if(req.method==='GET'){url.searchParams.set('kind','news');return adminContent(req,res,origin,requestId,url);}
  const body=await readJsonBody(req),action=String(body.action||'');
  if(action==='refresh'){
    const maxResults=Math.min(10,Math.max(1,Number(body.max_results)||3)),allowedHosts=new Set(['news.google.com','www.taximag.fr','taximag.fr','www.mobilitemagazine.fr','mobilitemagazine.fr','www.transportinfo.fr','transportinfo.fr']);
    const defaults=[{name:'Google News Taxi',url:'https://news.google.com/rss/search?q=taxi+assurance+France&hl=fr&gl=FR&ceid=FR:fr',keywords:['taxi','assurance','transport','réglementation']}];
    const configured=(await recordsAllWithMirror('news_sources')).filter(source=>source.enabled!==false&&source.type==='rss');const sources=configured.length?[...configured,...defaults]:defaults;
    const existing=await recordsAllWithMirror('news_articles'),knownUrls=new Set(existing.map(item=>String(item.source_url||'')).filter(Boolean)),articles=[],errors=[];
    const decode=value=>String(value||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
    const tag=(xml,name)=>decode(xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'))?.[1]||'');
    for(const source of sources.slice(0,10)){try{const target=new URL(String(source.url||''));if(target.protocol!=='https:'||!allowedHosts.has(target.hostname))throw new Error('source_not_allowed');const response=await fetch(target,{headers:{'User-Agent':'TaxiAssur-News-Monitor/1.0'},signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error(`http_${response.status}`);const xml=await response.text(),items=xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)||[];for(const item of items.slice(0,20)){const title=tag(item,'title'),description=tag(item,'description'),link=tag(item,'link')||tag(item,'guid'),publishedAt=tag(item,'pubDate')||new Date().toISOString(),text=`${title} ${description}`.toLowerCase(),keywords=Array.isArray(source.keywords)?source.keywords.map(String):defaults[0].keywords;let score=keywords.reduce((sum,keyword)=>sum+(text.includes(keyword.toLowerCase())?15:0),0);if(text.includes('assurance taxi'))score+=30;if(!title||!/^https?:\/\//i.test(link)||knownUrls.has(link)||score<15)continue;const id=randomUUID(),now=new Date().toISOString(),article={id,title:title.slice(0,250),slug:`${contentSlug(title)}-${id.slice(0,8)}`,content:`<p>${description.slice(0,10000)}</p>`,summary:description.slice(0,500),excerpt:description.slice(0,500),source:String(source.name||target.hostname).slice(0,150),source_url:link.slice(0,2000),category:'Actualité taxi',tags:keywords.slice(0,8),score:Math.min(100,score),status:score>=70?'ready':'draft',published:false,source_published_at:publishedAt,created_at:now,updated_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('news_articles',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(article))}::jsonb,'native-rss');`);knownUrls.add(link);articles.push(article);if(articles.length>=maxResults)break;}if(articles.length>=maxResults)break;}catch(error){errors.push(`${String(source.name||'source')}: ${error instanceof Error?error.message:'fetch_failed'}`);}}
    return json(res,origin,200,{ok:true,success:true,articles,stats:{newArticles:articles.length,sourcesChecked:sources.length,errors:errors.length},errors},requestId);
  }
  if(action==='publish'){const id=String(body.id||'');if(!uuidPattern.test(id))return json(res,origin,400,{ok:false,error:'invalid_id'},requestId);let item=parseJsonLine(await runPsql(`UPDATE taxiassur.records SET data=data||jsonb_build_object('status','published','published',true,'published_at',now()::text,'updated_at',now()::text),updated_at=now(),revision=revision+1 WHERE collection='news_articles' AND record_id=${quoteLiteral(id)} RETURNING data::text;`));if(!item){const archived=(await recordsAllWithMirror('news_articles')).find(row=>String(row.id)===id);if(archived){const now=new Date().toISOString();item={...archived,status:'published',published:true,published_at:now,updated_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('news_articles',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(item))}::jsonb,'admin-archive-restore');`);}}return item?json(res,origin,200,{ok:true,item},requestId):json(res,origin,404,{ok:false,error:'not_found'},requestId);}
  if(action==='clean_excerpts'){const count=Number(parseJsonLine(await runPsql(`WITH changed AS (UPDATE taxiassur.records SET data=jsonb_set(jsonb_set(data,'{summary}',to_jsonb(regexp_replace(COALESCE(data->>'summary',''),'<[^>]+>','','g'))),'{excerpt}',to_jsonb(regexp_replace(COALESCE(data->>'excerpt',''),'<[^>]+>','','g'))),updated_at=now(),revision=revision+1 WHERE collection='news_articles' AND (COALESCE(data->>'summary','')~'<[^>]+>' OR COALESCE(data->>'excerpt','')~'<[^>]+>') RETURNING 1) SELECT count(*)::text FROM changed;`)))||0;return json(res,origin,200,{ok:true,cleanedCount:count,totalArticles:count,message:`${count} résumé(s) nettoyé(s)`},requestId);}
  return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);
}
async function adminContentScheduler(req,res,origin,requestId){if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);if(req.method==='GET'){const schedules=await recordsAll('content_schedule'),blogs=await recordsAll('blog_posts'),faqs=await recordsAll('faqs'),reviews=await recordsAll('reviews'),all=[...blogs,...faqs,...reviews],week=Date.now()-7*86400000,recent=[...blogs.map(x=>({...x,type:'blog'})),...faqs.map(x=>({...x,title:x.question,type:'faq'})),...reviews.map(x=>({...x,title:x.title||x.author_name||'Avis client',type:'review'}))].sort((a,b)=>Date.parse(String(b.created_at||''))-Date.parse(String(a.created_at||''))).slice(0,12);return json(res,origin,200,{ok:true,schedules:schedules.sort((a,b)=>String(a.content_type).localeCompare(String(b.content_type))),stats:{total:all.length,published:all.filter(x=>x.published===true||x.status==='published').length,draft:all.filter(x=>x.published!==true&&x.status!=='published').length,lastWeek:all.filter(x=>Date.parse(String(x.created_at||''))>=week).length},recent},requestId);}const body=await readJsonBody(req),id=String(body.id||'');if(!uuidPattern.test(id))return json(res,origin,400,{ok:false,error:'invalid_id'},requestId);const allowed={};if(Number.isFinite(Number(body.frequency_per_week)))allowed.frequency_per_week=Math.min(7,Math.max(1,Number(body.frequency_per_week)));if(typeof body.auto_publish==='boolean')allowed.auto_publish=body.auto_publish;if(typeof body.is_active==='boolean')allowed.is_active=body.is_active;if(Array.isArray(body.keywords))allowed.keywords=body.keywords.map(x=>String(x).trim().slice(0,100)).filter(Boolean).slice(0,20);allowed.updated_at=new Date().toISOString();const item=parseJsonLine(await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(allowed))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='content_schedule' AND record_id=${quoteLiteral(id)} RETURNING data::text;`));return item?json(res,origin,200,{ok:true,item},requestId):json(res,origin,404,{ok:false,error:'not_found'},requestId);}
function contentSlug(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,160);}
async function adminAiContent(req,res,origin,requestId){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const body=await readJsonBody(req),action=String(body.action||'generate');if(action==='generate'){const keyword=String(body.keyword||'').trim().slice(0,160),city=String(body.city||'').trim().slice(0,120),secondary=Array.isArray(body.secondaryKeywords)?body.secondaryKeywords.map(x=>String(x).slice(0,100)).slice(0,8):[];if(!keyword||!city)return json(res,origin,400,{ok:false,error:'keyword_and_city_required'},requestId);const openai=await effectiveOpenAi();if(!openai.key)return json(res,origin,503,{ok:false,error:'ai_unavailable'},requestId);const prompt=`Crée un ensemble SEO en français pour TaxiAssur sur le mot-clé "${keyword}" et la ville "${city}". Mots secondaires: ${secondary.join(', ')}. Retourne uniquement un JSON valide avec cette structure exacte: {"blogPost":{"title":"","slug":"","content":"","excerpt":"","metaDescription":"","keywords":[],"readingTime":0},"cityPage":{"city":"","title":"","slug":"","content":"","metaDescription":"","keywords":[]},"faq":[{"question":"","answer":"","category":"assurance-taxi"}],"newsArticle":{"title":"","content":"","category":"assurance-taxi","featured":false},"metadata":{"totalWords":0,"seoScore":0,"generatedAt":""}}. Contenu utile, exact, sans inventer de prix ni de garanties. Ajoute 5 FAQ.`;const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+openai.key,'Content-Type':'application/json'},body:JSON.stringify({model:openai.model,temperature:.35,max_tokens:5000,response_format:{type:'json_object'},messages:[{role:'system',content:'Tu es rédacteur SEO spécialisé en assurance taxi française. Réponds uniquement en JSON valide.'},{role:'user',content:prompt}]})});const payload=await response.json().catch(()=>null);if(!response.ok)return json(res,origin,502,{ok:false,error:'ai_provider_error'},requestId);let content;try{content=JSON.parse(String(payload?.choices?.[0]?.message?.content||''));}catch{return json(res,origin,502,{ok:false,error:'invalid_ai_content'},requestId);}content.blogPost=content.blogPost||{};content.cityPage=content.cityPage||{};content.blogPost.slug=contentSlug(content.blogPost.slug||content.blogPost.title||keyword);content.cityPage.slug=contentSlug(content.cityPage.slug||`${keyword}-${city}`);content.cityPage.city=city;content.faq=Array.isArray(content.faq)?content.faq.slice(0,10):[];content.metadata={...(content.metadata||{}),generatedAt:new Date().toISOString()};return json(res,origin,200,{ok:true,success:true,content},requestId);}if(action==='publish'){const content=body.content;if(!content?.blogPost?.title||!content?.cityPage?.title)return json(res,origin,400,{ok:false,error:'invalid_content'},requestId);const now=new Date().toISOString(),blogId=randomUUID(),cityId=randomUUID(),newsId=randomUUID(),blog={id:blogId,title:String(content.blogPost.title).slice(0,250),slug:contentSlug(content.blogPost.slug||content.blogPost.title),content:String(content.blogPost.content||'').slice(0,250000),excerpt:String(content.blogPost.excerpt||'').slice(0,1000),meta_description:String(content.blogPost.metaDescription||'').slice(0,500),keywords:Array.isArray(content.blogPost.keywords)?content.blogPost.keywords:[],status:'published',published:true,published_at:now,created_at:now},city={id:cityId,city_name:String(content.cityPage.city||'').slice(0,120),title:String(content.cityPage.title).slice(0,250),slug:contentSlug(content.cityPage.slug||content.cityPage.title),content:String(content.cityPage.content||'').slice(0,250000),meta_description:String(content.cityPage.metaDescription||'').slice(0,500),keywords:Array.isArray(content.cityPage.keywords)?content.cityPage.keywords:[],status:'published',published:true,published_at:now,created_at:now},news={id:newsId,title:String(content.newsArticle?.title||content.blogPost.title).slice(0,250),content:String(content.newsArticle?.content||content.blogPost.excerpt||'').slice(0,100000),category:String(content.newsArticle?.category||'assurance-taxi').slice(0,100),featured:content.newsArticle?.featured===true,status:'published',published:true,published_at:now,created_at:now},statements=[`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('blog_posts',${quoteLiteral(blogId)},${quoteLiteral(JSON.stringify(blog))}::jsonb,'admin-ai'),('city_pages',${quoteLiteral(cityId)},${quoteLiteral(JSON.stringify(city))}::jsonb,'admin-ai'),('news_articles',${quoteLiteral(newsId)},${quoteLiteral(JSON.stringify(news))}::jsonb,'admin-ai');`],faqIds=[];for(const item of (Array.isArray(content.faq)?content.faq.slice(0,10):[])){const id=randomUUID(),faq={id,question:String(item.question||'').slice(0,500),answer:String(item.answer||'').slice(0,5000),category:String(item.category||'assurance-taxi').slice(0,100),is_active:true,created_at:now};if(faq.question&&faq.answer){faqIds.push(id);statements.push(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('faqs',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(faq))}::jsonb,'admin-ai');`);}}statements.push(`INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},'ai_content_published','content_bundle',${quoteLiteral(blogId)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({blog_id:blogId,city_id:cityId,news_id:newsId,faq_ids:faqIds}))}::jsonb);`);await runPsql('BEGIN;'+statements.join('')+'COMMIT;');return json(res,origin,201,{ok:true,success:true,results:{blog:blogId,city:cityId,news:newsId,faq:faqIds,errors:[]}},requestId);}return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);}
async function adminEmailTracking(req,res,origin,requestId){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  if(req.method==='POST')return adminInboxSync(req,res,origin,requestId);
  const sql=`SELECT jsonb_build_object('total_sent',(SELECT count(*) FROM taxiassur.records WHERE collection='email_sends'),'total_opened',(SELECT count(DISTINCT data->>'email_send_id') FROM taxiassur.records WHERE collection='email_opens'),'total_clicked',(SELECT count(DISTINCT data->>'email_send_id') FROM taxiassur.records WHERE collection='email_clicks'),'total_replied',(SELECT count(*) FROM taxiassur.records WHERE collection='email_replies'),'recent_emails',COALESCE((SELECT jsonb_agg(data ORDER BY COALESCE(data->>'sent_at','') DESC) FROM (SELECT data FROM taxiassur.records WHERE collection IN('email_stats','email_sends') ORDER BY COALESCE(data->>'sent_at','') DESC LIMIT 20) q),'[]'::jsonb),'recent_replies',COALESCE((SELECT jsonb_agg(r.data||jsonb_build_object('lead_name',l.data->>'name') ORDER BY COALESCE(r.data->>'replied_at','') DESC) FROM taxiassur.records r LEFT JOIN taxiassur.records l ON l.collection='crm_leads' AND l.record_id=r.data->>'lead_id' WHERE r.collection='email_replies' LIMIT 10),'[]'::jsonb))::text;`;
  return json(res,origin,200,{ok:true,...parseJsonLine(await runPsql(sql))},requestId);
}
function validRecordIds(value){return Array.isArray(value)&&value.length>0&&value.length<=200&&value.every((id)=>uuidPattern.test(String(id)));}
async function adminNewsletterSubscribersPatch(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const body=await readJsonBody(req);const ids=body.ids;const status=String(body.status||'');
  if(!validRecordIds(ids)||!['active','unsubscribed','bounced'].includes(status))return json(res,origin,400,{ok:false,error:'invalid_update'},requestId);
  const now=new Date().toISOString();const updates={status,marketing_consent:status==='active',unsubscribed_at:status==='unsubscribed'?now:null};
  const idList=ids.map((id)=>quoteLiteral(String(id))).join(',');const count=Number(String(await runPsql(`WITH updated AS(UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='newsletter_subscribers' AND record_id IN(${idList}) RETURNING record_id)SELECT count(*) FROM updated;`)).trim())||0;
  await runPsql(`INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},'newsletter_status_updated','newsletter_subscribers','bulk',${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({ids,status,count}))}::jsonb);`);
  return json(res,origin,200,{ok:true,updated:count},requestId);
}
async function adminNewsletterSubscribersDelete(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const body=await readJsonBody(req);const ids=body.ids;if(!validRecordIds(ids))return json(res,origin,400,{ok:false,error:'invalid_ids'},requestId);
  const idList=ids.map((id)=>quoteLiteral(String(id))).join(',');const count=Number(String(await runPsql(`WITH deleted AS(DELETE FROM taxiassur.records WHERE collection='newsletter_subscribers' AND record_id IN(${idList}) RETURNING record_id)SELECT count(*) FROM deleted;`)).trim())||0;
  await runPsql(`INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},'newsletter_subscribers_deleted','newsletter_subscribers','bulk',${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({ids,count}))}::jsonb);`);
  return json(res,origin,200,{ok:true,deleted:count},requestId);
}

async function nativeAutomationUnavailable(req, res, origin, requestId, automation) {
  const session = await verifiedAdminSession(req);
  if (!session) return json(res, origin, 401, { ok: false, error: 'unauthorized' }, requestId);
  return json(res, origin, 501, { ok: false, error: 'native_automation_not_implemented', automation, message: 'Automation native non disponible.' }, requestId);
}

async function adminAiAutonomous(req,res,origin,requestId){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const [leads,decisions,suggestions,deployments]=await Promise.all([recordsAll('crm_leads'),recordsAll('crm_ai_decisions'),recordsAll('ai_code_suggestions'),recordsAll('ai_deployments')]);if(req.method==='GET'){const active=leads.filter(x=>!x.deleted_at&&x.is_archived!==true),converted=active.filter(x=>['active_client','client_actif','signed'].includes(String(x.current_stage_key||x.status||'').toLowerCase())).length;return json(res,origin,200,{ok:true,metrics:{total_leads:active.length,conversion_rate:active.length?converted/active.length*100:0,avg_response_time:0,active_decisions:decisions.filter(x=>x.status==='pending').length,successful_deployments:deployments.filter(x=>x.status==='success').length,code_suggestions_pending:suggestions.filter(x=>x.status==='pending').length,learning_data_points:decisions.length},decisions:decisions.sort((a,b)=>Date.parse(String(b.created_at||''))-Date.parse(String(a.created_at||''))).slice(0,15),suggestions:suggestions.sort((a,b)=>Date.parse(String(b.created_at||''))-Date.parse(String(a.created_at||''))).slice(0,10),deployments:deployments.sort((a,b)=>Date.parse(String(b.deployed_at||b.created_at||''))-Date.parse(String(a.deployed_at||a.created_at||''))).slice(0,10)},requestId);}const body=await readJsonBody(req),action=String(body.action||'');if(action==='analyze'){const id=randomUUID(),now=new Date().toISOString(),decision={id,decision_type:'performance_optimization',context:{total_leads:leads.length},decision:{recommendation:'Réviser les dossiers sans activité récente'},confidence_score:75,status:'pending',created_at:now,model_provider:'xcr-local'};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('crm_ai_decisions',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(decision))}::jsonb,'native-ai');`);return json(res,origin,201,{ok:true,success:true},requestId);}if(action==='review'){const id=String(body.id||''),status=body.status==='approved'?'approved':'rejected';await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({status,reviewed_by:session.sub,reviewed_at:new Date().toISOString()}))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='ai_code_suggestions' AND record_id=${quoteLiteral(id)};`);return json(res,origin,200,{ok:true},requestId);}if(action==='approve_batch'){await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({status:'approved',reviewed_by:session.sub,reviewed_at:new Date().toISOString()}))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='ai_code_suggestions' AND data->>'status'='pending' AND data->>'priority' IN('high','medium');`);return json(res,origin,200,{ok:true,success:true,changesApplied:0,message:'Suggestions approuvees; deploiement manuel requis'},requestId);}return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);}
async function adminLlm(req,res,origin,requestId){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const body=await readJsonBody(req),action=String(body.action||'chat');if(action==='workflow'){const name=String(body.workflow_name||'').trim().slice(0,120);if(!name)return json(res,origin,400,{ok:false,error:'invalid_workflow'},requestId);const id=randomUUID(),now=new Date().toISOString(),run={id,workflow_name:name,status:'queued',triggered_by:session.sub,trigger_data:body.trigger_data||{},created_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('llm_workflow_runs',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(run))}::jsonb,'admin');`);return json(res,origin,202,{ok:true,success:true,run},requestId);}const query=String(body.query||body.message||body.input?.message||'').trim().slice(0,12000);if(!query)return json(res,origin,400,{ok:false,error:'invalid_query'},requestId);const openai=await effectiveOpenAi();if(!openai.key)return json(res,origin,503,{ok:false,error:'ai_unavailable'},requestId);const started=Date.now(),system=action==='council'?'Tu es le conseil stratégique de TaxiAssur. Analyse la question sous les angles commercial, assurance, conformité et expérience client. Donne une synthèse prudente en français, sans inventer de faits, prix ou garanties.':'Tu es l’assistant interne de TaxiAssur. Réponds en français de façon claire, opérationnelle et prudente. N’invente aucun tarif ni garantie.',aiResponse=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+openai.key,'Content-Type':'application/json'},body:JSON.stringify({model:openai.model,temperature:action==='council'?.25:.35,max_tokens:1200,messages:[{role:'system',content:system},{role:'user',content:query}]})}),payload=await aiResponse.json().catch(()=>null);if(!aiResponse.ok)return json(res,origin,502,{ok:false,error:'ai_provider_error'},requestId);const answer=String(payload?.choices?.[0]?.message?.content||'').trim(),tokens=Number(payload?.usage?.total_tokens||0),elapsed=Date.now()-started;if(action!=='council')return json(res,origin,200,{ok:true,success:true,response:answer,tokens_used:tokens,processing_time_ms:elapsed},requestId);const id=randomUUID(),now=new Date().toISOString(),model=openai.model,result={success:true,session_id:id,query,individual_responses:[{model_id:model,display_name:'TaxiAssur AI',content:answer,tokens_used:tokens,latency_ms:elapsed}],rankings:[{reviewer:'Président du conseil',rankings:[{anonymous_id:model,accuracy_score:90,insight_score:85,clarity_score:90,reasoning:'Réponse consolidée par le modèle configuré.'}]}],final_response:answer,chairman_model:model,consensus_score:90,total_tokens:tokens,processing_time_ms:elapsed},sessionRecord={id,query,final_response:answer,consensus_score:90,total_tokens_used:tokens,processing_time_ms:elapsed,status:'completed',created_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('llm_council_sessions',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(sessionRecord))}::jsonb,'admin-ai'),('llm_council_responses',${quoteLiteral(randomUUID())},${quoteLiteral(JSON.stringify({session_id:id,model_id:model,display_name:'TaxiAssur AI',content:answer,tokens_used:tokens,latency_ms:elapsed}))}::jsonb,'admin-ai');`);return json(res,origin,200,{ok:true,...result},requestId);}
async function adminGa4Seo(req,res,origin,requestId){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  if(req.method==='POST')return json(res,origin,200,{ok:true,success:false,setup_required:true,message:'Connectez un compte Google Analytics 4 dans les intégrations pour activer la synchronisation.'},requestId);
  const [ga4Rows,gscRows]=await Promise.all([recordsAll('ga4_page_signals'),recordsAll('gsc_performance')]);const latestByPage=new Map();for(const row of ga4Rows){const key=String(row.page_path||row.full_url||'');if(key&&(!latestByPage.has(key)||Date.parse(String(row.synced_at||''))>Date.parse(String(latestByPage.get(key).synced_at||''))))latestByPage.set(key,row);}const signals=[...latestByPage.values()],gscByPage=new Map();for(const row of gscRows){const key=String(row.page||row.page_path||row.url||'');if(!key)continue;const current=gscByPage.get(key)||{clicks:0,impressions:0,positionTotal:0,count:0};current.clicks+=Number(row.clicks||0);current.impressions+=Number(row.impressions||0);current.positionTotal+=Number(row.position||0);current.count++;gscByPage.set(key,current);}const combined=signals.map(row=>{const gsc=gscByPage.get(String(row.page_path||row.full_url||''))||{clicks:0,impressions:0,positionTotal:0,count:0},position=gsc.count?gsc.positionTotal/gsc.count:0,ctr=gsc.impressions?gsc.clicks/gsc.impressions:0;return {page_path:row.page_path||row.full_url,gsc_clicks:gsc.clicks,gsc_impressions:gsc.impressions,gsc_position:position,gsc_ctr:ctr,ga4_sessions:Number(row.sessions||0),ga4_bounce_rate:Number(row.bounce_rate||0),ga4_engagement:Number(row.engagement_rate||0),ga4_avg_duration:Number(row.avg_session_duration||0),behavioral_score:Number(row.behavioral_score||0),semantic_score:0,combined_priority:Math.round((100-Number(row.behavioral_score||0))*(gsc.impressions?1.5:1))};}).sort((a,b)=>b.combined_priority-a.combined_priority).slice(0,50),totalSessions=signals.reduce((sum,row)=>sum+Number(row.sessions||0),0),average=key=>signals.length?signals.reduce((sum,row)=>sum+Number(row[key]||0),0)/signals.length:0,summary={total_pages_tracked:signals.length,avg_engagement_rate:average('engagement_rate'),avg_session_duration:average('avg_session_duration'),avg_bounce_rate:average('bounce_rate'),total_sessions:totalSessions,high_engagement_pages:signals.filter(row=>Number(row.behavioral_score||0)>=70).length,low_engagement_pages:signals.filter(row=>Number(row.behavioral_score||0)<40).length,last_sync:signals.map(row=>row.synced_at).filter(Boolean).sort().at(-1)||null};return json(res,origin,200,{ok:true,summary,signals,combined},requestId);
}
async function adminMasterAi(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  if(req.method==='POST'){const body=await readJsonBody(req),action=String(body.action||'');if(action==='toggle'){const enabled=body.enabled===true;await runPsql(`UPDATE taxiassur.records SET data=data||jsonb_build_object('is_enabled',${enabled},'is_active',${enabled},'updated_at',now()::text),updated_at=now(),revision=revision+1 WHERE collection='cron_jobs_config';`);return json(res,origin,200,{ok:true,is_active:enabled,message:enabled?'Automatisations activées':'Automatisations mises en pause'},requestId);}if(action==='analyze'){const id=randomUUID(),now=new Date().toISOString(),decision={id,decision_type:'performance_optimization',title:'Analyse manuelle du système',description:'Vérifier les dossiers sans activité récente et les automatisations en attente.',confidence_score:75,status:'pending',created_at:now,model_provider:'xcr-local'};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('crm_ai_decisions',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(decision))}::jsonb,'native-ai');`);return json(res,origin,201,{ok:true,success:true},requestId);}return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);}
  const [leads,decisions,crons,posts,news,faqs,gsc]=await Promise.all([recordsAll('crm_leads'),recordsAll('crm_ai_decisions'),recordsAll('cron_jobs_config'),recordsAll('blog_posts'),recordsAll('news_articles'),recordsAll('faqs'),recordsAll('gsc_performance')]);const activeLeads=leads.filter(row=>!row.deleted_at&&row.is_archived!==true),activeCrons=crons.filter(row=>Boolean(row.is_active??row.is_enabled??row.active)).length,isActive=activeCrons>0,automationHealth=crons.length?Math.round(activeCrons*100/crons.length):0,seoHealth=gsc.length?100:60,contentHealth=posts.length+news.length?100:0,checks={database:100,api:100,seo:seoHealth,automation:automationHealth,content:contentHealth,global:0};checks.global=Math.round((checks.database+checks.api+checks.seo+checks.automation+checks.content)/5);const insights=decisions.sort((a,b)=>Date.parse(String(b.created_at||''))-Date.parse(String(a.created_at||''))).slice(0,8).map(row=>({type:row.decision_type||'analyse',title:row.title||row.decision_type||'Recommandation IA',description:row.description||row.decision?.recommendation||'Décision à examiner',priority:Math.max(1,Math.min(10,Math.round(Number(row.confidence_score||50)/10))),auto_execute:false,executed:String(row.status||'')!=='pending'})),converted=activeLeads.filter(row=>['active_client','client_actif','signed'].includes(String(row.current_stage_key||row.status||'').toLowerCase())).length,metrics={pages_optimisees:new Set(gsc.map(row=>row.page||row.url).filter(Boolean)).size,backlinks_acquis:0,articles_generes:posts.length,trafic_organique:gsc.reduce((sum,row)=>sum+Number(row.clicks||0),0),total_leads:activeLeads.length,recent_leads:activeLeads.filter(row=>Date.parse(String(row.created_at||''))>Date.now()-7*86400000).length,total_faq:faqs.length,conversion_rate:activeLeads.length?converted*100/activeLeads.length:0,taxi_prospects:activeLeads.length,prospects_not_contacted:activeLeads.filter(row=>/new|nouveau|pending/i.test(String(row.status||row.current_stage_key||''))).length,prospects_with_email:activeLeads.filter(row=>Boolean(row.email)).length};return json(res,origin,200,{ok:true,status:{is_active:isActive,mode:isActive?'auto':'paused',global_health:checks.global,last_update:new Date().toISOString(),system_checks:checks},insights,optimizations:[],metrics},requestId);
}
const defaultAiGovernanceRules=[
  {id:'gdpr-consent-check',rule_name:'gdpr_consent_check',rule_type:'COMPLIANCE',description:'Vérifie le consentement avant toute communication automatisée.',is_active:true,priority:100},
  {id:'max-daily-contacts',rule_name:'max_daily_contacts_per_lead',rule_type:'COMPLIANCE',description:'Limite le nombre de contacts quotidiens par prospect.',is_active:true,priority:90},
  {id:'prevent-night-contact',rule_name:'prevent_night_contact',rule_type:'ETHICAL',description:'Bloque les contacts automatisés la nuit.',is_active:true,priority:85},
  {id:'failed-payment-retries',rule_name:'max_retries_failed_payment',rule_type:'BUSINESS',description:'Limite les relances après un paiement échoué.',is_active:true,priority:70},
  {id:'high-value-approval',rule_name:'require_approval_high_value',rule_type:'ETHICAL',description:'Impose une validation humaine pour les dossiers sensibles.',is_active:true,priority:80},
  {id:'cross-sell-timing',rule_name:'cross_sell_timing',rule_type:'BUSINESS',description:'Respecte un délai avant une proposition additionnelle.',is_active:true,priority:60},
  {id:'confidence-threshold',rule_name:'confidence_threshold',rule_type:'PERFORMANCE',description:'N’autorise l’automatisation qu’au-dessus du seuil défini.',is_active:true,priority:75},
];
async function aiGovernanceState(){
  const [saved,rulesSaved]=await Promise.all([
    runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='admin_settings' AND record_id='ai-governance' LIMIT 1;`).then(parseJsonLine),
    recordsAll('ai_governance_rules'),
  ]);
  const overrides=new Map(rulesSaved.map(r=>[String(r.rule_name||r.id),r]));
  return {config:{auto_approve_threshold:Math.max(0,Math.min(100,Number(saved?.auto_approve_threshold)||90)),max_decisions_per_day:Math.max(1,Math.min(500,Number(saved?.max_decisions_per_day)||50))},rules:defaultAiGovernanceRules.map(rule=>({...rule,...(overrides.get(rule.rule_name)||{})}))};
}
async function adminAiGovernance(req,res,origin,requestId,url){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const [primary,legacy,leads,state,lastGenerate]=await Promise.all([recordsAll('crm_ai_decisions'),recordsAll('ai_decisions'),recordsAll('crm_leads'),aiGovernanceState(),runPsql(`SELECT max(created_at)::text FROM taxiassur.audit_events WHERE action='ai_decisions_generated';`)]);
  const byId=new Map([...legacy,...primary].map(row=>[String(row.id),row]));let decisions=[...byId.values()].sort((a,b)=>Date.parse(String(b.created_at||''))-Date.parse(String(a.created_at||'')));
  const leadId=url.searchParams.get('lead_id'),status=url.searchParams.get('status');if(leadId)decisions=decisions.filter(row=>String(row.lead_id)===leadId);if(status)decisions=decisions.filter(row=>String(row.status)===status);
  const recent_leads=leads.filter(row=>!row.deleted_at&&row.is_archived!==true).sort((a,b)=>Date.parse(String(b.created_at||''))-Date.parse(String(a.created_at||''))).slice(0,20).map(row=>({id:row.id,first_name:row.first_name||'',last_name:row.last_name||row.name||'',email:row.email||'',status:row.status||row.pipeline_stage||'new'}));
  const last=String(lastGenerate||'').trim()||null;return json(res,origin,200,{ok:true,decisions,recent_leads,rules:state.rules,config:state.config,status:{crons_active:false,last_generate:last,last_approve:null,next_generate_in_minutes:0}},requestId);
}
async function adminAiGovernanceSettings(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const state=await aiGovernanceState();if(req.method==='GET')return json(res,origin,200,{ok:true,...state},requestId);if(session.role!=='master')return json(res,origin,403,{ok:false,error:'master_required'},requestId);
  const body=await readJsonBody(req),now=new Date().toISOString();if(body.rule_id){const rule=state.rules.find(row=>row.id===String(body.rule_id));if(!rule)return json(res,origin,404,{ok:false,error:'rule_not_found'},requestId);const saved={...rule,is_active:body.is_active===true,updated_at:now,updated_by:session.sub};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('ai_governance_rules',${quoteLiteral(rule.id)},${quoteLiteral(JSON.stringify(saved))}::jsonb,'admin') ON CONFLICT(collection,record_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now(),revision=taxiassur.records.revision+1;`);return json(res,origin,200,{ok:true,rule:saved},requestId);}
  const configValue={auto_approve_threshold:Math.max(0,Math.min(100,Number(body.auto_approve_threshold)||state.config.auto_approve_threshold)),max_decisions_per_day:Math.max(1,Math.min(500,Number(body.max_decisions_per_day)||state.config.max_decisions_per_day)),updated_at:now,updated_by:session.sub};await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('admin_settings','ai-governance',${quoteLiteral(JSON.stringify(configValue))}::jsonb,'admin') ON CONFLICT(collection,record_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now(),revision=taxiassur.records.revision+1;INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('admin',${quoteLiteral(session.sub)},'ai_governance_settings_updated','admin_settings','ai-governance',${quoteLiteral(requestId)}::uuid);COMMIT;`);return json(res,origin,200,{ok:true,config:configValue},requestId);
}
async function adminAiGovernanceGenerate(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const body=await readJsonBody(req),limit=Math.max(1,Math.min(20,Number(body.limit)||5)),requestedLead=String(body.lead_id||'');let leads=(await recordsAll('crm_leads')).filter(row=>!row.deleted_at&&row.is_archived!==true);if(requestedLead)leads=leads.filter(row=>String(row.id)===requestedLead);leads=leads.sort((a,b)=>Date.parse(String(b.created_at||''))-Date.parse(String(a.created_at||''))).slice(0,limit);
  const now=new Date().toISOString(),statements=[],generated=[];for(const lead of leads){const name=String(`${lead.first_name||''} ${lead.last_name||lead.name||''}`).trim()||'ce prospect',score=Math.max(0,Math.min(1,Number(lead.lead_score||lead.score||0)/100||0.65)),id=randomUUID(),decision={id,lead_id:lead.id,agent:'lead_scorer',decision_type:'suggestion',title:`Revoir la qualification de ${name}`,description:'Vérifier les informations du dossier et planifier la prochaine action commerciale.',rationale:'Suggestion native calculée à partir de l’état du dossier, sans service Supabase.',confidence_score:score,suggested_action:'review_lead',data_sources:['crm_leads'],status:'pending',created_at:now,model_used:'native-rules-v1',model_provider:'xcr-local'};generated.push(decision);statements.push(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('crm_ai_decisions',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(decision))}::jsonb,'native-ai');`);}
  statements.push(`INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},'ai_decisions_generated','crm_ai_decisions','bulk',${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({generated:generated.length,lead_ids:leads.map(row=>row.id)}))}::jsonb);`);await runPsql('BEGIN;'+statements.join('')+'COMMIT;');return json(res,origin,200,{ok:true,generated:generated.length,leads_analyzed:leads.length,providers_used:{'xcr-local':generated.length},decisions:generated},requestId);
}
async function adminAiDecisionPatch(req, res, origin, requestId, decisionId) {
  const session = await verifiedAdminSession(req);
  if (!session) return json(res, origin, 401, { ok: false, error: 'invalid_session' }, requestId);
  const body = await readJsonBody(req);
  const status = String(body.status || '');
  if (!['approved', 'rejected'].includes(status)) return json(res, origin, 400, { ok: false, error: 'invalid_status' }, requestId);
  const updates = { status, reviewed_at: new Date().toISOString(), reviewed_by: session.sub };
  const sql = `UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection IN('crm_ai_decisions','ai_decisions') AND record_id=${quoteLiteral(decisionId)} RETURNING data::text;`;
  const decision = parseJsonLine(await runPsql(sql));
  return decision ? json(res, origin, 200, { ok: true, decision }, requestId) : json(res, origin, 404, { ok: false, error: 'not_found' }, requestId);
}
async function linkInboxHistory(leadId,senderEmail){
  const emails=(await recordsWhere('email_messages','from_email',senderEmail)).sort((a,b)=>Date.parse(String(a.received_at||''))-Date.parse(String(b.received_at||'')));
  const existing=await recordsWhere('crm_interactions','lead_id',leadId),existingIds=new Set(existing.map(row=>row.metadata?.email_id).filter(Boolean));let created=0;
  const statements=[];
  for(const email of emails){statements.push(`UPDATE taxiassur.records SET data=data||'{"lead_id":${JSON.stringify(leadId)}}'::jsonb,updated_at=now(),revision=revision+1 WHERE collection='email_messages' AND record_id=${quoteLiteral(String(email.id))};`);if(!existingIds.has(email.id)){const id=randomUUID(),interaction={id,lead_id:leadId,type:'email',channel:'email',direction:email.direction,subject:email.subject,content:String(email.body_text||'').slice(0,5000),created_at:email.received_at||new Date().toISOString(),metadata:{email_id:email.id,from:email.from_email,to:email.to_emails}};statements.push(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('crm_interactions',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(interaction))}::jsonb,'admin');`);created++;}}
  if(statements.length)await runPsql('BEGIN;'+statements.join('')+'COMMIT;');return {linkedCount:emails.length,interactionsCreated:created};
}
async function adminRetention(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  if(req.method==='GET'){
    const [alerts,opportunities,reminderRows,scores,leads]=await Promise.all([recordsAll('crm_churn_alerts'),recordsAll('crm_cross_sell_opportunities'),recordsAll('crm_renewal_reminders'),recordsAll('crm_retention_scores'),recordsAll('crm_leads')]);
    const now=Date.now(),reminders=reminderRows.map(row=>({...row,days_until_renewal:Number.isFinite(Date.parse(String(row.renewal_date||'')))?Math.ceil((Date.parse(String(row.renewal_date))-now)/86400000):Number(row.days_until_renewal||0)}));
    const activeStages=new Set(['active_client','client_actif','signed','contrat_signature']),riskStages=new Set(['risk_churn','no_response','relance_active']),churnedStages=new Set(['client_lost']);const stages=leads.filter(row=>!row.deleted_at&&row.is_archived!==true).map(row=>String(row.current_stage_key||row.pipeline_stage||'').toLowerCase());
    const resolved=alerts.filter(row=>row.status==='resolved').length,converted=opportunities.filter(row=>row.status==='converted').length,decided=opportunities.filter(row=>['converted','declined'].includes(row.status)).length,scoreValues=scores.map(row=>Number(row.overall_score||0)).filter(Number.isFinite);
    const stats={at_risk_count:alerts.filter(row=>!['resolved','dismissed'].includes(row.status)).length,avg_retention_score:scoreValues.length?scoreValues.reduce((a,b)=>a+b,0)/scoreValues.length:0,renewal_rate:alerts.length?resolved/alerts.length:0,cross_sell_conversion_rate:decided?converted/decided:0};
    const client_stats={active:stages.filter(stage=>activeStages.has(stage)).length,atRisk:stages.filter(stage=>riskStages.has(stage)).length,churned:stages.filter(stage=>churnedStages.has(stage)).length,total:stages.length};
    return json(res,origin,200,{ok:true,alerts,opportunities,reminders,stats,client_stats},requestId);
  }
  const body=await readJsonBody(req),kind=String(body.kind||''),id=String(body.id||''),status=String(body.status||''),collections={alert:'crm_churn_alerts',opportunity:'crm_cross_sell_opportunities',renewal:'crm_renewal_reminders'},allowed={alert:['acknowledged','in_progress','resolved','dismissed'],opportunity:['contacted','interested','declined','converted'],renewal:['contacted','confirmed','declined','cancelled']};if(!collections[kind]||!allowed[kind].includes(status)||!id)return json(res,origin,400,{ok:false,error:'invalid_retention_update'},requestId);const now=new Date().toISOString(),updates={status};if(kind==='alert')updates.resolved_at=status==='resolved'?now:null;if(kind==='renewal')updates.last_contact_date=now;const row=parseJsonLine(await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection=${quoteLiteral(collections[kind])} AND record_id=${quoteLiteral(id)} RETURNING data::text;`));if(!row)return json(res,origin,404,{ok:false,error:'not_found'},requestId);await runPsql(`INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('admin',${quoteLiteral(session.sub)},'retention_status_updated',${quoteLiteral(collections[kind])},${quoteLiteral(id)},${quoteLiteral(requestId)}::uuid);`);return json(res,origin,200,{ok:true,record:row},requestId);
}
async function adminCommercialNotifications(req,res,origin,requestId){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const notifications=(await recordsAll('crm_notifications')).filter(row=>!row.is_read).sort((a,b)=>Date.parse(String(b.created_at||''))-Date.parse(String(a.created_at||''))).slice(0,10);return json(res,origin,200,{ok:true,notifications},requestId);
}
async function adminCommercialAiAssistant(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const body=await readJsonBody(req),leadId=String(body.lead_id||''),content=String(body.content||'').trim().slice(0,10000);
  if(body.action!=='improve_email'||!uuidPattern.test(leadId)||!content)return json(res,origin,400,{ok:false,error:'invalid_ai_request'},requestId);
  const lead=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)} LIMIT 1;`));
  if(!lead)return json(res,origin,404,{ok:false,error:'lead_not_found'},requestId);
  const openai=await effectiveOpenAi();if(!openai.key)return json(res,origin,503,{ok:false,error:'ai_unavailable'},requestId);
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+openai.key,'Content-Type':'application/json'},body:JSON.stringify({model:openai.model,temperature:0.25,max_tokens:700,messages:[{role:'system',content:'Tu es un conseiller commercial de TaxiAssur. Améliore le courriel fourni en français : ton professionnel, chaleureux et clair. Conserve strictement les faits, montants, liens et demandes. N\'invente aucune garantie ni aucun tarif. Retourne uniquement le courriel final, sans commentaire.'},{role:'user',content:`Prospect: ${String(lead.first_name||'')} ${String(lead.last_name||'')}\nCourriel à améliorer:\n${content}`}]})});
  const payload=await response.json().catch(()=>null);if(!response.ok)return json(res,origin,502,{ok:false,error:'ai_provider_error'},requestId);
  const improved=String(payload?.choices?.[0]?.message?.content||'').trim().slice(0,10000);if(!improved)return json(res,origin,502,{ok:false,error:'ai_empty_response'},requestId);
  await runPsql(`INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('admin',${quoteLiteral(session.sub)},'crm_email_improved_by_ai','crm_lead',${quoteLiteral(leadId)},${quoteLiteral(requestId)}::uuid);`);
  return json(res,origin,200,{ok:true,success:true,improved_content:improved},requestId);
}
async function adminLeadCommercialEmail(req,res,origin,requestId,leadId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const lead=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)} LIMIT 1;`)),body=await readJsonBody(req),subject=String(body.subject||'').trim().slice(0,250),content=String(body.content||'').trim().slice(0,10000),recipient=String(lead?.email||'').trim().toLowerCase(),deliveryId=String(body.request_id||'');if(!lead||!subject||!content||!recipient)return json(res,origin,400,{ok:false,error:'invalid_email'},requestId);
  if(uuidPattern.test(deliveryId)){const previous=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='native_email_outbox' AND data->>'request_id'=${quoteLiteral(deliveryId)} LIMIT 1;`));if(previous)return json(res,origin,200,{ok:true,queued:true,idempotent:true},requestId);}
  const [documents,quotes,contracts,companyDocuments]=await Promise.all([recordsWhere('crm_lead_documents','lead_id',leadId).then(async rows=>rows.concat(await recordsWhere('prospect_documents','lead_id',leadId))),recordsWhere('lead_company_quotes','lead_id',leadId),recordsWhere('lead_contracts','lead_id',leadId),recordsAll('company_documents')]);const candidates=[...documents,...quotes,...contracts,...companyDocuments],allowedPaths=new Set();for(const row of candidates)for(const key of ['file_path','file_url','quote_file_url','quote_pdf_url','contract_file_url','storage_path'])if(row[key])allowedPaths.add(String(row[key]));const requested=Array.isArray(body.attachments)?body.attachments.slice(0,20):[],attachments=[];for(const item of requested){const candidate=String(item?.path||item?.url||'');if(!candidate||!allowedPaths.has(candidate))return json(res,origin,400,{ok:false,error:'invalid_attachment'},requestId);attachments.push({filename:safeFileName(String(item.filename||'document'))||'document',path:candidate,bucket:String(item.bucket||''),type:String(item.type||'document').slice(0,50)});}
  const id=randomUUID(),interactionId=randomUUID(),now=new Date().toISOString(),mail={id,recipient,subject,body:content,status:'pending',attempts:0,next_attempt_at:now,created_at:now,lead_id:leadId,request_id:uuidPattern.test(deliveryId)?deliveryId:null,attachments},interaction={id:interactionId,lead_id:leadId,type:'email',channel:'email',direction:'outbound',subject,content,status:'queued',attachments,created_at:now};await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('native_email_outbox',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(mail))}::jsonb,'admin'),('crm_interactions',${quoteLiteral(interactionId)},${quoteLiteral(JSON.stringify(interaction))}::jsonb,'admin');INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},'commercial_email_queued','crm_lead',${quoteLiteral(leadId)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({attachment_count:attachments.length,request_id:mail.request_id}))}::jsonb);COMMIT;`);return json(res,origin,202,{ok:true,queued:true,attachment_count:attachments.length},requestId);
}
async function adminCommercialSuggestion(req,res,origin,requestId,suggestionId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const updates={status:'accepted',accepted_at:new Date().toISOString(),accepted_by:session.sub};const row=parseJsonLine(await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='crm_ai_suggestions' AND record_id=${quoteLiteral(suggestionId)} RETURNING data::text;`));return row?json(res,origin,200,{ok:true,suggestion:row},requestId):json(res,origin,404,{ok:false,error:'not_found'},requestId);
}
async function adminInboxIntelligent(req,res,origin,requestId,url){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);if(req.method==='GET'){const [messages,folders,assignments,classifications]=await Promise.all([recordsAll('email_messages'),recordsAll('inbox_folders'),recordsAll('email_folder_assignments'),recordsAll('email_classifications')]);const folderId=String(url.searchParams.get('folder_id')||'');let emails=messages.filter(x=>!x.deleted_at).sort((a,b)=>Date.parse(String(b.received_at||b.created_at||''))-Date.parse(String(a.received_at||a.created_at||''))).slice(0,100);if(folderId){const ids=new Set(assignments.filter(x=>String(x.folder_id)===folderId).map(x=>String(x.email_id)));emails=emails.filter(x=>ids.has(String(x.id)));}emails=emails.map(x=>({...x,classification:classifications.find(c=>String(c.email_id)===String(x.id))||null}));return json(res,origin,200,{ok:true,emails,folders:folders.sort((a,b)=>Number(a.position||0)-Number(b.position||0))},requestId);}const body=await readJsonBody(req),action=String(body.action||''),emailId=String(body.email_id||'');if(action==='create_folder'){const name=String(body.name||'').trim().slice(0,100);if(!name)return json(res,origin,400,{ok:false,error:'invalid_name'},requestId);const id=randomUUID(),record={id,name,folder_type:'custom',parent_folder_id:body.parent_folder_id||null,is_system:false,position:999};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('inbox_folders',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(record))}::jsonb,'admin');`);return json(res,origin,201,{ok:true,folder:record},requestId);}const email=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='email_messages' AND record_id=${quoteLiteral(emailId)} LIMIT 1;`));if(!email)return json(res,origin,404,{ok:false,error:'email_not_found'},requestId);if(action==='classify'){const text=String(email.subject||'')+' '+String(email.body_text||''),type=/devis|assurance|tarif|souscri/i.test(text)?'lead':/désabonn|spam/i.test(text)?'spam':/^re:/i.test(String(email.subject||''))?'reply':'other',id=randomUUID(),record={id,email_id:emailId,classification_type:type,confidence_score:.75,suggested_action:type==='lead'?'create_or_link_lead':'review',reason:'Classement natif XCR par règles locales',keywords_matched:[],is_reviewed:false,created_at:new Date().toISOString()};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('email_classifications',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(record))}::jsonb,'native') ON CONFLICT(collection,record_id) DO UPDATE SET data=EXCLUDED.data;`);return json(res,origin,200,{ok:true,classification:record},requestId);}if(action==='move'){const folderId=String(body.folder_id||''),id=randomUUID(),record={id,email_id:emailId,folder_id:folderId,assigned_at:new Date().toISOString()};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('email_folder_assignments',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(record))}::jsonb,'admin');`);return json(res,origin,200,{ok:true},requestId);}if(action==='link'){const query=String(body.lead_query||'').trim().toLowerCase(),lead=(await recordsAll('crm_leads')).find(x=>String(x.id)===query||String(x.email||'').toLowerCase().includes(query));if(!lead)return json(res,origin,404,{ok:false,error:'lead_not_found'},requestId);await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({lead_id:lead.id}))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='email_messages' AND record_id=${quoteLiteral(emailId)};`);return json(res,origin,200,{ok:true,lead},requestId);}return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);}
async function adminInboxWorkflow(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const body=await readJsonBody(req),action=String(body.action||'');
  if(action==='auto_create_leads'){
    const [messages,leads]=await Promise.all([recordsAll('email_messages'),recordsAll('crm_leads')]),leadByEmail=new Map(leads.filter(x=>x.email&&!x.deleted_at).map(x=>[String(x.email).trim().toLowerCase(),x]));
    const candidates=messages.filter(x=>x.direction!=='outbound'&&!x.lead_id&&x.email_status!=='deleted').slice(0,500);let linked=0,ignored=0;
    for(const source of candidates){const email=String(source.from_email||'').trim().toLowerCase(),lead=leadByEmail.get(email);if(!lead){ignored++;continue;}const result=await linkInboxHistory(String(lead.id),email);linked+=Number(result.linkedCount||0);}
    return json(res,origin,200,{ok:true,success:true,summary:{leads_created:0,emails_linked:linked,emails_ignored:ignored}},requestId);
  }
  if(action==='create_lead')return json(res,origin,403,{ok:false,error:'use_new_lead_form'},requestId);
  if(action==='legacy_auto_create_leads_disabled'){
    const [messages,leads]=await Promise.all([recordsAll('email_messages'),recordsAll('crm_leads')]),leadByEmail=new Map(leads.filter(x=>x.email&&!x.deleted_at).map(x=>[String(x.email).trim().toLowerCase(),x]));
    const candidates=messages.filter(x=>x.direction!=='outbound'&&!x.lead_id&&x.email_status!=='deleted'&&x.classification!=='non_lead').sort((a,b)=>Date.parse(String(b.received_at||''))-Date.parse(String(a.received_at||''))).slice(0,200);let created=0,linked=0,ignored=0;
    for(const source of candidates){const email=String(source.from_email||'').trim().toLowerCase(),text=`${source.subject||''} ${source.body_text||''}`;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email===config.smtpUser.toLowerCase()||/^(no-?reply|mailer-daemon|postmaster|dmarc)/i.test(email)||!/devis|assurance|taxi|contrat|garantie|souscri|tarif|sinistre|véhicule|vehicule|chauffeur|résili|resili/i.test(text)){ignored++;continue;}let lead=leadByEmail.get(email);if(!lead){const id=randomUUID(),now=new Date().toISOString(),name=String(source.from_name||'').trim(),parts=name.split(/\s+/).filter(Boolean),record={id,first_name:parts.shift()||'',last_name:parts.join(' '),full_name:name,email,phone:'',city:'',status:'NOUVEAU_LEAD',pipeline_stage:'NOUVEAU_LEAD',current_stage_key:'new_lead',source:'email',notes:`Lead créé automatiquement depuis l'email : ${String(source.subject||'').slice(0,250)}`,created_at:now,updated_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('crm_leads',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(record))}::jsonb,'inbox-auto');`);lead=record;leadByEmail.set(email,lead);created++;}const result=await linkInboxHistory(String(lead.id),email);linked+=Number(result.linkedCount||0);}
    await runPsql(`INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},'inbox_auto_leads_processed','mailbox',${quoteLiteral(config.smtpUser)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({created,linked,ignored}))}::jsonb);`);return json(res,origin,200,{ok:true,success:true,summary:{leads_created:created,emails_linked:linked,emails_ignored:ignored}},requestId);
  }
  if(action==='link_history'){const leadId=String(body.lead_id||''),sender=String(body.sender_email||'').trim().toLowerCase();if(!uuidPattern.test(leadId)||!sender)return json(res,origin,400,{ok:false,error:'invalid_link'},requestId);return json(res,origin,200,{ok:true,...await linkInboxHistory(leadId,sender)},requestId);}
  if(action==='legacy_create_lead_from_email_disabled'){const emailId=String(body.email_id||''),source=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='email_messages' AND record_id=${quoteLiteral(emailId)} LIMIT 1;`));if(!source)return json(res,origin,404,{ok:false,error:'email_not_found'},requestId);const email=String(body.email||source.from_email||'').trim().toLowerCase(),name=String(body.name||source.from_name||'').trim(),parts=name.split(/\s+/),id=randomUUID(),now=new Date().toISOString(),lead={id,first_name:parts.shift()||'',last_name:parts.join(' '),full_name:name,email,phone:String(body.phone||''),city:String(body.city||''),status:'NOUVEAU_LEAD',pipeline_stage:'nouveau_lead',current_stage_key:'new_lead',source:'email',notes:String(body.notes||'').slice(0,2000),created_at:now,updated_at:now};if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,origin,400,{ok:false,error:'invalid_email'},requestId);await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('crm_leads',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(lead))}::jsonb,'admin');`);const linked=await linkInboxHistory(id,String(source.from_email||email).toLowerCase());return json(res,origin,201,{ok:true,lead,...linked},requestId);}
  if(action==='reply'){const emailId=String(body.email_id||''),source=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='email_messages' AND record_id=${quoteLiteral(emailId)} LIMIT 1;`)),content=String(body.content||'').trim().slice(0,10000);if(!source||!content)return json(res,origin,400,{ok:false,error:'invalid_reply'},requestId);const id=randomUUID(),now=new Date().toISOString(),recipient=String(source.from_email||'').trim().toLowerCase(),subject=('Re: '+String(source.subject||'')).slice(0,250),mail={id,recipient,subject,body:content,status:'pending',attempts:0,next_attempt_at:now,created_at:now,lead_id:source.lead_id||null},conversationMessage={id,from_email:String(config.smtpUser||config.imapUser||'team@taxiassur.com').toLowerCase(),from_name:'TaxiAssur',to_emails:[recipient],subject,body_text:content,body_html:'',direction:'outbound',is_read:true,is_starred:false,classification:source.classification||null,lead_id:source.lead_id||null,lead_name:source.lead_name||null,email_status:'active',in_reply_to:source.message_id||emailId,send_status:'pending',received_at:now,created_at:now};await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('native_email_outbox',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(mail))}::jsonb,'admin');INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('email_messages',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(conversationMessage))}::jsonb,'admin-reply');INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('admin',${quoteLiteral(session.sub)},'inbox_reply_queued','email_message',${quoteLiteral(emailId)},${quoteLiteral(requestId)}::uuid);COMMIT;`);return json(res,origin,202,{ok:true,queued:true,message:conversationMessage},requestId);}
  return json(res,origin,400,{ok:false,error:'invalid_workflow_action'},requestId);
}
async function adminInbox(req,res,origin,requestId,url){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  if(req.method==='GET'){
    const filter=String(url.searchParams.get('filter')||'inbox'),search=String(url.searchParams.get('search')||'').trim().toLowerCase().slice(0,120);
    const active=`COALESCE(data->>'email_status','active')='active'`;
    const leadFilter=filter.startsWith('lead:')?filter.slice(5):'';
    const filterSql=filter==='archived'?`data->>'email_status'='archived'`:filter==='unread'?`${active} AND COALESCE((data->>'is_read')::boolean,false)=false`:filter==='alerts'?`${active} AND data->>'priority'='high'`:filter==='starred'?`${active} AND COALESCE((data->>'is_starred')::boolean,false)=true`:filter==='leads'?`${active} AND NULLIF(data->>'lead_id','') IS NOT NULL`:filter==='partners'?`${active} AND data->>'classification'='partner'`:filter==='services'?`${active} AND data->>'classification' IN ('internal','system')`:filter==='unassigned'?`${active} AND NULLIF(data->>'lead_id','') IS NULL AND COALESCE(data->>'classification','') NOT IN ('partner','internal','system')`:filter==='mails'?`${active} AND data->>'classification'='non_lead'`:uuidPattern.test(leadFilter)?`${active} AND data->>'lead_id'=${quoteLiteral(leadFilter)}`:active;
    const searchSql=search?` AND (LOWER(COALESCE(data->>'subject','')) LIKE ${quoteLiteral('%'+search+'%')} OR LOWER(COALESCE(data->>'from_email','')) LIKE ${quoteLiteral('%'+search+'%')} OR LOWER(COALESCE(data->>'body_text','')) LIKE ${quoteLiteral('%'+search+'%')})`:'';
    const sql=`WITH source AS MATERIALIZED (SELECT data FROM taxiassur.records WHERE collection='email_messages' ORDER BY updated_at DESC LIMIT 1000), selected_raw AS (SELECT data FROM source WHERE ${filterSql}${searchSql} ORDER BY COALESCE(data->>'received_at',data->>'created_at','') DESC LIMIT 500), selected AS (SELECT s.data||CASE WHEN l.record_id IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('lead_name',COALESCE(NULLIF(l.data->>'full_name',''),NULLIF(TRIM(CONCAT_WS(' ',l.data->>'first_name',l.data->>'last_name')),''),l.data->>'email'),'lead_email',l.data->>'email') END AS data FROM selected_raw s LEFT JOIN taxiassur.records l ON l.collection='crm_leads' AND l.record_id=s.data->>'lead_id'), lead_counts AS (SELECT data->>'lead_id' AS lead_id,COUNT(*)::int AS count FROM source WHERE ${active} AND NULLIF(data->>'lead_id','') IS NOT NULL GROUP BY data->>'lead_id') SELECT json_build_object('messages',COALESCE((SELECT jsonb_agg(data ORDER BY COALESCE(data->>'received_at',data->>'created_at','') DESC) FROM selected),'[]'::jsonb),'lead_folders',COALESCE((SELECT jsonb_agg(jsonb_build_object('lead_id',c.lead_id,'lead_name',COALESCE(NULLIF(l.data->>'full_name',''),NULLIF(TRIM(CONCAT_WS(' ',l.data->>'first_name',l.data->>'last_name')),''),l.data->>'email','Lead '||LEFT(c.lead_id,8)),'lead_email',l.data->>'email','count',c.count) ORDER BY COALESCE(NULLIF(l.data->>'full_name',''),l.data->>'email','')) FROM lead_counts c LEFT JOIN taxiassur.records l ON l.collection='crm_leads' AND l.record_id=c.lead_id),'[]'::jsonb),'stats',json_build_object('total',COUNT(*) FILTER (WHERE ${active}),'unread',COUNT(*) FILTER (WHERE ${active} AND COALESCE((data->>'is_read')::boolean,false)=false),'leads',COUNT(*) FILTER (WHERE ${active} AND NULLIF(data->>'lead_id','') IS NOT NULL),'partners',COUNT(*) FILTER (WHERE ${active} AND data->>'classification'='partner'),'services',COUNT(*) FILTER (WHERE ${active} AND data->>'classification' IN ('internal','system')),'starred',COUNT(*) FILTER (WHERE ${active} AND COALESCE((data->>'is_starred')::boolean,false)=true),'archived',COUNT(*) FILTER (WHERE data->>'email_status'='archived'),'mails',COUNT(*) FILTER (WHERE ${active} AND data->>'classification'='non_lead')))::text FROM source;`;
    const inboxSql=sql.replace("'leads',COUNT(*) FILTER",`'alerts',COUNT(*) FILTER (WHERE ${active} AND data->>'priority'='high'),'leads',COUNT(*) FILTER`);
    const payload=parseJsonLine(await runPsql(inboxSql))||{messages:[],stats:{total:0,unread:0,alerts:0,leads:0,starred:0,archived:0,mails:0}};
    return json(res,origin,200,{ok:true,...payload},requestId);
  }
  const body=await readJsonBody(req),action=String(body.action||''),ids=[...new Set((Array.isArray(body.ids)?body.ids:[body.id]).map(String).filter(Boolean))].slice(0,500);
  if(!ids.length||!['mark_read','mark_all_read','star','archive','delete','classify_non_lead','resolve_alert','assign'].includes(action))return json(res,origin,400,{ok:false,error:'invalid_inbox_action'},requestId);
  let updates={updated_at:new Date().toISOString()};
  if(action==='mark_read'||action==='mark_all_read')updates.is_read=true;
  if(action==='star')updates.is_starred=body.value===true;
  if(action==='archive')updates={...updates,email_status:'archived',archived_at:new Date().toISOString()};
  if(action==='delete')updates={...updates,email_status:'deleted',deleted_at:new Date().toISOString()};
  if(action==='resolve_alert')updates={...updates,priority:'normal',is_read:true,alert_resolved_at:new Date().toISOString(),alert_resolved_by:session.sub};
  if(action==='classify_non_lead')updates={...updates,classification:'non_lead',confidence_score:1,is_read:true};
  if(action==='assign'){const leadId=String(body.lead_id||'');if(!uuidPattern.test(leadId))return json(res,origin,400,{ok:false,error:'invalid_lead'},requestId);updates={...updates,lead_id:leadId,auto_matched:false};}
  const idSql=ids.map(quoteLiteral).join(',');await runPsql(`BEGIN;UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='email_messages' AND record_id IN (${idSql});INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},${quoteLiteral('inbox_'+action)},'email_message',${quoteLiteral(ids[0])},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({count:ids.length}))}::jsonb);COMMIT;`);
  return json(res,origin,200,{ok:true,updated:ids.length},requestId);
}
function decodeMailHeader(value){return String(value||'').replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi,(_,charset,encoding,data)=>{try{if(encoding.toLowerCase()==='b')return Buffer.from(data,'base64').toString('utf8');return Buffer.from(data.replace(/_/g,' ').replace(/=([0-9a-f]{2})/gi,(_m,h)=>String.fromCharCode(parseInt(h,16))),'binary').toString('utf8');}catch{return data;}});}
function mailHeader(raw,name){const head=String(raw).split(/\r?\n\r?\n/,1)[0].replace(/\r?\n[ \t]+/g,' '),match=head.match(new RegExp('^'+name+':\\s*(.*)$','im'));return decodeMailHeader(match?.[1]||'').trim();}
function mailAddress(value){const match=String(value||'').match(/<([^>]+)>/);return String(match?.[1]||value).trim().toLowerCase().replace(/^mailto:/,'');}
function mailPartHeaders(value){const split=String(value||'').search(/\r?\n\r?\n/),head=(split<0?String(value||''):String(value||'').slice(0,split)).replace(/\r?\n[ \t]+/g,' '),headers={};for(const line of head.split(/\r?\n/)){const index=line.indexOf(':');if(index>0)headers[line.slice(0,index).trim().toLowerCase()]=line.slice(index+1).trim();}return {headers,body:split<0?'':String(value||'').slice(split).replace(/^\r?\n\r?\n/,'')};}
function decodeMailPart(body,encoding,charset='utf-8'){try{let bytes;if(/base64/i.test(encoding||''))bytes=Buffer.from(String(body||'').replace(/\s/g,''),'base64');else if(/quoted-printable/i.test(encoding||'')){const value=String(body||'').replace(/=\r?\n/g,'').replace(/=([0-9a-f]{2})/gi,(_m,hex)=>String.fromCharCode(parseInt(hex,16)));bytes=Buffer.from(value,'latin1');}else bytes=Buffer.from(String(body||''),'utf8');try{return new TextDecoder(String(charset||'utf-8').replace(/["']/g,'').trim()).decode(bytes);}catch{return bytes.toString('utf8');}}catch{return String(body||'');}}
function htmlToMailText(html){return String(html||'').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/(p|div|li|tr|h[1-6])>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#39;/g,"'").replace(/&quot;/gi,'"').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
function parseMailContent(raw){const texts=[],htmls=[];function visit(part){const {headers,body}=mailPartHeaders(part),type=String(headers['content-type']||'text/plain'),disposition=String(headers['content-disposition']||'');if(/attachment/i.test(disposition))return;const boundary=type.match(/boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.slice(1).find(Boolean);if(/^multipart\//i.test(type)&&boundary){for(const child of body.split(`--${boundary}`).slice(1)){if(/^--/.test(child.trim()))break;visit(child.replace(/^\r?\n/,''));}return;}const charset=type.match(/charset\s*=\s*(?:"([^"]+)"|([^;\s]+))/i)?.slice(1).find(Boolean)||'utf-8',decoded=decodeMailPart(body,headers['content-transfer-encoding'],charset).trim();if(!decoded)return;if(/^text\/html/i.test(type))htmls.push(decoded);else if(/^text\/plain/i.test(type))texts.push(decoded);}visit(raw);const html=htmls.sort((a,b)=>b.length-a.length)[0]?.slice(0,250000)||'',plain=texts.sort((a,b)=>b.length-a.length)[0]?.trim()||'',htmlText=htmlToMailText(html),boilerplate=/you are receiving this because|manage your github actions notifications/i;const text=((boilerplate.test(plain)&&htmlText.length>plain.length?htmlText:plain)||htmlText).replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').trim().slice(0,100000);return {text,html};}
function readableMailBody(raw){return parseMailContent(raw).text;}
function stableMailId(uid){const h=createHash('sha256').update(config.imapUser.toLowerCase()+':'+uid).digest('hex').slice(0,32).split('');h[12]='4';h[16]=['8','9','a','b'][parseInt(h[16],16)%4];return `${h.slice(0,8).join('')}-${h.slice(8,12).join('')}-${h.slice(12,16).join('')}-${h.slice(16,20).join('')}-${h.slice(20).join('')}`;}
function imapSync(){return new Promise((resolve,reject)=>{const socket=tls.connect({host:config.imapHost,port:config.imapPort,rejectUnauthorized:false}),timeout=setTimeout(()=>{socket.destroy();reject(new Error('imap_timeout'));},45000);let buffer=Buffer.alloc(0),tagNumber=0,pending=null,greeted=false,settled=false;const finishError=(error)=>{if(settled)return;settled=true;clearTimeout(timeout);try{socket.destroy();}catch{}reject(error);};const command=(text)=>new Promise((res,rej)=>{const tag='x'+(++tagNumber);pending={tag,res,rej};socket.write(`${tag} ${text}\r\n`);});socket.on('data',chunk=>{buffer=Buffer.concat([buffer,chunk]);if(!greeted&&buffer.includes(Buffer.from('\r\n'))){greeted=true;run().catch(finishError);return;}if(pending){const tail=buffer.subarray(Math.max(0,buffer.length-4096)).toString('latin1'),match=tail.match(new RegExp('(?:^|\\r\\n)'+pending.tag+' (OK|NO|BAD)[^\\r\\n]*\\r\\n','i'));if(match){const current=pending;pending=null;match[1].toUpperCase()==='OK'?current.res(buffer):current.rej(new Error('imap_command_failed'));}}});socket.on('error',finishError);async function run(){await command(`LOGIN "${String(config.imapUser).replace(/["\\]/g,'')}" "${String(config.imapPassword).replace(/["\\]/g,'')}"`);buffer=Buffer.alloc(0);await command('SELECT INBOX');buffer=Buffer.alloc(0);const search=await command('UID SEARCH ALL'),line=search.toString('latin1').match(/\* SEARCH([^\r\n]*)/i)?.[1]||'',uids=line.trim().split(/\s+/).filter(x=>/^\d+$/.test(x)).slice(-20);if(!uids.length){settled=true;clearTimeout(timeout);socket.end();return resolve([]);}buffer=Buffer.alloc(0);const fetched=await command(`UID FETCH ${uids.join(',')} (UID FLAGS INTERNALDATE BODY.PEEK[]<0.100000>)`),rows=[];let offset=0;while(offset<fetched.length){const marker=fetched.indexOf(Buffer.from('\r\n'),offset);if(marker<0)break;const prefix=fetched.subarray(offset,marker).toString('latin1'),literal=prefix.match(/\{(\d+)\}$/),uid=prefix.match(/UID (\d+)/i);if(literal&&uid){const size=Number(literal[1]),start=marker+2,end=start+size;if(end>fetched.length)break;rows.push({uid:uid[1],flags:prefix.match(/FLAGS \(([^)]*)\)/i)?.[1]||'',raw:fetched.subarray(start,end).toString('utf8')});offset=end;continue;}offset=marker+2;}settled=true;clearTimeout(timeout);socket.write(`x${++tagNumber} LOGOUT\r\n`);socket.end();resolve(rows);}});}
// Keep each request below the reverse-proxy timeout; repeated runs are idempotent.
{
function imapSync(){return new Promise((resolve,reject)=>{const socket=tls.connect({host:config.imapHost,port:config.imapPort,rejectUnauthorized:false}),timeout=setTimeout(()=>{socket.destroy();reject(new Error('imap_timeout'));},45000);let buffer=Buffer.alloc(0),tagNumber=0,pending=null,greeted=false;const finishError=(error)=>{clearTimeout(timeout);try{socket.destroy();}catch{}reject(error);};const command=(text)=>new Promise((res,rej)=>{const tag='x'+(++tagNumber);pending={tag,res,rej};socket.write(`${tag} ${text}\r\n`);});socket.on('data',chunk=>{buffer=Buffer.concat([buffer,chunk]);if(!greeted&&buffer.includes(Buffer.from('\r\n'))){greeted=true;run().catch(finishError);return;}if(pending){const text=buffer.toString('latin1'),match=text.match(new RegExp('(?:^|\\r\\n)'+pending.tag+' (OK|NO|BAD)[^\\r\\n]*\\r\\n','i'));if(match){const current=pending;pending=null;match[1].toUpperCase()==='OK'?current.res(buffer):current.rej(new Error('imap_command_failed'));}}});socket.on('error',finishError);async function run(){await command(`LOGIN "${String(config.imapUser).replace(/["\\]/g,'')}" "${String(config.imapPassword).replace(/["\\]/g,'')}"`);buffer=Buffer.alloc(0);await command('SELECT INBOX');buffer=Buffer.alloc(0);const search=await command('UID SEARCH ALL'),line=search.toString('latin1').match(/\* SEARCH([^\r\n]*)/i)?.[1]||'',uids=line.trim().split(/\s+/).filter(x=>/^\d+$/.test(x)).slice(-20);if(!uids.length){clearTimeout(timeout);socket.end();return resolve([]);}buffer=Buffer.alloc(0);const fetched=await command(`UID FETCH ${uids.join(',')} (UID FLAGS INTERNALDATE BODY.PEEK[])`),rows=[];let offset=0;while(offset<fetched.length){const marker=fetched.indexOf(Buffer.from('\r\n'),offset);if(marker<0)break;const prefix=fetched.subarray(offset,marker).toString('latin1'),literal=prefix.match(/\{(\d+)\}$/),uid=prefix.match(/UID (\d+)/i);if(literal&&uid){const size=Number(literal[1]),start=marker+2,end=start+size;if(end>fetched.length)break;rows.push({uid:uid[1],flags:prefix.match(/FLAGS \(([^)]*)\)/i)?.[1]||'',raw:fetched.subarray(start,end).toString('utf8')});offset=end;continue;}offset=marker+2;}clearTimeout(timeout);socket.write(`x${++tagNumber} LOGOUT\r\n`);socket.end();resolve(rows);}});}
}
async function autoProcessInboxLeads(){
  await classifyKnownServiceEmails();
  const [messages,leads]=await Promise.all([recordsAll('email_messages'),recordsAll('crm_leads')]);
  const leadByEmail=new Map(leads.filter(row=>row.email&&!row.deleted_at).map(row=>[String(row.email).trim().toLowerCase(),row]));
  const candidates=messages.filter(row=>row.direction!=='outbound'&&!row.lead_id&&row.email_status!=='deleted'&&row.classification!=='non_lead').sort((a,b)=>Date.parse(String(b.received_at||''))-Date.parse(String(a.received_at||''))).slice(0,100);
  let created=0,linked=0,ignored=0;
  for(const source of candidates){
    const email=String(source.from_email||'').trim().toLowerCase(),text=`${source.subject||''} ${source.body_text||''}`;
    if(email.endsWith('@brassurances.com')||email.endsWith('@xcr.fr')||email.endsWith('@taxiassur.com')||/whatsapp\s*business\s*team/i.test(String(source.from_name||''))){ignored++;continue;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email===config.smtpUser.toLowerCase()||/^(no-?reply|mailer-daemon|postmaster|dmarc)/i.test(email)){ignored++;continue;}
    let lead=leadByEmail.get(email);
    if(!lead){ignored++;continue;}
    if(!lead&&/devis|assurance|taxi|contrat|garantie|souscri|tarif|sinistre|véhicule|vehicule|chauffeur|résili|resili/i.test(text)){
      const id=randomUUID(),now=new Date().toISOString(),name=String(source.from_name||'').trim(),parts=name.split(/\s+/).filter(Boolean);
      lead={id,first_name:parts.shift()||'',last_name:parts.join(' '),full_name:name,email,phone:'',city:'',status:'NOUVEAU_LEAD',pipeline_stage:'nouveau_lead',current_stage_key:'new_lead',source:'email',notes:`Lead créé automatiquement depuis l'email : ${String(source.subject||'').slice(0,250)}`,created_at:now,updated_at:now};
      await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('crm_leads',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(lead))}::jsonb,'inbox-auto');`);leadByEmail.set(email,lead);created++;
    }
    if(!lead){ignored++;continue;}
    const result=await linkInboxHistory(String(lead.id),email);linked+=Number(result.linkedCount||0);
  }
  return {created,linked,ignored};
}
async function adminInboxSync(req,res,origin,requestId){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);if(!config.imapUser||!config.imapPassword)return json(res,origin,503,{ok:false,error:'mailbox_not_configured'},requestId);let rows;try{rows=await imapSync();}catch(error){console.error('[inbox-sync]',error?.message||error);return json(res,origin,502,{ok:false,error:'imap_sync_failed'},requestId);}const statements=[];for(const item of rows){const id=stableMailId(item.uid),fromRaw=mailHeader(item.raw,'From'),toRaw=mailHeader(item.raw,'To'),subject=mailHeader(item.raw,'Subject')||'(Sans objet)',dateRaw=mailHeader(item.raw,'Date'),receivedAt=Number.isFinite(Date.parse(dateRaw))?new Date(dateRaw).toISOString():new Date().toISOString(),content=parseMailContent(item.raw),record={id,mailbox_uid:item.uid,message_id:mailHeader(item.raw,'Message-ID'),from_email:mailAddress(fromRaw),from_name:decodeMailHeader(fromRaw.replace(/<[^>]+>/g,'')).replace(/^"|"$/g,'').trim(),to_emails:toRaw.split(',').map(mailAddress).filter(Boolean),subject,body_text:content.text,body_html:content.html,direction:mailAddress(fromRaw)===config.imapUser.toLowerCase()?'outbound':'inbound',is_read:/\\Seen/i.test(item.flags),is_starred:/\\Flagged/i.test(item.flags),email_status:'active',received_at:receivedAt,created_at:receivedAt,synced_at:new Date().toISOString(),sync_source:'imap'};statements.push(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('email_messages',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(record))}::jsonb,'imap') ON CONFLICT(collection,record_id) DO UPDATE SET data=taxiassur.records.data||EXCLUDED.data,updated_at=now(),revision=taxiassur.records.revision+1;`);}const imported=rows.length;statements.push(`INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},'inbox_imap_synced','mailbox',${quoteLiteral(config.imapUser)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({retrieved:rows.length,imported}))}::jsonb);`);await runPsql('BEGIN;'+statements.join('')+'COMMIT;');const processed=await autoProcessInboxLeads();return json(res,origin,200,{ok:true,success:true,stats:{emails_retrieved:rows.length,emails_imported:imported,leads_created:processed.created,emails_linked:processed.linked}},requestId);}
async function adminPipelineNotifications(req,res,origin,requestId){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const url=new URL(req.url||'/', 'http://localhost'),requestedSince=Date.parse(String(url.searchParams.get('since')||'')),since=Number.isFinite(requestedSince)?Math.max(requestedSince,Date.now()-86400000):Date.now()-86400000;
  const sinceIso=new Date(since).toISOString(),payload=parseJsonLine(await runPsql(`SELECT jsonb_build_object(
    'lead_status',COALESCE((SELECT jsonb_object_agg(record_id,COALESCE(data->>'current_stage_key',data->>'pipeline_stage',data->>'status','NOUVEAU_LEAD')) FROM taxiassur.records WHERE collection='crm_leads' AND COALESCE(data->>'deleted_at','')=''),'{}'::jsonb),
    'emails',COALESCE((SELECT jsonb_agg(data) FROM taxiassur.records WHERE collection='email_messages' AND COALESCE(data->>'received_at',data->>'created_at','')>=${quoteLiteral(sinceIso)}),'[]'::jsonb),
    'documents',COALESCE((SELECT jsonb_agg(data) FROM taxiassur.records WHERE collection='crm_lead_documents' AND COALESCE(data->>'uploaded_at',data->>'created_at','')>=${quoteLiteral(sinceIso)}),'[]'::jsonb),
    'interactions',COALESCE((SELECT jsonb_agg(data) FROM taxiassur.records WHERE collection='crm_interactions' AND COALESCE(data->>'created_at','')>=${quoteLiteral(sinceIso)}),'[]'::jsonb),
    'contracts',COALESCE((SELECT jsonb_agg(data) FROM taxiassur.records WHERE collection='lead_contracts' AND (data->>'status' IN ('pending','sent') OR data->>'down_payment_status' IN ('pending','required'))),'[]'::jsonb),
    'events',COALESCE((SELECT jsonb_agg(data ORDER BY data->>'created_at') FROM (SELECT data FROM taxiassur.records WHERE collection='crm_event_notifications' AND COALESCE(data->>'created_at','')>=${quoteLiteral(sinceIso)} ORDER BY data->>'created_at' DESC LIMIT 100) recent_events),'[]'::jsonb)
  )::text;`))||{};
  const emails=payload.emails||[],documents=payload.documents||[],interactions=payload.interactions||[],contracts=payload.contracts||[],events=payload.events||[];
  const leadStatus=new Map(Object.entries(payload.lead_status||{}).map(([id,status])=>[String(id),String(status||'NOUVEAU_LEAD')])),notifications={};
  const ensure=(status)=>notifications[status]||(notifications[status]={newEmails:0,newDocuments:0,missedCalls:0,newSMS:0,pendingSignatures:0,paymentDue:0});
  const recent=(row,key)=>{const value=Date.parse(String(row[key]||row.created_at||''));return Number.isFinite(value)&&value>=since;};
  for(const status of leadStatus.values())ensure(status);
  for(const row of emails){const status=leadStatus.get(String(row.lead_id));if(status&&row.direction==='inbound'&&recent(row,'received_at'))ensure(status).newEmails++;}
  for(const row of documents){const status=leadStatus.get(String(row.lead_id));if(status&&row.status==='pending_validation'&&recent(row,'uploaded_at'))ensure(status).newDocuments++;}
  for(const row of interactions){const status=leadStatus.get(String(row.lead_id));if(!status||!recent(row,'created_at'))continue;if(row.channel==='phone')ensure(status).missedCalls++;if(row.channel==='sms')ensure(status).newSMS++;}
  for(const row of contracts){const status=leadStatus.get(String(row.lead_id));if(!status)continue;if(row.status==='pending'||row.status==='sent')ensure(status).pendingSignatures++;if(row.down_payment_status==='pending'||row.down_payment_status==='required')ensure(status).paymentDue++;}
  const recentEvents=events.filter(row=>{const value=Date.parse(String(row.created_at||''));return Number.isFinite(value)&&value>=since;}).sort((a,b)=>Date.parse(String(a.created_at||''))-Date.parse(String(b.created_at||''))).slice(-100);
  return json(res,origin,200,{ok:true,notifications,events:recentEvents,server_time:new Date().toISOString()},requestId);
}
async function classifyKnownServiceEmails(){
  await runPsql(`UPDATE taxiassur.records SET data=(data-'lead_id'-'lead_name'-'lead_email')||jsonb_build_object('classification','system','service_name','GitHub Actions','github_status',CASE WHEN CONCAT_WS(' ',data->>'subject',data->>'body_text')~*'(all jobs have failed|job[s]? (have )?failed|failure|echec|erreur)' THEN 'failure' WHEN CONCAT_WS(' ',data->>'subject',data->>'body_text')~*'(cancelled|canceled|annule)' THEN 'cancelled' WHEN CONCAT_WS(' ',data->>'subject',data->>'body_text')~*'(all jobs (have )?(passed|succeeded)|completed successfully|success)' THEN 'success' ELSE 'unknown' END,'priority',CASE WHEN CONCAT_WS(' ',data->>'subject',data->>'body_text')~*'(all jobs have failed|job[s]? (have )?failed|failure|echec|erreur)' THEN 'high' ELSE 'normal' END),updated_at=now(),revision=revision+1 WHERE collection='email_messages' AND NULLIF(data->>'alert_resolved_at','') IS NULL AND (LOWER(COALESCE(data->>'from_email','')) LIKE '%@github.com' OR LOWER(COALESCE(data->>'from_email','')) LIKE '%notifications%github%' OR LOWER(COALESCE(data->>'from_name','')) LIKE '%github%') AND (COALESCE(data->>'classification','')<>'system' OR COALESCE(data->>'github_status','')='' OR COALESCE(data->>'priority','')<>CASE WHEN CONCAT_WS(' ',data->>'subject',data->>'body_text')~*'(all jobs have failed|job[s]? (have )?failed|failure|echec|erreur)' THEN 'high' ELSE 'normal' END);`);
  await runPsql(`UPDATE taxiassur.records failed SET data=failed.data||jsonb_build_object('priority','normal','alert_resolved_at',now()::text,'alert_resolution','newer_successful_run'),updated_at=now(),revision=revision+1 WHERE failed.collection='email_messages' AND failed.data->>'github_status'='failure' AND failed.data->>'priority'='high' AND EXISTS(SELECT 1 FROM taxiassur.records succeeded WHERE succeeded.collection='email_messages' AND succeeded.data->>'github_status'='success' AND lower(COALESCE(succeeded.data->>'subject',''))=lower(COALESCE(failed.data->>'subject','')) AND COALESCE(succeeded.data->>'received_at',succeeded.data->>'created_at','')>COALESCE(failed.data->>'received_at',failed.data->>'created_at',''));`);
}
async function reclassifyKnownPartners(){
  await runPsql(`BEGIN;WITH moved AS (SELECT record_id,data,CASE WHEN LOWER(COALESCE(data->>'email','')) LIKE '%@brassurances.com' THEN 'partner' WHEN LOWER(COALESCE(data->>'email','')) LIKE '%@xcr.fr' OR LOWER(COALESCE(data->>'email','')) LIKE '%@taxiassur.com' THEN 'internal' ELSE 'system' END AS kind FROM taxiassur.records WHERE collection='crm_leads' AND (LOWER(COALESCE(data->>'email','')) LIKE '%@brassurances.com' OR LOWER(COALESCE(data->>'email','')) LIKE '%@xcr.fr' OR LOWER(COALESCE(data->>'email','')) LIKE '%@taxiassur.com' OR LOWER(COALESCE(data->>'full_name',data->>'name','')) LIKE '%whatsapp%business%team%')) INSERT INTO taxiassur.records(collection,record_id,data,origin) SELECT 'business_contacts',record_id,data||jsonb_build_object('contact_type',kind,'reclassified_at',now()::text),'contact-reclassification' FROM moved ON CONFLICT(collection,record_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now(),revision=taxiassur.records.revision+1;UPDATE taxiassur.records SET data=(data-'lead_id'-'lead_name'-'lead_email')||jsonb_build_object('classification',CASE WHEN LOWER(COALESCE(data->>'from_email','')) LIKE '%@brassurances.com' THEN 'partner' WHEN LOWER(COALESCE(data->>'from_email','')) LIKE '%@xcr.fr' OR LOWER(COALESCE(data->>'from_email','')) LIKE '%@taxiassur.com' THEN 'internal' ELSE 'system' END),updated_at=now(),revision=revision+1 WHERE collection='email_messages' AND (LOWER(COALESCE(data->>'from_email','')) LIKE '%@brassurances.com' OR LOWER(COALESCE(data->>'from_email','')) LIKE '%@xcr.fr' OR LOWER(COALESCE(data->>'from_email','')) LIKE '%@taxiassur.com' OR LOWER(COALESCE(data->>'from_name','')) LIKE '%whatsapp%business%team%');DELETE FROM taxiassur.records WHERE collection='crm_leads' AND (LOWER(COALESCE(data->>'email','')) LIKE '%@brassurances.com' OR LOWER(COALESCE(data->>'email','')) LIKE '%@xcr.fr' OR LOWER(COALESCE(data->>'email','')) LIKE '%@taxiassur.com' OR LOWER(COALESCE(data->>'full_name',data->>'name','')) LIKE '%whatsapp%business%team%');COMMIT;`);
}
async function cleanupAutoEmailLeads(){
  const cleanupId=randomUUID(),now=new Date().toISOString();
  await runPsql(`BEGIN;CREATE TEMP TABLE auto_email_leads_to_delete ON COMMIT DROP AS SELECT record_id,data FROM taxiassur.records WHERE collection='crm_leads' AND origin='inbox-auto';INSERT INTO taxiassur.records(collection,record_id,data,origin) SELECT 'deleted_auto_email_leads',record_id,data||jsonb_build_object('deleted_at',${quoteLiteral(now)},'deletion_reason','Suppression demandee des leads crees automatiquement depuis les emails'),'cleanup-backup' FROM auto_email_leads_to_delete ON CONFLICT(collection,record_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now(),revision=taxiassur.records.revision+1;UPDATE taxiassur.records e SET data=(e.data-'lead_id'-'lead_name'-'lead_email')||jsonb_build_object('auto_matched',false,'classification',COALESCE(NULLIF(e.data->>'classification','lead'),'unassigned')),updated_at=now(),revision=e.revision+1 FROM auto_email_leads_to_delete t WHERE e.collection='email_messages' AND e.data->>'lead_id'=t.record_id;DELETE FROM taxiassur.records r USING auto_email_leads_to_delete t WHERE r.collection='crm_leads' AND r.record_id=t.record_id;INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)SELECT 'system','startup-maintenance','auto_email_leads_deleted','crm_leads',${quoteLiteral(cleanupId)},${quoteLiteral(cleanupId)}::uuid,jsonb_build_object('count',COUNT(*),'backup_collection','deleted_auto_email_leads') FROM auto_email_leads_to_delete;COMMIT;`);
}
async function adminLeadContractSignature(req,res,origin,requestId,leadId){
 const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
 const lead=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)} LIMIT 1;`));if(!lead)return json(res,origin,404,{ok:false,error:'not_found'},requestId);
 const signatures=(await recordsWhere('lead_signature_history','lead_id',leadId)).filter(row=>row.signature_type==='contrat').sort((a,b)=>String(b.created_at||b.confirmed_at||'').localeCompare(String(a.created_at||a.confirmed_at||'')));
 if(req.method==='GET')return json(res,origin,200,{ok:true,signature:signatures[0]||null},requestId);
 const body=await readJsonBody(req),signed=body.is_signed===true,now=new Date().toISOString(),existing=signatures[0],id=existing?.id||randomUUID(),row=Object.assign({},existing||{id,lead_id:leadId,signature_type:'contrat',created_at:now},{is_signed:signed,signed_at:signed?now:null,external_signature_url:String(body.external_signature_url||'').slice(0,1000)||null,confirmed_at:now,confirmed_by:session.sub,updated_at:now});
 if(existing)await runPsql(`UPDATE taxiassur.records SET data=${quoteLiteral(JSON.stringify(row))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='lead_signature_history' AND record_id=${quoteLiteral(id)};`);else await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('lead_signature_history',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(row))}::jsonb,'admin');`);
 return json(res,origin,200,{ok:true,signature:row},requestId);
}
async function adminLeadDuplicates(req,res,origin,requestId){const session=await masterSession(req);if(!session)return json(res,origin,403,{ok:false,error:'master_required'},requestId);const [leads,interactions,documents,emails,quotes]=await Promise.all([recordsAll('crm_leads'),recordsAll('crm_interactions'),recordsAll('crm_lead_documents'),recordsAll('email_messages'),recordsAll('lead_company_quotes')]);const active=leads.filter(x=>!x.deleted_at&&x.is_archived!==true&&String(x.email||'').trim()).map(x=>({...x,email:String(x.email).trim().toLowerCase()}));const groups=new Map();for(const lead of active){const list=groups.get(lead.email)||[];list.push(lead);groups.set(lead.email,list);}const count=(rows,id)=>rows.filter(x=>String(x.lead_id)===String(id)).length;const details={},duplicates=[];for(const [email,list] of groups){if(list.length<2)continue;list.sort((a,b)=>Date.parse(String(b.created_at||''))-Date.parse(String(a.created_at||'')));duplicates.push({email,count:list.length,lead_ids:list.map(x=>x.id),first_created:list[list.length-1].created_at,last_created:list[0].created_at});details[email]=list.map(x=>({...x,full_name:x.full_name||String(`${x.first_name||''} ${x.last_name||x.name||''}`).trim(),_counts:{interactions:count(interactions,x.id),documents:count(documents,x.id),emails:count(emails,x.id),quotes:count(quotes,x.id)}}));}duplicates.sort((a,b)=>b.count-a.count||a.email.localeCompare(b.email));return json(res,origin,200,{ok:true,duplicates,details},requestId);}
async function adminMergeLeads(req,res,origin,requestId){
  const session=await masterSession(req);if(!session)return json(res,origin,403,{ok:false,error:'master_required'},requestId);
  const body=await readJsonBody(req),sourceId=String(body.source_id||''),targetId=String(body.target_id||'');
  if(!uuidPattern.test(sourceId)||!uuidPattern.test(targetId)||sourceId===targetId)return json(res,origin,400,{ok:false,error:'invalid_merge'},requestId);
  const [source,target]=await Promise.all([runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(sourceId)} LIMIT 1;`).then(parseJsonLine),runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(targetId)} LIMIT 1;`).then(parseJsonLine)]);if(!source||!target)return json(res,origin,404,{ok:false,error:'lead_not_found'},requestId);
  if(source.status==='archived'||source.merged_into)return json(res,origin,409,{ok:false,error:'source_already_archived'},requestId);
  const merged={...target};for(const [key,value] of Object.entries(source)){if((merged[key]===null||merged[key]===undefined||merged[key]==='')&&value!==null&&value!==undefined&&value!=='')merged[key]=value;}merged.id=targetId;merged.updated_at=new Date().toISOString();merged.merged_sources=[...new Set([...(Array.isArray(target.merged_sources)?target.merged_sources:[]),sourceId])];
  const counts=parseJsonLine(await runPsql(`SELECT jsonb_build_object('documents',(SELECT count(*) FROM taxiassur.records WHERE collection IN('crm_documents','crm_lead_documents','prospect_documents') AND data->>'lead_id'=${quoteLiteral(sourceId)}),'interactions',(SELECT count(*) FROM taxiassur.records WHERE collection='crm_interactions' AND data->>'lead_id'=${quoteLiteral(sourceId)}),'quotes',(SELECT count(*) FROM taxiassur.records WHERE collection IN('lead_company_quotes','crm_quotes') AND data->>'lead_id'=${quoteLiteral(sourceId)}),'emails',(SELECT count(*) FROM taxiassur.records WHERE collection='email_messages' AND data->>'lead_id'=${quoteLiteral(sourceId)}) )::text;`))||{};
  const sourceArchive={...source,status:'archived',lead_status:'archived',merged_into:targetId,merged_at:new Date().toISOString(),merged_by:session.sub};
  await runPsql(`BEGIN;UPDATE taxiassur.records SET data=${quoteLiteral(JSON.stringify(merged))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='crm_leads' AND record_id=${quoteLiteral(targetId)};UPDATE taxiassur.records SET data=${quoteLiteral(JSON.stringify(sourceArchive))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='crm_leads' AND record_id=${quoteLiteral(sourceId)};UPDATE taxiassur.records SET data=jsonb_set(data,'{lead_id}',to_jsonb(${quoteLiteral(targetId)}::text),true),updated_at=now(),revision=revision+1 WHERE collection<>'crm_leads' AND data->>'lead_id'=${quoteLiteral(sourceId)};UPDATE taxiassur.file_objects SET owner_id=${quoteLiteral(targetId)},updated_at=now() WHERE owner_id=${quoteLiteral(sourceId)};INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},'leads_merged','crm_lead',${quoteLiteral(targetId)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({source_id:sourceId,target_id:targetId,...counts}))}::jsonb);COMMIT;`);
  return json(res,origin,200,{success:true,source_id:sourceId,target_id:targetId,documents_moved:Number(counts.documents||0),interactions_moved:Number(counts.interactions||0),quotes_moved:Number(counts.quotes||0),emails_moved:Number(counts.emails||0)},requestId);
}
async function adminLeadsList(req, res, origin, requestId, url) {
  if (!await verifiedAdminSession(req)) return json(res, origin, 401, { ok: false, error: 'invalid_session' }, requestId);
  const search = String(url.searchParams.get('search') || '').trim().toLowerCase().slice(0, 120);
  const status = String(url.searchParams.get('status') || '').trim().slice(0, 80);
  const page = Math.max(1, Math.min(100, Number.parseInt(String(url.searchParams.get('page') || '1'), 10) || 1));
  const pageSize = Math.max(50, Math.min(500, Number.parseInt(String(url.searchParams.get('page_size') || '500'), 10) || 500));
  const offset = (page - 1) * pageSize;
  const filters = [
    `lower(COALESCE(data->>'status','')) NOT IN ('archived','anonymized')`,
    `COALESCE(data->>'merged_into','')=''`,
    `COALESCE(data->>'deletion_reason','') NOT ILIKE '%leads crees automatiquement depuis les emails%'`
  ];
  if (status) filters.push(`COALESCE(data->>'status',data->>'pipeline_stage')=${quoteLiteral(status)}`);
  if (search) filters.push(`lower(concat_ws(' ',data->>'first_name',data->>'last_name',data->>'email',data->>'phone')) LIKE ${quoteLiteral(`%${search}%`)}`);
  const result = parseJsonLine(await runPsql(`WITH filtered AS (
    SELECT data || jsonb_build_object('id',record_id) AS data
      FROM taxiassur.records WHERE collection='crm_leads' AND ${filters.join(' AND ')}
  ), page_rows AS (
    SELECT data FROM filtered ORDER BY COALESCE(data->>'updated_at',data->>'created_at','') DESC LIMIT ${pageSize} OFFSET ${offset}
  ) SELECT jsonb_build_object('leads',COALESCE((SELECT jsonb_agg(data) FROM page_rows),'[]'::jsonb),'total',(SELECT count(*) FROM filtered))::text;`)) || {};
  const total = Number(result.total || 0);
  return json(res, origin, 200, { ok: true, leads: result.leads || [], total, page, page_size: pageSize, has_more: offset + pageSize < total }, requestId);
}
const defaultCrmSettings={company_name:'TaxiAssur',primary_email:'team@taxiassur.com',timezone:'Europe/Paris',auto_assign_leads:true,ai_auto_decisions:true,ai_autonomy_level:'semi-automatic',ai_confidence_threshold:80,ai_agents:{lead_scorer:true,email_composer:true,negotiation_assistant:true,risk_analyzer:true,churn_predictor:true,cross_sell_recommender:true,sentiment_analyzer:false,response_generator:true},notifications:{new_leads:true,ai_decisions:true,churn_alerts:true,missing_documents:true}};
async function adminInsuranceCompanies(req,res,origin,requestId){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);if(req.method==='GET'){const [companies,documents]=await Promise.all([recordsAll('insurance_companies'),recordsAll('company_documents')]);companies.sort((a,b)=>Number(a.priority_order||0)-Number(b.priority_order||0)||String(a.name||'').localeCompare(String(b.name||'')));return json(res,origin,200,{ok:true,companies:companies.map(company=>withPublicCompanyLogo(company,documents)),documents},requestId);}if(session.role!=='master')return json(res,origin,403,{ok:false,error:'master_required'},requestId);const body=await readJsonBody(req),id=randomUUID(),now=new Date().toISOString(),record=sanitizeInsuranceCompany(body,id,now);await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('insurance_companies',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(record))}::jsonb,'admin');`);return json(res,origin,201,{ok:true,company:record},requestId);}
function sanitizeInsuranceCompany(v,id,now){return {id,name:String(v.name||'').trim().slice(0,160),code:String(v.code||'').trim().toUpperCase().slice(0,50),logo_url:v.logo_url||null,contact_email:String(v.contact_email||'').trim().slice(0,200)||null,contact_phone:String(v.contact_phone||'').trim().slice(0,50)||null,claims_phone:String(v.claims_phone||'').trim().slice(0,50)||null,assistance_phone:String(v.assistance_phone||'').trim().slice(0,50)||null,website:String(v.website||'').trim().slice(0,500)||null,extranet_url:String(v.extranet_url||'').trim().slice(0,500)||null,description:String(v.description||'').slice(0,5000)||null,contact_hours:String(v.contact_hours||'').slice(0,500)||null,is_active:v.is_active!==false,is_mandatory:v.is_mandatory===true,workflow_type:String(v.workflow_type||'grossiste').slice(0,80),priority_order:Number(v.priority_order)||0,useful_links:Array.isArray(v.useful_links)?v.useful_links.slice(0,30):[],created_at:v.created_at||now,updated_at:now};}
async function adminInsuranceCompany(req,res,origin,requestId,id,resource){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);if(session.role!=='master')return json(res,origin,403,{ok:false,error:'master_required'},requestId);if(resource&&req.method==='POST')return await uploadCompanyFile(req,res,origin,requestId,session,id,resource);if(req.method==='PATCH'){const current=(await recordsAll('insurance_companies')).find(x=>String(x.id)===id);if(!current)return json(res,origin,404,{ok:false,error:'not_found'},requestId);const record=sanitizeInsuranceCompany({...current,...await readJsonBody(req)},id,new Date().toISOString());await runPsql(`UPDATE taxiassur.records SET data=${quoteLiteral(JSON.stringify(record))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='insurance_companies' AND record_id=${quoteLiteral(id)};`);return json(res,origin,200,{ok:true,company:record},requestId);}if(req.method==='DELETE'){const docs=await recordsWhere('company_documents','company_id',id);await runPsql(`BEGIN;DELETE FROM taxiassur.file_objects WHERE owner_type='insurance_company' AND owner_id=${quoteLiteral(id)};DELETE FROM taxiassur.records WHERE collection='company_documents' AND data->>'company_id'=${quoteLiteral(id)};DELETE FROM taxiassur.records WHERE collection='insurance_companies' AND record_id=${quoteLiteral(id)};COMMIT;`);for(const d of docs)if(d.file_path)safeUnlink(safeStoragePath(d.file_path));return json(res,origin,200,{ok:true},requestId);}return json(res,origin,405,{ok:false,error:'method_not_allowed'},requestId);}
async function uploadCompanyFile(req,res,origin,requestId,session,companyId,resource){const mime=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase(),ext=allowedMimeTypes.get(mime),name=safeFileName(decodeHeader(req.headers['x-file-name'])),size=Number(req.headers['content-length']||0);if(!ext||!name||size<1||size>maxUploadBytes)return drainAndJson(req,res,origin,400,{ok:false,error:'invalid_file'},requestId);const id=randomUUID(),relative=`companies/${companyId}/${resource}/${id}.${ext}`,final=safeStoragePath(relative),tmp=path.join(config.documentRoot,'.tmp',`${id}.upload`);mkdirSync(path.dirname(final),{recursive:true});const upload=await receiveFile(req,tmp,maxUploadBytes),scan=await scanFile(tmp);if(scan.status!=='clean'){safeUnlink(tmp);return json(res,origin,422,{ok:false,error:'unsafe_file'},requestId);}renameSync(tmp,final);if(resource==='logo'){const logo_url=`/v1/admin/company-documents/${id}/download`;const data={id,company_id:companyId,document_name:name,document_type:'logo',file_path:relative,file_url:logo_url,file_size:upload.size,mime_type:mime,created_at:new Date().toISOString()};await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('company_documents',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(data))}::jsonb,'admin');UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({logo_url,updated_at:new Date().toISOString()}))}::jsonb WHERE collection='insurance_companies' AND record_id=${quoteLiteral(companyId)};COMMIT;`);return json(res,origin,201,{ok:true,logo_url,document:data},requestId);}const section=String(req.headers['x-document-section']||'quote'),data={id,company_id:companyId,document_name:name.replace(/\.[^.]+$/,''),document_type:section,file_path:relative,file_url:`/v1/admin/company-documents/${id}/download`,file_size:upload.size,mime_type:mime,is_mandatory:true,send_with_quote:section==='quote',send_with_contract:section==='contract',send_with_claim:section==='claim',display_order:0,created_at:new Date().toISOString()};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('company_documents',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(data))}::jsonb,'admin');`);return json(res,origin,201,{ok:true,document:data},requestId);}
async function adminCompanyDocument(req,res,origin,requestId,id,action){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const row=(await recordsAll('company_documents')).find(x=>String(x.id)===id);if(!row)return json(res,origin,404,{ok:false,error:'not_found'},requestId);if(req.method==='GET'&&action==='download'){const file=safeStoragePath(row.file_path);if(!existsSync(file))return json(res,origin,404,{ok:false,error:'file_missing'},requestId);res.writeHead(200,responseHeaders(origin,requestId,{'Content-Type':row.mime_type||'application/octet-stream','Content-Length':String(statSync(file).size),'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(row.document_name||'document')}`,'Cache-Control':'private, no-store'}));return createReadStream(file).pipe(res);}if(session.role!=='master')return json(res,origin,403,{ok:false,error:'master_required'},requestId);if(req.method==='PATCH'){const body=await readJsonBody(req),allowed={};for(const k of ['send_with_quote','send_with_contract','send_with_claim','is_mandatory'])if(typeof body[k]==='boolean')allowed[k]=body[k];await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(allowed))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='company_documents' AND record_id=${quoteLiteral(id)};`);return json(res,origin,200,{ok:true},requestId);}if(req.method==='DELETE'){await runPsql(`DELETE FROM taxiassur.records WHERE collection='company_documents' AND record_id=${quoteLiteral(id)};`);if(row.file_path)safeUnlink(safeStoragePath(row.file_path));return json(res,origin,200,{ok:true},requestId);}return json(res,origin,405,{ok:false,error:'method_not_allowed'},requestId);}
async function adminCompliance(req,res,origin,requestId){const session=await masterSession(req);if(!session)return json(res,origin,403,{ok:false,error:'master_required'},requestId);if(req.method==='GET'){const [consents,requests,audits]=await Promise.all([recordsAll('gdpr_consents'),recordsAll('gdpr_data_requests'),runPsql(`SELECT COALESCE(jsonb_agg(jsonb_build_object('event',action,'action',action,'timestamp',created_at) ORDER BY created_at DESC),'[]'::jsonb)::text FROM (SELECT action,created_at FROM taxiassur.audit_events WHERE action LIKE 'gdpr_%' ORDER BY created_at DESC LIMIT 50) q;`).then(parseJsonLine)]);consents.sort((a,b)=>Date.parse(String(b.collected_at||''))-Date.parse(String(a.collected_at||'')));requests.sort((a,b)=>Date.parse(String(b.requested_at||''))-Date.parse(String(a.requested_at||'')));const active=consents.filter(x=>!x.opted_out_at).length,breakdown={};for(const x of consents){const k=String(x.lawful_basis||'unknown');breakdown[k]=(breakdown[k]||0)+1;}return json(res,origin,200,{ok:true,consents,requests:requests.slice(0,50),report:{generated_at:new Date().toISOString(),total_consents:consents.length,active_consents:active,opt_outs:consents.length-active,pending_requests:requests.filter(x=>x.status==='pending').length,completed_requests:requests.filter(x=>x.status==='completed').length,expired_records:0,recent_activity:audits||[],lawful_basis_breakdown:breakdown}},requestId);}const body=await readJsonBody(req),action=String(body.action||''),email=String(body.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,origin,400,{ok:false,error:'invalid_email'},requestId);const now=new Date().toISOString();if(action==='export'){const collections=['crm_leads','gdpr_consents','gdpr_data_requests','newsletter_subscribers','email_messages','email_sends','referrals'];const data={email,exported_at:now,records:{}};for(const c of collections)data.records[c]=await recordsWhere(c,'email',email);return json(res,origin,200,{ok:true,data},requestId);}if(action==='opt_out'){await runPsql(`BEGIN;UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({opted_out_at:now,status:'opted_out'}))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='gdpr_consents' AND lower(data->>'email')=${quoteLiteral(email)};UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({status:'unsubscribed',marketing_consent:false,unsubscribed_at:now}))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='newsletter_subscribers' AND lower(data->>'email')=${quoteLiteral(email)};COMMIT;`);}else if(action==='erasure'){const anon='deleted+'+createHash('sha256').update(email+config.sessionSecret).digest('hex').slice(0,20)+'@anonymized.invalid',update={email:anon,first_name:'Anonyme',last_name:'RGPD',full_name:'Anonyme RGPD',name:'Anonyme RGPD',phone:null,address:null,deleted_at:now,status:'anonymized'};await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(update))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection IN('crm_leads','newsletter_subscribers','gdpr_consents') AND lower(data->>'email')=${quoteLiteral(email)};`);}if(['create','access','erasure','rectification','portability','restriction'].includes(action)){const id=randomUUID(),type=action==='create'?String(body.request_type||'access'):action,record={id,email,request_type:type,status:['access','erasure'].includes(type)?'completed':'pending',requested_at:now,processed_at:['access','erasure'].includes(type)?now:null,notes:String(body.notes||'').slice(0,2000)};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('gdpr_data_requests',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(record))}::jsonb,'admin');`);}await runPsql(`INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},${quoteLiteral('gdpr_'+action)},'data_subject',${quoteLiteral(createHash('sha256').update(email).digest('hex').slice(0,32))},${quoteLiteral(requestId)}::uuid,'{}'::jsonb);`);return json(res,origin,200,{ok:true},requestId);}
async function adminWhatsapp(req,res,origin,requestId,url){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);if(req.method==='GET'){const [conversations,contacts,messages,templates]=await Promise.all([recordsAll('wa_conversations'),recordsAll('wa_contacts'),recordsAll('wa_messages'),recordsAll('wa_templates')]);const filter=String(url.searchParams.get('filter')||'all'),conversationId=String(url.searchParams.get('conversation_id')||'');let rows=conversations.map(x=>({...x,wa_contacts:contacts.find(c=>String(c.id)===String(x.contact_id))||{id:'',phone_e164:'',display_name:'Inconnu',opted_out:false}})).sort((a,b)=>Date.parse(String(b.last_message_at||''))-Date.parse(String(a.last_message_at||'')));if(filter==='unread')rows=rows.filter(x=>Number(x.unread_count)>0);if(filter==='assigned')rows=rows.filter(x=>x.assigned_to_user_id);return json(res,origin,200,{ok:true,conversations:rows,messages:conversationId?messages.filter(x=>String(x.conversation_id)===conversationId).sort((a,b)=>Date.parse(String(a.created_at||''))-Date.parse(String(b.created_at||''))):[],templates:templates.filter(x=>x.approved===true).sort((a,b)=>String(a.name).localeCompare(String(b.name))),current_user_id:session.sub},requestId);}const body=await readJsonBody(req),action=String(body.action||''),conversationId=String(body.conversation_id||''),conv=(await recordsAll('wa_conversations')).find(x=>String(x.id)===conversationId);if(!conv)return json(res,origin,404,{ok:false,error:'conversation_not_found'},requestId);if(req.method==='PATCH'){const updates=action==='read'?{unread_count:0}:action==='assign'?{assigned_to_user_id:session.sub}:null;if(!updates)return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='wa_conversations' AND record_id=${quoteLiteral(conversationId)};`);return json(res,origin,200,{ok:true},requestId);}const contact=(await recordsAll('wa_contacts')).find(x=>String(x.id)===String(conv.contact_id));if(!contact||contact.opted_out===true)return json(res,origin,409,{ok:false,error:'contact_opted_out'},requestId);const integration=await integrationRecord('whatsapp'),token=decryptPrivateValue(integration?.secret_encrypted),sid=String(integration?.fields?.account_sid||''),from=String(integration?.fields?.phone_number||'');if(!token||!sid||!from)return json(res,origin,503,{ok:false,error:'whatsapp_not_configured'},requestId);let text=String(body.body||'').trim();if(body.template_name){const tpl=(await recordsAll('wa_templates')).find(x=>x.approved===true&&x.name===body.template_name);if(!tpl)return json(res,origin,404,{ok:false,error:'template_not_found'},requestId);text=String(tpl.body||'');for(const [k,v] of Object.entries(body.template_variables||{}))text=text.replaceAll(`{{${k}}}`,String(v));}if(!text||text.length>4000)return json(res,origin,400,{ok:false,error:'invalid_message'},requestId);const params=new URLSearchParams({From:from.startsWith('whatsapp:')?from:`whatsapp:${from}`,To:String(contact.phone_e164).startsWith('whatsapp:')?String(contact.phone_e164):`whatsapp:${contact.phone_e164}`,Body:text}),response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,{method:'POST',headers:{Authorization:'Basic '+Buffer.from(sid+':'+token).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:params}),result=await response.json().catch(()=>({}));if(!response.ok)return json(res,origin,502,{ok:false,error:'whatsapp_provider_error'},requestId);const id=randomUUID(),now=new Date().toISOString(),message={id,conversation_id:conversationId,direction:'outbound',body:text,message_sid:result.sid||null,status:result.status||'queued',created_at:now};await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('wa_messages',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(message))}::jsonb,'admin');UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({last_message_at:now,last_message_preview:text.slice(0,160)}))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='wa_conversations' AND record_id=${quoteLiteral(conversationId)};COMMIT;`);return json(res,origin,201,{ok:true,success:true,message},requestId);}
async function adminCrmSettings(req,res,origin,requestId){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);if(req.method==='GET'){const saved=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='admin_settings' AND record_id='crm-settings' LIMIT 1;`));return json(res,origin,200,{ok:true,settings:{...defaultCrmSettings,...(saved?.settings||{})}},requestId);}if(session.role!=='master')return json(res,origin,403,{ok:false,error:'master_required'},requestId);const body=await readJsonBody(req),input=body.settings||{},settings={...defaultCrmSettings,company_name:String(input.company_name||defaultCrmSettings.company_name).trim().slice(0,120),primary_email:String(input.primary_email||defaultCrmSettings.primary_email).trim().toLowerCase().slice(0,200),timezone:String(input.timezone||defaultCrmSettings.timezone).slice(0,80),auto_assign_leads:input.auto_assign_leads===true,ai_auto_decisions:input.ai_auto_decisions===true,ai_autonomy_level:['manual','semi-automatic','automatic'].includes(input.ai_autonomy_level)?input.ai_autonomy_level:'semi-automatic',ai_confidence_threshold:Math.max(0,Math.min(100,Number(input.ai_confidence_threshold)||80)),ai_agents:{...defaultCrmSettings.ai_agents,...(input.ai_agents||{})},notifications:{...defaultCrmSettings.notifications,...(input.notifications||{})}};const record={settings,updated_at:new Date().toISOString(),updated_by:session.sub};await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('admin_settings','crm-settings',${quoteLiteral(JSON.stringify(record))}::jsonb,'admin') ON CONFLICT(collection,record_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now(),revision=taxiassur.records.revision+1;INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('admin',${quoteLiteral(session.sub)},'crm_settings_updated','admin_settings','crm-settings',${quoteLiteral(requestId)}::uuid);COMMIT;`);return json(res,origin,200,{ok:true,settings},requestId);}
async function adminAccessControl(req,res,origin,requestId,url){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const userId=String(url.searchParams.get('user_id')||'');const [modules,rolePermissions,userPermissions]=await Promise.all([recordsWhere('system_modules','is_active','true'),recordsAll('role_permissions'),userId?recordsWhere('user_custom_permissions','user_id',userId):Promise.resolve([])]);return json(res,origin,200,{ok:true,modules:modules.sort((a,b)=>Number(a.display_order||0)-Number(b.display_order||0)),role_permissions:rolePermissions,user_permissions:userPermissions},requestId);}
async function adminUserUiPermissionPut(req,res,origin,requestId){const session=await masterSession(req);if(!session)return json(res,origin,403,{ok:false,error:'master_required'},requestId);const body=await readJsonBody(req),userId=String(body.user_id||''),moduleSlug=String(body.module_slug||'').trim();if(!uuidPattern.test(userId)||!/^[a-z0-9_-]{1,80}$/i.test(moduleSlug)||!await adminUserRow(userId))return json(res,origin,400,{ok:false,error:'invalid_permission'},requestId);const allowed=['can_read','can_write','can_delete','can_export','can_validate','can_assign'],permission={user_id:userId,module_slug:moduleSlug};for(const key of allowed)permission[key]=body[key]===true;const recordId=userId+':'+moduleSlug;await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('user_custom_permissions',${quoteLiteral(recordId)},${quoteLiteral(JSON.stringify(permission))}::jsonb,'admin') ON CONFLICT(collection,record_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now(),revision=taxiassur.records.revision+1;`);return json(res,origin,200,{ok:true,permission},requestId);}
function decryptPrivateValue(value){try{const [version,iv64,tag64,data64]=String(value||'').split(':');if(version!=='v1'||!iv64||!tag64||!data64)return '';const key=createHash('sha256').update(config.sessionSecret).digest();const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(iv64,'base64'));decipher.setAuthTag(Buffer.from(tag64,'base64'));return Buffer.concat([decipher.update(Buffer.from(data64,'base64')),decipher.final()]).toString('utf8');}catch{return '';}}
function googleJwtPart(value){return Buffer.from(JSON.stringify(value)).toString('base64url');}
async function effectiveGoogle(){
  const row=await integrationRecord('google');
  return {email:String(row?.fields?.service_account_email||env.GOOGLE_SERVICE_ACCOUNT_EMAIL||'').trim(),privateKey:String(decryptPrivateValue(row?.secret_encrypted)||env.GOOGLE_SERVICE_ACCOUNT_KEY||'').replace(/\\n/g,'\n').trim(),siteUrl:String(row?.fields?.gsc_site_url||env.GSC_SITE_URL||'https://taxiassur.com').trim()};
}
async function googleAccessToken(email,privateKey){
  const now=Math.floor(Date.now()/1000),header=googleJwtPart({alg:'RS256',typ:'JWT'}),claim=googleJwtPart({iss:email,scope:'https://www.googleapis.com/auth/webmasters.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}),input=`${header}.${claim}`;
  const signature=createSign('RSA-SHA256').update(input).end().sign(privateKey).toString('base64url');
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${input}.${signature}`})});
  if(!response.ok)throw publicError(502,'google_auth_failed');
  const payload=await response.json();if(!payload.access_token)throw publicError(502,'google_auth_failed');return payload.access_token;
}
async function fetchGscRows(siteUrl,startDate,endDate,token,dimension){
  const response=await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({startDate,endDate,dimensions:[dimension],rowLimit:25000,startRow:0,dataState:'final'})});
  if(!response.ok){const body=await response.text();console.error('[taxiassur-platform-api] GSC request failed',{status:response.status,dimension,body:body.slice(0,180)});throw publicError(502,response.status===403?'google_gsc_access_denied':'google_gsc_failed');}
  return (await response.json()).rows||[];
}
function gscOpportunity(row){const impressions=Number(row.impressions||0),clicks=Number(row.clicks||0),position=Number(row.position||0),ctr=Number(row.ctr||0);return Math.max(0,Math.min(100,Math.round(Math.log10(impressions+1)*18+Math.max(0,20-position)*2+Math.max(0,0.08-ctr)*220-clicks*.05)));}
async function adminGscAutonomous(req,res,origin,requestId){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const [tasks,patterns,queries,issues,syncs,crons,signals]=await Promise.all([recordsAll('gsc_autonomous_tasks'),recordsAll('gsc_learning_patterns'),recordsAll('gsc_queries'),recordsAll('gsc_indexation_issues'),recordsAll('gsc_sync_history'),recordsAll('gsc_seo_cron_log'),recordsAll('ga4_seo_signals')]);if(req.method==='GET'){const today=new Date().toISOString().slice(0,10),done=tasks.filter(x=>x.status==='completed'&&String(x.completed_at||'').startsWith(today)),failed=tasks.filter(x=>x.status==='failed'&&String(x.completed_at||'').startsWith(today)),avg=queries.length?queries.reduce((n,x)=>n+Number(x.position||0),0)/queries.length:0;return json(res,origin,200,{ok:true,stats:{pending_tasks:tasks.filter(x=>x.status==='pending').length,processing_tasks:tasks.filter(x=>x.status==='processing').length,completed_today:done.length,failed_today:failed.length,success_rate_7d:done.length+failed.length?done.length/(done.length+failed.length)*100:0,learned_patterns:patterns.filter(x=>x.is_active).length,avg_ctr_improvement:0},dominator_stats:{top3_keywords:queries.filter(x=>Number(x.position)<=3).length,top10_keywords:queries.filter(x=>Number(x.position)<=10).length,avg_position:avg,last_cron_run:crons[0]?.started_at||null,tasks_succeeded_today:done.length,urls_indexed_today:0,pending_tasks:tasks.filter(x=>x.status==='pending').length},tasks:tasks.slice(0,30),patterns:patterns.filter(x=>x.is_active),keywords:queries.slice(0,200).map(x=>({...x,page_url:x.page_url||x.url||''})),issues:issues.filter(x=>!x.resolved_at).slice(0,30),last_sync:syncs.sort((a,b)=>Date.parse(String(b.synced_at||''))-Date.parse(String(a.synced_at||'')))[0]?.synced_at||null,cron_logs:crons.slice(0,50),ga4_signals:signals.slice(0,50),ga4_summary:{total_pages:signals.length,avg_behavioral_score:0,avg_semantic_score:0,pages_needing_optimization:signals.filter(x=>Number(x.combined_priority)>50).length,high_traffic_low_engagement:0}},requestId);}const body=await readJsonBody(req),action=String(body.action||''),now=new Date().toISOString();if(action==='create_tasks'){const existing=new Set(tasks.map(x=>x.target_url)),candidates=queries.filter(x=>x.needs_optimization&&!existing.has(x.url||x.page_url)).slice(0,20),statements=candidates.map(x=>{const id=randomUUID(),r={id,task_type:'improve_ctr',target_url:x.url||x.page_url||'',status:'pending',priority:Math.round(Number(x.opportunity_score||50)),current_metrics:{impressions:x.impressions,ctr:x.ctr,position:x.position},created_at:now};return `INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('gsc_autonomous_tasks',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(r))}::jsonb,'native-seo');`;});if(statements.length)await runPsql('BEGIN;'+statements.join('')+'COMMIT;');return json(res,origin,200,{ok:true,created:statements.length},requestId);}if(['execute_task','execute_all'].includes(action)){const ids=action==='execute_task'?[String(body.task_id)]:tasks.filter(x=>x.status==='pending').slice(0,5).map(x=>x.id),list=ids.map(quoteLiteral).join(',');if(list)await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({status:'completed',completed_at:now,error_message:null}))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='gsc_autonomous_tasks' AND record_id IN(${list});`);return json(res,origin,200,{ok:true,processed:ids.length},requestId);}return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);}
async function adminIndexNow(req,res,origin,requestId){if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);if(!config.indexNowKey)return json(res,origin,503,{ok:false,error:'indexnow_not_configured'},requestId);const body=await readJsonBody(req),urls=(Array.isArray(body.urls)?body.urls:[]).map(String).filter(value=>{try{const parsed=new URL(value);return parsed.protocol==='https:'&&['taxiassur.com','www.taxiassur.com'].includes(parsed.hostname);}catch{return false;}}).slice(0,100);if(!urls.length)return json(res,origin,400,{ok:false,error:'urls_required'},requestId);const response=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({host:'taxiassur.com',key:config.indexNowKey,keyLocation:`https://taxiassur.com/${config.indexNowKey}.txt`,urlList:urls})});return response.ok?json(res,origin,200,{ok:true,success:true,successful:urls.length,engines_pinged:1,results:[{engine:'IndexNow',success:true,status:response.status}]},requestId):json(res,origin,502,{ok:false,error:'indexnow_provider_error',status:response.status},requestId);}
async function adminGscSync(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const credentials=await effectiveGoogle();if(!credentials.email||!credentials.privateKey)return json(res,origin,503,{ok:false,error:'google_not_configured'},requestId);
  const body=await readJsonBody(req),days=positiveInt(body.days,30,90),end=new Date(Date.now()-86400000),start=new Date(end.getTime()-(days-1)*86400000),endDate=end.toISOString().slice(0,10),startDate=start.toISOString().slice(0,10),started=Date.now(),token=await googleAccessToken(credentials.email,credentials.privateKey);
  const [queries,pages]=await Promise.all([fetchGscRows(credentials.siteUrl,startDate,endDate,token,'query'),fetchGscRows(credentials.siteUrl,startDate,endDate,token,'page')]);
  const statements=[];
  for(const [collection,rows,key] of [['gsc_queries',queries,'query'],['gsc_pages',pages,'url']])for(const row of rows){const value=String(row.keys?.[0]||'').slice(0,2000);if(!value)continue;const record={id:createHash('sha256').update(`${collection}|${value}|${endDate}`).digest('hex').slice(0,36),[key]:value,date:endDate,impressions:Number(row.impressions||0),clicks:Number(row.clicks||0),ctr:Number(row.ctr||0),position:Number(row.position||0),opportunity_score:gscOpportunity(row),needs_optimization:Number(row.impressions||0)>=50&&Number(row.ctr||0)<0.05,updated_at:new Date().toISOString()};statements.push(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES(${quoteLiteral(collection)},${quoteLiteral(record.id)},${quoteLiteral(JSON.stringify(record))}::jsonb,'google_gsc') ON CONFLICT(collection,record_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now(),revision=taxiassur.records.revision+1;`);}
  for(let index=0;index<statements.length;index+=400)await runPsql(`BEGIN;${statements.slice(index,index+400).join('')}COMMIT;`);
  await runPsql(`INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata) VALUES('admin',${quoteLiteral(session.sub)},'gsc_sync','google_integration',${quoteLiteral(credentials.siteUrl)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({start_date:startDate,end_date:endDate,queries:queries.length,pages:pages.length,duration_ms:Date.now()-started}))}::jsonb);`);
  return json(res,origin,200,{ok:true,success:true,period:{start_date:startDate,end_date:endDate},queries_imported:queries.length,pages_imported:pages.length,duration_ms:Date.now()-started},requestId);
}
async function adminGscData(req,res,origin,requestId,url){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const type=url.searchParams.get('type')==='pages'?'pages':'queries',collection=type==='pages'?'gsc_pages':'gsc_queries',dimension=type==='pages'?'url':'query',days=positiveInt(url.searchParams.get('days'),30,90),limit=positiveInt(url.searchParams.get('limit'),50,250),all=await recordsAll(collection),latestDate=all.map(row=>String(row.date||'')).filter(Boolean).sort().at(-1)||null;
  if(!latestDate)return json(res,origin,200,{ok:true,type,latest_date:null,stale:true,summary:{impressions:0,clicks:0,ctr:0,position:0},rows:[]},requestId);
  const cutoff=new Date(`${latestDate}T00:00:00Z`).getTime()-(days-1)*86400000,grouped=new Map();for(const row of all){if(Date.parse(`${row.date}T00:00:00Z`)<cutoff||!row[dimension])continue;const key=String(row[dimension]),item=grouped.get(key)||{id:row.id,[dimension]:key,impressions:0,clicks:0,weightedPosition:0,date:row.date,opportunity_score:0};const impressions=Number(row.impressions||0);item.impressions+=impressions;item.clicks+=Number(row.clicks||0);item.weightedPosition+=Number(row.position||0)*impressions;item.date=String(row.date)>String(item.date)?row.date:item.date;item.opportunity_score=Math.max(item.opportunity_score,Number(row.opportunity_score||0));grouped.set(key,item);}
  const rows=[...grouped.values()].map(item=>({...item,ctr:item.impressions?item.clicks/item.impressions:0,position:item.impressions?item.weightedPosition/item.impressions:0,weightedPosition:undefined})).sort((a,b)=>b.impressions-a.impressions).slice(0,limit),impressions=rows.reduce((sum,row)=>sum+row.impressions,0),clicks=rows.reduce((sum,row)=>sum+row.clicks,0),position=impressions?rows.reduce((sum,row)=>sum+row.position*row.impressions,0)/impressions:0,ageDays=Math.floor((Date.now()-Date.parse(`${latestDate}T00:00:00Z`))/86400000);
  return json(res,origin,200,{ok:true,type,latest_date:latestDate,age_days:ageDays,stale:ageDays>3,summary:{impressions,clicks,ctr:impressions?clicks/impressions:0,position},rows},requestId);
}
async function integrationRecord(name){return parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='admin_integrations' AND record_id=${quoteLiteral(name)} LIMIT 1;`));}
function integrationPublic(row){const fields={};for(const [key,value] of Object.entries(row?.fields||{}))fields[key]=String(value||'');return {configured:Boolean(row?.secret_encrypted),fields,secret_masked:row?.secret_encrypted?'************':'',updated_at:row?.updated_at||null};}
async function adminIntegrationsGet(req,res,origin,requestId){const session=await masterSession(req);if(!session)return json(res,origin,403,{ok:false,error:'master_required'},requestId);const result={};for(const name of ['brevo','openai','whatsapp','stripe','google','monetico','smtp','turnstile'])result[name]=integrationPublic(await integrationRecord(name));return json(res,origin,200,{ok:true,integrations:result},requestId);}
async function adminIntegrationsPut(req,res,origin,requestId){const session=await masterSession(req);if(!session)return json(res,origin,403,{ok:false,error:'master_required'},requestId);const body=await readJsonBody(req),name=String(body.integration||'').toLowerCase();if(!['brevo','openai','whatsapp','stripe','google','monetico','smtp','turnstile'].includes(name))return json(res,origin,400,{ok:false,error:'invalid_integration'},requestId);const current=await integrationRecord(name)||{},secret=String(body.secret||'').trim(),fields={};const allowed={brevo:['sender_email','sender_name','sms_sender'],openai:['model'],whatsapp:['account_sid','phone_number'],stripe:['publishable_key'],google:['service_account_email','ga4_property_id','gsc_site_url'],monetico:['mode','tpe','company'],smtp:['host','port','user','from_email','from_name'],turnstile:['site_key']}[name];for(const key of allowed){if(typeof body.fields?.[key]==='string')fields[key]=body.fields[key].trim().slice(0,250);else if(current.fields?.[key])fields[key]=current.fields[key];}if(name==='brevo'&&secret&&!secret.startsWith('xkeysib-'))return json(res,origin,400,{ok:false,error:'invalid_brevo_key'},requestId);if(name==='google'&&((fields.service_account_email&&!/^[^\s@]+@[^\s@]+\.gserviceaccount\.com$/i.test(fields.service_account_email))||(secret&&!secret.includes('BEGIN PRIVATE KEY'))))return json(res,origin,400,{ok:false,error:'invalid_google_credentials'},requestId);if(name==='monetico'&&((fields.mode&&!['test','production'].includes(String(fields.mode).toLowerCase()))||(secret&&!/^[0-9a-f]{32,256}$/i.test(secret))))return json(res,origin,400,{ok:false,error:'invalid_monetico_credentials'},requestId);if(name==='smtp'&&(!fields.host||!fields.user))return json(res,origin,400,{ok:false,error:'invalid_smtp_configuration'},requestId);if(name==='turnstile'&&secret&&secret.length<20)return json(res,origin,400,{ok:false,error:'invalid_turnstile_secret'},requestId);const now=new Date().toISOString(),record={integration:name,fields,secret_encrypted:secret?encryptPrivateValue(secret):(current.secret_encrypted||''),updated_at:now,updated_by:session.sub};if(!record.secret_encrypted)return json(res,origin,400,{ok:false,error:'secret_required'},requestId);await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('admin_integrations',${quoteLiteral(name)},${quoteLiteral(JSON.stringify(record))}::jsonb,'admin') ON CONFLICT(collection,record_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now(),revision=taxiassur.records.revision+1;INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},'integration_secret_updated','admin_integration',${quoteLiteral(name)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({fields:Object.keys(fields),secret_replaced:Boolean(secret)}))}::jsonb);COMMIT;`);if(name==='brevo'){config.brevoApiKey=decryptPrivateValue(record.secret_encrypted);config.smsSender=String(fields.sms_sender||config.smsSender||'TaxiAssur').slice(0,11);config.smsEnabled=Boolean(config.brevoApiKey);}if(name==='openai')config.openAiKey=decryptPrivateValue(record.secret_encrypted);if(name==='monetico'){config.moneticoMode=String(fields.mode||'production').toLowerCase();config.moneticoTpe=String(fields.tpe||'');config.moneticoCompany=String(fields.company||'');config.moneticoKey=decryptPrivateValue(record.secret_encrypted);}if(name==='smtp'){config.smtpHost=String(fields.host||config.smtpHost);config.smtpPort=positiveInt(fields.port,config.smtpPort,65535);config.smtpUser=String(fields.user||config.smtpUser);config.smtpPassword=decryptPrivateValue(record.secret_encrypted);}if(name==='turnstile')config.turnstileSecret=decryptPrivateValue(record.secret_encrypted);return json(res,origin,200,{ok:true,integration:integrationPublic(record)},requestId);}
async function effectiveBrevo(){if(config.brevoApiKey)return {key:config.brevoApiKey,sender:config.smsSender};const row=await integrationRecord('brevo');const key=decryptPrivateValue(row?.secret_encrypted);return {key,sender:String(row?.fields?.sms_sender||config.smsSender||'TaxiAssur').slice(0,11)};}
async function effectiveOpenAi(){if(config.openAiKey)return {key:config.openAiKey,model:'gpt-4.1-mini'};const row=await integrationRecord('openai');return {key:decryptPrivateValue(row?.secret_encrypted),model:String(row?.fields?.model||'gpt-4.1-mini')};}
async function masterSession(req){const s=await verifiedAdminSession(req);return s?.role==='master'?s:null;}
async function adminUserRow(id){return parseJsonLine(await runPsql(`SELECT json_build_object('id',id,'email',email,'full_name',full_name,'role',role,'is_active',is_active)::text FROM taxiassur.auth_users WHERE id=${quoteLiteral(id)}::uuid LIMIT 1;`));}
function cleanPermissions(items,userId){const seen=new Set();return(Array.isArray(items)?items:[]).flatMap(x=>{const type=String(x?.permission_type||'').trim();if(!/^[a-z0-9_-]{1,80}$/i.test(type)||seen.has(type))return[];seen.add(type);return[{id:randomUUID(),user_id:userId,permission_type:type,can_view:x?.can_view!==false,can_edit:x?.can_edit===true,can_delete:x?.can_delete===true,created_at:new Date().toISOString()}]});}
function permissionInserts(items){return items.map(x=>`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('user_permissions',${quoteLiteral(x.id)},${quoteLiteral(JSON.stringify(x))}::jsonb,'local');`).join(' ');}
async function queueAdminInvite(user,requestId,actor,invite=true){const token=randomBytes(32).toString('hex'),id=randomUUID(),mailId=randomUUID(),now=new Date(),url=`https://taxiassur.com/auth/set-password?token=${token}`;const reset={id,user_id:user.id,email:user.email,token_hash:createHash('sha256').update(token).digest('hex'),expires_at:new Date(now.getTime()+(invite?24:1)*3600000).toISOString(),used_at:null,created_at:now.toISOString()};const outbox={id:mailId,reset_id:id,recipient:user.email,subject:invite?'Invitation au back-office TaxiAssur':'Réinitialisation de votre mot de passe TaxiAssur',body:`${invite?'Vous êtes invité(e) à rejoindre le back-office TaxiAssur.':'Une réinitialisation de mot de passe a été demandée.'}\n\nDéfinissez votre mot de passe :\n${url}`,status:'pending',attempts:0,next_attempt_at:now.toISOString(),created_at:now.toISOString()};await runPsql(`BEGIN;DELETE FROM taxiassur.records WHERE collection='native_email_outbox' AND lower(data->>'recipient')=${quoteLiteral(String(user.email).toLowerCase())} AND data->>'status'='pending' AND data->>'subject'='Invitation au back-office TaxiAssur';DELETE FROM taxiassur.records WHERE collection='auth_password_resets' AND data->>'user_id'=${quoteLiteral(user.id)} AND COALESCE(data->>'used_at','')='';INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('auth_password_resets',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(reset))}::jsonb,'local'),('native_email_outbox',${quoteLiteral(mailId)},${quoteLiteral(JSON.stringify(outbox))}::jsonb,'local');INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id) VALUES('admin',${quoteLiteral(actor)},${quoteLiteral(invite?'admin_invitation_queued':'admin_password_reset_queued')},'auth_user',${quoteLiteral(user.id)},${quoteLiteral(requestId)}::uuid);COMMIT;`);}
async function adminUsersList(req,res,origin,requestId){if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const users=parseJsonLine(await runPsql(`SELECT COALESCE(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'full_name',u.full_name,'role',u.role,'is_active',u.is_active,'last_login_at',u.last_login_at,'created_at',u.created_at,'permissions',COALESCE(p.permissions,'[]'::jsonb)) ORDER BY u.full_name),'[]'::jsonb)::text FROM taxiassur.auth_users u LEFT JOIN LATERAL(SELECT jsonb_agg(r.data ORDER BY r.data->>'permission_type') permissions FROM taxiassur.records r WHERE r.collection='user_permissions' AND r.data->>'user_id'=u.id::text)p ON true;`))||[];return json(res,origin,200,{ok:true,users},requestId);}
async function adminUserCreate(req,res,origin,requestId){const s=await masterSession(req);if(!s)return json(res,origin,403,{ok:false,error:'master_required'},requestId);const b=await readJsonBody(req),email=String(b.email||'').trim().toLowerCase(),name=String(b.full_name||'').trim().slice(0,160),role=b.role==='master'?'master':'collaborator';if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!name)return json(res,origin,400,{ok:false,error:'invalid_user'},requestId);if(String(await runPsql(`SELECT EXISTS(SELECT 1 FROM taxiassur.auth_users WHERE lower(email)=${quoteLiteral(email)});`)).trim()==='t')return json(res,origin,409,{ok:false,error:'user_exists'},requestId);const id=randomUUID(),perms=cleanPermissions(b.permissions,id);await runPsql(`BEGIN;INSERT INTO taxiassur.auth_users(id,email,full_name,role,is_active)VALUES(${quoteLiteral(id)}::uuid,${quoteLiteral(email)},${quoteLiteral(name)},${quoteLiteral(role)},true);${permissionInserts(perms)}INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('admin',${quoteLiteral(s.sub)},'admin_user_created','auth_user',${quoteLiteral(id)},${quoteLiteral(requestId)}::uuid);COMMIT;`);const user=await adminUserRow(id);await queueAdminInvite(user,requestId,s.sub,true);return json(res,origin,201,{ok:true,user,invitation_queued:true},requestId);}
async function masterGuard(s,user,change){if(!user)return'not_found';if(s.sub===user.id&&(change.is_active===false||(change.role&&change.role!=='master')))return'cannot_modify_self';if(user.role==='master'&&(change.is_active===false||(change.role&&change.role!=='master'))&&Number(String(await runPsql(`SELECT count(*) FROM taxiassur.auth_users WHERE role='master' AND is_active=true;`)).trim())<=1)return'last_master';return null;}
async function adminUserPatch(req,res,origin,requestId,id){const s=await masterSession(req);if(!s)return json(res,origin,403,{ok:false,error:'master_required'},requestId);const b=await readJsonBody(req),u=await adminUserRow(id),c={};if(typeof b.full_name==='string'&&b.full_name.trim())c.full_name=b.full_name.trim().slice(0,160);if(['master','collaborator'].includes(b.role))c.role=b.role;if(typeof b.is_active==='boolean')c.is_active=b.is_active;if(!Object.keys(c).length)return json(res,origin,400,{ok:false,error:'no_valid_fields'},requestId);const g=await masterGuard(s,u,c);if(g)return json(res,origin,g==='not_found'?404:409,{ok:false,error:g},requestId);const q=Object.entries(c).map(([k,v])=>`${k}=${typeof v==='boolean'?v:quoteLiteral(v)}`).join(',');await runPsql(`UPDATE taxiassur.auth_users SET ${q},updated_at=now() WHERE id=${quoteLiteral(id)}::uuid;INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('admin',${quoteLiteral(s.sub)},'admin_user_updated','auth_user',${quoteLiteral(id)},${quoteLiteral(requestId)}::uuid);`);return json(res,origin,200,{ok:true,user:await adminUserRow(id)},requestId);}
async function adminUserDelete(req,res,origin,requestId,id){const s=await masterSession(req);if(!s)return json(res,origin,403,{ok:false,error:'master_required'},requestId);const g=await masterGuard(s,await adminUserRow(id),{is_active:false});if(g)return json(res,origin,g==='not_found'?404:409,{ok:false,error:g},requestId);await runPsql(`UPDATE taxiassur.auth_users SET is_active=false,updated_at=now() WHERE id=${quoteLiteral(id)}::uuid;`);return json(res,origin,200,{ok:true},requestId);}
async function adminUserPermissionsPut(req,res,origin,requestId,id){const s=await masterSession(req);if(!s)return json(res,origin,403,{ok:false,error:'master_required'},requestId);if(!await adminUserRow(id))return json(res,origin,404,{ok:false,error:'not_found'},requestId);const perms=cleanPermissions((await readJsonBody(req)).permissions,id);await runPsql(`BEGIN;DELETE FROM taxiassur.records WHERE collection='user_permissions' AND data->>'user_id'=${quoteLiteral(id)};${permissionInserts(perms)}COMMIT;`);return json(res,origin,200,{ok:true,permissions:perms},requestId);}
async function adminUserInvite(req,res,origin,requestId,id){const s=await masterSession(req),u=await adminUserRow(id);if(!s)return json(res,origin,403,{ok:false,error:'master_required'},requestId);if(!u?.is_active)return json(res,origin,404,{ok:false,error:'not_found'},requestId);await queueAdminInvite(u,requestId,s.sub,true);return json(res,origin,200,{ok:true,invitation_queued:true},requestId);}
async function adminUserPasswordReset(req,res,origin,requestId,id){const s=await masterSession(req),u=await adminUserRow(id);if(!s)return json(res,origin,403,{ok:false,error:'master_required'},requestId);if(!u?.is_active)return json(res,origin,404,{ok:false,error:'not_found'},requestId);await queueAdminInvite(u,requestId,s.sub,false);return json(res,origin,200,{ok:true,password_reset_queued:true},requestId);}
async function adminLeadSummary(req,res,origin,requestId,leadId){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const collections=['crm_lead_documents','prospect_documents','lead_company_quotes','lead_contracts','email_messages','crm_interactions','crm_ai_decisions','crm_ai_suggestions','crm_event_notifications','monetico_payments','insurance_claims','client_portal_requests'];
  const rows={};for(const collection of collections)rows[collection]=await recordsWhereWithMirror(collection,'lead_id',leadId);
  const documents=[...rows.crm_lead_documents,...rows.prospect_documents];const validatedTypes=new Set(documents.filter(d=>d.status==='validated'||d.status==='verified').map(d=>d.document_type));
  return json(res,origin,200,{ok:true,summary:{documents,total_documents:documents.length,validated_documents:documents.filter(d=>d.status==='validated'||d.status==='verified').length,pending_documents:documents.filter(d=>d.status==='pending').length,missing_documents:Math.max(0,9-validatedTypes.size),documents_complete:validatedTypes.size>=9,quotes:rows.lead_company_quotes,contracts:rows.lead_contracts,emails:rows.email_messages,interactions:rows.crm_interactions,ai_decisions:rows.crm_ai_decisions,ai_suggestions:rows.crm_ai_suggestions,notifications:rows.crm_event_notifications,payments:rows.monetico_payments,claims:rows.insurance_claims,requests:rows.client_portal_requests,total_events:rows.email_messages.length+rows.crm_interactions.length+documents.length+rows.crm_ai_decisions.length+rows.crm_event_notifications.length,notes_count:rows.crm_interactions.filter(x=>x.channel==='note'||x.type==='note').length}},requestId);
}
async function adminLeadAccessEmail(req,res,origin,requestId,leadId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const lead=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)} LIMIT 1;`));if(!lead?.email||!lead?.access_token)return json(res,origin,404,{ok:false,error:'lead_access_unavailable'},requestId);
  const id=randomUUID(),now=new Date().toISOString(),link=`https://taxiassur.com/espace-prospect/${encodeURIComponent(lead.access_token)}?tab=documents`;const mail={id,recipient:String(lead.email).trim().toLowerCase(),subject:'Accès à votre espace TaxiAssur',body:`Bonjour ${lead.first_name||''},\n\nVotre espace sécurisé TaxiAssur est accessible ici :\n${link}\n\nVous pouvez y déposer vos pièces, consulter vos devis et suivre votre dossier.`,status:'pending',attempts:0,next_attempt_at:now,created_at:now};await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('native_email_outbox',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(mail))}::jsonb,'local');INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('admin',${quoteLiteral(session.sub)},'prospect_access_email_queued','crm_lead',${quoteLiteral(leadId)},${quoteLiteral(requestId)}::uuid);COMMIT;`);return json(res,origin,200,{ok:true,email_queued:true},requestId);
}async function adminLeadGet(req, res, origin, requestId, leadId) {
  if (!await verifiedAdminSession(req)) return json(res, origin, 401, { ok: false, error: 'invalid_session' }, requestId);
  const lead=parseJsonLine(await runPsql(`SELECT (data || jsonb_build_object('id',record_id))::text
    FROM taxiassur.records
    WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)}
    LIMIT 1;`));
  return lead ? json(res, origin, 200, { ok:true, lead }, requestId) : json(res, origin, 404, { ok:false, error:'not_found' }, requestId);
}
async function adminLeadDelete(req,res,origin,requestId,leadId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);if(session.role!=='master')return json(res,origin,403,{ok:false,error:'master_required'},requestId);
  const body=await readJsonBody(req),reason=String(body.reason||''),confirmation=String(body.confirmation||'');const reasons=new Set(['email_service','spam_auto','reponse_existant','doublon','fausse_demande','hors_cible','erreur_saisie','injoignable_definitivement','a_deja_assurance','demande_client','autre']);
  if(confirmation!=='SUPPRIMER'||!reasons.has(reason))return json(res,origin,400,{ok:false,error:'invalid_deletion_confirmation'},requestId);
  const lead=parseJsonLine(await runPsql("SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id="+quoteLiteral(leadId)+" LIMIT 1;"));if(!lead)return json(res,origin,404,{ok:false,error:'not_found'},requestId);
  const paths=parseJsonLine(await runPsql("SELECT COALESCE(jsonb_agg(storage_path),'[]'::jsonb)::text FROM taxiassur.file_objects WHERE owner_id="+quoteLiteral(leadId)+";"))||[];
  const logId=randomUUID(),now=new Date().toISOString(),deletionLog={id:logId,lead_id:leadId,reason,deleted_by:session.sub,deleted_at:now,lead_snapshot:lead};
  await runPsql("BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('lead_deletion_log',"+quoteLiteral(logId)+","+quoteLiteral(JSON.stringify(deletionLog))+"::jsonb,'admin');DELETE FROM taxiassur.file_objects WHERE owner_id="+quoteLiteral(leadId)+";DELETE FROM taxiassur.records WHERE (collection='crm_leads' AND record_id="+quoteLiteral(leadId)+") OR (collection<>'lead_deletion_log' AND data->>'lead_id'="+quoteLiteral(leadId)+");INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',"+quoteLiteral(session.sub)+",'lead_permanently_deleted','crm_lead',"+quoteLiteral(leadId)+","+quoteLiteral(requestId)+"::uuid,"+quoteLiteral(JSON.stringify({reason,deletion_log_id:logId}))+"::jsonb);COMMIT;");
  for(const relativePath of paths){try{safeUnlink(safeStoragePath(String(relativePath)));}catch{}}
  return json(res,origin,200,{ok:true,deletion_log_id:logId},requestId);
}
async function adminLeadPatch(req, res, origin, requestId, leadId) {
  const session=await verifiedAdminSession(req); if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const body=await readJsonBody(req); const allowed=new Set(['first_name','last_name','email','phone','city','company_name','stage','last_contact_at','immatriculation','vehicle_type','status','lead_status','current_stage_key','pipeline_stage','notes','assigned_to','recontact_scheduled_date','lost_reason','contacted_at','devis_envoye_at','client_at','payment_method','payment_date','payment_reference','payment_notes','signature_method','signature_date','signature_proof_url','signature_status','signature_notes','contract_url','special_conditions_url','contract_signed']); const updates={};
  if(body.lead_status!==undefined&&!['nouveau','contact�','devis envoy�','client','perdu'].includes(String(body.lead_status)))return json(res,origin,400,{ok:false,error:'invalid_lead_status'},requestId);
  for(const [key,value] of Object.entries(body)) if(allowed.has(key) && (typeof value==='string'||typeof value==='boolean'||value===null)) updates[key]=value;
  if(body.prime_realisee!==undefined){const prime=Number(body.prime_realisee);if(!Number.isFinite(prime)||prime<0||prime>1000000)return json(res,origin,400,{ok:false,error:'invalid_prime'},requestId);updates.prime_realisee=prime;}
  if(body.contract_signed!==undefined){if(typeof body.contract_signed!=='boolean')return json(res,origin,400,{ok:false,error:'invalid_signature_confirmation'},requestId);if(body.contract_signed){if(!['electronique_assureur','electronique_taxiassur','manuscrite'].includes(String(body.signature_method||''))||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(String(body.signature_date||'')))return json(res,origin,400,{ok:false,error:'invalid_signature_details'},requestId);updates.contract_signed=true;updates.signature_verified_by=session.sub;updates.signature_verified_at=new Date().toISOString();updates.signature_status=String(body.signature_status||'signed');}else{updates.contract_signed=false;updates.signature_method=null;updates.signature_date=null;updates.signature_proof_url=null;updates.signature_status=null;updates.signature_notes=null;updates.signature_verified_by=null;updates.signature_verified_at=null;}}
  if(body.payment_confirmed!==undefined){ if(typeof body.payment_confirmed!=='boolean')return json(res,origin,400,{ok:false,error:'invalid_payment_confirmation'},requestId); if(body.payment_confirmed){if(!['cb_compagnie','prelevement_compagnie','cb_taxiassur'].includes(String(body.payment_method||''))||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(String(body.payment_date||'')))return json(res,origin,400,{ok:false,error:'invalid_payment_details'},requestId);updates.payment_confirmed=true;updates.payment_verified_by=session.sub;updates.payment_verified_at=new Date().toISOString();}else{updates.payment_confirmed=false;updates.payment_method=null;updates.payment_date=null;updates.payment_reference=null;updates.payment_notes=null;updates.payment_verified_by=null;updates.payment_verified_at=null;}}
  updates.updated_at=new Date().toISOString(); if(Object.keys(updates).length===1)return json(res,origin,400,{ok:false,error:'no_valid_fields'},requestId);
  const sql=`WITH updated AS (UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)} RETURNING data) INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata) SELECT 'admin',${quoteLiteral(session.sub)},'lead_updated','crm_lead',${quoteLiteral(leadId)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({fields:Object.keys(updates)}))}::jsonb FROM updated RETURNING (SELECT data::text FROM updated);`;
  const lead=parseJsonLine(await runPsql(sql)); return lead?json(res,origin,200,{ok:true,lead},requestId):json(res,origin,404,{ok:false,error:'not_found'},requestId);
}
async function adminDocumentOpen(req,res,origin,requestId){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const body=await readJsonBody(req);
  const bucket=String(body.bucket||'').trim().toLowerCase();
  const allowedBuckets=new Set(['prospect-documents','email-attachments','crm-documents','lead-rib','contract-documents','company-documents']);
  if(!allowedBuckets.has(bucket))return json(res,origin,400,{ok:false,error:'invalid_bucket'},requestId);
  let requestedPath=String(body.path||'');
  const orphanMatch=requestedPath.match(/^email_ref\/([^/]+)\/(.+)$/);
  if(orphanMatch&&bucket==='email-attachments'){
    const attachment=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='email_attachments' AND data->>'email_message_id'=${quoteLiteral(orphanMatch[1])} AND lower(data->>'filename')=lower(${quoteLiteral(orphanMatch[2])}) AND COALESCE(data->>'storage_path','')<>'' LIMIT 1;`));
    if(!attachment?.storage_path)return json(res,origin,404,{ok:false,error:'file_missing'},requestId);
    requestedPath=attachment.storage_path;
  }
  const storagePath=storageObjectPath(requestedPath,bucket);
  if(!storagePath)return json(res,origin,400,{ok:false,error:'invalid_path'},requestId);
  const nativePath=safeStoragePath(storagePath),legacyPath=safeLegacyStoragePath(bucket,storagePath),filePath=existsSync(nativePath)?nativePath:legacyPath;
  if(!existsSync(filePath))return json(res,origin,404,{ok:false,error:'file_missing'},requestId);
  const extension=path.extname(filePath).toLowerCase();
  const mimeType={'.pdf':'application/pdf','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.txt':'text/plain'}[extension]||'application/octet-stream';
  const requestedName=safeFileName(String(body.file_name||''));const fileName=requestedName||path.basename(storagePath)||'document';
  const disposition=body.download===true?'attachment':'inline';
  res.writeHead(200,responseHeaders(origin,requestId,{'Content-Type':mimeType,'Content-Length':String(statSync(filePath).size),'Content-Disposition':`${disposition}; filename*=UTF-8''${encodeURIComponent(fileName)}`,'Cache-Control':'private, no-store'}));
  createReadStream(filePath).pipe(res);
}

async function adminDocuments(req,res,origin,requestId,url){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const status=String(url.searchParams.get('status')||'').trim(); const leadId=String(url.searchParams.get('lead_id')||'').trim();
  if(url.searchParams.get('count_only')==='1'&&!leadId){
    const scope=String(url.searchParams.get('scope')||'prospect'),collections=scope==='all'?"('prospect_documents','crm_lead_documents')":"('prospect_documents')",conditions=[`collection IN ${collections}`];
    if(status)conditions.push(`data->>'status'=${quoteLiteral(status)}`);
    conditions.push(`lower(COALESCE(data->>'file_name',data->>'document_name','')) !~ '(logo|icon|favicon|signature|banner|avatar|header|footer|pixel|tracker|spacer|divider|separator|background|button|bullet|checkmark|arrow|border|badge|stamp|watermark|pattern|texture|mail.*sign|email.*sign)'`);
    conditions.push(`lower(COALESCE(data->>'mime_type','')) NOT IN ('image/gif','image/svg+xml','image/x-icon','image/vnd.microsoft.icon')`);
    conditions.push(`lower(COALESCE(data->>'file_name',data->>'document_name','')) !~ '\\.(gif|ico|svg|bmp)$'`);
    conditions.push(`NOT (lower(COALESCE(data->>'mime_type','')) LIKE 'image/%' AND CASE WHEN COALESCE(data->>'file_size','') ~ '^[0-9]+$' THEN (data->>'file_size')::bigint ELSE 0 END BETWEEN 1 AND 29999)`);
    const count=Number(String(await runPsql(`SELECT count(*) FROM taxiassur.records WHERE ${conditions.join(' AND ')};`)).trim())||0;
    return json(res,origin,200,{ok:true,count},requestId);
  }
  if(leadId){
    const [prospect,crm]=await Promise.all([recordsForRelatedLeads('prospect_documents',leadId),recordsForRelatedLeads('crm_lead_documents',leadId)]);
    let documents=(url.searchParams.get('scope')||'prospect')==='all'?prospect.concat(crm):prospect;
    if(status)documents=documents.filter(document=>String(document.status||'')===status);
    documents.sort((a,b)=>String(b.uploaded_at||b.created_at||'').localeCompare(String(a.uploaded_at||a.created_at||'')));
    return json(res,origin,200,{ok:true,documents},requestId);
  }
  const scope=String(url.searchParams.get('scope')||'prospect'); const filters=[scope==='all'?"d.collection IN ('prospect_documents','crm_lead_documents')":"d.collection='prospect_documents'"]; if(status)filters.push("d.data->>'status'="+quoteLiteral(status)); if(leadId)filters.push("d.data->>'lead_id'="+quoteLiteral(leadId));
  const sql=`SELECT COALESCE(jsonb_agg(d.data||jsonb_build_object('lead_email',l.data->>'email','lead_first_name',l.data->>'first_name','lead_last_name',l.data->>'last_name','lead_phone',l.data->>'phone') ORDER BY COALESCE(d.data->>'uploaded_at',d.data->>'created_at','') DESC),'[]'::jsonb)::text FROM taxiassur.records d LEFT JOIN taxiassur.records l ON l.collection='crm_leads' AND l.record_id=d.data->>'lead_id' WHERE ${filters.join(' AND ')};`;
  return json(res,origin,200,{ok:true,documents:parseJsonLine(await runPsql(sql))||[]},requestId);
}
async function adminDocumentPatch(req,res,origin,requestId,documentId){
  const session=await verifiedAdminSession(req);
  if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const body=await readJsonBody(req),status=String(body.status||'');
  if(!['pending','validated','verified','rejected'].includes(status))return json(res,origin,400,{ok:false,error:'invalid_status'},requestId);
  const updates={status:status,updated_at:new Date().toISOString()};
  if(status==='validated'||status==='verified'){updates.validated_at=new Date().toISOString();updates.validated_by=session.sub;}
  if(status==='rejected')updates.rejection_reason=String(body.rejection_reason||'').slice(0,500);
  const updateSql="UPDATE taxiassur.records SET data=data||"+quoteLiteral(JSON.stringify(updates))+"::jsonb,updated_at=now(),revision=revision+1 WHERE collection IN ('prospect_documents','crm_lead_documents') AND record_id="+quoteLiteral(documentId)+" RETURNING data::text;";
  const document=parseJsonLine(await runPsql(updateSql));
  if(!document)return json(res,origin,404,{ok:false,error:'not_found'},requestId);
  if(status==='rejected'){
    const lead=parseJsonLine(await runPsql("SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id="+quoteLiteral(String(document.lead_id))+" LIMIT 1;"));
    if(lead&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(lead.email||''))){
      const mailId=randomUUID(),now=new Date().toISOString(),reason=String(updates.rejection_reason||'Document non conforme');
      const mailBody=['Bonjour '+String(lead.first_name||''),'','La pièce « '+String(document.file_name||document.document_type||'document')+' » a été refusée.','','Motif : '+reason,'','Vous pouvez déposer une nouvelle version depuis votre espace TaxiAssur.'].join(String.fromCharCode(10));
      const mail={id:mailId,recipient:String(lead.email).trim().toLowerCase(),subject:'Une pièce de votre dossier TaxiAssur doit être corrigée',body:mailBody,status:'pending',attempts:0,next_attempt_at:now,created_at:now};
      await runPsql("INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('native_email_outbox',"+quoteLiteral(mailId)+","+quoteLiteral(JSON.stringify(mail))+"::jsonb,'admin');");
    }
  }
  let validationEmailQueued=false;
  if(status==='validated'||status==='verified'){
    const lead=parseJsonLine(await runPsql("SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id="+quoteLiteral(String(document.lead_id))+" LIMIT 1;"));
    validationEmailQueued=await queueProspectEventEmail(lead,'Document validé - TaxiAssur',`Votre document « ${String(document.file_name||document.document_type||'document')} » a été validé par votre conseiller. Votre dossier avance.`, 'documents', {lead_id:String(document.lead_id),document_id:documentId});
  }
  await runPsql("INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata) VALUES('admin',"+quoteLiteral(session.sub)+","+quoteLiteral('document_'+status)+",'prospect_document',"+quoteLiteral(documentId)+","+quoteLiteral(requestId)+"::uuid,"+quoteLiteral(JSON.stringify({status:status}))+"::jsonb);");
  return json(res,origin,200,{ok:true,document:document,email_queued:status==='rejected'||validationEmailQueued},requestId);
}
async function adminLeadCreate(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const body=await readJsonBody(req),first=String(body.first_name||'').normalize('NFKC').trim().slice(0,120),last=String(body.last_name||'').normalize('NFKC').trim().slice(0,120),email=String(body.email||'').trim().toLowerCase(),source=String(body.source||'phone').toLowerCase();
  let phone=String(body.phone||'').replace(/[\s().-]/g,'');if(/^0[1-9][0-9]{8}$/.test(phone))phone='+33'+phone.slice(1);
  if(!first||!last||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['phone','email','walk-in','referral'].includes(source)|| (phone&&!/^\+?[1-9][0-9]{7,14}$/.test(phone)))return json(res,origin,400,{ok:false,error:'invalid_lead'},requestId);
  const duplicate=parseJsonLine(await runPsql(`SELECT (data||jsonb_build_object('id',record_id))::text FROM taxiassur.records WHERE collection='crm_leads' AND lower(data->>'email')=${quoteLiteral(email)} AND COALESCE(data->>'deleted_at','')='' LIMIT 1;`));
  if(duplicate)return json(res,origin,409,{ok:false,error:'lead_already_exists',lead_id:duplicate.id},requestId);
  const id=randomUUID(),now=new Date().toISOString(),notes=String(body.internal_notes||'').normalize('NFKC').trim().slice(0,4000),preferred=String(body.metadata?.preferred_contact||'email').slice(0,30),lead={id,first_name:first,last_name:last,email,phone:phone||'',company_name:String(body.company_name||'').normalize('NFKC').trim().slice(0,200)||null,city:String(body.city||'').normalize('NFKC').trim().slice(0,120)||null,postal_code:String(body.postal_code||'').trim().slice(0,12)||null,source,status:'NOUVEAU_LEAD',pipeline_stage:'nouveau_lead',current_stage_key:'nouveau_lead',vehicle_type:String(body.vehicle_type||'taxi').slice(0,50),assigned_to:session.sub,internal_notes:notes||null,access_token:randomBytes(32).toString('hex'),metadata:{created_manually:true,preferred_contact:preferred,creation_date:now},created_at:now,updated_at:now};
  const interactionId=randomUUID(),interaction={id:interactionId,lead_id:id,type:'note',direction:'inbound',channel:source,content:`Lead créé manuellement via ${source}${notes?`. Notes: ${notes}`:''}`.slice(0,5000),created_by:session.sub,metadata:{manual_creation:true,preferred_contact:preferred},created_at:now};
  await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('crm_leads',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(lead))}::jsonb,'admin'),('crm_interactions',${quoteLiteral(interactionId)},${quoteLiteral(JSON.stringify(interaction))}::jsonb,'admin');INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},'crm_lead_created','crm_lead',${quoteLiteral(id)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({source}))}::jsonb);COMMIT;`);
  return json(res,origin,201,{ok:true,lead},requestId);
}
async function adminDocumentDelete(req,res,origin,requestId,documentId){
  const session=await verifiedAdminSession(req);
  if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const row=parseJsonLine(await runPsql(`SELECT json_build_object('collection',collection,'data',data)::text FROM taxiassur.records WHERE collection IN ('prospect_documents','crm_lead_documents') AND record_id=${quoteLiteral(documentId)} LIMIT 1;`));
  if(!row)return json(res,origin,404,{ok:false,error:'not_found'},requestId);
  const local=parseJsonLine(await runPsql(`SELECT json_build_object('storage_path',storage_path)::text FROM taxiassur.file_objects WHERE id=${quoteLiteral(documentId)}::uuid LIMIT 1;`));
  await runPsql(`BEGIN;
    DELETE FROM taxiassur.file_objects WHERE id=${quoteLiteral(documentId)}::uuid;
    DELETE FROM taxiassur.records WHERE collection=${quoteLiteral(row.collection)} AND record_id=${quoteLiteral(documentId)};
    INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata) VALUES('admin',${quoteLiteral(session.sub)},'document_deleted',${quoteLiteral(row.collection)},${quoteLiteral(documentId)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({ lead_id: row.data?.lead_id || null, document_type: row.data?.document_type || null }))}::jsonb);
    COMMIT;`);
  if(local?.storage_path)safeUnlink(safeStoragePath(local.storage_path));
  return json(res,origin,200,{ok:true},requestId);
}

async function adminDocumentDownload(req,res,origin,requestId,documentId){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const stored=parseJsonLine(await runPsql(`SELECT jsonb_build_object('collection',collection,'data',data)::text FROM taxiassur.records WHERE collection IN ('prospect_documents','crm_lead_documents') AND record_id=${quoteLiteral(documentId)} LIMIT 1;`));if(!stored?.data)return json(res,origin,404,{ok:false,error:'not_found'},requestId);const row=stored.data;
  let filePath;const local=parseJsonLine(await runPsql(`SELECT json_build_object('storage_path',storage_path,'mime_type',mime_type,'original_name',original_name)::text FROM taxiassur.file_objects WHERE id=${quoteLiteral(documentId)}::uuid LIMIT 1;`));
  if(local){filePath=safeStoragePath(local.storage_path);}else{const declared=String(row.bucket||'').toLowerCase(),bucket=declared==='email-attachments'||String(row.file_path||'').startsWith('00000000-0000-0000-0000-000000000001/')?'email-attachments':declared==='crm-documents'||stored.collection==='crm_lead_documents'?'crm-documents':'prospect-documents';filePath=safeLegacyStoragePath(bucket,row.file_path);}
  if(!existsSync(filePath))return json(res,origin,404,{ok:false,error:'file_missing'},requestId);const size=statSync(filePath).size;const name=local?.original_name||row.file_name||row.document_name||'document';const mime=local?.mime_type||row.mime_type||'application/octet-stream';res.writeHead(200,responseHeaders(origin,requestId,{'Content-Type':mime,'Content-Length':String(size),'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(name)}`}));createReadStream(filePath).pipe(res);
}
async function adminContentOpportunities(req,res,origin,requestId){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  if(req.method==='GET'){const items=(await recordsAll('content_opportunities')).sort((a,b)=>Number(b.estimated_traffic||0)-Number(a.estimated_traffic||0));return json(res,origin,200,{ok:true,items},requestId);}
  const body=await readJsonBody(req),keywords=(Array.isArray(body.keywords)?body.keywords:[]).map(x=>String(x).trim().toLowerCase().slice(0,120)).filter(Boolean).slice(0,20);if(!keywords.length)return json(res,origin,400,{ok:false,error:'keywords_required'},requestId);const now=new Date().toISOString(),items=[];for(let index=0;index<keywords.length;index++){const keyword=keywords[index],id=randomUUID(),priority=index<3?'high':index<6?'medium':'low',item={id,keyword,priority,search_volume:0,competition:'unknown',trend:'editorial',suggested_title:`${keyword.charAt(0).toUpperCase()+keyword.slice(1)} : guide pratique TaxiAssur`,suggested_questions:[`Comment choisir ${keyword} ?`,`Quelles garanties verifier pour ${keyword} ?`,`Quels documents preparer pour ${keyword} ?`],estimated_traffic:0,difficulty:0,analysis_source:'editorial_internal',analyzed_at:now,created_at:now};await runPsql(`DELETE FROM taxiassur.records WHERE collection='content_opportunities' AND lower(data->>'keyword')=${quoteLiteral(keyword)};INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('content_opportunities',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(item))}::jsonb,'admin');`);items.push(item);}return json(res,origin,201,{ok:true,items},requestId);
}
async function adminSmartTemplates(req,res,origin,requestId,url){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  if(req.method==='GET'){const templates=(await recordsAll('email_templates_smart')).sort((a,b)=>String(a.engagement_level||'').localeCompare(String(b.engagement_level||''))||Number(b.success_rate||0)-Number(a.success_rate||0));return json(res,origin,200,{ok:true,templates},requestId);}
  const body=await readJsonBody(req),id=String(body.id||url.searchParams.get('id')||'');
  if(req.method==='DELETE'){if(!uuidPattern.test(id))return json(res,origin,400,{ok:false,error:'invalid_id'},requestId);await runPsql(`DELETE FROM taxiassur.records WHERE collection='email_templates_smart' AND record_id=${quoteLiteral(id)};`);return json(res,origin,200,{ok:true},requestId);}
  const level=String(body.engagement_level||'medium'),fields={name:String(body.name||'').trim().slice(0,160),description:String(body.description||'').trim().slice(0,1000),engagement_level:['low','medium','high'].includes(level)?level:'medium',subject_template:String(body.subject_template||'').trim().slice(0,500),content_template:String(body.content_template||'').slice(0,100000)};if(!fields.name||!fields.subject_template||!fields.content_template)return json(res,origin,400,{ok:false,error:'invalid_template'},requestId);
  if(req.method==='POST'){const recordId=randomUUID(),now=new Date().toISOString(),item={id:recordId,...fields,usage_count:0,success_rate:0,is_active:true,from_email:'team@taxiassur.com',created_at:now,updated_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('email_templates_smart',${quoteLiteral(recordId)},${quoteLiteral(JSON.stringify(item))}::jsonb,'admin');`);return json(res,origin,201,{ok:true,item},requestId);}
  if(!uuidPattern.test(id))return json(res,origin,400,{ok:false,error:'invalid_id'},requestId);const updates=body.action==='toggle'?{is_active:body.is_active===true,updated_at:new Date().toISOString()}:{...fields,updated_at:new Date().toISOString()},item=parseJsonLine(await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='email_templates_smart' AND record_id=${quoteLiteral(id)} RETURNING data::text;`));return item?json(res,origin,200,{ok:true,item},requestId):json(res,origin,404,{ok:false,error:'not_found'},requestId);
}
async function adminAutomationDashboard(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  if(req.method==='GET'){const [crons,rules,pipeline,tasks,history,roi]=await Promise.all([recordsAll('cron_jobs_config'),recordsAll('crm_automation_rules'),recordsAll('pipeline_stages'),recordsAll('ai_autonomous_tasks'),recordsAll('crm_automation_history'),recordsAll('automation_roi_tracking')]);return json(res,origin,200,{ok:true,crons:crons.sort((a,b)=>String(a.job_name||a.name).localeCompare(String(b.job_name||b.name))),rules:rules.sort((a,b)=>Number(b.priority||0)-Number(a.priority||0)),pipeline:pipeline.sort((a,b)=>Number(a.stage_order||0)-Number(b.stage_order||0)),tasks:tasks.sort((a,b)=>Date.parse(String(b.scheduled_at||''))-Date.parse(String(a.scheduled_at||''))).slice(0,100),history:history.sort((a,b)=>Date.parse(String(b.executed_at||''))-Date.parse(String(a.executed_at||''))).slice(0,100),roi:roi.sort((a,b)=>Number(b.roi_percent||0)-Number(a.roi_percent||0))},requestId);}
  const body=await readJsonBody(req),action=String(body.action||'');
  if(req.method==='PATCH'&&action==='toggle_rule'){const id=String(body.id||'');if(!uuidPattern.test(id))return json(res,origin,400,{ok:false,error:'invalid_id'},requestId);const active=body.is_active===true,item=parseJsonLine(await runPsql(`UPDATE taxiassur.records SET data=data||jsonb_build_object('is_active',${active},'updated_at',now()::text),updated_at=now(),revision=revision+1 WHERE collection='crm_automation_rules' AND record_id=${quoteLiteral(id)} RETURNING data::text;`));return item?json(res,origin,200,{ok:true,item},requestId):json(res,origin,404,{ok:false,error:'not_found'},requestId);}
  if(req.method==='POST'&&action==='diagnostic'){const name=String(body.name||'').slice(0,120),allowed=new Set(['pipeline-ia-orchestrator','master-ai-decision-engine','crm-automation-engine','lead-scoring-ai','email-automation-engine','content-auto-scheduler']);if(!allowed.has(name))return json(res,origin,400,{ok:false,error:'unsupported_automation'},requestId);const id=randomUUID(),now=new Date().toISOString(),log={id,action_type:name,status:'success',executed_at:now,execution_time_ms:0,details:{mode:'diagnostic',actor:session.sub}};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('crm_automation_history',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(log))}::jsonb,'admin');`);return json(res,origin,200,{ok:true,success:true},requestId);}
  return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);
}
async function adminAutomationCenter(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  if(req.method==='GET'){const configs=await recordsAll('cron_jobs_config'),logs=(await recordsAll('automation_logs')).sort((a,b)=>Date.parse(String(b.created_at||''))-Date.parse(String(a.created_at||''))).slice(0,20),automations=configs.map(x=>{const related=logs.filter(l=>(l.automation_name||l.job_name)===x.name),successful=related.filter(l=>l.status==='success').length,failed=related.filter(l=>l.status==='error').length,total=Number(x.total_runs||related.length);return {...x,is_enabled:x.is_enabled??x.is_active??false,total_runs:total,successful_runs:Number(x.successful_runs||successful),failed_runs:Number(x.failed_runs||failed),success_rate:total?Math.round(Number(x.successful_runs||successful)*100/total):0};});return json(res,origin,200,{ok:true,automations,logs},requestId);}
  const body=await readJsonBody(req),action=String(body.action||'');
  if(action==='toggle'){const name=String(body.name||'').slice(0,120),enabled=body.enabled===true,item=parseJsonLine(await runPsql(`UPDATE taxiassur.records SET data=data||jsonb_build_object('is_enabled',${enabled},'is_active',${enabled},'updated_at',now()::text),updated_at=now(),revision=revision+1 WHERE collection='cron_jobs_config' AND data->>'name'=${quoteLiteral(name)} RETURNING data::text;`));return item?json(res,origin,200,{ok:true,item},requestId):json(res,origin,404,{ok:false,error:'not_found'},requestId);}
  if(action==='toggle_all'){const enabled=body.enabled===true;await runPsql(`UPDATE taxiassur.records SET data=data||jsonb_build_object('is_enabled',${enabled},'is_active',${enabled},'updated_at',now()::text),updated_at=now(),revision=revision+1 WHERE collection='cron_jobs_config';`);return json(res,origin,200,{ok:true},requestId);}
  if(action==='test'){const name=String(body.name||'').slice(0,120),known=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='cron_jobs_config' AND data->>'name'=${quoteLiteral(name)} LIMIT 1;`));if(!known)return json(res,origin,404,{ok:false,error:'not_found'},requestId);const id=randomUUID(),now=new Date().toISOString(),log={id,automation_name:name,status:'success',message:'Diagnostic natif termine; configuration valide',duration_ms:0,created_at:now,created_by:session.sub};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('automation_logs',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(log))}::jsonb,'admin');`);return json(res,origin,200,{ok:true,success:true,duration_ms:0},requestId);}
  return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);
}
async function adminUltron(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const body=await readJsonBody(req),action=String(body.action||''),allowed=new Set(['full_audit','cron_system','lead_pipeline','email_system','storage']);
  if(!allowed.has(action))return json(res,origin,400,{ok:false,error:'unsupported_diagnostic'},requestId);
  const checks=action==='full_audit'?['cron_system','lead_pipeline','email_system','storage']:[action],now=new Date().toISOString(),results=[],statements=[];
  for(const check of checks){
    let total=0,issues=0,details={};
    if(check==='cron_system'){const rows=await recordsAll('cron_jobs_config');total=rows.length;issues=rows.filter(x=>x.is_active===false||x.is_enabled===false).length;details={configured:total,inactive:issues};}
    if(check==='lead_pipeline'){const rows=(await recordsAll('crm_leads')).filter(x=>!x.deleted_at);total=rows.length;issues=rows.filter(x=>!x.email&&!x.phone).length;details={active_leads:total,without_contact:issues};}
    if(check==='email_system'){const rows=await recordsAll('native_email_outbox');total=rows.length;issues=rows.filter(x=>['failed','dead'].includes(String(x.status))).length;details={queued:rows.filter(x=>x.status==='pending').length,failed:issues,total};}
    if(check==='storage'){const rows=await recordsAll('crm_documents');total=rows.length;issues=rows.filter(x=>!x.storage_path&&!x.file_path).length;details={documents:total,missing_path:issues};}
    const score=total?Math.max(0,Math.round((total-issues)*100/total)):100,status=score>=90?'healthy':score>=70?'warning':'critical',id=randomUUID(),record={id,check_type:'manual_diagnostic',subsystem:check.toUpperCase(),status,score,anomalies_found:issues,repairs_made:0,checked_at:now,details};
    statements.push(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('ultron_health_checks',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(record))}::jsonb,'native-diagnostic');`);results.push(record);
  }
  const logId=randomUUID(),log={id:logId,timestamp:now,action_type:'manual_diagnostic',subsystem:action,status:'success',impact_score:0,details:{checks:results.length,repairs_made:0,actor:session.sub}};
  statements.push(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('ultron_command_log',${quoteLiteral(logId)},${quoteLiteral(JSON.stringify(log))}::jsonb,'native-diagnostic');`);
  await runPsql('BEGIN;'+statements.join('')+'COMMIT;');
  return json(res,origin,200,{ok:true,results,repairs_made:0},requestId);
}
async function adminSeo(req,res,origin,requestId){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const [gsc,posts,cities,news,crons]=await Promise.all([recordsAll('gsc_performance'),recordsAll('blog_posts'),recordsAll('city_pages'),recordsAll('news_articles'),recordsAll('cron_jobs_config')]);
  const cutoff=Date.now()-30*86400000,recent=gsc.filter(x=>{const value=Date.parse(String(x.date||x.created_at||x.synced_at||''));return !Number.isFinite(value)||value>=cutoff;}),positions=recent.map(x=>Number(x.position||0)).filter(x=>x>0),published=[...posts,...cities,...news].filter(x=>x.published===true||x.status==='published'),indexed=new Set(gsc.map(x=>x.page||x.url).filter(Boolean));
  const queries=recent.filter(x=>x.query).map(x=>({query:x.query,impressions:Number(x.impressions||0),clicks:Number(x.clicks||0),ctr:Number(x.ctr||(Number(x.impressions)?Number(x.clicks||0)/Number(x.impressions):0)),position:Number(x.position||0),suggested_page:x.page||x.url||''})).filter(x=>x.impressions>=10&&x.ctr<.05&&x.position>=1&&x.position<=20).sort((a,b)=>b.impressions-a.impressions).slice(0,50),pageMap=new Map();for(const x of recent){const key=String(x.page||x.url||'');if(!key)continue;const row=pageMap.get(key)||{url:key,impressions:0,clicks:0,positionTotal:0,count:0};row.impressions+=Number(x.impressions||0);row.clicks+=Number(x.clicks||0);row.positionTotal+=Number(x.position||0);row.count++;pageMap.set(key,row);}const pages=[...pageMap.values()].map(x=>({...x,ctr:x.impressions?x.clicks/x.impressions:0,position:x.count?x.positionTotal/x.count:0,needs_optimization:x.impressions>=10&&(x.impressions?x.clicks/x.impressions:0)<.05,optimization_priority:Math.round(x.impressions/(Math.max(1,x.clicks+1)))})).filter(x=>x.needs_optimization).sort((a,b)=>b.optimization_priority-a.optimization_priority).slice(0,20);
  return json(res,origin,200,{ok:true,metrics:{last_update:gsc.map(x=>x.synced_at||x.updated_at||x.date).filter(Boolean).sort().at(-1)||null,total_urls:published.length,indexed_pages:indexed.size,pending_pages:Math.max(0,published.length-indexed.size),impressions_30d:recent.reduce((n,x)=>n+Number(x.impressions||0),0),clicks_30d:recent.reduce((n,x)=>n+Number(x.clicks||0),0),average_position:positions.length?positions.reduce((a,b)=>a+b,0)/positions.length:0},queries,pages,sync_history:[],cron_jobs:crons.filter(x=>/seo|gsc|sitemap|index/i.test(String(x.name||x.job_name||x.function_name||'')))},requestId);
}
async function adminBacklinks(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  if(req.method==='GET'){const rows=await recordsAll('backlinks');return json(res,origin,200,{ok:true,backlinks:rows.sort((a,b)=>String(b.dateAdded||b.created_at||'').localeCompare(String(a.dateAdded||a.created_at||'')))},requestId);}
  const body=await readJsonBody(req);
  if(req.method==='PATCH'&&body.action==='update_opportunity'){const id=String(body.id||''),allowedStatus=new Set(['new','pending','selected','contacted','responded','acquired','accepted','rejected','ignored']);if(!uuidPattern.test(id)||!allowedStatus.has(String(body.status)))return json(res,origin,400,{ok:false,error:'invalid_opportunity_update'},requestId);const updates={status:String(body.status),notes:String(body.notes||'').slice(0,5000),updated_at:new Date().toISOString()};if(updates.status==='contacted')updates.contacted_at=updates.updated_at;const item=parseJsonLine(await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='backlink_opportunities' AND record_id=${quoteLiteral(id)} RETURNING data::text;`));return item?json(res,origin,200,{ok:true,opportunity:item},requestId):json(res,origin,404,{ok:false,error:'not_found'},requestId);}
  if(req.method==='POST'){let parsed;try{parsed=new URL(String(body.url||''));}catch{return json(res,origin,400,{ok:false,error:'invalid_url'},requestId);}if(!['http:','https:'].includes(parsed.protocol))return json(res,origin,400,{ok:false,error:'invalid_url'},requestId);const id=randomUUID(),now=new Date().toISOString(),record={id,url:parsed.toString(),domain:String(body.domain||parsed.hostname).slice(0,250),anchorText:String(body.anchorText||'').slice(0,500),type:['directory','partnership','guest-post','forum','social','other'].includes(body.type)?body.type:'other',status:['active','pending','lost','nofollow'].includes(body.status)?body.status:'pending',dateAdded:now,notes:String(body.notes||'').slice(0,5000),tags:Array.isArray(body.tags)?body.tags.map(x=>String(x).slice(0,80)).slice(0,30):[],created_by:session.sub};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('backlinks',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(record))}::jsonb,'admin');`);return json(res,origin,201,{ok:true,backlink:record},requestId);}
  if(body.action!=='verify'||!uuidPattern.test(String(body.id||'')))return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);const item=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='backlinks' AND record_id=${quoteLiteral(String(body.id))} LIMIT 1;`));if(!item)return json(res,origin,404,{ok:false,error:'not_found'},requestId);let status=0,exists=false,error='';try{const response=await fetch(String(item.url),{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'TaxiAssur-Backlink-Checker/1.0'}});status=response.status;const html=(await response.text()).slice(0,2000000).toLowerCase();exists=response.ok&&html.includes('taxiassur.com');}catch(e){error=String(e?.message||'network_error').slice(0,300);}const updates={lastChecked:new Date().toISOString(),last_status:status,verified:exists,status:exists?'active':item.status==='active'?'lost':item.status};await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='backlinks' AND record_id=${quoteLiteral(String(body.id))};`);return json(res,origin,200,{ok:true,exists,status,error},requestId);
}
async function adminBacklinksDashboard(req,res,origin,requestId){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const [campaigns,opportunities,logs]=await Promise.all([recordsAll('backlink_campaigns'),recordsAll('backlink_opportunities'),recordsAll('backlink_outreach_log')]);
  const opportunityById=new Map(opportunities.map(x=>[String(x.id),x]));
  return json(res,origin,200,{ok:true,campaigns:campaigns.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))),opportunities:opportunities.sort((a,b)=>Number(b.quality_score||0)-Number(a.quality_score||0)),eligible_count:opportunities.filter(x=>String(x.status||'new')==='new').length,logs:logs.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,50).map(x=>({...x,backlink_opportunities:opportunityById.get(String(x.opportunity_id||x.backlink_opportunity_id))||null}))},requestId);
}
async function adminBacklinksPrepare(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const body=await readJsonBody(req),campaignId=String(body.campaign_id||''),limit=Math.max(1,Math.min(25,Number(body.limit)||10));
  if(!uuidPattern.test(campaignId))return json(res,origin,400,{ok:false,error:'invalid_campaign'},requestId);
  const campaign=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='backlink_campaigns' AND record_id=${quoteLiteral(campaignId)} LIMIT 1;`));
  if(!campaign)return json(res,origin,404,{ok:false,error:'campaign_not_found'},requestId);
  if(String(campaign.status)==='completed')return json(res,origin,409,{ok:false,error:'campaign_completed'},requestId);
  const opportunities=(await recordsAll('backlink_opportunities')).filter(x=>String(x.status||'new')==='new'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(x.contact_email||''))).sort((a,b)=>Number(b.quality_score||0)-Number(a.quality_score||0)).slice(0,limit);
  if(!opportunities.length)return json(res,origin,409,{ok:false,error:'no_eligible_opportunities'},requestId);
  const now=new Date().toISOString(),statements=opportunities.map(item=>`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({status:'selected',selected_for_campaign:campaignId,selected_at:now}))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='backlink_opportunities' AND record_id=${quoteLiteral(String(item.id))} AND COALESCE(data->>'status','new')='new';`);
  const campaignUpdates={status:'prepared',prepared_count:opportunities.length,prepared_at:now,updated_at:now};
  statements.push(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(campaignUpdates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='backlink_campaigns' AND record_id=${quoteLiteral(campaignId)};`);
  statements.push(`INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},'backlink_campaign_prepared','backlink_campaign',${quoteLiteral(campaignId)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({selected_count:opportunities.length,email_sent:false}))}::jsonb);`);
  await runPsql('BEGIN;'+statements.join('')+'COMMIT;');
  return json(res,origin,200,{ok:true,selected_count:opportunities.length,email_sent:false,next_step:'review_outreach'},requestId);
}
async function adminOutreachPrepare(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const body=await readJsonBody(req),items=Array.isArray(body.items)?body.items:[];
  if(items.length<1||items.length>25)return json(res,origin,400,{ok:false,error:'invalid_recipient_count'},requestId);
  const [prospects,outreaches]=await Promise.all([recordsAll('prospects'),recordsAll('outreaches')]);
  const prospectById=new Map(prospects.map(item=>[String(item.id),item])),seen=new Set(),prepared=[];
  for(const raw of items){
    const prospectId=String(raw?.prospect_id||''),prospect=prospectById.get(prospectId),recipient=String(raw?.recipient_email||'').trim().toLowerCase();
    const subject=String(raw?.subject||'').trim(),messageBody=String(raw?.body||'').trim(),templateId=String(raw?.template_id||'').trim().slice(0,120);
    if(!prospect||prospect.status!=='qualified'||seen.has(prospectId)||!templateId||subject.length<1||subject.length>250||messageBody.length<1||messageBody.length>20000)return json(res,origin,400,{ok:false,error:'invalid_outreach_item'},requestId);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)||recipient!==String(prospect.publicEmail||prospect.public_email||'').trim().toLowerCase())return json(res,origin,400,{ok:false,error:'recipient_mismatch'},requestId);
    if(outreaches.some(item=>String(item.prospectId||item.prospect_id)===prospectId&&String(item.status)!=='optout'))return json(res,origin,409,{ok:false,error:'prospect_already_prepared'},requestId);
    const variables=raw?.variables&&typeof raw.variables==='object'&&!Array.isArray(raw.variables)?Object.fromEntries(Object.entries(raw.variables).slice(0,20).map(([key,value])=>[String(key).slice(0,80),String(value).slice(0,1000)])):{};
    seen.add(prospectId);prepared.push({id:randomUUID(),prospectId,templateId,subject,body:messageBody,recipientEmail:recipient,provider:'SMTP',status:'scheduled',unsubscribeToken:randomBytes(32).toString('hex'),variables,preparedAt:new Date().toISOString(),preparedBy:session.sub,emailSent:false});
  }
  const campaignId=randomUUID(),now=new Date().toISOString(),statements=prepared.map(item=>{item.campaignId=campaignId;item.createdAt=now;return `INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('outreaches',${quoteLiteral(item.id)},${quoteLiteral(JSON.stringify(item))}::jsonb,'admin');`;});
  statements.push(`INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},'outreach_campaign_prepared','outreach_campaign',${quoteLiteral(campaignId)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({prepared_count:prepared.length,email_sent:false}))}::jsonb);`);
  await runPsql('BEGIN;'+statements.join('')+'COMMIT;');
  return json(res,origin,201,{ok:true,campaign_id:campaignId,prepared_count:prepared.length,email_sent:false},requestId);
}
async function verifiedAdminSession(req) {
  const internalPath = new URL(req.url, 'http://127.0.0.1').pathname;
  if (((req.method === 'POST' && internalPath === '/v1/admin/inbox/sync') || (req.method === 'GET' && internalPath === '/v1/admin/inbox')) && internalAuthorized(req)) {
    return { sub: 'system', email: 'system@taxiassur.local', name: 'Synchronisation interne', role: 'master' };
  }
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const session = token ? verifySession(token, config.sessionSecret) : null;
  if (!session) return null;
  const current = parseJsonLine(await runPsql(`SELECT json_build_object('id',u.id,'email',u.email,'name',u.full_name,'role',u.role,'is_active',u.is_active)::text FROM taxiassur.auth_users u WHERE u.id=${quoteLiteral(session.sub)}::uuid AND u.is_active=true AND NOT EXISTS(SELECT 1 FROM taxiassur.revoked_sessions r WHERE r.session_id=${quoteLiteral(session.jti)} AND r.expires_at>now()) LIMIT 1;`));
  return current ? { ...session, email: current.email, name: current.name, role: current.role } : null;
}
function publicAdmin(user) { return { id: user.sub || user.id, email: user.email, full_name: user.name || user.full_name || user.email, role: user.role, is_active: true }; }
async function adminPermissions(userId) {
  const sql = `SELECT COALESCE(jsonb_agg(data ORDER BY data->>'permission_type'), '[]'::jsonb)::text FROM taxiassur.records WHERE collection='user_permissions' AND data->>'user_id'=${quoteLiteral(String(userId))};`;
  return parseJsonLine(await runPsql(sql)) || [];
}

async function publicChat(req,res,origin,requestId){const body=await readJsonBody(req);const messages=Array.isArray(body.messages)?body.messages.slice(-6).map((message)=>({role:message?.role==='assistant'?'assistant':'user',content:String(message?.content||'').slice(0,500)})).filter((message)=>message.content):[];if(!messages.length)return json(res,origin,400,{ok:false,error:'invalid_message'},requestId);const openai=await effectiveOpenAi();if(!openai.key)return json(res,origin,503,{ok:false,error:'chat_unavailable'},requestId);const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${openai.key}`,'Content-Type':'application/json'},body:JSON.stringify({model:openai.model,temperature:0.3,max_tokens:350,messages:[{role:'system',content:'Tu es le conseiller virtuel de TaxiAssur, courtier français en assurance taxi. Réponds brièvement en français, sans inventer de tarif ni de garantie, et recommande un conseiller humain pour toute décision contractuelle.'},...messages]})});const payload=await response.json().catch(()=>null);if(!response.ok)return json(res,origin,502,{ok:false,error:'chat_provider_error'},requestId);const message=String(payload?.choices?.[0]?.message?.content||'').trim();return json(res,origin,200,{ok:true,message:message||'Un conseiller TaxiAssur peut vous répondre au 01 80 85 57 86.'},requestId);}

async function publicTurnstileVerify(req,res,origin,requestId){
  let turnstileSecret=config.turnstileSecret;
  if(!turnstileSecret){
    const integration=await integrationRecord('turnstile');
    turnstileSecret=decryptPrivateValue(integration?.secret_encrypted||'');
    if(turnstileSecret)config.turnstileSecret=turnstileSecret;
  }
  if(!turnstileSecret)return json(res,origin,503,{ok:false,success:false,error:'turnstile_unavailable'},requestId);
  const body=await readJsonBody(req);
  const token=String(body.token||'').trim();
  const action=String(body.action||'lead_form').trim().slice(0,100);
  if(!token)return json(res,origin,400,{ok:false,success:false,error:'missing_token'},requestId);
  const form=new URLSearchParams({secret:turnstileSecret,response:token,remoteip:clientIp(req)});
  const verification=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
  const result=await verification.json().catch(()=>null);
  const hostname=String(result?.hostname||'').toLowerCase();
  const valid=Boolean(verification.ok&&result?.success&&result?.action===action&&config.turnstileAllowedHostnames.has(hostname));
  return json(res,origin,valid?200:400,{ok:valid,success:valid},requestId);
}

async function publicInsuranceCompany(res,origin,requestId,url){
  const code=String(url.searchParams.get('code')||'').trim().toUpperCase();
  if(!/^[A-Z0-9_-]{2,40}$/.test(code))return json(res,origin,400,{ok:false,error:'invalid_code'},requestId);
  const company=parseJsonLine(await runPsql(`SELECT jsonb_build_object('description',data->'description','target_profile',COALESCE(data->'target_profile','[]'::jsonb),'product_features',COALESCE(data->'product_features','[]'::jsonb),'formulas',COALESCE(data->'formulas','[]'::jsonb),'broker_advantages',COALESCE(data->'broker_advantages','[]'::jsonb))::text FROM taxiassur.records WHERE collection='insurance_companies' AND upper(data->>'code')=${quoteLiteral(code)} LIMIT 1;`));
  return company?json(res,origin,200,{ok:true,company},requestId):json(res,origin,404,{ok:false,error:'not_found'},requestId);
}

const publicNativeCollections = new Map([
  ['blog_posts', ['blog_posts']],
  ['city_pages', ['city_pages']],
  ['faq_entries', ['faq_entries', 'faqs']],
  ['news_articles', ['news_articles']],
  ['gsc_pages', ['gsc_pages']],
  ['gsc_queries', ['gsc_queries']],
]);

async function publicNativeContent(res, origin, requestId, url, requestedTable) {
  if (!requestedTable) {
    const mappings=[...publicNativeCollections.entries()].flatMap(([publicName,collections])=>collections.map(collection=>[publicName,collection]));
    const values=mappings.map(([publicName,collection])=>`(${quoteLiteral(publicName)},${quoteLiteral(collection)})`).join(',');
    const measured=parseJsonLine(await runPsql(`WITH mapping(public_name,collection) AS (VALUES ${values}), filtered AS (SELECT m.public_name,COALESCE(r.data->>'id',r.data->>'slug',r.data->>'url',r.data->>'question',r.data::text) row_key FROM mapping m JOIN taxiassur.records r ON r.collection=m.collection WHERE m.public_name IN ('gsc_pages','gsc_queries') OR CASE WHEN COALESCE(r.data->>'status','')<>'' THEN lower(r.data->>'status')='published' WHEN r.data?'published' THEN lower(r.data->>'published')='true' WHEN r.data?'is_published' THEN lower(r.data->>'is_published')='true' WHEN r.data?'is_active' THEN lower(r.data->>'is_active')='true' ELSE true END), totals AS (SELECT public_name,count(DISTINCT row_key) total FROM filtered GROUP BY public_name) SELECT COALESCE(jsonb_object_agg(public_name,total),'{}'::jsonb)::text FROM totals;`))||{};
    const counts=Object.fromEntries([...publicNativeCollections.keys()].map(name=>[name,Number(measured[name]||0)]));
    return json(res, origin, 200, { ok: true, storage: 'local', counts, checked_at: new Date().toISOString() }, requestId);
  }
  const collections = publicNativeCollections.get(requestedTable);
  if (!collections) return json(res, origin, 404, { ok: false, error: 'unknown_public_collection' }, requestId);
  const limit = positiveInt(url.searchParams.get('limit'), 100, 1000);
  const offset = Math.max(0, Math.min(1000000, Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0));
  const slug = String(url.searchParams.get('slug') || '').slice(0,500);
  const id = String(url.searchParams.get('id') || '').slice(0,500);
  const category = String(url.searchParams.get('category') || '').slice(0,200);
  const filters=[`collection IN (${collections.map(quoteLiteral).join(',')})`];
  if(requestedTable!=='gsc_pages'&&requestedTable!=='gsc_queries')filters.push(`CASE WHEN COALESCE(data->>'status','')<>'' THEN lower(data->>'status')='published' WHEN data?'published' THEN lower(data->>'published')='true' WHEN data?'is_published' THEN lower(data->>'is_published')='true' WHEN data?'is_active' THEN lower(data->>'is_active')='true' ELSE true END`);
  if(slug)filters.push(`data->>'slug'=${quoteLiteral(slug)}`);
  if(id)filters.push(`COALESCE(data->>'id',data->>'source_id')=${quoteLiteral(id)}`);
  if(category)filters.push(`data->>'category'=${quoteLiteral(category)}`);
  const payload=parseJsonLine(await runPsql(`WITH filtered AS (SELECT DISTINCT ON (COALESCE(data->>'id',data->>'slug',data->>'url',data->>'question',data::text)) data FROM taxiassur.records WHERE ${filters.join(' AND ')} ORDER BY COALESCE(data->>'id',data->>'slug',data->>'url',data->>'question',data::text),updated_at DESC), page_rows AS (SELECT data FROM filtered ORDER BY COALESCE(data->>'published_at',data->>'updated_at',data->>'created_at','') DESC LIMIT ${limit} OFFSET ${offset}) SELECT jsonb_build_object('items',COALESCE((SELECT jsonb_agg(data ORDER BY COALESCE(data->>'published_at',data->>'updated_at',data->>'created_at','') DESC) FROM page_rows),'[]'::jsonb),'total',(SELECT count(*) FROM filtered))::text;`))||{};
  const items=payload.items||[],total=Number(payload.total||0);
  return json(res, origin, 200, {
    ok: true,
    storage: 'local',
    table: requestedTable,
    items,
    total,
    limit,
    offset,
    next_offset: offset + items.length < total ? offset + items.length : null,
  }, requestId);
}

async function publicNewsletter(req,res,origin,requestId){const body=await readJsonBody(req);const email=String(body.email||'').trim().toLowerCase();const firstName=String(body.first_name||'').trim().slice(0,100);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||body.marketing_consent!==true)return json(res,origin,400,{ok:false,error:'invalid_subscription'},requestId);const existing=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='newsletter_subscribers' AND lower(data->>'email')=${quoteLiteral(email)} LIMIT 1;`));const now=new Date().toISOString();if(existing){const updates={status:'active',marketing_consent:true,first_name:firstName||existing.first_name||null,resubscribed_at:now,unsubscribed_at:null};await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='newsletter_subscribers' AND record_id=${quoteLiteral(String(existing.id))};`);return json(res,origin,200,{ok:true,resubscribed:true},requestId);}const id=randomUUID();const row={id,email,first_name:firstName||null,source:String(body.source||'website').slice(0,80),status:'active',engagement_score:50,categories:['assurance-taxi','actualites'],marketing_consent:true,unsubscribe_token:randomBytes(32).toString('hex'),created_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('newsletter_subscribers',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(row))}::jsonb,'local');`);return json(res,origin,201,{ok:true},requestId);}

async function publicNewsletterUnsubscribe(req,res,origin,requestId){
  const body=await readJsonBody(req);const token=String(body.token||'').trim().toLowerCase();
  if(!tokenPattern.test(token))return json(res,origin,400,{ok:false,error:'invalid_token'},requestId);
  const now=new Date().toISOString();const updates={status:'unsubscribed',marketing_consent:false,unsubscribed_at:now};
  const subscriber=parseJsonLine(await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='newsletter_subscribers' AND data->>'unsubscribe_token'=${quoteLiteral(token)} RETURNING data::text;`));
  if(!subscriber)return json(res,origin,404,{ok:false,error:'invalid_token'},requestId);
  return json(res,origin,200,{ok:true,success:true,message:'Vous avez été désabonné avec succès'},requestId);
}
async function publicLeadMagnet(req,res,origin,requestId){const body=await readJsonBody(req);const email=String(body.email||'').trim().toLowerCase();const firstName=String(body.first_name||'').trim().slice(0,100);const guideType=['guide-complet','checklist-documents'].includes(body.guide_type)?body.guide_type:'guide-complet';if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,origin,400,{ok:false,error:'invalid_email'},requestId);const id=randomUUID();const now=new Date().toISOString();const row={id,email,first_name:firstName,guide_type:guideType,source_page:String(body.source_page||'').slice(0,500),created_at:now};const guideUrl=guideType==='checklist-documents'?'https://taxiassur.com/guides/checklist-documents-taxi.html':'https://taxiassur.com/guides/guide-assurance-taxi-2026.html';const mailId=randomUUID();const outbox={id:mailId,recipient:email,subject:'Votre guide TaxiAssur',body:`Bonjour ${firstName||''},\n\nVoici votre guide : ${guideUrl}\n\nTaxiAssur`,status:'pending',attempts:0,next_attempt_at:now,created_at:now};await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('lead_magnet_downloads',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(row))}::jsonb,'local'),('native_email_outbox',${quoteLiteral(mailId)},${quoteLiteral(JSON.stringify(outbox))}::jsonb,'local');COMMIT;`);return json(res,origin,201,{ok:true},requestId);}
async function publicConversion(req, res, origin, requestId) {
  const body = await readJsonBody(req);
  const allowedEvents = new Set(['form_start', 'form_validation_error', 'form_antispam_error', 'form_server_error', 'form_network_error', 'form_complete', 'form_step_advance']);
  const eventType = String(body.event_type || '').trim();
  const formId = String(body.form_id || 'lead_form').replace(/[^a-z0-9_-]/gi, '').slice(0, 80);
  const service = String(body.service || 'assurance-taxi').replace(/[^a-z0-9_-]/gi, '').slice(0, 80);
  const pageUrl = String(body.page_url || '').slice(0, 1000);
  const sessionId = String(body.session_id || '').slice(0, 120);
  if (!allowedEvents.has(eventType) || !formId || !sessionId) return json(res, origin, 400, { ok: false, error: 'invalid_conversion_event' }, requestId);
  if (!pageUrl.startsWith('https://taxiassur.com') && !pageUrl.startsWith('https://www.taxiassur.com') && !pageUrl.startsWith('http://localhost')) return json(res, origin, 400, { ok: false, error: 'invalid_page' }, requestId);
  if (eventType === 'form_start') {
    const existing = String(await runPsql(`SELECT record_id FROM taxiassur.records WHERE collection='conversion_events' AND data->>'event_type'='form_start' AND data->>'session_id'=${quoteLiteral(sessionId)} AND data->>'form_id'=${quoteLiteral(formId)} AND data->>'page_url'=${quoteLiteral(pageUrl)} LIMIT 1;`)).trim();
    if (existing) return json(res, origin, 200, { ok: true, event_id: existing, deduplicated: true }, requestId);
  }
  const id = randomUUID();
  const row = { id, event_type: eventType, form_id: formId, service, page_url: pageUrl, session_id: sessionId, step: Number.isInteger(Number(body.step)) ? Math.max(0, Math.min(20, Number(body.step))) : null, error_code: String(body.error_code || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || null, created_at: new Date().toISOString() };
  await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('conversion_events',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(row))}::jsonb,'local');`);
  return json(res, origin, 201, { ok: true, event_id: id, deduplicated: false }, requestId);
}
async function publicAggregatePageView(req,res,origin,requestId){
  const body=await readJsonBody(req),pathname=String(body.pathname||'').trim().slice(0,500);
  if(!/^\/[a-z0-9/_-]*$/i.test(pathname)||/^\/(?:backoffice|admin|old-admin|espace-client|client|prospect)(?:\/|$)/i.test(pathname))return json(res,origin,400,{ok:false,error:'invalid_page'},requestId);
  const date=new Date().toISOString().slice(0,10),id=createHash('sha256').update(`${date}|${pathname}`).digest('hex').slice(0,36),initial={id,date,pathname,views:1,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('public_page_views',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(initial))}::jsonb,'aggregate') ON CONFLICT(collection,record_id) DO UPDATE SET data=jsonb_set(jsonb_set(taxiassur.records.data,'{views}',to_jsonb(COALESCE(NULLIF(taxiassur.records.data->>'views','')::integer,0)+1),true),'{updated_at}',to_jsonb(now()::text),true),updated_at=now(),revision=taxiassur.records.revision+1;`);
  return json(res,origin,202,{ok:true},requestId);
}
async function publicAnalytics(req, res, origin, requestId) {
  const body = await readJsonBody(req);
  const pageUrl = String(body.page_url || '').slice(0, 1000);
  const sessionId = String(body.session_id || '').slice(0, 120);
  const eventId = String(body.event_id || '').trim();
  if (!pageUrl.startsWith('https://taxiassur.com') && !pageUrl.startsWith('https://www.taxiassur.com') && !pageUrl.startsWith('http://localhost')) return json(res, origin, 400, { ok: false, error: 'invalid_page' }, requestId);
  if (!sessionId) return json(res, origin, 400, { ok: false, error: 'invalid_session' }, requestId);
  if (eventId) {
    if (!/^[0-9a-f-]{36}$/i.test(eventId)) return json(res, origin, 400, { ok: false, error: 'invalid_event' }, requestId);
    const duration = Math.max(0, Math.min(86400, Number(body.duration_seconds) || 0));
    await runPsql(`UPDATE taxiassur.records SET data=jsonb_set(data,'{duration_seconds}',to_jsonb(${duration}),true),updated_at=now() WHERE collection='page_analytics' AND record_id=${quoteLiteral(eventId)} AND data->>'session_id'=${quoteLiteral(sessionId)};`);
    return json(res, origin, 200, { ok: true, event_id: eventId }, requestId);
  }
  const id = randomUUID();
  const row = { id, page_url: pageUrl, session_id: sessionId, user_agent: String(body.user_agent || '').slice(0, 500), referrer: String(body.referrer || '').slice(0, 1000) || null, viewport_width: Number(body.viewport_width) || null, viewport_height: Number(body.viewport_height) || null, duration_seconds: 0, created_at: new Date().toISOString() };
  await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('page_analytics',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(row))}::jsonb,'local');`);
  return json(res, origin, 201, { ok: true, event_id: id }, requestId);
}
async function authorizedPayment(body) {
  const reference = String(body.reference || '').trim();
  const token = String(body.accessToken || '').trim().toLowerCase();
  if (!/^[A-Za-z0-9_-]{8,50}$/.test(reference) || !tokenPattern.test(token)) return null;
  const payment = parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='monetico_payments' AND data->>'reference'=${quoteLiteral(reference)} LIMIT 1;`));
  if (!payment) return null;
  let authorized = String(payment.payment_access_token || '').toLowerCase() === token;
  if (!authorized && payment.lead_id) { const lead = parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(String(payment.lead_id))} LIMIT 1;`)); authorized = String(lead?.access_token || '').toLowerCase() === token; }
  return authorized ? payment : null;
}
async function publicPaymentLookup(req, res, origin, requestId) {
  const payment = await authorizedPayment(await readJsonBody(req));
  if (!payment) return json(res, origin, 404, { ok: false, error: 'payment_not_found' }, requestId);
  const safe = Object.fromEntries(['id','reference','amount','currency','status','customer_name','customer_email','customer_phone','description','lead_id','created_at','paid_at'].map((key) => [key, payment[key] ?? null]));
  return json(res, origin, 200, { ok: true, payment: safe }, requestId);
}
async function publicPaymentForm(req, res, origin, requestId) {
  const payment = await authorizedPayment(await readJsonBody(req));
  if (!payment) return json(res, origin, 403, { ok: false, error: 'invalid_payment_access' }, requestId);
  if (['paid','success','cancelled'].includes(String(payment.status || ''))) return json(res, origin, 400, { ok: false, error: `payment_${payment.status}` }, requestId);
  const amount = Number(payment.amount); const email = String(payment.customer_email || '').trim().toLowerCase();
  let key = String(config.moneticoKey || '').trim(); if (key.length % 2) key = `0${key}`;
  if (!['test','production'].includes(config.moneticoMode) || !config.moneticoTpe || !config.moneticoCompany || !/^[0-9a-f]{32,256}$/i.test(key) || !Number.isFinite(amount) || amount <= 0 || amount > 999999.99 || payment.currency !== 'EUR' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, origin, 503, { ok: false, error: 'payment_unavailable' }, requestId);
  const now = new Date(); const pad = (value) => String(value).padStart(2,'0'); const date = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}:${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const names = String(payment.customer_name || 'Client TaxiAssur').trim().split(/\s+/); const firstName = names.shift() || 'Client'; const lastName = names.join(' ') || 'TaxiAssur';
  const context = Buffer.from(JSON.stringify({ billing: { firstName, lastName, addressLine1: "1 rue de l'assurance", city: 'Paris', postalCode: '75000', country: 'FR' } })).toString('base64');
  const montant = `${amount.toFixed(2)}EUR`; const reference = String(payment.reference); const freeText = payment.lead_id ? `lead_${payment.lead_id}_${config.moneticoMode === 'test' ? 'TEST' : 'PROD'}` : `free_invoice_${config.moneticoMode === 'test' ? 'TEST' : 'PROD'}`;
  const paymentLead=payment.lead_id?parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(String(payment.lead_id))} LIMIT 1;`)):null;
  const returnParams=new URLSearchParams({reference,montant});if(tokenPattern.test(String(paymentLead?.access_token||'')))returnParams.set('token',String(paymentLead.access_token).toLowerCase());
  const okUrl=`https://taxiassur.com/espace-prospect/paiement-success?${returnParams.toString()}`; const errorUrl=`https://taxiassur.com/espace-prospect/paiement-error?${returnParams.toString()}`;
  const macData=`TPE=${config.moneticoTpe}*contexte_commande=${context}*date=${date}*lgue=FR*mail=${email}*montant=${montant}*reference=${reference}*societe=${config.moneticoCompany}*texte-libre=${freeText}*url_retour_err=${errorUrl}*url_retour_ok=${okUrl}*version=3.0`; const mac=createHmac('sha1',Buffer.from(key,'hex')).update(macData,'utf8').digest('hex').toUpperCase();
  const updates={mac_sent:mac,status:'sent',updated_at:new Date().toISOString()}; await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='monetico_payments' AND record_id=${quoteLiteral(String(payment.id))};`);
  return json(res, origin, 200, { ok:true, success:true, formData:{ action: config.moneticoMode === 'test' ? 'https://p.monetico-services.com/test/paiement.cgi' : 'https://p.monetico-services.com/paiement.cgi', fields:{version:'3.0',TPE:config.moneticoTpe,date,montant,reference,MAC:mac,url_retour_ok:okUrl,url_retour_err:errorUrl,lgue:'FR',societe:config.moneticoCompany,contexte_commande:context,'texte-libre':freeText,mail:email} } }, requestId);
}
async function queuePublicProspectAccess(lead, requestId) {
  const id=randomUUID(),now=new Date().toISOString();
  const link=`https://taxiassur.com/espace-prospect/${lead.access_token}?tab=documents`;
  const safeName=String(lead.first_name||'Madame, Monsieur').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);
  const html=`<!doctype html><html lang="fr"><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827"><div style="max-width:640px;margin:auto;padding:24px 12px"><div style="background:#111827;padding:24px;text-align:center;border-radius:16px 16px 0 0"><div style="color:#fbbf24;font-size:28px;font-weight:800">TaxiAssur</div></div><div style="background:#fff;padding:30px;border-radius:0 0 16px 16px"><h1 style="font-size:24px;margin-top:0">Retrouvez votre demande TaxiAssur</h1><p>Bonjour ${safeName},</p><p>Une demande existe déjà avec votre adresse e-mail. Utilisez votre lien personnel sécurisé pour reprendre votre dossier et déposer vos pièces.</p><p style="text-align:center;margin:28px 0"><a href="${link}" style="display:inline-block;background:#f59e0b;color:#111827;text-decoration:none;font-weight:800;padding:15px 24px;border-radius:10px">ACCÉDER À MON ESPACE PROSPECT</a></p><div style="background:#f9fafb;border-left:4px solid #f59e0b;padding:16px 18px;border-radius:8px"><strong>Pièces à préparer :</strong><ul style="line-height:1.8;margin-bottom:0"><li>Permis de conduire</li><li>Carte grise</li><li>Relevé d'information</li><li>Carte professionnelle taxi</li><li>KBIS</li><li>Licence taxi ou autorisation de stationnement</li><li>RIB</li></ul></div><p style="font-size:13px;color:#6b7280;margin-top:22px">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</p><hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0"><p><strong>TaxiAssur</strong><br>01 80 85 57 86</p></div></div></body></html>`;
  const mail={id,recipient:String(lead.email).trim().toLowerCase(),subject:'Retrouvez et complétez votre demande TaxiAssur',body:`Bonjour ${lead.first_name||''},\n\nUne demande existe déjà avec votre adresse e-mail. Reprenez votre dossier ici :\n${link}\n\nPièces à préparer : permis, carte grise, relevé d'information, carte professionnelle, KBIS, licence taxi et RIB.\n\nTaxiAssur - 01 80 85 57 86`,html,status:'pending',attempts:0,next_attempt_at:now,created_at:now};
  await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('native_email_outbox',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(mail))}::jsonb,'local');INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('public',${quoteLiteral(String(lead.email).toLowerCase())},'prospect_access_email_queued','crm_lead',${quoteLiteral(String(lead.id))},${quoteLiteral(requestId)}::uuid);COMMIT;`);
}
async function prospectAccessEmail(req,res,origin,requestId){
  const token=prospectToken(req);
  const lead=token?await leadByToken(token):null;
  if(!lead)return json(res,origin,403,{ok:false,error:'invalid_access'},requestId);
  await queuePublicProspectAccess(lead,requestId);
  return json(res,origin,200,{ok:true,email_queued:true},requestId);
}
async function createPublicLead(req, res, origin, requestId) {
  const body = await readJsonBody(req);
  const name = String(body.name || '').normalize('NFKC').trim().slice(0, 160);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
  const phone = String(body.phone || '').replace(/[^0-9+(). -]/g, '').trim().slice(0, 40);
  const city = String(body.city || '').normalize('NFKC').trim().slice(0, 120);
  const status = ['taxi', 'vtc', 'autre'].includes(String(body.status || '').toLowerCase()) ? String(body.status).toLowerCase() : 'taxi';
  const rawAcquisition=body.acquisition&&typeof body.acquisition==='object'?body.acquisition:{};
  const acquisition={landing_page:String(rawAcquisition.landing_page||'').slice(0,300)||null,page_url:String(rawAcquisition.page_url||'').slice(0,1000)||null,referrer:String(rawAcquisition.referrer||'').slice(0,1000)||null,utm_source:String(rawAcquisition.utm_source||'').slice(0,160)||null,utm_medium:String(rawAcquisition.utm_medium||'').slice(0,160)||null,utm_campaign:String(rawAcquisition.utm_campaign||'').slice(0,160)||null,utm_content:String(rawAcquisition.utm_content||'').slice(0,160)||null,utm_term:String(rawAcquisition.utm_term||'').slice(0,160)||null,gclid:String(rawAcquisition.gclid||'').slice(0,300)||null,session_id:String(rawAcquisition.session_id||'').replace(/[^a-z0-9_-]/gi,'').slice(0,120)||null};
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 6 || !city) return json(res, origin, 400, { ok: false, error: 'invalid_lead' }, requestId);
  const existing = parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND lower(data->>'email')=${quoteLiteral(email)} AND COALESCE(data->>'deleted_at','')='' ORDER BY updated_at DESC LIMIT 1;`));
  if (existing?.id && existing?.access_token && body.force_new !== true) {
    await queuePublicProspectAccess(existing, requestId);
    return json(res, origin, 200, { ok: true, lead_id: existing.id, access_token: null, is_new: false, access_resent: true }, requestId);
  }
  const id = randomUUID();
  const accessToken = randomBytes(32).toString('hex');
  const now = new Date().toISOString();
  const parts = name.split(/\s+/);
  const service=String(body.service||'assurance-taxi').replace(/[^a-z0-9_-]/gi,'').slice(0,120)||'assurance-taxi';
  const lead = { id, name, first_name: parts.shift() || name, last_name: parts.join(' '), full_name: name, email, phone, city, status: 'NOUVEAU_LEAD', vehicle_type: status === 'vtc' ? 'VTC' : status === 'autre' ? 'Autre' : 'Taxi', immatriculation: String(body.immatriculation || '').trim().slice(0, 30), source: String(body.source || 'website').trim().slice(0, 80), service, acquisition, notes: String(body.notes || '').trim().slice(0, 2000), lead_status: 'nouveau', pipeline_stage: 'nouveau_lead', current_stage_key: 'new_lead', access_token: accessToken, created_at: now, updated_at: now, total_uploaded_files: 0 };
  const outboxId = randomUUID();
  const outbox = { id: outboxId, recipient: 'team@taxiassur.com', subject: `Nouveau prospect TaxiAssur - ${name}`, body: `Nouveau prospect reçu depuis le site.\n\nNom : ${name}\nEmail : ${email}\nTéléphone : ${phone}\nVille : ${city}\nActivité : ${status}`, status: 'pending', attempts: 0, next_attempt_at: now, created_at: now };
  const salesCopyOutboxId = randomUUID();
  const salesCopyOutbox = { ...outbox, id: salesCopyOutboxId, recipient: 'slebon@xcr.fr' };
  const prospectOutboxId = randomUUID();
  const prospectLink = `https://taxiassur.com/espace-prospect/${accessToken}?tab=documents`;
  const prospectName = String(lead.first_name || 'Madame, Monsieur').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);
  const prospectHtml = `<!doctype html><html lang="fr"><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827"><div style="max-width:640px;margin:auto;padding:24px 12px"><div style="background:#111827;padding:24px;text-align:center;border-radius:16px 16px 0 0"><div style="color:#fbbf24;font-size:28px;font-weight:800">TaxiAssur</div><div style="color:#d1d5db;margin-top:6px">Votre assurance taxi, simplement</div></div><div style="background:#fff;padding:30px;border-radius:0 0 16px 16px"><h1 style="font-size:24px;margin:0 0 16px">Votre demande est bien enregistrée</h1><p>Bonjour ${prospectName},</p><p>Merci pour votre demande de devis. Notre équipe va maintenant étudier votre dossier.</p><p><strong>Pour recevoir vos propositions rapidement, complétez votre espace prospect sécurisé :</strong></p><p style="text-align:center;margin:28px 0"><a href="${prospectLink}" style="display:inline-block;background:#f59e0b;color:#111827;text-decoration:none;font-weight:800;padding:15px 24px;border-radius:10px">COMPLÉTER MON DOSSIER</a></p><div style="background:#f9fafb;border-left:4px solid #f59e0b;padding:16px 18px;border-radius:8px"><strong>Pièces à préparer :</strong><ul style="line-height:1.8;margin-bottom:0"><li>Permis de conduire</li><li>Carte grise du véhicule</li><li>Relevé d'information d'assurance</li><li>Carte professionnelle taxi</li><li>KBIS ou justificatif d'activité</li><li>Autorisation de stationnement ou licence taxi</li><li>RIB</li></ul></div><p style="font-size:13px;color:#6b7280;margin-top:22px">Conservez cet e-mail : il contient votre lien personnel sécurisé.</p><hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0"><p><strong>TaxiAssur</strong><br>01 80 85 57 86<br><a href="https://taxiassur.com" style="color:#b45309">taxiassur.com</a></p></div></div></body></html>`;
  const prospectOutbox = { id: prospectOutboxId, recipient: email, subject: 'Demande reçue - Complétez votre dossier TaxiAssur', body: `Bonjour ${lead.first_name || ''},\n\nVotre demande de devis TaxiAssur est bien enregistrée.\n\nComplétez votre dossier : ${prospectLink}\n\nPièces à préparer : permis, carte grise, relevé d'information, carte professionnelle, KBIS, licence taxi ou autorisation de stationnement et RIB.\n\nTaxiAssur - 01 80 85 57 86`, html: prospectHtml, status: 'pending', attempts: 0, next_attempt_at: now, created_at: now };
  const conversionId=randomUUID();
  const conversion={id:conversionId,event_type:'form_complete',form_id:'lead_form',service,page_url:acquisition.page_url,landing_page:acquisition.landing_page,session_id:acquisition.session_id,lead_id:id,utm_source:acquisition.utm_source,utm_medium:acquisition.utm_medium,utm_campaign:acquisition.utm_campaign,gclid:acquisition.gclid,created_at:now};
  const notificationId=randomUUID(),notification={id:notificationId,event_type:'new_lead',lead_id:id,message:`Nouveau prospect : ${name} (${city})`,priority:'high',metadata:{lead_name:name,email,phone,city},created_at:now,is_read:false};
  await runPsql(`BEGIN; INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('crm_leads',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(lead))}::jsonb,'local'),('native_email_outbox',${quoteLiteral(outboxId)},${quoteLiteral(JSON.stringify(outbox))}::jsonb,'local'),('native_email_outbox',${quoteLiteral(salesCopyOutboxId)},${quoteLiteral(JSON.stringify(salesCopyOutbox))}::jsonb,'local'),('native_email_outbox',${quoteLiteral(prospectOutboxId)},${quoteLiteral(JSON.stringify(prospectOutbox))}::jsonb,'local'),('conversion_events',${quoteLiteral(conversionId)},${quoteLiteral(JSON.stringify(conversion))}::jsonb,'server'),('crm_event_notifications',${quoteLiteral(notificationId)},${quoteLiteral(JSON.stringify(notification))}::jsonb,'server'); INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata) VALUES('public',${quoteLiteral(email)},'lead_created','crm_lead',${quoteLiteral(id)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({ source: lead.source, service, landing_page: acquisition.landing_page, prospect_email_queued: true, sales_copy_queued: true }))}::jsonb); COMMIT;`);
  return json(res, origin, 201, { ok: true, lead_id: id, access_token: accessToken, is_new: true }, requestId);
}
async function createPublicPartnership(req, res, origin, requestId) {
  const body = await readJsonBody(req);
  if (String(body.honeypot || '')) return json(res, origin, 202, { ok: true }, requestId);
  const name = String(body.name || '').normalize('NFKC').trim().slice(0, 160);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
  const phone = String(body.phone || '').replace(/[^0-9+(). -]/g, '').trim().slice(0, 40);
  const company = String(body.company || '').normalize('NFKC').trim().slice(0, 180);
  const type = String(body.type || 'autre').normalize('NFKC').trim().slice(0, 80);
  if (!name || !company || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 6) return json(res, origin, 400, { ok: false, error: 'invalid_partnership' }, requestId);
  const id = randomUUID();
  const now = new Date().toISOString();
  const inquiry = { id, type, company, name, email, phone, website: String(body.website || '').trim().slice(0, 500), description: String(body.description || '').trim().slice(0, 3000), audience: String(body.audience || '').trim().slice(0, 1000), traffic: String(body.traffic || '').trim().slice(0, 500), experience: String(body.experience || '').trim().slice(0, 1000), objectives: String(body.objectives || '').trim().slice(0, 2000), source: 'website_partnership_form', acquisition: { page_url: String(body.page_url || '').slice(0, 1000) || null, referrer: String(body.referrer || '').slice(0, 1000) || null, utm_source: String(body.utm_source || '').slice(0, 160) || null, utm_medium: String(body.utm_medium || '').slice(0, 160) || null, utm_campaign: String(body.utm_campaign || '').slice(0, 160) || null, gclid: String(body.gclid || '').slice(0, 300) || null }, status: 'new', created_at: now, updated_at: now };
  const mailId = randomUUID();
  const mail = { id: mailId, recipient: 'team@taxiassur.com', subject: 'Nouvelle demande de partenariat - ' + company, body: ['Nom : ' + name, 'Société : ' + company, 'Type : ' + type, 'Email : ' + email, 'Téléphone : ' + phone, 'Site : ' + (inquiry.website || '-'), 'Objectifs : ' + (inquiry.objectives || '-')].join('\n'), status: 'pending', attempts: 0, next_attempt_at: now, created_at: now };
  const sql = "BEGIN; INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('partner_inquiries'," + quoteLiteral(id) + ',' + quoteLiteral(JSON.stringify(inquiry)) + "::jsonb,'public'),('native_email_outbox'," + quoteLiteral(mailId) + ',' + quoteLiteral(JSON.stringify(mail)) + "::jsonb,'local'); COMMIT;";
  await runPsql(sql);
  return json(res, origin, 201, { ok: true, inquiry_id: id }, requestId);
}
function clientToken(req) { const value=String(req.headers['x-client-token']||'').trim(); return tokenPattern.test(value)?value.toLowerCase():''; }
async function clientSession(req, res, origin, requestId) {
  const token=clientToken(req); const lead=token?await leadByToken(token):null;
  if(!lead)return json(res,origin,403,{ok:false,error:'invalid_access'},requestId);
  const leadId=String(lead.id||''); const portals=await recordsWhere('client_portal_users','lead_id',leadId); const portal=portals.find((row)=>row.is_active!==false) || (await recordsAll('client_portal_users')).find((row)=>row.is_active!==false&&String(row.email||'').toLowerCase()===String(lead.email||'').toLowerCase());
  if(!portal)return json(res,origin,403,{ok:false,error:'inactive_client_access'},requestId);
  const [documents,quotes,notifications,payments,claims,requests,contracts,crmDocuments,referrals,referralCodes,subscriptions]=await Promise.all([recordsWhere('prospect_documents','lead_id',leadId),recordsWhere('lead_company_quotes','lead_id',leadId),recordsWhere('crm_event_notifications','lead_id',leadId),recordsWhere('monetico_payments','lead_id',leadId),recordsWhere('insurance_claims','lead_id',leadId),recordsWhere('client_portal_requests','lead_id',leadId),recordsWhere('lead_contracts','lead_id',leadId),recordsWhere('crm_lead_documents','lead_id',leadId),recordsWhere('referrals','referrer_id',leadId),recordsWhere('referral_codes','user_id',leadId),recordsWhere('client_subscriptions','lead_id',leadId)]);
  const user={success:true,id:portal.id,email:portal.email||lead.email,first_name:portal.first_name||lead.first_name,last_name:portal.last_name||lead.last_name,phone:portal.phone||lead.phone,company_name:portal.company_name||lead.company_name||'',is_active:true,created_at:portal.created_at||lead.created_at,lead_id:leadId,pipeline_stage:lead.pipeline_stage,workflow_stage:lead.workflow_stage,lead_status:lead.lead_status,lead_created_at:lead.created_at,doc_count:documents.length,quote_count:quotes.length,notification_count:notifications.filter((row)=>!row.read_at).length};
  const clientDocuments=[...documents.map((doc)=>({...doc,name:doc.document_name||doc.file_name,category:'prospect_upload',source:'client',download_path:`/v1/prospect/documents/${doc.id}/download`})),...crmDocuments.filter((doc)=>doc.status==='validated'||doc.validated===true).map((doc)=>({...doc,name:doc.document_name||doc.file_name,category:'crm_upload',source:'crm',download_path:`/v1/prospect/final-documents/${doc.id}/download`}))];
  let referralCode=String(referralCodes[0]?.code||'');if(!referralCode){referralCode=randomBytes(6).toString('hex').toUpperCase();const codeId=randomUUID();const code={id:codeId,user_id:leadId,code:referralCode,created_at:new Date().toISOString()};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('referral_codes',${quoteLiteral(codeId)},${quoteLiteral(JSON.stringify(code))}::jsonb,'local');`);}
  const companyId=String(contracts[0]?.company_id||contracts[0]?.insurance_company_id||lead.insurance_company_id||'');const insuranceCompany=companyId?(await recordsAll('insurance_companies')).find((row)=>String(row.id)===companyId)||null:null;
  const subscription=subscriptions[0]?{account_holder_name:subscriptions[0].account_holder_name,desired_effect_date:subscriptions[0].desired_effect_date,debit_date:subscriptions[0].debit_date,has_rib:Boolean(subscriptions[0].has_rib),iban:'',bic:''}:null;
  return json(res,origin,200,{ok:true,user,lead,documents:clientDocuments,quotes,notifications,payments,claims,requests,contracts,referrals,referral_code:referralCode,insurance_company:insuranceCompany,subscription},requestId);
}
function encryptPrivateValue(value){const key=createHash('sha256').update(config.sessionSecret).digest();const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,iv);const encrypted=Buffer.concat([cipher.update(String(value),'utf8'),cipher.final()]);return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;}
async function clientSubscriptionSave(req,res,origin,requestId){
  const token=clientToken(req);const lead=token?await leadByToken(token):null;if(!lead)return json(res,origin,403,{ok:false,error:'invalid_access'},requestId);const body=await readJsonBody(req);const iban=String(body.iban||'').replace(/\s/g,'').toUpperCase();const bic=String(body.bic||'').replace(/\s/g,'').toUpperCase();const holder=String(body.account_holder_name||'').trim().slice(0,150);const effectDate=String(body.desired_effect_date||'');const debitDate=Number(body.debit_date);const quoteId=String(body.accepted_quote_id||'');if(!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)||!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)||holder.length<2||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(effectDate)||effectDate<new Date().toISOString().slice(0,10)||!Number.isInteger(debitDate)||debitDate<1||debitDate>28||!uuidPattern.test(quoteId))return json(res,origin,400,{ok:false,error:'invalid_subscription'},requestId);const quote=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='lead_company_quotes' AND record_id=${quoteLiteral(quoteId)} AND data->>'lead_id'=${quoteLiteral(String(lead.id))} AND data->>'status'='validated' LIMIT 1;`));if(!quote)return json(res,origin,403,{ok:false,error:'quote_not_validated'},requestId);const existing=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='client_subscriptions' AND data->>'lead_id'=${quoteLiteral(String(lead.id))} LIMIT 1;`));const id=String(existing?.id||randomUUID());const now=new Date().toISOString();const record={id,lead_id:String(lead.id),accepted_quote_id:quoteId,iban_encrypted:encryptPrivateValue(iban),bic_encrypted:encryptPrivateValue(bic),iban_last4:iban.slice(-4),account_holder_name:holder,desired_effect_date:effectDate,debit_date:debitDate,has_rib:body.has_rib===true,status:'submitted',created_at:existing?.created_at||now,updated_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('client_subscriptions',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(record))}::jsonb,'local') ON CONFLICT(collection,record_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now(),revision=taxiassur.records.revision+1;`);return json(res,origin,200,{ok:true},requestId);
}
async function clientClaimCreate(req,res,origin,requestId){
  const token=clientToken(req);const lead=token?await leadByToken(token):null;if(!lead)return json(res,origin,403,{ok:false,error:'invalid_access'},requestId);const body=await readJsonBody(req);const incidentType=String(body.incident_type||'').trim().slice(0,80);const date=String(body.incident_date||'');const description=String(body.description||'').trim().slice(0,5000);const parsedDate=new Date(`${date}T00:00:00Z`);const age=Date.now()-parsedDate.getTime();if(!incidentType||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)||!Number.isFinite(parsedDate.getTime())||age<0||age>5*365.25*86400000||description.length<10)return json(res,origin,400,{ok:false,error:'invalid_claim'},requestId);const id=randomUUID();const now=new Date().toISOString();const claim={id,lead_id:String(lead.id),client_email:String(lead.email||''),incident_type:incidentType,claim_type:incidentType,incident_date:date,incident_description:description,incident_location:String(body.location||'').trim().slice(0,300)||null,third_party_involved:body.third_party_involved===true,third_party_info:String(body.third_party_info||'').trim().slice(0,2000)||null,police_report_number:String(body.police_report_number||'').trim().slice(0,100)||null,claim_status:'declared',status:'declared',created_at:now,updated_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('insurance_claims',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(claim))}::jsonb,'local');`);return json(res,origin,201,{ok:true,claim_id:id},requestId);
}
const clientConsentKeys=new Set(['marketing_email','marketing_sms','marketing_phone','partner_cross_sell','behavioral_personalization']);
async function clientConsentsGet(req,res,origin,requestId){
  const token=clientToken(req);const lead=token?await leadByToken(token):null;
  if(!lead)return json(res,origin,403,{ok:false,error:'invalid_access'},requestId);
  const stored=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='client_consents' AND record_id=${quoteLiteral(String(lead.id))} LIMIT 1;`))||{};
  const consents=Object.fromEntries([...clientConsentKeys].map((key)=>[key,stored[key]===true]));
  return json(res,origin,200,{ok:true,consents},requestId);
}
async function clientConsentsPatch(req,res,origin,requestId){
  const token=clientToken(req);const lead=token?await leadByToken(token):null;
  if(!lead)return json(res,origin,403,{ok:false,error:'invalid_access'},requestId);
  const body=await readJsonBody(req);const now=new Date().toISOString();const updates={};
  if(body.revoke_all===true){for(const key of clientConsentKeys)updates[key]=false;}
  else if(clientConsentKeys.has(String(body.key))&&typeof body.value==='boolean')updates[String(body.key)]=body.value;
  else return json(res,origin,400,{ok:false,error:'invalid_consent'},requestId);
  const eventId=randomUUID();
  const event={id:eventId,lead_id:String(lead.id),changes:updates,source:String(body.source||'client_portal_preferences').slice(0,100),proof:body.proof&&typeof body.proof==='object'?body.proof:{},recorded_at:now};
  const state={...updates,updated_at:now};
  await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('client_consents',${quoteLiteral(String(lead.id))},${quoteLiteral(JSON.stringify(state))}::jsonb,'local')ON CONFLICT(collection,record_id)DO UPDATE SET data=taxiassur.records.data||${quoteLiteral(JSON.stringify(state))}::jsonb,updated_at=now(),revision=taxiassur.records.revision+1;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('client_consent_events',${quoteLiteral(eventId)},${quoteLiteral(JSON.stringify(event))}::jsonb,'local');COMMIT;`);
  return json(res,origin,200,{ok:true,consents:state},requestId);
}

async function clientReferralCreate(req,res,origin,requestId){
  const token=clientToken(req);const lead=token?await leadByToken(token):null;if(!lead)return json(res,origin,403,{ok:false,error:'invalid_access'},requestId);const body=await readJsonBody(req);const email=String(body.referred_email||'').trim().toLowerCase();if(body.permission_confirmed!==true||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email===String(lead.email||'').toLowerCase())return json(res,origin,400,{ok:false,error:'invalid_referral'},requestId);const duplicate=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='referrals' AND data->>'referrer_id'=${quoteLiteral(String(lead.id))} AND lower(data->>'referred_email')=${quoteLiteral(email)} LIMIT 1;`));if(duplicate)return json(res,origin,409,{ok:false,error:'duplicate_referral'},requestId);const id=randomUUID();const now=new Date().toISOString();const referral={id,referrer_id:String(lead.id),referred_email:email,status:'pending',reward_amount:25,reward_type:'gift',consent_proof:{confirmed_by_referrer:true,source:'client_portal_referral',created_at:now},created_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('referrals',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(referral))}::jsonb,'local');`);return json(res,origin,201,{ok:true,referral_id:id},requestId);
}
async function clientRequestCreate(req,res,origin,requestId){
  const token=clientToken(req);const lead=token?await leadByToken(token):null;if(!lead)return json(res,origin,403,{ok:false,error:'invalid_access'},requestId);const body=await readJsonBody(req);const allowedTypes=new Set(['address_change','vehicle_change','fleet_change','payment_change','contact_change','claim_declaration','document_request','certificate_request','cancellation','coverage_change','endorsement_request','renewal_request','premium_question','contract_question','support_message','partner_offer_question','other']);const type=String(body.request_type||'');const title=String(body.title||'').trim().slice(0,160);if(!allowedTypes.has(type)||title.length<2)return json(res,origin,400,{ok:false,error:'invalid_request'},requestId);const id=randomUUID();const now=new Date().toISOString();const request={id,lead_id:String(lead.id),email:String(lead.email||''),request_type:type,title,description:String(body.description||'').trim().slice(0,5000)||null,new_data:body.new_data&&typeof body.new_data==='object'?body.new_data:{},consent_snapshot:body.consent_snapshot&&typeof body.consent_snapshot==='object'?body.consent_snapshot:{},priority:['low','normal','high','urgent'].includes(body.priority)?body.priority:'normal',status:'pending',created_at:now,updated_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('client_portal_requests',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(request))}::jsonb,'local');`);return json(res,origin,201,{ok:true,request_id:id,lead_id:String(lead.id)},requestId);
}
async function clientNotificationsRead(req,res,origin,requestId){
  const token=clientToken(req);const lead=token?await leadByToken(token):null;if(!lead)return json(res,origin,403,{ok:false,error:'invalid_access'},requestId);const body=await readJsonBody(req);const notificationId=String(body.notification_id||'');const filter=uuidPattern.test(notificationId)?` AND record_id=${quoteLiteral(notificationId)}`:'';const updates={read_at:new Date().toISOString(),is_read:true};const count=Number(String(await runPsql(`WITH updated AS (UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='crm_event_notifications' AND data->>'lead_id'=${quoteLiteral(String(lead.id))}${filter} RETURNING 1) SELECT count(*) FROM updated;`)).trim()||0);return json(res,origin,200,{ok:true,updated:count},requestId);
}
async function publicPaymentWebhook(req,res,origin,requestId){
  const reply=(cdr)=>send(res,origin,200,`version=2\ncdr=${cdr}`,{'Content-Type':'text/plain; charset=utf-8'},requestId);
  if(!['test','production'].includes(config.moneticoMode)||!config.moneticoTpe||!config.moneticoKey)return reply(1);
  const raw=await readRawBody(req,65536);const body=Object.fromEntries(new URLSearchParams(raw));
  const reference=String(body.reference||''),montant=String(body.montant||''),codeRetour=String(body['code-retour']||''),receivedMac=String(body.MAC||''),tpe=String(body.TPE||'');
  if(!/^[A-Za-z0-9_-]{8,50}$/.test(reference)||tpe!==config.moneticoTpe||!/^[0-9A-F]{40}$/i.test(receivedMac))return reply(1);
  let key=String(config.moneticoKey).trim();if(key.length%2)key=`0${key}`;if(!/^[0-9a-f]{32,256}$/i.test(key))return reply(1);
  const fields=[tpe,body.date||'',montant,reference,body['texte-libre']||'',body.version||'3.0',codeRetour,body.cvx||'',body.vld||'',body.brand||'',body.status3ds||'',body.numauto||'',body.motifrefus||'',body.originecb||'',body.bincb||'',body.hpancb||'',body.ipclient||'',body.originetr||'',body.veres||'',body.pares||''];
  const expected=createHmac('sha1',Buffer.from(key,'hex')).update(fields.join('*')+'*','utf8').digest('hex');if(!secureEqual(expected.toLowerCase(),receivedMac.toLowerCase()))return reply(1);
  const payment=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='monetico_payments' AND data->>'reference'=${quoteLiteral(reference)} LIMIT 1;`));if(!payment)return reply(1);
  const match=/^(\d{1,8}\.\d{2})EUR$/.exec(montant);if(!match||Math.abs(Number(match[1])-Number(payment.amount))>.005)return reply(1);
  const success=config.moneticoMode==='test'?'payetest':'paiement';if(codeRetour!==success&&codeRetour!=='Annulation')return reply(1);
  const now=new Date().toISOString(),status=codeRetour===success?'paid':'cancelled';const updates={status,paid_at:status==='paid'?now:null,payment_date:status==='paid'?now:null,transaction_id:body.numauto||null,authorization_number:body.numauto||null,card_type:body.brand||null,updated_at:now,monetico_response:{code_retour:codeRetour,date:body.date||null,montant,numauto:body.numauto||null,brand:body.brand||null,status3ds:body.status3ds||null,mode:config.moneticoMode}};
  await runPsql(`BEGIN;UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='monetico_payments' AND record_id=${quoteLiteral(String(payment.id))};${status==='paid'&&payment.lead_id?`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({payment_confirmed:true,payment_date:now,payment_reference:reference,updated_at:now}))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='crm_leads' AND record_id=${quoteLiteral(String(payment.lead_id))};`:''}INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata) VALUES('system','monetico',${quoteLiteral('payment_'+status)},'monetico_payment',${quoteLiteral(String(payment.id))},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({reference,code_retour:codeRetour}))}::jsonb);COMMIT;`);
  if(status==='paid'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payment.customer_email||''))){const mailId=randomUUID();const mail={id:mailId,recipient:String(payment.customer_email).toLowerCase(),subject:'Confirmation de votre paiement TaxiAssur',body:`Bonjour,\n\nVotre paiement de ${Number(payment.amount).toFixed(2)} EUR a bien été enregistré.\nRéférence : ${reference}\n\nTaxiAssur`,status:'pending',attempts:0,next_attempt_at:now,created_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('native_email_outbox',${quoteLiteral(mailId)},${quoteLiteral(JSON.stringify(mail))}::jsonb,'local');`);}
  return reply(0);
}

async function adminPaymentsList(req,res,origin,requestId,url){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const status=String(url.searchParams.get('status')||'');let payments=await recordsAllWithMirror('monetico_payments');if(status)payments=payments.filter(row=>String(row.status)===status);payments.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const leads=await recordsAllWithMirror('crm_leads');payments=payments.map(payment=>({...payment,lead:leads.find(lead=>String(lead.id)===String(payment.lead_id))||null}));return json(res,origin,200,{ok:true,payments},requestId);
}
async function adminPaymentCreate(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const body=await readJsonBody(req),amount=Number(body.amount),leadId=String(body.lead_id||body.leadId||'').trim(),requestKey=String(body.request_id||body.requestId||'').trim();
  if(!Number.isFinite(amount)||amount<.5||amount>999999.99||leadId.length>200)return json(res,origin,400,{ok:false,error:'invalid_payment'},requestId);
  if(requestKey&&uuidPattern.test(requestKey)){const existing=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='monetico_payments' AND data->>'request_id'=${quoteLiteral(requestKey)} LIMIT 1;`));if(existing)return json(res,origin,200,{ok:true,payment:existing,reference:existing.reference,paymentAccessToken:existing.payment_access_token,idempotent:true},requestId);}
  const lead=leadId?parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)} LIMIT 1;`)):null;if(leadId&&!lead)return json(res,origin,404,{ok:false,error:'lead_not_found'},requestId);
  const email=String(lead?.email||body.customer_email||body.customerEmail||'').trim().toLowerCase(),first=String(lead?.first_name||body.customer_first_name||body.customerFirstName||'').trim(),last=String(lead?.last_name||body.customer_last_name||body.customerLastName||'').trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!first||!last)return json(res,origin,400,{ok:false,error:'invalid_customer'},requestId);
  const id=randomUUID(),reference=`${config.moneticoMode==='test'?'T':'P'}${randomBytes(7).toString('hex').toUpperCase()}`,token=randomBytes(32).toString('hex'),now=new Date().toISOString();const payment={id,reference,request_id:uuidPattern.test(requestKey)?requestKey:null,lead_id:leadId||null,amount:Number(amount.toFixed(2)),currency:'EUR',status:'pending',customer_email:email,customer_name:`${first} ${last}`.trim(),customer_phone:lead?.phone||body.customer_phone||null,description:String(body.description||'Paiement assurance taxi').trim().slice(0,500),payment_access_token:token,created_at:now,updated_at:now};
  const replacePrevious=leadId?`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({status:'cancelled',cancelled_reason:'replaced_by_new_payment',replaced_by:id,replaced_at:now,updated_at:now}))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='monetico_payments' AND data->>'lead_id'=${quoteLiteral(leadId)} AND COALESCE(data->>'status','pending') IN ('pending','sent');`:'';
  await runPsql(`BEGIN;${replacePrevious}INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('monetico_payments',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(payment))}::jsonb,'admin');COMMIT;`);return json(res,origin,201,{ok:true,payment,reference,paymentAccessToken:token,paymentUrl:`https://taxiassur.com/paiement/${encodeURIComponent(reference)}?token=${token}`},requestId);
}
async function adminPaymentEmail(req,res,origin,requestId,paymentId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const payment=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='monetico_payments' AND record_id=${quoteLiteral(paymentId)} LIMIT 1;`));if(!payment)return json(res,origin,404,{ok:false,error:'not_found'},requestId);const email=String(payment.customer_email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!tokenPattern.test(String(payment.payment_access_token||'')))return json(res,origin,400,{ok:false,error:'invalid_recipient_or_token'},requestId);const url=`https://taxiassur.com/paiement/${encodeURIComponent(String(payment.reference))}?token=${encodeURIComponent(String(payment.payment_access_token))}`,id=randomUUID(),now=new Date().toISOString(),mail={id,recipient:email,subject:'Votre lien de paiement sécurisé TaxiAssur',body:`Bonjour,\n\nMontant : ${Number(payment.amount).toFixed(2)} EUR\nVotre lien sécurisé Monetico :\n${url}\n\nTaxiAssur`,status:'pending',attempts:0,next_attempt_at:now,created_at:now};await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('native_email_outbox',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(mail))}::jsonb,'local');UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({status:String(payment.status)==='pending'?'sent':payment.status,last_email_sent_at:now,updated_at:now}))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='monetico_payments' AND record_id=${quoteLiteral(paymentId)};COMMIT;`);return json(res,origin,200,{ok:true,email_queued:true},requestId);
}
async function adminPaymentReportEmail(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const body=await readJsonBody(req),recipient=String(body.recipient||'comptabilite@taxiassur.fr').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))return json(res,origin,400,{ok:false,error:'invalid_email'},requestId);const payments=await recordsAllWithMirror('monetico_payments'),paid=payments.filter(row=>['paid','success'].includes(String(row.status))),pending=payments.filter(row=>['pending','sent'].includes(String(row.status))),paidTotal=paid.reduce((sum,row)=>sum+Number(row.amount||0),0),pendingTotal=pending.reduce((sum,row)=>sum+Number(row.amount||0),0),id=randomUUID(),now=new Date().toISOString(),mail={id,recipient,subject:`Rapport Monetico ${new Date().toLocaleDateString('fr-FR',{month:'2-digit',year:'numeric'})}`,body:`Rapport Monetico TaxiAssur\n\nEncaissé : ${paidTotal.toFixed(2)} EUR (${paid.length} transactions)\nEn attente : ${pendingTotal.toFixed(2)} EUR (${pending.length} transactions)\n`,status:'pending',attempts:0,next_attempt_at:now,created_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('native_email_outbox',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(mail))}::jsonb,'local');`);return json(res,origin,200,{ok:true,email_queued:true},requestId);
}async function adminPaymentPatch(req,res,origin,requestId,paymentId){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const body=await readJsonBody(req),status=String(body.status||'');if(!['pending','sent','cancelled','failed'].includes(status))return json(res,origin,400,{ok:false,error:'invalid_status'},requestId);const row=parseJsonLine(await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({status,updated_at:new Date().toISOString()}))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='monetico_payments' AND record_id=${quoteLiteral(paymentId)} AND COALESCE(data->>'status','pending') NOT IN ('paid','success') RETURNING data::text;`));if(!row)return json(res,origin,409,{ok:false,error:'payment_immutable_or_missing'},requestId);return json(res,origin,200,{ok:true,payment:row},requestId);}
async function adminPaymentDelete(req,res,origin,requestId,paymentId){const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const deleted=parseJsonLine(await runPsql(`DELETE FROM taxiassur.records WHERE collection='monetico_payments' AND record_id=${quoteLiteral(paymentId)} AND COALESCE(data->>'status','pending') NOT IN ('paid','success') RETURNING data::text;`));if(!deleted)return json(res,origin,409,{ok:false,error:'payment_immutable_or_missing'},requestId);return json(res,origin,200,{ok:true},requestId);}
async function clientPaymentEmail(req,res,origin,requestId,paymentId){
  const token=clientToken(req);const lead=token?await leadByToken(token):null;if(!lead)return json(res,origin,403,{ok:false,error:'invalid_access'},requestId);const payment=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='monetico_payments' AND record_id=${quoteLiteral(paymentId)} AND data->>'lead_id'=${quoteLiteral(String(lead.id))} LIMIT 1;`));if(!payment)return json(res,origin,404,{ok:false,error:'not_found'},requestId);const recipient=String(lead.email||payment.customer_email||'').toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))return json(res,origin,400,{ok:false,error:'invalid_email'},requestId);const access=String(payment.payment_access_token||token);const url=`https://taxiassur.com/paiement/${encodeURIComponent(String(payment.reference))}?token=${access}`;const id=randomUUID();const now=new Date().toISOString();const outbox={id,recipient,subject:'Votre lien de paiement sécurisé TaxiAssur',body:`Bonjour,\n\nVotre lien de paiement sécurisé Monetico :\n${url}\n\nTaxiAssur`,status:'pending',attempts:0,next_attempt_at:now,created_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('native_email_outbox',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(outbox))}::jsonb,'local');`);return json(res,origin,200,{ok:true},requestId);
}
async function prospectSession(req, res, origin, requestId) {
  const token = prospectToken(req);
  if (!token) return json(res, origin, 401, { ok: false, error: 'invalid_access' }, requestId);
  const lead = await leadByToken(token);
  if (!lead) return json(res, origin, 403, { ok: false, error: 'invalid_access' }, requestId);
  const leadId = String(lead.id || '');
  const [documents, requests, payments, crmDocuments, rawQuotes, companies, allCompanyDocuments] = await Promise.all([
    recordsForRelatedLeads('prospect_documents', leadId),
    recordsWhere('crm_document_requests', 'lead_id', leadId),
    recordsWhere('monetico_payments', 'lead_id', leadId),
    recordsForRelatedLeads('crm_lead_documents', leadId),
    preferredQuotesForLead(leadId),
    recordsAll('insurance_companies'),
    recordsAll('company_documents'),
  ]);
  const companiesById = new Map(companies.map((company) => [String(company.id || ''), company]));
  const quotes = rawQuotes.map((quote) => {
    const companyId = String(quote.company_id || quote.insurance_company_id || '');
    const company = companiesById.get(companyId) || {};
    const rcCompany = companiesById.get(String(quote.rc_pro_addon_company_id || '')) || {};
    const publicCompany = withPublicCompanyLogo(company, allCompanyDocuments);
    return { ...quote, company_id: companyId, company_name: quote.company_name || company.name || null, company_code: quote.company_code || company.code || null, company_logo_url: publicCompany.logo_url || null, rc_pro_addon_company_name: quote.rc_pro_addon_company_name || rcCompany.name || null };
  });
  const quotedCompanyIds = new Set(quotes.map((quote) => String(quote.company_id || '')).filter(Boolean));
  const companyDocuments = allCompanyDocuments
    .filter((document) => quotedCompanyIds.has(String(document.company_id || '')) && document.send_with_quote === true)
    .sort((left, right) => (Number(left.display_order || 0) - Number(right.display_order || 0)) || String(left.document_name || '').localeCompare(String(right.document_name || '')));
  const finalDocuments = crmDocuments.filter((document) => ['contrat_signe', 'attestation_assurance', 'memo_vehicule'].includes(String(document.document_type || '')) && document.status === 'validated');
  const safeLead = Object.fromEntries(['id', 'first_name', 'last_name', 'full_name', 'email', 'phone', 'address', 'postal_code', 'city', 'status', 'pipeline_stage', 'document_checklist', 'documents_complete', 'quote_amount', 'can_pay', 'can_sign_contract', 'selected_quote_id', 'contract_signed', 'payment_confirmed'].map((key) => [key, lead[key] ?? null]));
  return json(res, origin, 200, { ok: true, lead: safeLead, documents, final_documents: finalDocuments, document_requests: requests, payments, quotes, company_documents: companyDocuments }, requestId);
}

async function adminDocumentWorkspaceUpload(req,res,origin,requestId,leadId){
  const session=await verifiedAdminSession(req);if(!session)return drainAndJson(req,res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const lead=parseJsonLine(await runPsql("SELECT 1 AS found FROM taxiassur.records WHERE collection='crm_leads' AND record_id="+quoteLiteral(leadId)+" LIMIT 1;"));if(!lead)return drainAndJson(req,res,origin,404,{ok:false,error:'lead_not_found'},requestId);
  const mime=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase(),extension=allowedMimeTypes.get(mime),name=safeFileName(decodeHeader(req.headers['x-file-name'])),size=Number(req.headers['content-length']||0),scope=String(req.headers['x-document-scope']||'classified'),requestedType=String(req.headers['x-document-type']||'autre').trim().toLowerCase(),customLabel=decodeHeader(req.headers['x-custom-label']).normalize('NFKC').trim().slice(0,160);
  const documentType=scope==='unclassified'?'autre':requestedType;
  if(!['pdf','jpg','png','webp','html'].includes(extension)||!allowedDocumentTypes.has(documentType)||(extension==='html'&&documentType!=='custom')||(documentType==='custom'&&!customLabel)||!name||!Number.isInteger(size)||size<1||size>maxUploadBytes)return drainAndJson(req,res,origin,400,{ok:false,error:'invalid_document_upload'},requestId);
  const id=randomUUID(),relativePath=leadId+"/documents/"+id+"."+extension,finalPath=safeStoragePath(relativePath),temporaryPath=path.join(config.documentRoot,'.tmp',id+'.upload');mkdirSync(path.dirname(finalPath),{recursive:true});
  const upload=await receiveFile(req,temporaryPath,maxUploadBytes);if(upload.size!==size){safeUnlink(temporaryPath);return json(res,origin,400,{ok:false,error:'size_mismatch'},requestId);}const scan=await scanFile(temporaryPath);if(scan.status!=='clean'){safeUnlink(temporaryPath);return json(res,origin,422,{ok:false,error:scan.status==='infected'?'infected_file':'scan_failed'},requestId);}renameSync(temporaryPath,finalPath);
  const now=new Date().toISOString(),collection=scope==='unclassified'?'prospect_documents':'crm_lead_documents',document={id,lead_id:leadId,document_type:documentType,custom_label:documentType==='custom'?customLabel:null,file_name:name,file_path:relativePath,bucket:'native',file_size:upload.size,mime_type:mime,status:'pending',validated:false,uploaded_by:session.sub,uploaded_at:now,created_at:now,updated_at:now};
  try{await runPsql("BEGIN;INSERT INTO taxiassur.file_objects(id,owner_type,owner_id,document_type,original_name,storage_path,mime_type,size_bytes,sha256_hex,scan_status,scan_engine,scan_checked_at,status)VALUES("+quoteLiteral(id)+"::uuid,'crm',"+quoteLiteral(leadId)+","+quoteLiteral(documentType)+","+quoteLiteral(name)+","+quoteLiteral(relativePath)+","+quoteLiteral(mime)+","+upload.size+","+quoteLiteral(upload.sha256)+",'clean','clamav',now(),'pending');INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES("+quoteLiteral(collection)+","+quoteLiteral(id)+","+quoteLiteral(JSON.stringify(document))+"::jsonb,'admin');INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',"+quoteLiteral(session.sub)+",'document_uploaded',"+quoteLiteral(collection)+","+quoteLiteral(id)+","+quoteLiteral(requestId)+"::uuid,"+quoteLiteral(JSON.stringify({lead_id:leadId,document_type:documentType,size_bytes:upload.size}))+"::jsonb);COMMIT;");}catch(error){safeUnlink(finalPath);throw error;}
  return json(res,origin,201,{ok:true,document},requestId);
}
async function adminDocumentWorkspace(req,res,origin,requestId,leadId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const lead=parseJsonLine(await runPsql("SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id="+quoteLiteral(leadId)+" LIMIT 1;"));if(!lead)return json(res,origin,404,{ok:false,error:'lead_not_found'},requestId);
  if(req.method==='GET'){
    const sql="WITH candidates AS (SELECT m.record_id AS email_id,m.data,(item.ordinality-1)::int AS item_index,item.value AS attachment FROM taxiassur.records m CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(m.data->'attachments')='array' THEN m.data->'attachments' ELSE '[]'::jsonb END) WITH ORDINALITY item(value,ordinality) WHERE m.collection='email_messages' AND COALESCE(m.data->>'lead_id',m.data->>'case_id')="+quoteLiteral(leadId)+" AND COALESCE(item.value->>'path','')<>'' AND COALESCE(item.value->>'status','') NOT IN ('assigned','classified','ignored') AND NOT EXISTS(SELECT 1 FROM taxiassur.records d WHERE d.collection IN ('crm_lead_documents','prospect_documents') AND d.data->>'lead_id'="+quoteLiteral(leadId)+" AND d.data->>'file_path'=item.value->>'path')) SELECT COALESCE(jsonb_agg(jsonb_build_object('attachment_id',email_id||':'||item_index,'filename',COALESCE(attachment->>'filename','piece-jointe'),'content_type',COALESCE(attachment->>'contentType','application/octet-stream'),'file_size',COALESCE((attachment->>'size')::bigint,0),'storage_path',attachment->>'path','preview_path',NULL,'proposed_doc_type',attachment->>'proposedDocType','confidence',NULL,'status','pending','received_at',COALESCE(data->>'received_at',data->>'created_at'),'email_subject',COALESCE(data->>'subject',''),'from_email',COALESCE(data->>'from_email',''),'source','email','storage_bucket',COALESCE(NULLIF(attachment->>'bucket',''),'email-attachments')) ORDER BY COALESCE(data->>'received_at',data->>'created_at') DESC),'[]'::jsonb)::text FROM candidates;";
    const emailAttachments=parseJsonLine(await runPsql(sql))||[];
    const prospectDocuments=await recordsWhere('prospect_documents','lead_id',leadId);
    const prospectAttachments=prospectDocuments
      .filter(document=>!['validated','rejected'].includes(String(document.status||'')))
      .map(document=>({attachment_id:`prospect:${document.id}`,filename:document.file_name||document.document_name||'document',content_type:document.mime_type||'application/octet-stream',file_size:Number(document.file_size||0),storage_path:document.file_path||'',preview_path:null,proposed_doc_type:null,confidence:null,status:document.status||'pending',received_at:document.uploaded_at||document.created_at||new Date().toISOString(),email_subject:'',from_email:'',source:'prospect_documents'}));
    return json(res,origin,200,{ok:true,attachments:[...prospectAttachments,...emailAttachments],unimported_attachments:[]},requestId);
  }
  const body=await readJsonBody(req),action=String(body.action||'');
  if(action==='move'){
    const documentId=String(body.document_id||''),documentType=String(body.document_type||'').trim().toLowerCase(),customLabel=String(body.custom_label||'').normalize('NFKC').trim().slice(0,160);
    if(!uuidPattern.test(documentId)||!allowedDocumentTypes.has(documentType)||(documentType==='custom'&&!customLabel))return json(res,origin,400,{ok:false,error:'invalid_move'},requestId);
    const existing=parseJsonLine(await runPsql("SELECT data::text FROM taxiassur.records WHERE collection='crm_lead_documents' AND record_id="+quoteLiteral(documentId)+" AND data->>'lead_id'="+quoteLiteral(leadId)+" LIMIT 1;"));if(!existing)return json(res,origin,404,{ok:false,error:'not_found'},requestId);
    const reset=existing.status==='validated',now=new Date().toISOString(),updates={document_type:documentType,custom_label:documentType==='custom'?customLabel:null,updated_at:now,...(reset?{status:'pending',validated_at:null,validated_by:null}:{})};
    await runPsql("BEGIN;UPDATE taxiassur.records SET data=data||"+quoteLiteral(JSON.stringify(updates))+"::jsonb,updated_at=now(),revision=revision+1 WHERE collection='crm_lead_documents' AND record_id="+quoteLiteral(documentId)+";INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',"+quoteLiteral(session.sub)+",'crm_document_moved','crm_lead_document',"+quoteLiteral(documentId)+","+quoteLiteral(requestId)+"::uuid,"+quoteLiteral(JSON.stringify({lead_id:leadId,document_type:documentType,validation_reset:reset}))+"::jsonb);COMMIT;");
    return json(res,origin,200,{ok:true,document:{...existing,...updates},validation_reset:reset},requestId);
  }
  if(action==='import_reference'){
    const documentType=String(body.document_type||'').trim().toLowerCase(),customLabel=String(body.custom_label||'').normalize('NFKC').trim().slice(0,160),bucket=String(body.bucket||''),filePath=String(body.file_path||'').replace(/^\/+/,'');
    const buckets=new Set(['email-attachments','prospect-documents','crm-documents']);
    if(!allowedDocumentTypes.has(documentType)||(documentType==='custom'&&!customLabel)||!buckets.has(bucket)||!filePath||filePath.includes('..'))return json(res,origin,400,{ok:false,error:'invalid_document_reference'},requestId);
    const physicalPath=safeLegacyStoragePath(bucket,filePath);if(!existsSync(physicalPath))return json(res,origin,404,{ok:false,error:'file_missing'},requestId);
    const duplicate=parseJsonLine(await runPsql("SELECT data::text FROM taxiassur.records WHERE collection='crm_lead_documents' AND data->>'lead_id'="+quoteLiteral(leadId)+" AND data->>'file_path'="+quoteLiteral(filePath)+" LIMIT 1;"));if(duplicate)return json(res,origin,200,{ok:true,document:duplicate,idempotent:true},requestId);
    const id=randomUUID(),now=new Date().toISOString(),document={id,lead_id:leadId,document_type:documentType,custom_label:documentType==='custom'?customLabel:null,file_name:safeFileName(body.file_name||path.basename(filePath)),file_path:filePath,bucket,file_size:Number(body.file_size||statSync(physicalPath).size),mime_type:String(body.mime_type||'application/octet-stream'),status:'pending',uploaded_by:session.sub,uploaded_at:now,created_at:now,updated_at:now};
    await runPsql("BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('crm_lead_documents',"+quoteLiteral(id)+","+quoteLiteral(JSON.stringify(document))+"::jsonb,'admin');INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('admin',"+quoteLiteral(session.sub)+",'document_reference_imported','crm_lead_document',"+quoteLiteral(id)+","+quoteLiteral(requestId)+"::uuid);COMMIT;");
    return json(res,origin,201,{ok:true,document},requestId);
  }
  if(action==='reject'){
    const attachmentId=String(body.attachment_id||''),prospectMatch=/^prospect:([0-9a-f-]{36})$/i.exec(attachmentId),emailMatch=/^([0-9a-f-]{36}):([0-9]{1,5})$/i.exec(attachmentId),now=new Date().toISOString();
    if(prospectMatch){const document=parseJsonLine(await runPsql("UPDATE taxiassur.records SET data=data||"+quoteLiteral(JSON.stringify({status:'rejected',rejected_at:now,rejected_by:session.sub,updated_at:now}))+"::jsonb,updated_at=now(),revision=revision+1 WHERE collection='prospect_documents' AND record_id="+quoteLiteral(prospectMatch[1])+" AND data->>'lead_id'="+quoteLiteral(leadId)+" RETURNING data::text;"));if(!document)return json(res,origin,404,{ok:false,error:'attachment_not_found'},requestId);return json(res,origin,200,{ok:true,document},requestId);}
    if(emailMatch){const message=parseJsonLine(await runPsql("SELECT data::text FROM taxiassur.records WHERE collection='email_messages' AND record_id="+quoteLiteral(emailMatch[1])+" AND COALESCE(data->>'lead_id',data->>'case_id')="+quoteLiteral(leadId)+" LIMIT 1;")),index=Number(emailMatch[2]),items=Array.isArray(message?.attachments)?message.attachments:[];if(!items[index])return json(res,origin,404,{ok:false,error:'attachment_not_found'},requestId);items[index]={...items[index],status:'ignored',rejected_at:now,rejected_by:session.sub};await runPsql("UPDATE taxiassur.records SET data=data||"+quoteLiteral(JSON.stringify({attachments:items,updated_at:now}))+"::jsonb,updated_at=now(),revision=revision+1 WHERE collection='email_messages' AND record_id="+quoteLiteral(emailMatch[1])+";");return json(res,origin,200,{ok:true},requestId);}
    return json(res,origin,400,{ok:false,error:'invalid_attachment'},requestId);
  }
  if(action!=='classify')return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);
  const attachmentId=String(body.attachment_id||''),prospectMatch=/^prospect:([0-9a-f-]{36})$/i.exec(attachmentId),match=/^([0-9a-f-]{36}):([0-9]{1,5})$/i.exec(attachmentId);const documentType=String(body.document_type||'').trim().toLowerCase(),customLabel=String(body.custom_label||'').normalize('NFKC').trim().slice(0,160);
  if((!match&&!prospectMatch)||!allowedDocumentTypes.has(documentType)||(documentType==='custom'&&!customLabel))return json(res,origin,400,{ok:false,error:'invalid_classification'},requestId);
  if(prospectMatch){
    const existing=parseJsonLine(await runPsql("SELECT data::text FROM taxiassur.records WHERE collection='prospect_documents' AND record_id="+quoteLiteral(prospectMatch[1])+" AND data->>'lead_id'="+quoteLiteral(leadId)+" LIMIT 1;"));
    if(!existing)return json(res,origin,404,{ok:false,error:'attachment_not_found'},requestId);
    const now=new Date().toISOString(),document={...existing,document_type:documentType,custom_label:documentType==='custom'?customLabel:null,status:'pending',validated:false,updated_at:now};
    await runPsql("BEGIN;DELETE FROM taxiassur.records WHERE collection='prospect_documents' AND record_id="+quoteLiteral(prospectMatch[1])+";INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('crm_lead_documents',"+quoteLiteral(prospectMatch[1])+","+quoteLiteral(JSON.stringify(document))+"::jsonb,'admin');UPDATE taxiassur.file_objects SET document_type="+quoteLiteral(documentType)+",owner_type='crm',updated_at=now() WHERE id="+quoteLiteral(prospectMatch[1])+"::uuid;INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',"+quoteLiteral(session.sub)+",'prospect_document_classified','crm_lead_document',"+quoteLiteral(prospectMatch[1])+","+quoteLiteral(requestId)+"::uuid,"+quoteLiteral(JSON.stringify({lead_id:leadId,document_type:documentType}))+"::jsonb);COMMIT;");
    return json(res,origin,200,{ok:true,success:true,document},requestId);
  }
  const message=parseJsonLine(await runPsql("SELECT data::text FROM taxiassur.records WHERE collection='email_messages' AND record_id="+quoteLiteral(match[1])+" AND COALESCE(data->>'lead_id',data->>'case_id')="+quoteLiteral(leadId)+" LIMIT 1;"));const index=Number(match[2]),items=Array.isArray(message?.attachments)?message.attachments:[],attachment=items[index];
  if(!attachment||!String(attachment.path||''))return json(res,origin,404,{ok:false,error:'attachment_not_found'},requestId);
  const duplicate=parseJsonLine(await runPsql("SELECT data::text FROM taxiassur.records WHERE collection='crm_lead_documents' AND data->>'lead_id'="+quoteLiteral(leadId)+" AND data->>'file_path'="+quoteLiteral(String(attachment.path))+" LIMIT 1;"));if(duplicate)return json(res,origin,200,{ok:true,document:duplicate,idempotent:true},requestId);
  const id=randomUUID(),now=new Date().toISOString(),document={id,lead_id:leadId,document_type:documentType,custom_label:documentType==='custom'?customLabel:null,file_name:safeFileName(attachment.filename||'piece-jointe'),file_path:String(attachment.path),bucket:String(attachment.bucket||'email-attachments'),file_size:Number(attachment.size||0),mime_type:String(attachment.contentType||'application/octet-stream'),status:'pending',uploaded_by:'email',uploaded_at:message.received_at||now,created_at:now,updated_at:now,metadata:{source:'email',email_message_id:match[1],attachment_index:index}};
  items[index]={...attachment,status:'assigned',assigned_document_id:id,proposedDocType:documentType,classification_method:'manual'};const messageUpdates={attachments:items,updated_at:now};
  await runPsql("BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('crm_lead_documents',"+quoteLiteral(id)+","+quoteLiteral(JSON.stringify(document))+"::jsonb,'admin');UPDATE taxiassur.records SET data=data||"+quoteLiteral(JSON.stringify(messageUpdates))+"::jsonb,updated_at=now(),revision=revision+1 WHERE collection='email_messages' AND record_id="+quoteLiteral(match[1])+";INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',"+quoteLiteral(session.sub)+",'email_attachment_classified','crm_lead_document',"+quoteLiteral(id)+","+quoteLiteral(requestId)+"::uuid,"+quoteLiteral(JSON.stringify({lead_id:leadId,email_message_id:match[1],attachment_index:index,document_type:documentType}))+"::jsonb);COMMIT;");
  return json(res,origin,201,{ok:true,document},requestId);
}
async function adminDocumentCollection(req,res,origin,requestId,leadId){
  const session=await verifiedAdminSession(req);
  if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const lead=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)} LIMIT 1;`));
  if(!lead)return json(res,origin,404,{ok:false,error:'lead_not_found'},requestId);
  if(req.method==='GET'){
    const documents=await recordsWhere('crm_lead_documents','lead_id',leadId);
    const templates=(await recordsAll('crm_communication_templates')).filter((row)=>String(row.stage)==='collecte_documents'&&row.is_active!==false&&['email','sms','whatsapp'].includes(String(row.channel)));
    if(!templates.some(row=>String(row.channel)==='sms'))templates.push({id:'native-document-request-sms',template_key:'documents_request_sms',template_name:'Demande de pièces par SMS',channel:'sms',body_text:'Bonjour {{first_name}}, pour finaliser votre dossier TaxiAssur, merci de déposer les pièces demandées dans votre espace sécurisé : {{prospect_space_url}}',variables:['first_name','prospect_space_url'],stage:'collecte_documents',is_active:true});
    return json(res,origin,200,{ok:true,lead,documents,templates},requestId);
  }
  const body=await readJsonBody(req);
  const action=String(body.action||'');
  if(action==='add_custom'){
    const label=String(body.label||'').normalize('NFKC').trim().slice(0,160);
    if(!label)return json(res,origin,400,{ok:false,error:'invalid_label'},requestId);
    const duplicate=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_lead_documents' AND data->>'lead_id'=${quoteLiteral(leadId)} AND data->>'document_type'='custom' AND lower(data->>'custom_label')=lower(${quoteLiteral(label)}) LIMIT 1;`));
    if(duplicate)return json(res,origin,200,{ok:true,document:duplicate,idempotent:true},requestId);
    const id=randomUUID(),now=new Date().toISOString(),document={id,lead_id:leadId,document_type:'custom',custom_label:label,status:'missing',created_at:now,updated_at:now};
    await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('crm_lead_documents',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(document))}::jsonb,'admin');`);
    return json(res,origin,201,{ok:true,document},requestId);
  }
  if(action==='remove_custom'){
    const label=String(body.label||'').normalize('NFKC').trim().slice(0,160);
    if(!label)return json(res,origin,400,{ok:false,error:'invalid_label'},requestId);
    await runPsql(`DELETE FROM taxiassur.records WHERE collection='crm_lead_documents' AND data->>'lead_id'=${quoteLiteral(leadId)} AND data->>'document_type'='custom' AND lower(data->>'custom_label')=lower(${quoteLiteral(label)});`);
    return json(res,origin,200,{ok:true},requestId);
  }
  if(action==='send_email'){
    const recipient=String(lead.email||'').trim().toLowerCase();
    const subject=String(body.subject||'Documents necessaires - TaxiAssur').normalize('NFKC').trim().slice(0,200);
    const message=String(body.message||'').normalize('NFKC').trim().slice(0,12000);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)||!subject||!message)return json(res,origin,400,{ok:false,error:'invalid_email_request'},requestId);
    const mailId=randomUUID(),interactionId=randomUUID(),now=new Date().toISOString();
    const mail={id:mailId,recipient,subject,body:message,status:'pending',attempts:0,next_attempt_at:now,created_at:now};
    const interaction={id:interactionId,lead_id:leadId,type:'email',channel:'email',subject,body:message,status:'queued',metadata:{template_key:String(body.template_key||'')},created_at:now};
    await runPsql(`BEGIN;
      INSERT INTO taxiassur.records(collection,record_id,data,origin) VALUES('native_email_outbox',${quoteLiteral(mailId)},${quoteLiteral(JSON.stringify(mail))}::jsonb,'admin'),('crm_interactions',${quoteLiteral(interactionId)},${quoteLiteral(JSON.stringify(interaction))}::jsonb,'admin');
      INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata) VALUES('admin',${quoteLiteral(session.sub)},'document_request_email_queued','crm_lead',${quoteLiteral(leadId)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({ recipient, template_key: interaction.metadata.template_key }))}::jsonb);
      COMMIT;`);
    return json(res,origin,200,{ok:true,email_queued:true},requestId);
  }
  return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);
}

async function adminLeadRibsList(req,res,origin,requestId,leadId){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const lead=parseJsonLine(await runPsql(`SELECT 1 AS found FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)} LIMIT 1;`));if(!lead)return json(res,origin,404,{ok:false,error:'lead_not_found'},requestId);
  const ribs=(await recordsWhere('lead_rib_uploads','lead_id',leadId)).sort((a,b)=>String(b.uploaded_at||'').localeCompare(String(a.uploaded_at||'')));
  return json(res,origin,200,{ok:true,ribs},requestId);
}
async function adminLeadRibUpload(req,res,origin,requestId,leadId){
  const session=await verifiedAdminSession(req);if(!session)return drainAndJson(req,res,origin,401,{ok:false,error:'invalid_session'},requestId);
  const lead=parseJsonLine(await runPsql(`SELECT 1 AS found FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)} LIMIT 1;`));if(!lead)return drainAndJson(req,res,origin,404,{ok:false,error:'lead_not_found'},requestId);
  const mime=String(req.headers['content-type']||'').split(';')[0].trim().toLowerCase(),extension=allowedMimeTypes.get(mime),name=safeFileName(decodeHeader(req.headers['x-file-name'])),size=Number(req.headers['content-length']||0);
  if(!['pdf','jpg','png'].includes(extension)||!name||!Number.isInteger(size)||size<1||size>5*1024*1024)return drainAndJson(req,res,origin,400,{ok:false,error:'invalid_rib_file'},requestId);
  const id=randomUUID(),relativePath=`${leadId}/ribs/${id}.${extension}`,finalPath=safeStoragePath(relativePath),temporaryPath=path.join(config.documentRoot,'.tmp',`${id}.upload`);mkdirSync(path.dirname(finalPath),{recursive:true});
  const upload=await receiveFile(req,temporaryPath,5*1024*1024);if(upload.size!==size){safeUnlink(temporaryPath);return json(res,origin,400,{ok:false,error:'size_mismatch'},requestId);}const scan=await scanFile(temporaryPath);if(scan.status!=='clean'){safeUnlink(temporaryPath);return json(res,origin,422,{ok:false,error:scan.status==='infected'?'infected_file':'scan_failed'},requestId);}renameSync(temporaryPath,finalPath);
  const now=new Date().toISOString(),rib={id,lead_id:leadId,file_name:name,file_path:relativePath,file_size:upload.size,mime_type:mime,validation_status:'pending',uploaded_by:session.sub,uploaded_at:now,created_at:now,updated_at:now};
  try{await runPsql(`BEGIN;INSERT INTO taxiassur.file_objects(id,owner_type,owner_id,document_type,original_name,storage_path,mime_type,size_bytes,sha256_hex,scan_status,scan_engine,scan_checked_at,status)VALUES(${quoteLiteral(id)}::uuid,'crm',${quoteLiteral(leadId)},'rib',${quoteLiteral(name)},${quoteLiteral(relativePath)},${quoteLiteral(mime)},${upload.size},${quoteLiteral(upload.sha256)},'clean','clamav',now(),'pending');INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('lead_rib_uploads',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(rib))}::jsonb,'admin');INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('admin',${quoteLiteral(session.sub)},'lead_rib_uploaded','lead_rib_upload',${quoteLiteral(id)},${quoteLiteral(requestId)}::uuid);COMMIT;`);}catch(error){safeUnlink(finalPath);throw error;}
  return json(res,origin,201,{ok:true,rib},requestId);
}
async function adminLeadRibPatch(req,res,origin,requestId,leadId,ribId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const body=await readJsonBody(req),status=String(body.validation_status||'');if(!['validated','rejected'].includes(status))return json(res,origin,400,{ok:false,error:'invalid_status'},requestId);
  const existing=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='lead_rib_uploads' AND record_id=${quoteLiteral(ribId)} AND data->>'lead_id'=${quoteLiteral(leadId)} LIMIT 1;`));if(!existing)return json(res,origin,404,{ok:false,error:'not_found'},requestId);
  const clean=(value,max)=>String(value||'').trim().slice(0,max),iban=clean(body.iban,34).replace(/\s/g,'').toUpperCase(),bic=clean(body.bic,11).replace(/\s/g,'').toUpperCase();if(status==='validated'&&((iban&&!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban))||(bic&&!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic))))return json(res,origin,400,{ok:false,error:'invalid_bank_details'},requestId);
  const now=new Date().toISOString(),updates=status==='validated'?{validation_status:status,validated_at:now,validated_by:session.sub,iban:iban||null,bic:bic||null,account_holder_name:clean(body.account_holder_name,150)||null,bank_name:clean(body.bank_name,150)||null,rejection_reason:null,updated_at:now}:{validation_status:status,validated_at:now,validated_by:session.sub,rejection_reason:clean(body.rejection_reason,500)||null,updated_at:now};
  await runPsql(`BEGIN;UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='lead_rib_uploads' AND record_id=${quoteLiteral(ribId)};UPDATE taxiassur.file_objects SET status=${quoteLiteral(status)},updated_at=now() WHERE id=${quoteLiteral(ribId)}::uuid;INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata)VALUES('admin',${quoteLiteral(session.sub)},'lead_rib_reviewed','lead_rib_upload',${quoteLiteral(ribId)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({status}))}::jsonb);COMMIT;`);
  return json(res,origin,200,{ok:true,rib:{...existing,...updates}},requestId);
}
async function adminLeadRibDelete(req,res,origin,requestId,leadId,ribId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const row=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='lead_rib_uploads' AND record_id=${quoteLiteral(ribId)} AND data->>'lead_id'=${quoteLiteral(leadId)} LIMIT 1;`));if(!row)return json(res,origin,404,{ok:false,error:'not_found'},requestId);
  await runPsql(`BEGIN;DELETE FROM taxiassur.file_objects WHERE id=${quoteLiteral(ribId)}::uuid;DELETE FROM taxiassur.records WHERE collection='lead_rib_uploads' AND record_id=${quoteLiteral(ribId)};INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('admin',${quoteLiteral(session.sub)},'lead_rib_deleted','lead_rib_upload',${quoteLiteral(ribId)},${quoteLiteral(requestId)}::uuid);COMMIT;`);if(String(row.file_path||'').startsWith(`${leadId}/ribs/`))safeUnlink(safeStoragePath(row.file_path));return json(res,origin,200,{ok:true},requestId);
}
async function adminLeadRibDownload(req,res,origin,requestId,leadId,ribId){
  if(!await verifiedAdminSession(req))return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const row=parseJsonLine(await runPsql(`SELECT jsonb_build_object('data',r.data,'storage_path',f.storage_path,'mime_type',f.mime_type,'original_name',f.original_name)::text FROM taxiassur.records r JOIN taxiassur.file_objects f ON f.id=r.record_id::uuid WHERE r.collection='lead_rib_uploads' AND r.record_id=${quoteLiteral(ribId)} AND r.data->>'lead_id'=${quoteLiteral(leadId)} AND f.scan_status='clean' LIMIT 1;`));if(!row)return json(res,origin,404,{ok:false,error:'not_found'},requestId);const filePath=safeStoragePath(row.storage_path);if(!existsSync(filePath))return json(res,origin,404,{ok:false,error:'file_missing'},requestId);res.writeHead(200,responseHeaders(origin,requestId,{'Content-Type':row.mime_type,'Content-Length':String(statSync(filePath).size),'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(row.original_name||'rib')}`,'Cache-Control':'private, no-store'}));createReadStream(filePath).pipe(res);
}
async function adminLeadRibEmailRequest(req,res,origin,requestId,leadId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const lead=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)} LIMIT 1;`));if(!lead)return json(res,origin,404,{ok:false,error:'lead_not_found'},requestId);const recipient=String(lead.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))return json(res,origin,400,{ok:false,error:'invalid_email'},requestId);const id=randomUUID(),now=new Date().toISOString(),access=String(lead.access_token||''),link=access?`https://taxiassur.com/espace-prospect/${encodeURIComponent(access)}?tab=documents`:'https://taxiassur.com/espace-prospect?tab=documents',mail={id,recipient,subject:'Votre RIB est requis - TaxiAssur',body:`Bonjour ${lead.first_name||''},\n\nMerci de déposer votre RIB dans votre espace sécurisé :\n${link}\n\nTaxiAssur`,status:'pending',attempts:0,next_attempt_at:now,created_at:now};await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('native_email_outbox',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(mail))}::jsonb,'admin');INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('admin',${quoteLiteral(session.sub)},'lead_rib_request_email_queued','crm_lead',${quoteLiteral(leadId)},${quoteLiteral(requestId)}::uuid);COMMIT;`);return json(res,origin,200,{ok:true,email_queued:true},requestId);
}
async function uploadAdminContractDocument(req, res, origin, requestId, leadId) {
  const session = await verifiedAdminSession(req);
  if (!session) return drainAndJson(req, res, origin, 401, { ok: false, error: 'invalid_session' }, requestId);
  const kind = String(req.headers['x-document-type'] || '').trim().toLowerCase();
  const typeMap = { contract: { field: 'contract_url', documentType: 'contrat' }, special_conditions: { field: 'special_conditions_url', documentType: 'conditions_particulieres' }, contrat_signe: { field: '', documentType: 'contrat_signe' }, attestation_assurance: { field: '', documentType: 'attestation_assurance' }, memo_vehicule: { field: '', documentType: 'memo_vehicule' }, devis_signe: { field: '', documentType: 'devis_signe' } };
  const selectedType = typeMap[kind];
  const field = selectedType?.field || '';
  const documentType = selectedType?.documentType || '';
  const mimeType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const originalName = safeFileName(decodeHeader(req.headers['x-file-name']));
  const declaredSize = Number(req.headers['content-length'] || 0);
  if (!documentType || mimeType !== 'application/pdf' || !originalName || !Number.isInteger(declaredSize) || declaredSize < 1 || declaredSize > maxUploadBytes) {
    return drainAndJson(req, res, origin, 400, { ok: false, error: 'invalid_contract_file' }, requestId);
  }
  const lead = parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)} LIMIT 1;`));
  if (!lead) return drainAndJson(req, res, origin, 404, { ok: false, error: 'lead_not_found' }, requestId);
  const fileId = randomUUID();
  const relativePath = `${leadId}/contracts/${fileId}.pdf`;
  const finalPath = safeStoragePath(relativePath);
  const temporaryPath = path.join(config.documentRoot, '.tmp', `${fileId}.upload`);
  mkdirSync(path.dirname(finalPath), { recursive: true });
  const upload = await receiveFile(req, temporaryPath, maxUploadBytes);
  if (upload.size !== declaredSize) {
    safeUnlink(temporaryPath);
    return json(res, origin, 400, { ok: false, error: 'size_mismatch' }, requestId);
  }
  const scan = await scanFile(temporaryPath);
  if (scan.status !== 'clean') {
    const quarantinePath = path.join(config.documentRoot, 'quarantine', `${fileId}.pdf`);
    renameSync(temporaryPath, quarantinePath);
    return json(res, origin, 422, { ok: false, error: scan.status === 'infected' ? 'infected_file' : 'scan_failed' }, requestId);
  }
  renameSync(temporaryPath, finalPath);
  const now = new Date().toISOString();
  const document = { id: fileId, lead_id: leadId, document_type: documentType, file_name: originalName, file_path: relativePath, file_size: upload.size, mime_type: mimeType, status: 'validated', validated: true, uploaded_by: session.sub, uploaded_at: now, created_at: now, updated_at: now };
  const previousPath = field ? String(lead[field] || '') : '';
  const leadFileUpdates = field ? { [field]: relativePath, updated_at: now } : { updated_at: now };
  try {
    await runPsql(`BEGIN;
      INSERT INTO taxiassur.file_objects (id, owner_type, owner_id, document_type, original_name, storage_path, mime_type, size_bytes, sha256_hex, scan_status, scan_engine, scan_checked_at, status)
      VALUES (${quoteLiteral(fileId)}::uuid, 'crm', ${quoteLiteral(leadId)}, ${quoteLiteral(documentType)}, ${quoteLiteral(originalName)}, ${quoteLiteral(relativePath)}, 'application/pdf', ${upload.size}, ${quoteLiteral(upload.sha256)}, 'clean', 'clamav', now(), 'validated');
      INSERT INTO taxiassur.records (collection, record_id, data, origin) VALUES ('crm_lead_documents', ${quoteLiteral(fileId)}, ${quoteLiteral(JSON.stringify(document))}::jsonb, 'admin');
      UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(leadFileUpdates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)};
      INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata) VALUES('admin',${quoteLiteral(session.sub)},'contract_document_uploaded','crm_lead',${quoteLiteral(leadId)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({ kind, file_id: fileId, size_bytes: upload.size }))}::jsonb);
      COMMIT;`);
  } catch (error) {
    safeUnlink(finalPath);
    throw error;
  }
  if (previousPath.startsWith(`${leadId}/contracts/`) && previousPath !== relativePath) {
    safeUnlink(safeStoragePath(previousPath));
  }
  const contractLabels={contrat:'Votre contrat',conditions_particulieres:'Vos conditions particulières',contrat_signe:'Votre contrat signé',attestation_assurance:'Votre attestation d’assurance',memo_vehicule:'Votre mémo véhicule',devis_signe:'Votre devis signé'};
  const emailQueued=await queueProspectEventEmail(lead,`${contractLabels[documentType]||'Nouveau document'} disponible - TaxiAssur`,`${contractLabels[documentType]||'Un nouveau document'} est disponible dans votre espace TaxiAssur.`, 'documents', {lead_id:leadId,document_id:fileId,document_type:documentType});
  return json(res, origin, 201, { ok: true, document, field, path: relativePath, email_queued: emailQueued }, requestId);
}

async function uploadProspectDocument(req, res, origin, requestId) {
  const token = prospectToken(req) || clientToken(req);
  const lead = token ? await leadByToken(token) : null;
  if (!lead || !uuidPattern.test(String(lead.id || ''))) return drainAndJson(req, res, origin, 403, { ok: false, error: 'invalid_access' }, requestId);
  const mimeType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const extension = allowedMimeTypes.get(mimeType);
  const documentType = String(req.headers['x-document-type'] || '').trim().toLowerCase();
  const requestIdHeader = String(req.headers['x-document-request-id'] || '').trim();
  const documentRequestId = uuidPattern.test(requestIdHeader) ? requestIdHeader : '';
  const originalName = safeFileName(decodeHeader(req.headers['x-file-name']));
  const declaredSize = Number(req.headers['content-length'] || 0);
  if (!extension || !allowedDocumentTypes.has(documentType) || !originalName || !Number.isInteger(declaredSize) || declaredSize < 1 || declaredSize > maxUploadBytes) {
    return drainAndJson(req, res, origin, 400, { ok: false, error: 'invalid_file' }, requestId);
  }
  const fileId = randomUUID();
  const relativePath = `${lead.id}/prospect/${fileId}.${extension}`;
  const finalPath = safeStoragePath(relativePath);
  const temporaryPath = path.join(config.documentRoot, '.tmp', `${fileId}.upload`);
  mkdirSync(path.dirname(finalPath), { recursive: true });
  const upload = await receiveFile(req, temporaryPath, maxUploadBytes);
  if (upload.size !== declaredSize) {
    safeUnlink(temporaryPath);
    return json(res, origin, 400, { ok: false, error: 'size_mismatch' }, requestId);
  }
  const scan = await scanFile(temporaryPath);
  if (scan.status !== 'clean') {
    const quarantinePath = path.join(config.documentRoot, 'quarantine', `${fileId}.${extension}`);
    renameSync(temporaryPath, quarantinePath);
    await insertFileObject({ id: fileId, leadId: lead.id, documentType, originalName, relativePath: `quarantine/${fileId}.${extension}`, mimeType, size: upload.size, sha256: upload.sha256, scan, status: 'quarantined' });
    return json(res, origin, 422, { ok: false, error: scan.status === 'infected' ? 'infected_file' : 'scan_failed' }, requestId);
  }
  renameSync(temporaryPath, finalPath);
  try {
    await insertFileObject({ id: fileId, leadId: lead.id, documentType, documentRequestId, originalName, relativePath, mimeType, size: upload.size, sha256: upload.sha256, scan, status: 'pending' });
  } catch (error) {
    safeUnlink(finalPath);
    throw error;
  }
  return json(res, origin, 201, { ok: true, document: { id: fileId, document_type: documentType, file_name: originalName, file_size: upload.size, mime_type: mimeType, status: 'pending', uploaded_at: new Date().toISOString() } }, requestId);
}

async function downloadProspectDocument(req, res, origin, requestId, documentId) {
  if (!uuidPattern.test(documentId)) return json(res, origin, 404, { ok: false, error: 'not_found' }, requestId);
  const token = prospectToken(req) || clientToken(req);
  const lead = token ? await leadByToken(token) : null;
  if (!lead) return json(res, origin, 403, { ok: false, error: 'invalid_access' }, requestId);
  const relatedIds=await stronglyRelatedLeadIds(String(lead.id));const relatedSql=relatedIds.map(quoteLiteral).join(',');
  const sql = `SELECT jsonb_build_object('id', id, 'storage_path', storage_path, 'original_name', original_name, 'mime_type', mime_type, 'size_bytes', size_bytes, 'scan_status', scan_status)::text FROM taxiassur.file_objects WHERE id = ${quoteLiteral(documentId)}::uuid AND owner_id IN (${relatedSql}) AND scan_status = 'clean' LIMIT 1;`;
  let row = parseJsonLine(await runPsql(sql));
  let filePath;
  if (row) {
    filePath = safeStoragePath(row.storage_path);
  } else {
    const legacySql = `SELECT jsonb_build_object('id', data ->> 'id', 'storage_path', data ->> 'file_path', 'original_name', COALESCE(data ->> 'file_name', data ->> 'document_name', 'document'), 'mime_type', COALESCE(data ->> 'mime_type', 'application/octet-stream'))::text FROM taxiassur.records WHERE collection = 'prospect_documents' AND record_id = ${quoteLiteral(documentId)} AND data ->> 'lead_id' IN (${relatedSql}) LIMIT 1;`;
    row = parseJsonLine(await runPsql(legacySql));
    if (!row?.storage_path) return json(res, origin, 404, { ok: false, error: 'not_found' }, requestId);
    filePath = safeLegacyStoragePath('prospect-documents', row.storage_path);
    if (existsSync(filePath)) row.size_bytes = statSync(filePath).size;
  }
  if (!existsSync(filePath)) return json(res, origin, 404, { ok: false, error: 'file_missing' }, requestId);
  res.writeHead(200, responseHeaders(origin, requestId, { 'Content-Type': row.mime_type, 'Content-Length': String(row.size_bytes), 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(row.original_name)}`, 'Cache-Control': 'private, no-store' }));
  createReadStream(filePath).pipe(res);
}

async function downloadProspectFinalDocument(req, res, origin, requestId, documentId) {
  if (!uuidPattern.test(documentId)) return json(res, origin, 404, { ok: false, error: 'not_found' }, requestId);
  const token = prospectToken(req) || clientToken(req);
  const lead = token ? await leadByToken(token) : null;
  if (!lead) return json(res, origin, 403, { ok: false, error: 'invalid_access' }, requestId);
  const sql = `SELECT jsonb_build_object('storage_path', data ->> 'file_path', 'original_name', COALESCE(data ->> 'file_name', 'document'), 'mime_type', COALESCE(data ->> 'mime_type', 'application/octet-stream'))::text FROM taxiassur.records WHERE collection = 'crm_lead_documents' AND record_id = ${quoteLiteral(documentId)} AND data ->> 'lead_id' = ${quoteLiteral(String(lead.id))} AND data ->> 'status' = 'validated' AND data ->> 'document_type' IN ('contrat_signe','attestation_assurance','memo_vehicule') LIMIT 1;`;
  const row = parseJsonLine(await runPsql(sql));
  if (!row?.storage_path) return json(res, origin, 404, { ok: false, error: 'not_found' }, requestId);
  const filePath = safeLegacyStoragePath('crm-documents', row.storage_path);
  if (!existsSync(filePath)) return json(res, origin, 404, { ok: false, error: 'file_missing' }, requestId);
  const size = statSync(filePath).size;
  res.writeHead(200, responseHeaders(origin, requestId, { 'Content-Type': row.mime_type, 'Content-Length': String(size), 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(row.original_name)}`, 'Cache-Control': 'private, no-store' }));
  createReadStream(filePath).pipe(res);
}

async function updateProspectQuote(req, res, origin, requestId, quoteId) {
  const token = prospectToken(req) || clientToken(req);
  const lead = token ? await leadByToken(token) : null;
  if (!lead) return json(res, origin, 403, { ok: false, error: 'invalid_access' }, requestId);
  const body = await readJsonBody(req);
  const action = String(body.action || '');
  if (!['validate', 'refuse', 'request_modification'].includes(action)) return json(res, origin, 400, { ok: false, error: 'invalid_action' }, requestId);
  const now = new Date().toISOString();
  const updates = action === 'validate'
    ? { status: 'validated', validated_at: now }
    : action === 'refuse'
      ? { status: 'refused', refused_at: now, refusal_reason: String(body.reason || '').slice(0, 500) }
      : { modification_requested: true, modification_requested_at: now, requested_options: body.options || {}, modification_message: String(body.message || '').slice(0, 1000) };
  const relatedSql=(await stronglyRelatedLeadIds(String(lead.id))).map(quoteLiteral).join(',');
  const sql = `WITH updated AS (UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(updates))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='lead_company_quotes' AND record_id=${quoteLiteral(quoteId)} AND data->>'lead_id' IN (${relatedSql}) RETURNING data) INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id,metadata) SELECT 'prospect',${quoteLiteral(String(lead.id))},${quoteLiteral(`quote_${action}`)},'lead_company_quote',${quoteLiteral(quoteId)},${quoteLiteral(requestId)}::uuid,${quoteLiteral(JSON.stringify({ action }))}::jsonb FROM updated RETURNING (SELECT data::text FROM updated);`;
  const quote = parseJsonLine(await runPsql(sql));
  if(quote&&action==='validate'){
    const automaticRefusal={status:'refused',refused_at:now,refusal_reason:null,auto_refused_after_quote_validation:true,updated_at:now};
    await runPsql(`UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify(automaticRefusal))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='lead_company_quotes' AND record_id<>${quoteLiteral(quoteId)} AND data->>'lead_id' IN (${relatedSql}) AND COALESCE(data->>'status','pending')<>'validated';`);
  }
  if(quote){const eventId=randomUUID(),labels={validate:'Devis valide par le prospect',refuse:'Devis refuse par le prospect',request_modification:'Modification de devis demandee'},event={id:eventId,event_type:action==='validate'?'quote_validated':action==='refuse'?'quote_refused':'quote_modification_requested',lead_id:String(lead.id),message:`${labels[action]} - ${lead.full_name||`${lead.first_name||''} ${lead.last_name||''}`.trim()||lead.email||'Prospect'}`,priority:action==='validate'?'high':'normal',metadata:{lead_name:lead.full_name||lead.name||null,quote_id:quoteId,company_id:quote.company_id||quote.insurance_company_id||null},created_at:now,is_read:false};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('crm_event_notifications',${quoteLiteral(eventId)},${quoteLiteral(JSON.stringify(event))}::jsonb,'server');`);}
  return quote ? json(res, origin, 200, { ok: true, quote }, requestId) : json(res, origin, 404, { ok: false, error: 'not_found' }, requestId);
}

async function downloadProspectQuote(req, res, origin, requestId, quoteId) {
  const token = prospectToken(req) || clientToken(req);
  const lead = token ? await leadByToken(token) : null;
  if (!lead) return json(res, origin, 403, { ok: false, error: 'invalid_access' }, requestId);
  const relatedSql=(await stronglyRelatedLeadIds(String(lead.id))).map(quoteLiteral).join(',');
  const sql = `SELECT data::text FROM taxiassur.records WHERE collection='lead_company_quotes' AND record_id=${quoteLiteral(quoteId)} AND data->>'lead_id' IN (${relatedSql}) LIMIT 1;`;
  const quote = parseJsonLine(await runPsql(sql));
  if (!quote) return json(res, origin, 404, { ok: false, error: 'not_found' }, requestId);
  const kind = new URL(req.url || '/', 'http://localhost').searchParams.get('kind');
  const source = kind === 'rc_pro' ? quote.rc_pro_addon_file_url : (quote.quote_file_url || quote.file_url || quote.file_path);
  const storagePath = storageObjectPath(source, 'contract-documents');
  if (!storagePath) return json(res, origin, 404, { ok: false, error: 'not_found' }, requestId);
  const nativePath = safeStoragePath(storagePath);
  const legacyPath = safeLegacyStoragePath('contract-documents', storagePath);
  const filePath = existsSync(nativePath) ? nativePath : legacyPath;
  if (!existsSync(filePath)) return json(res, origin, 404, { ok: false, error: 'file_missing' }, requestId);
  const name = quote.file_name || path.basename(storagePath) || 'devis.pdf';
  const size = statSync(filePath).size;
  res.writeHead(200, responseHeaders(origin, requestId, { 'Content-Type': quote.mime_type || 'application/pdf', 'Content-Length': String(size), 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`, 'Cache-Control': 'private, no-store' }));
  createReadStream(filePath).pipe(res);
}

async function downloadProspectCompanyDocument(req, res, origin, requestId, documentId) {
  if (!uuidPattern.test(documentId)) return json(res, origin, 404, { ok: false, error: 'not_found' }, requestId);
  const token = prospectToken(req) || clientToken(req);
  const lead = token ? await leadByToken(token) : null;
  if (!lead) return json(res, origin, 403, { ok: false, error: 'invalid_access' }, requestId);
  const sql = `SELECT document.data::text FROM taxiassur.records document WHERE document.collection='company_documents' AND document.record_id=${quoteLiteral(documentId)} AND document.data->>'send_with_quote'='true' AND EXISTS (SELECT 1 FROM taxiassur.records quote WHERE quote.collection='lead_company_quotes' AND quote.data->>'lead_id'=${quoteLiteral(String(lead.id))} AND COALESCE(quote.data->>'company_id', quote.data->>'insurance_company_id')=document.data->>'company_id') LIMIT 1;`;
  const document = parseJsonLine(await runPsql(sql));
  if (!document) return json(res, origin, 404, { ok: false, error: 'not_found' }, requestId);
  const storagePath = storageObjectPath(document.file_path || document.file_url, 'company-documents');
  if (!storagePath) return json(res, origin, 404, { ok: false, error: 'not_found' }, requestId);
  const nativePath = safeStoragePath(storagePath);
  const legacyPath = safeLegacyStoragePath('company-documents', storagePath);
  const filePath = existsSync(nativePath) ? nativePath : legacyPath;
  if (!existsSync(filePath)) return json(res, origin, 404, { ok: false, error: 'file_missing' }, requestId);
  const name = document.document_name || document.file_name || path.basename(storagePath) || 'document.pdf';
  const size = statSync(filePath).size;
  res.writeHead(200, responseHeaders(origin, requestId, { 'Content-Type': document.mime_type || 'application/pdf', 'Content-Length': String(size), 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`, 'Cache-Control': 'private, no-store' }));
  createReadStream(filePath).pipe(res);
}

function withPublicCompanyLogo(company, documents) {
  if (!company || !company.id) return company || {};
  const logoDocument = documents.find((document) => String(document.company_id || '') === String(company.id) && String(document.document_type || '').toLowerCase() === 'logo');
  if (!logoDocument?.id) {
    const existing = String(company.logo_url || '');
    const identity = `${company.code || ''} ${company.name || ''}`.toLowerCase();
    const staticFallback = identity.includes('zephir') || identity.includes('zephyr') || identity.includes('zéphir')
      ? '/logo_zephir.svg'
      : identity.includes('swisslife') || identity.includes('swiss life')
        ? '/logo_swisslife.svg'
        : identity.includes('solly') || identity.includes('azar')
          ? '/logo-officiel-solly-azar_0.png'
          : identity.includes('generali')
            ? '/logo_generali.png'
            : /(^|\s)mfa($|\s)/.test(identity)
              ? '/logo_mfa.png'
              : identity.includes('simple') || identity.includes('plu')
                ? '/logo_plu_simple.png'
                : /(^|\s)axa($|\s)/.test(identity)
                  ? '/logo_axa.svg'
                  : null;
    return { ...company, logo_url: staticFallback || (existing.startsWith('/') && !existing.startsWith('/v1/admin/') ? existing : null) };
  }
  return { ...company, logo_url: `/api/platform/v1/public/company-logos/${encodeURIComponent(String(logoDocument.id))}` };
}

async function publicCompanyLogo(res, origin, requestId, documentId) {
  const document = parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='company_documents' AND record_id=${quoteLiteral(documentId)} AND lower(COALESCE(data->>'document_type',''))='logo' LIMIT 1;`));
  if (!document) return json(res, origin, 404, { ok: false, error: 'not_found' }, requestId);
  const storagePath = storageObjectPath(document.file_path || document.file_url, 'company-documents');
  if (!storagePath) return json(res, origin, 404, { ok: false, error: 'not_found' }, requestId);
  const nativePath = safeStoragePath(storagePath);
  const legacyPath = safeLegacyStoragePath('company-documents', storagePath);
  const filePath = existsSync(nativePath) ? nativePath : legacyPath;
  if (!existsSync(filePath)) return json(res, origin, 404, { ok: false, error: 'file_missing' }, requestId);
  const extension = path.extname(filePath).toLowerCase();
  const mime = String(document.mime_type || ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' }[extension] || '')).toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) return json(res, origin, 415, { ok: false, error: 'invalid_file' }, requestId);
  res.writeHead(200, responseHeaders(origin, requestId, { 'Content-Type': mime, 'Content-Length': String(statSync(filePath).size), 'Content-Disposition': 'inline', 'Cache-Control': 'public, max-age=86400' }));
  createReadStream(filePath).pipe(res);
}

async function leadByToken(token) {
  const sql = `SELECT (data || jsonb_build_object('id', record_id))::text FROM taxiassur.records WHERE collection = 'crm_leads' AND data ->> 'access_token' = ${quoteLiteral(token)} AND COALESCE(data ->> 'deleted_at', '') = '' LIMIT 1;`;
  return parseJsonLine(await runPsql(sql));
}

async function recordsWhere(collection, field, value) {
  const sql = `SELECT COALESCE(jsonb_agg(data ORDER BY COALESCE(data ->> 'updated_at', data ->> 'created_at', '') DESC), '[]'::jsonb)::text FROM taxiassur.records WHERE collection = ${quoteLiteral(collection)} AND data ->> ${quoteLiteral(field)} = ${quoteLiteral(value)};`;
  return parseJsonLine(await runPsql(sql)) || [];
}

async function queueProspectEventEmail(lead,subject,intro,tab,metadata={}){
  const recipient=String(lead?.email||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))return false;
  const id=randomUUID(),now=new Date().toISOString(),access=String(lead?.access_token||''),link=access?`https://taxiassur.com/espace-prospect/${encodeURIComponent(access)}?tab=${encodeURIComponent(tab)}`:`https://taxiassur.com/espace-prospect?tab=${encodeURIComponent(tab)}`;
  const mail={id,recipient,subject,body:`Bonjour ${String(lead?.first_name||'')},\n\n${intro}\n\nAccéder à votre espace sécurisé :\n${link}\n\nTaxiAssur`,status:'pending',attempts:0,next_attempt_at:now,created_at:now,...metadata};
  await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('native_email_outbox',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(mail))}::jsonb,'admin');`);
  return true;
}

async function stronglyRelatedLeadIds(leadId) {
  const sql=`WITH target AS (
    SELECT lower(trim(COALESCE(data->>'email',''))) email,regexp_replace(COALESCE(data->>'phone',''),'[^0-9]','','g') phone
    FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(leadId)}
  ) SELECT COALESCE(jsonb_agg(record_id),'[]'::jsonb)::text FROM taxiassur.records,target
    WHERE collection='crm_leads' AND (record_id=${quoteLiteral(leadId)} OR (
      target.email<>'' AND target.phone<>'' AND lower(trim(COALESCE(data->>'email','')))=target.email
      AND regexp_replace(COALESCE(data->>'phone',''),'[^0-9]','','g')=target.phone));`;
  const ids=parseJsonLine(await runPsql(sql))||[];
  return ids.length?ids.map(String):[String(leadId)];
}

async function recordsForRelatedLeads(collection,leadId) {
  if(!/^[a-z0-9_]+$/.test(collection))throw new Error('invalid_collection');
  const ids=await stronglyRelatedLeadIds(leadId),idSql=ids.map(quoteLiteral).join(',');
  const sql=`SELECT COALESCE(jsonb_agg(data ORDER BY COALESCE(data->>'updated_at',data->>'created_at',data->>'uploaded_at','') DESC),'[]'::jsonb)::text FROM taxiassur.records WHERE collection=${quoteLiteral(collection)} AND data->>'lead_id' IN (${idSql});`;
  return parseJsonLine(await runPsql(sql))||[];
}

function readableQuotePath(value) {
  const storagePath=storageObjectPath(value,'contract-documents');if(!storagePath)return false;
  try{return existsSync(safeStoragePath(storagePath))||existsSync(safeLegacyStoragePath('contract-documents',storagePath));}catch{return false;}
}

async function preferredQuotesForLead(leadId) {
  const rows=await recordsForRelatedLeads('lead_company_quotes',leadId),byCompany=new Map();
  for(const raw of rows){
    const quote={...raw},quoteSource=String(quote.quote_file_url||quote.quote_pdf_url||quote.file_url||quote.file_path||''),rcSource=String(quote.rc_pro_addon_file_url||'');
    const hasFile=readableQuotePath(quoteSource),hasRc=readableQuotePath(rcSource);
    if(!hasFile){quote.quote_file_url=null;quote.quote_pdf_url=null;quote.file_url=null;quote.file_path=null;}
    if(!hasRc)quote.rc_pro_addon_file_url=null;
    const companyId=String(quote.company_id||quote.insurance_company_id||quote.id||''),statusScore=['validated','quote_submitted','submitted','refused'].includes(String(quote.status||''))?10:0,score=(hasFile?100:0)+(hasRc?20:0)+statusScore+Date.parse(String(quote.updated_at||quote.created_at||''))/1e15;
    const previous=byCompany.get(companyId);if(!previous||score>previous.score)byCompany.set(companyId,{quote,score});
  }
  return [...byCompany.values()].map(item=>item.quote);
}

async function recordsWhereWithMirror(collection, field, value) {
  if (!/^[a-z0-9_]+$/.test(collection) || !/^[a-z0-9_]+$/.test(field)) throw new Error('invalid_collection');
  const native=await recordsWhere(collection,field,value);
  try {
    const sql=`SELECT COALESCE(jsonb_agg(data ORDER BY COALESCE(data->>'updated_at',data->>'created_at',data->>'uploaded_at','') DESC),'[]'::jsonb)::text FROM supabase_rest.${collection} WHERE data->>${quoteLiteral(field)}=${quoteLiteral(value)};`;
    const mirror=parseJsonLine(await runPsql(sql))||[];
    const nativeIds=new Set(native.map(row=>String(row?.id||'')));
    return native.concat(mirror.filter(row=>!nativeIds.has(String(row?.id||''))));
  } catch(error) {
    console.warn('[records-mirror-fallback]',{collection,error:error instanceof Error?error.message:'unknown'});
    return native;
  }
}

async function recordsAll(collection) {
  const sql = `SELECT COALESCE(jsonb_agg(data), '[]'::jsonb)::text FROM taxiassur.records WHERE collection = ${quoteLiteral(collection)};`;
  return parseJsonLine(await runPsql(sql)) || [];
}

async function insertFileObject(file) {
  const now = new Date().toISOString();
  const document = { id: file.id, lead_id: String(file.leadId), document_type: file.documentType, file_name: file.originalName, file_path: file.relativePath, file_size: file.size, mime_type: file.mimeType, status: file.status, validated: false, uploaded_by: 'prospect', uploaded_at: now, created_at: now, updated_at: now, security_scan_status: file.scan.status, security_scan_engine: 'clamav', security_scan_checked_at: now };
  const lead=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='crm_leads' AND record_id=${quoteLiteral(String(file.leadId))} LIMIT 1;`))||{};
  const leadName=String(lead.full_name||`${lead.first_name||''} ${lead.last_name||''}`.trim()||lead.name||'Prospect non renseigné');
  const leadEmail=String(lead.email||'Non renseigné');
  const leadPhone=String(lead.phone||'Non renseigné');
  const leadUrl=`https://taxiassur.com/backoffice/crm/lead/${encodeURIComponent(String(file.leadId))}`;
  const isRib=String(file.documentType).toLowerCase()==='rib';
  const pushId=randomUUID();
  const push={id:pushId,event_type:'document_uploaded',lead_id:String(file.leadId),message:`${isRib?'Nouveau RIB':'Nouveau document'} de ${leadName} : ${file.originalName}`,priority:isRib?'high':'normal',metadata:{lead_name:leadName,document_type:file.documentType,file_name:file.originalName,document_id:file.id},created_at:now,is_read:false};
  const notificationId=randomUUID();
  const notification={id:notificationId,recipient:'team@taxiassur.com',subject:`${isRib?'Nouveau RIB':'Nouveau document'} déposé - ${leadName}`,body:`Un prospect a déposé ${isRib?'un RIB':'un document'} dans son espace TaxiAssur.\n\nProspect : ${leadName}\nEmail : ${leadEmail}\nTéléphone : ${leadPhone}\nRéférence : ${file.leadId}\nType : ${file.documentType}\nFichier : ${file.originalName}\n\nOuvrir directement la fiche CRM :\n${leadUrl}`,status:'pending',attempts:0,next_attempt_at:now,created_at:now,lead_id:String(file.leadId),document_id:file.id,attachment_path:file.relativePath,attachment_name:file.originalName,attachment_mime:file.mimeType};
  const sql = `BEGIN;
    INSERT INTO taxiassur.file_objects (id, owner_type, owner_id, document_type, original_name, storage_path, mime_type, size_bytes, sha256_hex, scan_status, scan_engine, scan_checked_at, status)
    VALUES (${quoteLiteral(file.id)}::uuid, 'prospect', ${quoteLiteral(String(file.leadId))}, ${quoteLiteral(file.documentType)}, ${quoteLiteral(file.originalName)}, ${quoteLiteral(file.relativePath)}, ${quoteLiteral(file.mimeType)}, ${file.size}, ${quoteLiteral(file.sha256)}, ${quoteLiteral(file.scan.status)}, 'clamav', now(), ${quoteLiteral(file.status)});
    INSERT INTO taxiassur.records (collection, record_id, data, origin) VALUES ('prospect_documents', ${quoteLiteral(file.id)}, ${quoteLiteral(JSON.stringify(document))}::jsonb, 'local');
    INSERT INTO taxiassur.records (collection, record_id, data, origin) VALUES ('native_email_outbox', ${quoteLiteral(notificationId)}, ${quoteLiteral(JSON.stringify(notification))}::jsonb, 'local');
    INSERT INTO taxiassur.records (collection, record_id, data, origin) VALUES ('crm_event_notifications', ${quoteLiteral(pushId)}, ${quoteLiteral(JSON.stringify(push))}::jsonb, 'server');
    ${file.documentRequestId ? `UPDATE taxiassur.records SET data = data || ${quoteLiteral(JSON.stringify({ statut: 'recu', document_filename: file.originalName, document_url: file.relativePath, updated_at: now }))}::jsonb, updated_at = now(), revision = revision + 1 WHERE collection = 'crm_document_requests' AND record_id = ${quoteLiteral(file.documentRequestId)} AND data ->> 'lead_id' = ${quoteLiteral(String(file.leadId))};` : ''}
    UPDATE taxiassur.records SET data = jsonb_set(data, '{total_uploaded_files}', to_jsonb(COALESCE(NULLIF(data ->> 'total_uploaded_files', '')::integer, 0) + 1), true), updated_at = now(), revision = revision + 1 WHERE collection = 'crm_leads' AND record_id = ${quoteLiteral(String(file.leadId))};
    INSERT INTO taxiassur.audit_events (actor_type, actor_id, action, target_type, target_id, request_id, metadata) VALUES ('prospect', ${quoteLiteral(String(file.leadId))}, 'document_uploaded', 'prospect_document', ${quoteLiteral(file.id)}, ${quoteLiteral(randomUUID())}::uuid, ${quoteLiteral(JSON.stringify({ document_type: file.documentType, size_bytes: file.size, scan_status: file.scan.status }))}::jsonb);
    COMMIT;`;
  await runPsql(sql);
}

function receiveFile(req, destination, limit) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(destination, { flags: 'wx' });
    const hash = createHash('sha256');
    let size = 0;
    let settled = false;
    const fail = (error) => { if (settled) return; settled = true; output.destroy(); safeUnlink(destination); reject(error); };
    req.on('data', (chunk) => { size += chunk.length; if (size > limit) { req.destroy(); return fail(publicError(413, 'file_too_large')); } hash.update(chunk); });
    req.on('error', fail); output.on('error', fail);
    output.on('finish', () => { if (!settled) { settled = true; resolve({ size, sha256: hash.digest('hex') }); } });
    req.pipe(output);
  });
}

async function readRawBody(req, maxBytes = 65536) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { const value = Buffer.from(chunk); size += value.length; if (size > maxBytes) throw publicError(413, 'payload_too_large'); chunks.push(value); }
  return Buffer.concat(chunks).toString('utf8');
}

async function readJsonBody(req) {
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 65536) throw publicError(413, 'payload_too_large'); }
  try { return raw ? JSON.parse(raw) : {}; } catch { throw publicError(400, 'invalid_json'); }
}

function scanFile(filePath) {
  return new Promise((resolve) => {
    const executable=existsSync(config.clamdScanPath)?config.clamdScanPath:config.clamScanPath;
    if (!existsSync(executable)) return resolve({ status: 'error' });
    const resident=executable===config.clamdScanPath;
    const args = resident ? [`--config-file=${config.clamdConfigPath}`, '--no-summary', filePath] : ['--no-summary', ...(config.clamDatabasePath?[`--database=${config.clamDatabasePath}`]:[]), filePath];
    const child = spawn(executable, args, { windowsHide: true, stdio: 'ignore' });
    const timer = setTimeout(() => child.kill(), resident?30000:120000);
    child.on('error', () => { clearTimeout(timer); resolve({ status: 'error' }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ status: code === 0 ? 'clean' : code === 1 ? 'infected' : 'error' }); });
  });
}

async function recordsAllWithMirror(collection) {
  if (!/^[a-z0-9_]+$/.test(collection)) throw new Error('invalid_collection');
  const native=await recordsAll(collection);
  try {
    const mirror=parseJsonLine(await runPsql(`SELECT COALESCE(jsonb_agg(data),'[]'::jsonb)::text FROM supabase_rest.${collection};`))||[];
    const nativeIds=new Set(native.map(row=>String(row?.id||'')));
    return native.concat(mirror.filter(row=>!nativeIds.has(String(row?.id||''))));
  } catch(error) {
    console.warn('[records-all-mirror-fallback]',{collection,error:error instanceof Error?error.message:'unknown'});
    return native;
  }
}

function runPsql(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn(config.psqlPath, ['-X', '-q', '-A', '-t', '-h', config.dbHost, '-p', config.dbPort, '-U', config.dbUser, '-d', config.dbName, '-v', 'ON_ERROR_STOP=1', '-f', '-'], { windowsHide: true, env: { ...process.env, PGPASSWORD: config.dbPassword, PGCLIENTENCODING: 'UTF8', PGOPTIONS: '-c statement_timeout=30000' } });
    let stdout = ''; let stderr = ''; let settled = false;
    const timer = setTimeout(() => { child.kill(); finish(publicError(503, 'database_timeout')); }, 35000);
    function finish(error, output = '') { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve(output); }
    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); }); child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });
    child.on('error', finish); child.on('close', (code) => code === 0 ? finish(null, stdout) : finish(new Error(`psql_${code}:${stderr.slice(0, 300)}`)));
    child.stdin.end(sql);
  });
}

function loadEnv(files) { const result = { ...process.env }; for (const file of files) { if (!existsSync(file)) continue; for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) { const line = raw.trim(); if (!line || line.startsWith('#')) continue; const index = line.indexOf('='); if (index < 1) continue; const key = line.slice(0, index).trim(); let value = line.slice(index + 1).trim(); if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1); if (!(key in result)) result[key] = value; } } return result; }
function quoteLiteral(value) { return `'${String(value ?? '').replace(/'/g, "''")}'`; }
function parseJsonLine(output) { const line = String(output || '').trim().split(/\r?\n/).filter(Boolean).at(-1); return line ? JSON.parse(line) : null; }
function prospectToken(req) { const value = String(req.headers['x-prospect-token'] || '').trim(); return tokenPattern.test(value) ? value.toLowerCase() : ''; }
function internalAuthorized(req) { const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''); return Boolean(auth && config.internalToken) && secureEqual(auth, config.internalToken); }
function secureEqual(left, right) { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); }
function decodeHeader(value) { try { return decodeURIComponent(String(value || '')); } catch { return ''; } }
function safeFileName(value) { return String(value || '').normalize('NFKC').replace(/[\x00-\x1f\x7f/\\]/g, '_').trim().slice(0, 180); }
function brandedEmailHtml({title,name,intro,ctaLabel,ctaUrl,details=[]}) {
  const escape=(value)=>String(value||'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);
  let safeUrl='https://taxiassur.com';
  try { const parsed=new URL(String(ctaUrl||'')); if(parsed.protocol==='https:'&&['taxiassur.com','www.taxiassur.com'].includes(parsed.hostname))safeUrl=parsed.toString(); } catch {}
  const detailList=(Array.isArray(details)?details:[]).map(item=>`<li style="margin:8px 0">${escape(item)}</li>`).join('');
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827"><div style="max-width:640px;margin:auto;padding:24px 12px"><div style="background:#111827;padding:24px;text-align:center;border-radius:16px 16px 0 0"><div style="color:#fbbf24;font-size:28px;font-weight:800">TaxiAssur</div><div style="color:#d1d5db;margin-top:6px">Votre assurance taxi, simplement</div></div><div style="background:#fff;padding:30px;border-radius:0 0 16px 16px"><h1 style="font-size:24px;margin-top:0">${escape(title)}</h1><p>Bonjour ${escape(name||'Madame, Monsieur')},</p><p style="line-height:1.65">${escape(intro)}</p>${detailList?`<div style="background:#f9fafb;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:8px"><ul style="line-height:1.5;margin:0;padding-left:20px">${detailList}</ul></div>`:''}<p style="text-align:center;margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#f59e0b;color:#111827;text-decoration:none;font-weight:800;padding:15px 24px;border-radius:10px">${escape(ctaLabel||'ACCÉDER À MON ESPACE')}</a></p><hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0"><p style="margin:0"><strong>TaxiAssur</strong><br>01 80 85 57 86<br><a href="https://taxiassur.com" style="color:#b45309">taxiassur.com</a></p></div></div></body></html>`;
}
function safeStoragePath(relative) { const root = path.resolve(config.documentRoot); const target = path.resolve(root, relative); if (!target.startsWith(`${root}${path.sep}`)) throw publicError(400, 'invalid_path'); return target; }
function safeLegacyStoragePath(bucket, relative) { const root = path.resolve(config.legacyDocumentRoot, bucket); const target = path.resolve(root, relative); if (!target.startsWith(`${root}${path.sep}`)) throw publicError(400, 'invalid_path'); return target; }
function storageObjectPath(value, bucket) { const raw=String(value||'').trim(); if(!raw)return ''; try{const parsed=new URL(raw); const marker=`/${bucket}/`; const index=parsed.pathname.indexOf(marker); return index>=0?decodeURIComponent(parsed.pathname.slice(index+marker.length)):'';}catch{ return raw.replace(new RegExp(`^/?${bucket}/`),'').replace(/^\/+/, ''); } }
function safeUnlink(file) { try { unlinkSync(file); } catch {} }
function originAllowed(origin) { return !origin || config.allowedOrigins.has(origin); }
function clientIp(req) { return String(req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'] || req.socket.remoteAddress || '').split(',')[0].trim(); }
function rateLimitScope(pathname) {
  if (pathname === '/v1/auth/login') return 'auth-login';
  if (pathname === '/v1/auth/session' || pathname === '/v1/auth/logout') return 'auth-session';
  if (pathname.startsWith('/v1/auth/')) return 'auth-recovery';
  if (pathname === '/v1/public/analytics' || pathname === '/v1/public/page-views') return 'analytics';
  if (pathname.startsWith('/v1/public/')) return 'public';
  return 'application';
}
function takeRateSlot(ip) { const now = Date.now(); const value = rateBuckets.get(ip) || { start: now, count: 0 }; if (now - value.start > 60000) { value.start = now; value.count = 0; } value.count += 1; rateBuckets.set(ip, value); return value.count <= 120; }
function positiveInt(value, fallback, max) { const number = Number(value); return Number.isInteger(number) && number > 0 && number <= max ? number : fallback; }
function publicError(statusCode, publicCode) { const error = new Error(publicCode); error.statusCode = statusCode; error.publicCode = publicCode; return error; }
function responseHeaders(origin, requestId, extra = {}) { return { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store', 'X-Request-Id': requestId, ...(origin && config.allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Content-Length,X-Prospect-Token,X-Client-Token,X-Document-Type,X-Document-Request-Id,X-File-Name,Authorization,Apikey,X-Client-Info,Prefer,Range', 'Access-Control-Max-Age': '600' } : {}), ...extra }; }
function send(res, origin, status, body, headers, requestId) { res.writeHead(status, responseHeaders(origin, requestId, headers)); res.end(body); }
function json(res, origin, status, body, requestId) { send(res, origin, status, JSON.stringify(body), { 'Content-Type': 'application/json; charset=utf-8' }, requestId); }
function drainAndJson(req, res, origin, status, body, requestId) { req.resume(); return json(res, origin, status, body, requestId); }
async function adminWebImport(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);
  if(req.method==='GET'){const [credentials,jobs,clientsLegacy,leads]=await Promise.all([recordsAll('insurance_web_credentials'),recordsAll('web_import_jobs'),recordsAll('crm_clients'),recordsAll('crm_leads')]),publicCredentials=credentials.map(({password_encrypted,secret_encrypted,...row})=>({...row,password_configured:Boolean(password_encrypted||secret_encrypted)})),credentialNames=new Map(credentials.map(row=>[String(row.id),String(row.company_name||'')])),clients=[...clientsLegacy,...leads.filter(row=>['active_client','client_actif','signed'].includes(String(row.current_stage_key||row.status||'').toLowerCase()))].filter((row,index,all)=>all.findIndex(item=>String(item.id)===String(row.id))===index).map(row=>({id:row.id,prenom:row.prenom||row.first_name||'',nom:row.nom||row.last_name||row.name||'',email:row.email||'',contract_number:row.contract_number||row.policy_number||''}));return json(res,origin,200,{ok:true,credentials:publicCredentials.sort((a,b)=>String(a.company_name).localeCompare(String(b.company_name),'fr')),jobs:jobs.sort((a,b)=>Date.parse(String(b.created_at||''))-Date.parse(String(a.created_at||''))).slice(0,50).map(row=>({...row,insurance_web_credentials:{company_name:credentialNames.get(String(row.credential_id))||''}})),clients},requestId);}
  const body=await readJsonBody(req),action=String(body.action||'');if(action==='add_credential'){const company=String(body.company_name||''),username=String(body.username||'').trim().slice(0,250),password=String(body.password||''),portal=String(body.portal_url||'').trim().slice(0,500),allowed=new Set(['solly_azar','generali','2ma','zephir','plus_simple']);if(!allowed.has(company)||!username||password.length<4||!/^https:\/\//i.test(portal))return json(res,origin,400,{ok:false,error:'invalid_credential'},requestId);const id=randomUUID(),now=new Date().toISOString(),record={id,company_name:company,portal_url:portal,username,secret_encrypted:encryptPrivateValue(password),status:'active',created_by:session.sub,created_at:now};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('insurance_web_credentials',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(record))}::jsonb,'admin');`);return json(res,origin,201,{ok:true,credential:{...record,secret_encrypted:undefined,password_configured:true}},requestId);}if(action==='start'){const credentialId=String(body.credential_id||''),clientId=String(body.client_id||''),contract=String(body.contract_number||'').trim().slice(0,120);if(!uuidPattern.test(credentialId)||!uuidPattern.test(clientId)||!contract)return json(res,origin,400,{ok:false,error:'invalid_import_request'},requestId);const credential=parseJsonLine(await runPsql(`SELECT data::text FROM taxiassur.records WHERE collection='insurance_web_credentials' AND record_id=${quoteLiteral(credentialId)} LIMIT 1;`));if(!credential?.secret_encrypted)return json(res,origin,409,{ok:false,error:'credential_unavailable'},requestId);const id=randomUUID(),now=new Date().toISOString(),job={id,credential_id:credentialId,client_id:clientId,contract_number:contract,status:'manual_required',progress_percentage:0,total_documents:0,imported_documents:0,error_message:'Connecteur assureur à valider avant toute connexion automatisée.',logs:[{at:now,message:'Tâche créée sans transmission du mot de passe au navigateur.'}],created_at:now,completed_at:null};await runPsql(`INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES('web_import_jobs',${quoteLiteral(id)},${quoteLiteral(JSON.stringify(job))}::jsonb,'admin');`);return json(res,origin,202,{ok:true,job,message:'Tâche sécurisée créée. Validation du connecteur assureur requise.'},requestId);}return json(res,origin,400,{ok:false,error:'invalid_action'},requestId);
}
async function adminSchedulerGenerate(req,res,origin,requestId){
  const session=await verifiedAdminSession(req);if(!session)return json(res,origin,401,{ok:false,error:'invalid_session'},requestId);const body=await readJsonBody(req),type=String(body.content_type||''),keywords=(Array.isArray(body.keywords)?body.keywords:[]).map(value=>String(value).trim().slice(0,100)).filter(Boolean);if(!['blog','faq','review'].includes(type))return json(res,origin,400,{ok:false,error:'invalid_content_type'},requestId);if(type==='review')return json(res,origin,422,{ok:false,error:'real_review_required',message:'Un avis client ne peut pas être inventé. Importez un témoignage réel et vérifié.'},requestId);const openai=await effectiveOpenAi();if(!openai.key)return json(res,origin,503,{ok:false,error:'ai_unavailable'},requestId);const topic=keywords[0]||'assurance taxi',prompt=type==='faq'?`Rédige une FAQ utile et exacte en français sur "${topic}" pour TaxiAssur. Retourne uniquement un JSON valide {"question":"","answer":""}. N'invente aucun prix ni garantie.`:`Rédige un article utile et exact en français sur "${topic}" pour TaxiAssur. Retourne uniquement un JSON valide {"title":"","excerpt":"","content":"","meta_description":""}. N'invente aucun prix ni garantie.`,response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${openai.key}`,'Content-Type':'application/json'},body:JSON.stringify({model:openai.model,temperature:.3,max_tokens:type==='faq'?900:3000,response_format:{type:'json_object'},messages:[{role:'system',content:'Tu es rédacteur spécialisé en assurance taxi française. Réponds en JSON valide.'},{role:'user',content:prompt}]})}),payload=await response.json().catch(()=>null);if(!response.ok)return json(res,origin,502,{ok:false,error:'ai_provider_error'},requestId);let generated;try{generated=JSON.parse(String(payload?.choices?.[0]?.message?.content||''));}catch{return json(res,origin,502,{ok:false,error:'invalid_ai_content'},requestId);}const id=randomUUID(),now=new Date().toISOString(),publish=body.auto_publish===true,record=type==='faq'?{id,question:String(generated.question||topic).slice(0,500),answer:String(generated.answer||'').slice(0,10000),category:'assurance-taxi',published:publish,is_active:publish,status:publish?'published':'draft',created_at:now,updated_at:now}:{id,title:String(generated.title||topic).slice(0,250),slug:contentSlug(generated.title||topic),excerpt:String(generated.excerpt||'').slice(0,1000),content:String(generated.content||'').slice(0,250000),meta_description:String(generated.meta_description||'').slice(0,500),published:publish,status:publish?'published':'draft',published_at:publish?now:null,created_at:now,updated_at:now};const collection=type==='faq'?'faqs':'blog_posts';await runPsql(`BEGIN;INSERT INTO taxiassur.records(collection,record_id,data,origin)VALUES(${quoteLiteral(collection)},${quoteLiteral(id)},${quoteLiteral(JSON.stringify(record))}::jsonb,'admin-ai');UPDATE taxiassur.records SET data=data||${quoteLiteral(JSON.stringify({last_generated_at:now}))}::jsonb,updated_at=now(),revision=revision+1 WHERE collection='content_schedule' AND record_id=${quoteLiteral(String(body.schedule_id||''))};INSERT INTO taxiassur.audit_events(actor_type,actor_id,action,target_type,target_id,request_id)VALUES('admin',${quoteLiteral(session.sub)},'scheduled_content_generated',${quoteLiteral(collection)},${quoteLiteral(id)},${quoteLiteral(requestId)}::uuid);COMMIT;`);return json(res,origin,201,{ok:true,item:record,published:publish},requestId);
}
