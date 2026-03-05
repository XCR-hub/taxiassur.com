#!/bin/bash

# Configuration du webhook Bolt.new pour l'auto-publication
# Ce script configure le secret BOLT_REBUILD_WEBHOOK_URL dans Supabase

set -e

echo "🔧 Configuration du webhook Bolt.new..."
echo ""

WEBHOOK_URL="https://api.bolt.new/v1/deploy/github-mcmcpmfr"

echo "📍 URL du webhook: $WEBHOOK_URL"
echo ""

# Vérifier si Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé"
    echo ""
    echo "📋 Configuration manuelle requise:"
    echo ""
    echo "1. Aller sur: https://supabase.com/dashboard/project/[votre-projet]/settings/vault"
    echo "2. Cliquer sur 'New secret'"
    echo "3. Name: BOLT_REBUILD_WEBHOOK_URL"
    echo "4. Value: $WEBHOOK_URL"
    echo "5. Cliquer sur 'Add secret'"
    echo ""
    exit 1
fi

# Configurer le secret
echo "⚙️ Configuration du secret BOLT_REBUILD_WEBHOOK_URL..."
supabase secrets set BOLT_REBUILD_WEBHOOK_URL="$WEBHOOK_URL"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Webhook Bolt.new configuré avec succès !"
    echo ""
    echo "📋 Prochaines étapes:"
    echo "1. Le système va automatiquement rebuilder Bolt.new après chaque publication Git"
    echo "2. Les publications sont déclenchées automatiquement toutes les 10 minutes via cron"
    echo "3. Vous pouvez aussi déclencher manuellement depuis le backoffice"
    echo ""
    echo "🧪 Pour tester la configuration:"
    echo "   supabase functions invoke git-auto-publisher"
    echo ""
else
    echo ""
    echo "❌ Erreur lors de la configuration"
    echo ""
    echo "📋 Configuration manuelle requise:"
    echo ""
    echo "1. Aller sur: https://supabase.com/dashboard/project/[votre-projet]/settings/vault"
    echo "2. Cliquer sur 'New secret'"
    echo "3. Name: BOLT_REBUILD_WEBHOOK_URL"
    echo "4. Value: $WEBHOOK_URL"
    echo "5. Cliquer sur 'Add secret'"
    echo ""
    exit 1
fi
