#!/bin/bash

# Configuration du secret OpenAI pour les Edge Functions Supabase
# Ce script configure la clé API OpenAI nécessaire pour les publications automatiques

OPENAI_KEY="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"

echo "🔧 Configuration du secret OPENAI_API_KEY dans Supabase..."

# Configurer le secret via Supabase CLI
supabase secrets set OPENAI_API_KEY="$OPENAI_KEY" --project-ref drohhxrkoequjphvabvq

if [ $? -eq 0 ]; then
    echo "✅ Secret OPENAI_API_KEY configuré avec succès !"
    echo ""
    echo "Les publications automatiques sont maintenant activées :"
    echo "  - Pinterest : 3x par jour (10h, 14h, 19h)"
    echo "  - LinkedIn : 2x par jour en semaine (9h, 15h)"
else
    echo "❌ Erreur lors de la configuration du secret"
    echo ""
    echo "Configuration manuelle via Dashboard Supabase :"
    echo "1. Allez sur https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/settings/vault"
    echo "2. Cliquez sur 'New secret'"
    echo "3. Nom : OPENAI_API_KEY"
    echo "4. Valeur : $OPENAI_KEY"
    echo "5. Cliquez sur 'Add secret'"
fi
