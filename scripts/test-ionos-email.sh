#!/bin/bash

# Script de test de la configuration IONOS SMTP
# Teste l'envoi d'un email via IONOS

set -e

echo "🧪 TEST CONFIGURATION IONOS SMTP"
echo "=================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📧 Configuration testée :${NC}"
echo "  Serveur : smtp.ionos.fr"
echo "  Port : 587"
echo "  Email : team@taxiassur.com"
echo "  Mot de passe : TAXIassur!,"
echo ""

# Vérifier si supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI non installé${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Vérification des secrets Supabase...${NC}"
echo ""

# Vérifier les secrets
secrets_output=$(supabase secrets list --project-ref bpwcakjtwgdtfwghylwv 2>/dev/null | grep IONOS || echo "")

if [ -z "$secrets_output" ]; then
    echo -e "${RED}❌ Aucun secret IONOS trouvé${NC}"
    echo ""
    echo "Exécutez d'abord :"
    echo "  ./scripts/update-ionos-password.sh"
    exit 1
fi

echo -e "${GREEN}✅ Secrets IONOS trouvés :${NC}"
echo "$secrets_output"
echo ""

# Demander confirmation pour le test
read -p "Voulez-vous tester l'envoi d'un email ? (o/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    echo "❌ Test annulé"
    exit 0
fi

echo ""
echo -e "${BLUE}📨 Envoi d'un email de test...${NC}"
echo ""

# Créer un payload de test
payload=$(cat <<EOF
{
  "to": "team@taxiassur.com",
  "toName": "Test TaxiAssur",
  "subject": "✅ Test Configuration IONOS - $(date '+%d/%m/%Y %H:%M')",
  "htmlBody": "<!DOCTYPE html><html><body><h1>Test réussi !</h1><p>Ce test confirme que la configuration IONOS SMTP fonctionne correctement.</p><ul><li>Serveur : smtp.ionos.fr</li><li>Port : 587</li><li>Email : team@taxiassur.com</li><li>Date : $(date)</li></ul></body></html>",
  "fromEmail": "team@taxiassur.com",
  "fromName": "TaxiAssur Test"
}
EOF
)

# URL de la fonction edge
edge_function_url="https://bpwcakjtwgdtfwghylwv.supabase.co/functions/v1/send-email-ionos"

# Récupérer la clé anon (vous devrez la remplacer par la vraie)
anon_key=$(grep VITE_SUPABASE_ANON_KEY .env 2>/dev/null | cut -d '=' -f2 || echo "")

if [ -z "$anon_key" ]; then
    echo -e "${YELLOW}⚠️  Impossible de lire la clé anon depuis .env${NC}"
    echo ""
    echo "Testez manuellement via :"
    echo "  Dashboard Supabase > Edge Functions > send-email-ionos"
    exit 1
fi

# Envoyer la requête
response=$(curl -s -w "\n%{http_code}" -X POST "$edge_function_url" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $anon_key" \
  -d "$payload")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

echo ""
if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ EMAIL ENVOYÉ AVEC SUCCÈS !${NC}"
    echo ""
    echo "Réponse :"
    echo "$body" | jq . 2>/dev/null || echo "$body"
    echo ""
    echo -e "${BLUE}📬 Vérifiez votre boîte mail team@taxiassur.com${NC}"
else
    echo -e "${RED}❌ ERREUR LORS DE L'ENVOI${NC}"
    echo ""
    echo "Code HTTP : $http_code"
    echo "Réponse :"
    echo "$body"
    echo ""
    echo -e "${YELLOW}Vérifiez :${NC}"
    echo "  1. Le mot de passe dans les secrets Supabase"
    echo "  2. Les logs de la fonction edge send-email-ionos"
    echo "  3. Le compte IONOS team@taxiassur.com"
fi

echo ""
