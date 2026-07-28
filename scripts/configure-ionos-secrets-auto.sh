#!/bin/bash

# Configuration automatique des secrets IONOS dans Supabase
# Ce script configure tous les secrets nécessaires pour l'envoi d'emails via IONOS SMTP

echo "🔐 Configuration des secrets IONOS dans Supabase..."

# Vérifier que Supabase CLI est disponible
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé"
    echo "Installez-le avec: npm install -g supabase"
    exit 1
fi

# Vérifier que le projet est lié
if [ ! -f ".supabase/config.toml" ]; then
    echo "❌ Projet Supabase non lié"
    echo "Exécutez: supabase link --project-ref drohhxrkoequjphvabvq"
    exit 1
fi

echo "✅ Supabase CLI détecté"

# Configuration des secrets IONOS
echo ""
read -s -p "Mot de passe IONOS email : " IONOS_EMAIL_PASSWORD
echo ""
if [ -z "$IONOS_EMAIL_PASSWORD" ]; then
    echo "Mot de passe IONOS vide"
    exit 1
fi
IONOS_EMAIL_PASSWORD_PROMPTED=1
echo "📧 Configuration des secrets IONOS SMTP..."

# IONOS_SMTP_HOST
echo "🔧 Configuration de IONOS_SMTP_HOST..."
echo "smtp.ionos.fr" | supabase secrets set IONOS_SMTP_HOST --env-file /dev/stdin 2>&1 | grep -v "^$"

# IONOS_SMTP_PORT
echo "🔧 Configuration de IONOS_SMTP_PORT..."
echo "465" | supabase secrets set IONOS_SMTP_PORT --env-file /dev/stdin 2>&1 | grep -v "^$"

# IONOS_EMAIL_USER
echo "🔧 Configuration de IONOS_EMAIL_USER..."
echo "team@taxiassur.com" | supabase secrets set IONOS_EMAIL_USER --env-file /dev/stdin 2>&1 | grep -v "^$"

# IONOS_EMAIL_PASSWORD
echo "🔧 Configuration de IONOS_EMAIL_PASSWORD..."
printf '%s\n' "$IONOS_EMAIL_PASSWORD" | supabase secrets set IONOS_EMAIL_PASSWORD --env-file /dev/stdin 2>&1 | grep -v "^$"

echo ""
echo "✅ Tous les secrets IONOS ont été configurés avec succès !"
echo ""
echo "📋 Secrets configurés :"
echo "  - IONOS_SMTP_HOST = smtp.ionos.fr"
echo "  - IONOS_SMTP_PORT = 465"
echo "  - IONOS_EMAIL_USER = team@taxiassur.com"
echo "  - IONOS_EMAIL_PASSWORD = ******** (masqué)"
echo ""
echo "🔄 Les Edge Functions vont redémarrer automatiquement dans quelques secondes..."
echo "⏱️  Attendez 30 secondes puis testez l'envoi d'emails"
echo ""
echo "🧪 Pour tester immédiatement :"
echo "   npm run test:ionos"
