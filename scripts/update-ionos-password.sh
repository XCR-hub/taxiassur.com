#!/bin/bash

# Script de mise à jour du mot de passe IONOS
# Pour TaxiAssur - 23 Février 2026

set -e

echo "🔐 MISE À JOUR MOT DE PASSE IONOS"
echo "=================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI n'est pas installé${NC}"
    echo ""
    echo "Installation :"
    echo "  brew install supabase/tap/supabase"
    echo "  ou"
    echo "  npm install -g supabase"
    exit 1
fi

echo -e "${BLUE}📋 Configuration actuelle :${NC}"
echo "  Email : team@taxiassur.com"
echo "  Nouveau mot de passe : TAXIassur!,"
echo ""

# Vérifier si on est connecté
echo -e "${BLUE}🔍 Vérification de la connexion Supabase...${NC}"
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vous n'êtes pas connecté à Supabase${NC}"
    echo ""
    echo "Connectez-vous avec :"
    echo "  supabase login"
    exit 1
fi

echo -e "${GREEN}✅ Connecté à Supabase${NC}"
echo ""

# Afficher les secrets actuels
echo -e "${BLUE}📝 Secrets IONOS actuels :${NC}"
supabase secrets list --project-ref bpwcakjtwgdtfwghylwv 2>/dev/null | grep IONOS || echo "  (aucun trouvé)"
echo ""

# Demander confirmation
read -p "Voulez-vous mettre à jour le mot de passe IONOS ? (o/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    echo "❌ Opération annulée"
    exit 0
fi

echo ""
echo -e "${BLUE}⚙️  Mise à jour des secrets...${NC}"

# Mettre à jour tous les secrets IONOS
supabase secrets set \
  --project-ref bpwcakjtwgdtfwghylwv \
  IONOS_SMTP_HOST="smtp.ionos.fr" \
  IONOS_SMTP_PORT="587" \
  IONOS_EMAIL_USER="team@taxiassur.com" \
  IONOS_EMAIL_PASSWORD="TAXIassur!,"

echo ""
echo -e "${GREEN}✅ Secrets mis à jour avec succès !${NC}"
echo ""

# Vérifier les nouveaux secrets
echo -e "${BLUE}🔍 Vérification des secrets :${NC}"
supabase secrets list --project-ref bpwcakjtwgdtfwghylwv | grep IONOS
echo ""

echo -e "${GREEN}✅ CONFIGURATION COMPLÈTE${NC}"
echo ""
echo "Les emails partiront maintenant de team@taxiassur.com"
echo "avec le nouveau mot de passe."
echo ""
echo -e "${YELLOW}🧪 Test recommandé :${NC}"
echo "  1. Remplir le formulaire sur https://taxiassur.com"
echo "  2. Vérifier la réception des emails à team@taxiassur.com"
echo ""
echo -e "${BLUE}📚 Documentation complète :${NC}"
echo "  - CONFIGURATION_EMAILS_COMPLETE_23FEV2026.md"
echo "  - UPDATE_IONOS_PASSWORD_23FEV2026.md"
echo ""
