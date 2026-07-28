#!/bin/bash

# Script de mise à jour des secrets IONOS dans Supabase
# Date: 15 Janvier 2026

read -s -p "Mot de passe IONOS email : " IONOS_EMAIL_PASSWORD
echo ""
if [ -z "$IONOS_EMAIL_PASSWORD" ]; then
    echo "Mot de passe IONOS vide"
    exit 1
fi
IONOS_EMAIL_PASSWORD_PROMPTED=1
echo "🔧 Mise à jour des secrets IONOS pour Supabase Edge Functions"
echo "=============================================================="
echo ""

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé"
    echo "   Installez-le avec: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI détecté"
echo ""

# Se connecter à Supabase (si pas déjà connecté)
echo "🔐 Vérification de la connexion Supabase..."
supabase projects list &> /dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Vous devez vous connecter à Supabase"
    echo "   Exécutez: supabase login"
    exit 1
fi

echo "✅ Connecté à Supabase"
echo ""

# Lier le projet (si pas déjà lié)
echo "🔗 Liaison avec le projet..."
supabase link --project-ref drohhxrkoequjphvabvq 2>/dev/null
echo ""

# Définir les secrets IONOS
echo "📤 Mise à jour des secrets IONOS..."
echo ""

echo "1/9 IONOS_EMAIL_USER..."
supabase secrets set IONOS_EMAIL_USER=team@taxiassur.com

echo "2/9 IONOS_EMAIL_PASSWORD..."
supabase secrets set IONOS_EMAIL_PASSWORD="$IONOS_EMAIL_PASSWORD"

echo "3/9 IONOS_SMTP_HOST..."
supabase secrets set IONOS_SMTP_HOST=smtp.ionos.fr

echo "4/9 IONOS_SMTP_PORT..."
supabase secrets set IONOS_SMTP_PORT=465

echo "5/9 IONOS_IMAP_HOST..."
supabase secrets set IONOS_IMAP_HOST=imap.ionos.fr

echo "6/9 IONOS_IMAP_PORT..."
supabase secrets set IONOS_IMAP_PORT=993

echo "7/9 IONOS_IMAP_USER..."
supabase secrets set IONOS_IMAP_USER=team@taxiassur.com

echo "8/9 IONOS_IMAP_PASSWORD..."
supabase secrets set IONOS_IMAP_PASSWORD="$IONOS_EMAIL_PASSWORD"

echo "9/9 IONOS_IMAP_TLS..."
supabase secrets set IONOS_IMAP_TLS=true

echo ""
echo "✅ Tous les secrets IONOS ont été mis à jour !"
echo ""

# Redéployer les Edge Functions concernées
echo "🚀 Redéploiement des Edge Functions..."
echo ""

echo "📦 Déploiement de send-email-ionos..."
supabase functions deploy send-email-ionos

echo "📦 Déploiement de sync-ionos-imap-v2..."
supabase functions deploy sync-ionos-imap-v2

echo "📦 Déploiement de sync-ionos-imap..."
supabase functions deploy sync-ionos-imap

echo ""
echo "=============================================================="
echo "✅ Configuration IONOS mise à jour avec succès !"
echo "=============================================================="
echo ""
echo "📋 Paramètres configurés :"
echo "   - Email: team@taxiassur.com"
echo "   - SMTP: smtp.ionos.fr:465 (SSL/TLS direct)"
echo "   - IMAP: imap.ionos.fr:993 (TLS)"
echo ""
echo "🧪 Pour tester :"
echo "   npm run test:email-ionos"
echo ""
