#!/bin/bash

# Script de configuration Monético en mode Production
# TaxiAssur - 23 Février 2026

set -e

echo "🚀 CONFIGURATION MONÉTICO - MODE PRODUCTION"
echo "============================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Vérifier Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI non installé${NC}"
    echo "Installation : brew install supabase/tap/supabase"
    exit 1
fi

echo -e "${BLUE}📋 Informations de Production CIC :${NC}"
echo "  TPE : 7374133"
echo "  Code société : taxiassur"
echo "  Langues : FR, EN"
echo ""

echo -e "${YELLOW}⚠️  ATTENTION : Mode Production${NC}"
echo "  • Les paiements seront RÉELS"
echo "  • Utilisez des VRAIES cartes bancaires"
echo "  • Les débits seront effectifs"
echo ""

# Vérifier connexion Supabase
echo -e "${BLUE}🔍 Vérification connexion Supabase...${NC}"
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Non connecté à Supabase${NC}"
    echo "Connectez-vous avec : supabase login"
    exit 1
fi

echo -e "${GREEN}✅ Connecté à Supabase${NC}"
echo ""

# Afficher les secrets actuels
echo -e "${BLUE}📝 Configuration actuelle :${NC}"
supabase secrets list --project-ref bpwcakjtwgdtfwghylwv 2>/dev/null | grep MONETICO || echo "  (aucun secret Monético trouvé)"
echo ""

# Demander la clé MAC de production
echo -e "${YELLOW}🔐 Clé MAC de Production${NC}"
echo ""
echo "⚠️  IMPORTANT : La clé MAC de production est différente de la clé de test"
echo ""
echo "Où trouver votre clé MAC de production ?"
echo "  1. Connectez-vous à https://www.monetico-services.com/fr"
echo "  2. Menu Configuration > Paramètres TPE"
echo "  3. Section 'Clé de sécurité' ou 'Clé MAC'"
echo "  4. Copiez la clé hexadécimale (40 caractères)"
echo ""
echo "Format attendu : 106FA85BF342FD4EE95C883D82865B5CC1F63890 (exemple)"
echo ""

read -p "Entrez votre clé MAC de PRODUCTION (40 caractères) : " mac_key

# Valider le format
if [ ${#mac_key} -ne 40 ]; then
    echo -e "${RED}❌ Erreur : La clé MAC doit faire 40 caractères${NC}"
    echo "Longueur actuelle : ${#mac_key}"
    exit 1
fi

# Vérifier que c'est bien hexadécimal
if ! [[ $mac_key =~ ^[0-9A-Fa-f]{40}$ ]]; then
    echo -e "${RED}❌ Erreur : La clé MAC doit être hexadécimale (0-9, A-F)${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Format de clé MAC valide${NC}"
echo ""

# Récapitulatif
echo -e "${BLUE}📋 Récapitulatif de la configuration :${NC}"
echo ""
echo "  MONETICO_MODE       = production"
echo "  MONETICO_TPE        = 7374133"
echo "  MONETICO_SOCIETE    = taxiassur"
echo "  MONETICO_MAC_KEY    = ${mac_key:0:10}...${mac_key:30:10}"
echo ""

# Demander confirmation
read -p "Confirmer la configuration en MODE PRODUCTION ? (o/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    echo "❌ Configuration annulée"
    exit 0
fi

echo ""
echo -e "${BLUE}⚙️  Configuration des secrets Supabase...${NC}"
echo ""

# Configurer les secrets
supabase secrets set \
  --project-ref bpwcakjtwgdtfwghylwv \
  MONETICO_MODE="production" \
  MONETICO_TPE="7374133" \
  MONETICO_SOCIETE="taxiassur" \
  MONETICO_MAC_KEY="$mac_key"

echo ""
echo -e "${GREEN}✅ Secrets configurés avec succès !${NC}"
echo ""

# Vérifier les secrets
echo -e "${BLUE}🔍 Vérification des secrets :${NC}"
supabase secrets list --project-ref bpwcakjtwgdtfwghylwv | grep MONETICO
echo ""

echo -e "${GREEN}✅ MONÉTICO EN MODE PRODUCTION${NC}"
echo ""
echo -e "${YELLOW}📋 Prochaines étapes :${NC}"
echo ""
echo "1. Configurer les URLs dans le dashboard Monético :"
echo "   https://www.monetico-services.com/fr"
echo ""
echo "   URL de retour OK :"
echo "   https://taxiassur.com/espace-prospect/paiement-success"
echo ""
echo "   URL de retour KO :"
echo "   https://taxiassur.com/espace-prospect/paiement-error"
echo ""
echo "   URL du webhook serveur :"
echo "   https://bpwcakjtwgdtfwghylwv.supabase.co/functions/v1/monetico-webhook"
echo ""
echo "2. Tester avec un paiement de 1€ :"
echo "   ./scripts/test-monetico-production.sh"
echo ""
echo "3. Vérifier les logs des paiements :"
echo "   Dashboard Supabase > Edge Functions > Logs"
echo ""
echo -e "${RED}⚠️  ATTENTION :${NC}"
echo "  • Les paiements sont maintenant RÉELS"
echo "  • Ne testez PAS avec les cartes de test CIC"
echo "  • Vérifiez chaque paiement dans le dashboard Monético"
echo ""
echo -e "${BLUE}📚 Documentation complète :${NC}"
echo "  MONETICO_PRODUCTION_23FEV2026.md"
echo ""
