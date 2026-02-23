#!/bin/bash

# Fix rapide Monético "TPE Fermé"
# Active le mode production

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${RED}🔧 FIX URGENT - Monético TPE Fermé${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}Problème :${NC} Le TPE est en production mais le code est en mode TEST"
echo -e "${GREEN}Solution :${NC} Activer le mode PRODUCTION"
echo ""

# Vérifier Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI non installé${NC}"
    echo ""
    echo "Installation :"
    echo "  brew install supabase/tap/supabase"
    echo ""
    echo "Ou configurez manuellement via le Dashboard :"
    echo "  https://supabase.com/dashboard/project/bpwcakjtwgdtfwghylwv/settings/functions"
    echo ""
    exit 1
fi

echo -e "${BLUE}📝 Configuration actuelle :${NC}"
supabase secrets list --project-ref bpwcakjtwgdtfwghylwv 2>/dev/null | grep MONETICO || echo "  Aucun secret Monético trouvé"
echo ""

echo -e "${YELLOW}⚡ Action :${NC} Passage en mode PRODUCTION"
echo ""

read -p "Continuer ? (O/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo "❌ Annulé"
    exit 0
fi

echo ""
echo -e "${BLUE}⚙️  Configuration du mode production...${NC}"

# Configurer uniquement le mode (minimum requis pour débloquer)
supabase secrets set \
  --project-ref bpwcakjtwgdtfwghylwv \
  MONETICO_MODE="production"

echo ""
echo -e "${GREEN}✅ Mode PRODUCTION activé !${NC}"
echo ""

echo -e "${YELLOW}⏱️  Attente du rechargement des Edge Functions (30s)...${NC}"
for i in {30..1}; do
    echo -ne "\r   $i secondes restantes...   "
    sleep 1
done
echo ""
echo ""

echo -e "${GREEN}✅ Configuration appliquée${NC}"
echo ""

echo -e "${BLUE}🔍 Nouvelle configuration :${NC}"
supabase secrets list --project-ref bpwcakjtwgdtfwghylwv | grep MONETICO
echo ""

echo -e "${YELLOW}📋 Prochaines étapes :${NC}"
echo ""
echo "1. ✅ Mode production activé"
echo ""
echo "2. ⚠️  Configurez la clé MAC de production :"
echo "   → Récupérez-la sur https://www.monetico-services.com/fr"
echo "   → Menu : Configuration > Paramètres TPE"
echo "   → Exécutez :"
echo ""
echo "   supabase secrets set --project-ref bpwcakjtwgdtfwghylwv \\"
echo "     MONETICO_MAC_KEY='VOTRE_CLE_MAC_PRODUCTION'"
echo ""
echo "3. 🧪 Testez un nouveau paiement :"
echo "   → La référence doit commencer par 'P' (pas 'T')"
echo "   → Le TPE doit accepter le paiement"
echo ""
echo -e "${GREEN}Le TPE devrait maintenant fonctionner !${NC}"
echo ""
