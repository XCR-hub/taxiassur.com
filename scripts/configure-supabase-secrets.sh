#!/bin/bash

# Script de configuration des secrets Supabase
# Exécuter avec: bash scripts/configure-supabase-secrets.sh

set -e

echo "=========================================="
echo "Configuration des Secrets Supabase"
echo "=========================================="
echo ""

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI n'est pas installé${NC}"
    echo "Installation: npm install -g supabase"
    exit 1
fi

echo -e "${YELLOW}📝 Vérification de l'authentification...${NC}"

# Vérifier si on est déjà connecté
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}🔐 Authentification requise...${NC}"
    supabase login
else
    echo -e "${GREEN}✅ Déjà authentifié${NC}"
fi

echo ""
echo -e "${YELLOW}🔗 Liaison au projet...${NC}"
supabase link --project-ref qiavtxpaznxpttkdaevy

echo ""
echo -e "${YELLOW}🔧 Configuration des secrets critiques...${NC}"
echo ""

# Secrets CRITIQUES
echo -e "${GREEN}[1/7] IONOS_EMAIL_PASSWORD${NC}"
supabase secrets set IONOS_EMAIL_PASSWORD="TAXIassur!"

echo -e "${GREEN}[2/7] OPENAI_API_KEY${NC}"
supabase secrets set OPENAI_API_KEY="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"

echo -e "${GREEN}[3/7] BREVO_API_KEY${NC}"
supabase secrets set BREVO_API_KEY="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"

echo -e "${GREEN}[4/7] SENDGRID_API_KEY${NC}"
supabase secrets set SENDGRID_API_KEY="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"

echo -e "${GREEN}[5/7] LINKEDIN_ACCESS_TOKEN${NC}"
supabase secrets set LINKEDIN_ACCESS_TOKEN="AQV7bN8vSwlvNLg2SDGoh7eX_zRtP5bvF_J_KbPm_nPV7CkTy7v5C6j1i4z1ULbARfxQ6VU1uh8bPrnlcTKhG5AttZz6qHLK_m1BcpL4l_dgRIliaW_JkNF6XrXPPLNMXQciIHvETKAqTyHI9pFycw7k1FOqZG98KZeiWy-_lmofY7kdwFsxpRXkbcOL7YNEmzMHgquk82IJg35G3TBKpZgFoDJ4RA6YGzqOjEdNm1kL6lMhrJIFeMz-tCHj0ARTAysBuZ1s6HrsdwCmFuY8DGBQDTMKaCEcRC_BHmbztQM5qQg3sk2oYzazzxAcwDFOkGtmwHaXizpsmHUKNYeOpGPxPajX5Q"

echo -e "${GREEN}[6/7] PINTEREST_ACCESS_TOKEN${NC}"
supabase secrets set PINTEREST_ACCESS_TOKEN="pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA"

echo -e "${GREEN}[7/7] PEXELS_API_KEY${NC}"
supabase secrets set PEXELS_API_KEY="mwktI0rV88p2CHnMP6jliUIPDPBEniubiF7cneG1uFRQ0Yxsu8XmNyG3"

echo ""
echo -e "${YELLOW}📋 Configuration des paramètres IONOS supplémentaires...${NC}"

supabase secrets set IONOS_SMTP_HOST="smtp.ionos.fr"
supabase secrets set IONOS_SMTP_PORT="465"
supabase secrets set IONOS_EMAIL_USER="team@taxiassur.com"
supabase secrets set IONOS_IMAP_HOST="imap.ionos.fr"
supabase secrets set IONOS_IMAP_PORT="993"

echo ""
echo -e "${YELLOW}📋 Configuration Brevo supplémentaire...${NC}"

supabase secrets set BREVO_SENDER_EMAIL="team@taxiassur.com"
supabase secrets set BREVO_SENDER_NAME="TaxiAssur"

echo ""
echo -e "${GREEN}✅ Configuration terminée !${NC}"
echo ""
echo -e "${YELLOW}📝 Liste des secrets configurés :${NC}"
echo ""

supabase secrets list

echo ""
echo -e "${GREEN}=========================================="
echo "✅ Tous les secrets ont été configurés !"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}ℹ️  Prochaines étapes :${NC}"
echo "1. Tester l'envoi d'email (send-payment-link-email)"
echo "2. Tester le chatbot IA (avec OpenAI)"
echo "3. Vérifier les publications LinkedIn/Pinterest"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT - Secrets Monético PRODUCTION :${NC}"
echo "Les secrets Monético sont en MODE TEST actuellement."
echo "Pour passer en PRODUCTION, demandez à Ingineco :"
echo "  - MONETICO_TPE"
echo "  - MONETICO_MAC_KEY"
echo "Puis exécutez :"
echo '  supabase secrets set MONETICO_MODE="production"'
echo '  supabase secrets set MONETICO_TPE="VOTRE_TPE"'
echo '  supabase secrets set MONETICO_MAC_KEY="VOTRE_CLE_MAC"'
echo ""
