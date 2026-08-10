#!/usr/bin/env bash

# Configure Supabase secrets without storing sensitive values in Git.
# Usage:
#   SUPABASE_PROJECT_REF=drohhxrkoequjphvabvq BREVO_API_KEY=... bash scripts/configure-supabase-secrets.sh
# Missing values are requested with hidden input, or skipped if left empty.

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-drohhxrkoequjphvabvq}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if ! command -v supabase >/dev/null 2>&1; then
  echo -e "${RED}Supabase CLI introuvable.${NC}"
  echo "Installation: npm install -g supabase"
  exit 1
fi

if ! supabase projects list >/dev/null 2>&1; then
  echo -e "${YELLOW}Connexion Supabase requise.${NC}"
  supabase login
fi

echo -e "${YELLOW}Configuration des secrets Supabase pour ${PROJECT_REF}.${NC}"
echo "Les valeurs saisies ne seront pas affichees. Les JSON multilignes doivent etre fournis via variable d'environnement."

declare -a SECRET_NAMES=(
  IONOS_EMAIL_PASSWORD
  IONOS_SMTP_PASSWORD
  IONOS_IMAP_PASSWORD
  BREVO_API_KEY
  SENDGRID_API_KEY
  RESEND_API_KEY
  OPENAI_API_KEY
  ANTHROPIC_API_KEY
  GEMINI_API_KEY
  OPENROUTER_API_KEY
  HUGGINGFACE_API_KEY
  LINKEDIN_ACCESS_TOKEN
  LINKEDIN_CLIENT_SECRET
  PINTEREST_ACCESS_TOKEN
  TWILIO_AUTH_TOKEN
  KEYYO_WEBHOOK_SECRET
  INDEXNOW_KEY
  TWITTER_CLIENT_ID
  TWITTER_CLIENT_SECRET
  TWITTER_REDIRECT_URI
  TWILIO_WHATSAPP_WEBHOOK_URL
  TWILIO_WHATSAPP_STATUS_URL
  BREVO_WEBHOOK_TOKEN
  BREVO_SMS_WEBHOOK_TOKEN
  PEXELS_API_KEY
  GOOGLE_SEARCH_CONSOLE_API_KEY
  GOOGLE_CSE_API_KEY
  GOOGLE_PLACES_API_KEY
  GOOGLE_CLIENT_SECRET
  GOOGLE_SEARCH_CONSOLE_CREDENTIALS
  GOOGLE_OAUTH_JSON
  SERP_API_KEY
  HUNTER_API_KEY
  HUNTER_IO_API_KEY
  MAKE_API_TOKEN
  FTP_PASSWORD
  MONETICO_MAC_KEY
)

declare -A DEFAULTS=(
  [IONOS_SMTP_HOST]="smtp.ionos.fr"
  [IONOS_SMTP_PORT]="465"
  [IONOS_SMTP_USER]="team@taxiassur.com"
  [IONOS_EMAIL_USER]="team@taxiassur.com"
  [IONOS_IMAP_HOST]="imap.ionos.fr"
  [IONOS_IMAP_PORT]="993"
  [IONOS_IMAP_USER]="team@taxiassur.com"
  [BREVO_SENDER_EMAIL]="team@taxiassur.com"
  [BREVO_SENDER_NAME]="TaxiAssur"
  [LINKEDIN_CLIENT_ID]="78jlte9c2mbjw5"
  [TWILIO_ACCOUNT_SID]=""
  [TWILIO_MESSAGING_SERVICE_SID]=""
  [GOOGLE_CSE_CX]="73ba86b5aae9b4add"
  [GOOGLE_CSE_CX_ID]="73ba86b5aae9b4add"
  [GOOGLE_CLIENT_ID]=""
  [SITE_URL]="https://taxiassur.com"
  [FTP_HOST]="home749874859.1and1-data.host"
  [FTP_USER]=""
  [FTP_PORT]="22"
  [FTP_PROTOCOL]="sftp"
  [GITHUB_REPO]="XCR-hub/taxiassur.com"
  [MONETICO_MODE]="production"
  [MONETICO_TPE]=""
  [MONETICO_SOCIETE]="taxiassur"
)

set_secret() {
  local name="$1"
  local value="${!name-}"

  if [[ -z "${value}" && -n "${DEFAULTS[$name]+x}" ]]; then
    value="${DEFAULTS[$name]}"
  fi

  if [[ -z "${value}" ]]; then
    read -r -s -p "${name} (laisser vide pour ignorer): " value
    echo
  fi

  if [[ -z "${value}" ]]; then
    echo "SKIP ${name}"
    return
  fi

  supabase secrets set "${name}=${value}" --project-ref "${PROJECT_REF}" >/dev/null
  echo "OK   ${name}"
}

for name in "${SECRET_NAMES[@]}"; do
  set_secret "${name}"
done

for name in "${!DEFAULTS[@]}"; do
  set_secret "${name}"
done

echo -e "${GREEN}Configuration terminee. Verification des noms de secrets:${NC}"
supabase secrets list --project-ref "${PROJECT_REF}"
