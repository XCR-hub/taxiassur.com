param(
  [string]$ProjectRef = 'drohhxrkoequjphvabvq',
  [switch]$ConfirmCriticalMigrationsApplied
)
$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path -Parent $PSScriptRoot
$requiredCriticalMigrations = @(
  (Join-Path $repoRoot 'supabase/migrations/20260810033000_add_monetico_creation_idempotency.sql'),
  (Join-Path $repoRoot 'supabase/migrations/20260810040000_create_communication_delivery_idempotency.sql'),
  (Join-Path $repoRoot 'supabase/migrations/20260810043000_harden_monetico_email_delivery_status.sql'),
  (Join-Path $repoRoot 'supabase/migrations/20260810050000_harden_client_claim_creation.sql')
)
$missingMigrationFiles = @($requiredCriticalMigrations | Where-Object { -not (Test-Path -LiteralPath $_) })
if ($missingMigrationFiles.Count) {
  throw "Required critical migration files are missing: $($missingMigrationFiles -join ', ')"
}
if (-not $ConfirmCriticalMigrationsApplied) {
  throw 'Deployment aborted: apply the critical database migrations first, verify them remotely, then rerun with -ConfirmCriticalMigrationsApplied.'
}
$projectJson = & npx --no-install supabase projects list --output json 2>$null
if ($LASTEXITCODE -ne 0 -or -not ($projectJson -match $ProjectRef)) {
  throw 'An authenticated Supabase CLI session with access to the target project is required. Run: npx supabase login'
}
$requiredRemoteSecrets = @(
  'BREVO_WEBHOOK_TOKEN',
  'BREVO_SMS_WEBHOOK_TOKEN',
  'BREVO_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_WHATSAPP_FROM',
  'MONETICO_MODE',
  'MONETICO_TPE',
  'MONETICO_SOCIETE',
  'MONETICO_MAC_KEY',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WEBHOOK_URL',
  'KEYYO_WEBHOOK_SECRET',
  'INDEXNOW_KEY',
  'TWITTER_CLIENT_ID',
  'TWITTER_CLIENT_SECRET',
  'TWITTER_REDIRECT_URI',
  'TWILIO_WHATSAPP_WEBHOOK_URL',
  'TWILIO_WHATSAPP_STATUS_URL'
)
Write-Host 'Checking required remote webhook secrets...'
$secretJson = & npx supabase secrets list --project-ref $ProjectRef --output json 2>$null
if ($LASTEXITCODE -ne 0) { throw 'Unable to list remote Supabase secrets; deployment aborted.' }
$secretText = $secretJson -join [Environment]::NewLine
$missingSecrets = @($requiredRemoteSecrets | Where-Object {
  $secretText -notmatch ('"name"\s*:\s*"' + [regex]::Escape($_) + '"')
})
if ($missingSecrets.Count) {
  throw "Missing required Supabase secrets: $($missingSecrets -join ', '). Configure them before deployment."
}
Write-Host 'Required webhook secrets are present.'
$functions = @(
  'invite-admin-user',
  'auto-deploy-improvements',
  'ai-code-generator',
  'apply-ai-decision',
  'autonomous-ai-engine',
  'ia-auto-executor',
  'pipeline-action-executor',
  'pipeline-automation-engine',
  'crm-automation-engine',
  'event-processor',
  'master-ai-decision-engine',
  'generate-ai-decisions',
  'llm-autonomous-orchestrator',
  'git-auto-publisher',
  'ultra-autonomous-self-healer',
  'ultron-site-healer',
  'web-import-executor',
  'create-cic-payment-link',
  'emergency-lead-recovery',
  'send-sms',
  'send-sms-brevo',
  'send-crm-email',
  'send-whatsapp',
  'process-notification-queue',
  'process-sms-queue',
  'brevo-webhook-handler',
  'sms-inbound-webhook',
  'twilio-webhook',
  'keyyo-webhook',
  'whatsapp-webhook',
  'whatsapp-status',
  'send-client-access',
  'send-email-ionos',
  'sync-all-emails-complete',
  'sync-ionos-imap',
  'auto-create-leads-from-emails',
  'llm-council-chat',
  'clean-news-excerpts',
  'send-newsletter-campaign',
  'pinterest-publisher',
  'generate-seo-content',
  'indexnow-ping',
  'generate-city-complete',
  'auto-generate-city-page',
  'ai-social-scraper',
  'news-aggregator-master',
  'ai-viral-content-generator',
  'auto-seo-notifier',
  'twitter-oauth-exchange',
  'partner-scraper-outreach',
  'send-outreach-emails',
  'backlink-auto-outreach',
  'unsubscribe-outreach',
  'crm-ai-assistant',
  'realtime-monitoring-engine',
  'llm-brain',
  'keyyo-click-to-call',
  'keyyo-fetch-calls',
  'publish-unified-content',
  'linkedin-ai-content-generator',
  'social-media-publisher',
  'news-auto-publisher',
  'auto-backup-system',
  'fetch-email-replies',
  'sync-ionos-imap-documents',
  'sync-ionos-imap-v2',
  'auto-process-email-attachments',
  'extract-email-attachments',
  'sync-brevo-emails',
  'sync-sendgrid-emails',
  'sync-all-historical-emails',
  'sync-email-history-batch',
  'process-insurer-dossier-sends',
  'send-email',
  'team-email-handler',
  'notify-claim',
  'send-lead-magnet-confirmation',
  'send-intelligent-document-request',
  'upload-client-document',
  'sign-document-url',
  'client-subscription',
  'cic-payment-webhook',
  'create-monetico-payment',
  'get-monetico-payment-form',
  'monetico-webhook',
  'send-payment-link-monetico',
  'test-monetico-signature'
)
$publicNoJwtFunctions = @('unsubscribe-outreach')
foreach ($functionName in $functions) {
  Write-Host "Deploying $functionName..."
  if ($functionName -in $publicNoJwtFunctions) {
    & npx supabase functions deploy $functionName --project-ref $ProjectRef --no-verify-jwt
  } else {
    & npx supabase functions deploy $functionName --project-ref $ProjectRef
  }
  if ($LASTEXITCODE -ne 0) { throw "Deployment failed: $functionName" }
}
Write-Host 'Functions deployed. Run npm run security:verify-production-privileged.'
Write-Host 'Critical migrations were explicitly confirmed before function deployment.'
