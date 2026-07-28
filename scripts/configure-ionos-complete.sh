#!/bin/bash

echo "🔧 Configuration complète des secrets IONOS et SFTP..."

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé"
    echo "Installation: npm install -g supabase"
    exit 1
fi

# Vérifier la connexion au projet
if ! supabase status &> /dev/null; then
    echo "❌ Pas de connexion au projet Supabase"
    echo "Utilisez: supabase link --project-ref votre-project-ref"
    exit 1
fi

echo ""
read -s -p "Mot de passe IONOS email : " IONOS_EMAIL_PASSWORD
echo ""
read -s -p "Mot de passe SFTP IONOS : " SFTP_PASSWORD
echo ""
if [ -z "$IONOS_EMAIL_PASSWORD" ] || [ -z "$SFTP_PASSWORD" ]; then
    echo "Mot de passe vide"
    exit 1
fi
IONOS_EMAIL_PASSWORD_PROMPTED=1
echo "📧 Configuration des secrets IONOS Email..."

# IONOS SMTP (envoi d'emails) - Port 465 pour TLS direct
supabase secrets set IONOS_SMTP_HOST="smtp.ionos.fr"
supabase secrets set IONOS_SMTP_PORT="465"
supabase secrets set IONOS_SMTP_USER="team@taxiassur.com"
supabase secrets set IONOS_SMTP_PASSWORD="$IONOS_EMAIL_PASSWORD"
supabase secrets set IONOS_FROM_EMAIL="team@taxiassur.com"
supabase secrets set IONOS_FROM_NAME="TaxiAssur"

# IONOS IMAP (réception d'emails)
supabase secrets set IONOS_IMAP_HOST="imap.ionos.fr"
supabase secrets set IONOS_IMAP_PORT="993"
supabase secrets set IONOS_IMAP_USER="team@taxiassur.com"
supabase secrets set IONOS_IMAP_PASSWORD="$IONOS_EMAIL_PASSWORD"
supabase secrets set IONOS_IMAP_SECURE="true"

echo ""
echo "🚀 Configuration des secrets SFTP (déploiement)..."

# SFTP pour déploiement automatique
supabase secrets set SFTP_HOST="home749874859.1and1-data.host"
supabase secrets set SFTP_PORT="22"
supabase secrets set SFTP_USER="acc1591324770"
supabase secrets set SFTP_PASSWORD="$SFTP_PASSWORD"
supabase secrets set SFTP_REMOTE_PATH="/dist"

echo ""
echo "🌐 Configuration des URLs..."

# URLs du site
supabase secrets set SITE_URL="https://taxiassur.pro"
supabase secrets set FRONTEND_URL="https://taxiassur.pro"

echo ""
echo "✅ Configuration terminée !"
echo ""
echo "📋 Secrets configurés :"
echo "   - IONOS SMTP (envoi emails)"
echo "   - IONOS IMAP (réception emails)"
echo "   - SFTP IONOS (déploiement)"
echo "   - URLs du site"
echo ""
echo "🔍 Pour vérifier : supabase secrets list"
echo ""
echo "🎯 Prochaines étapes :"
echo "   1. Tester l'envoi d'email : npm run test:ionos"
echo "   2. Déployer le site : npm run deploy"
echo ""
