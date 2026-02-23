#!/bin/bash

# Script de test Monético en mode Production
# TaxiAssur - 23 Février 2026

set -e

echo "🧪 TEST MONÉTICO - MODE PRODUCTION"
echo "===================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${RED}⚠️  ATTENTION : MODE PRODUCTION${NC}"
echo "  • Ce test utilisera des VRAIES cartes bancaires"
echo "  • Le paiement sera RÉEL et débité"
echo "  • Montant recommandé : 1.00 EUR pour le test"
echo ""

read -p "Continuer avec un test de paiement réel ? (o/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    echo "❌ Test annulé"
    exit 0
fi

echo ""
echo -e "${BLUE}📧 Informations de test :${NC}"
echo ""

# Demander l'email de test
read -p "Email pour le test (défaut: test@taxiassur.com) : " test_email
test_email=${test_email:-test@taxiassur.com}

# Demander le montant
read -p "Montant du test en EUR (défaut: 1.00) : " test_amount
test_amount=${test_amount:-1.00}

echo ""
echo -e "${BLUE}🔍 Récapitulatif du test :${NC}"
echo "  Email : $test_email"
echo "  Montant : $test_amount EUR"
echo "  Mode : PRODUCTION (paiement réel)"
echo ""

read -p "Confirmer le test ? (o/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    echo "❌ Test annulé"
    exit 0
fi

echo ""
echo -e "${BLUE}🚀 Création du paiement...${NC}"
echo ""

# Récupérer la clé anon depuis .env
anon_key=$(grep VITE_SUPABASE_ANON_KEY .env 2>/dev/null | cut -d '=' -f2 || echo "")

if [ -z "$anon_key" ]; then
    echo -e "${RED}❌ Impossible de lire VITE_SUPABASE_ANON_KEY depuis .env${NC}"
    echo "Testez manuellement via le Dashboard Supabase"
    exit 1
fi

# URL de la fonction edge
edge_function_url="https://bpwcakjtwgdtfwghylwv.supabase.co/functions/v1/create-monetico-payment"

# Payload du test
payload=$(cat <<EOF
{
  "amount": $test_amount,
  "customerEmail": "$test_email",
  "customerFirstName": "Test",
  "customerLastName": "Production",
  "description": "Test paiement production - $(date '+%d/%m/%Y %H:%M')"
}
EOF
)

# Envoyer la requête
response=$(curl -s -w "\n%{http_code}" -X POST "$edge_function_url" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $anon_key" \
  -d "$payload")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

echo ""
if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ PAIEMENT CRÉÉ AVEC SUCCÈS${NC}"
    echo ""

    # Parser la réponse JSON
    mode=$(echo "$body" | jq -r '.mode' 2>/dev/null || echo "unknown")
    reference=$(echo "$body" | jq -r '.reference' 2>/dev/null || echo "unknown")
    payment_id=$(echo "$body" | jq -r '.paymentId' 2>/dev/null || echo "unknown")

    echo "Détails :"
    echo "  Mode : $mode"
    echo "  Référence : $reference"
    echo "  Payment ID : $payment_id"
    echo ""

    if [ "$mode" != "PRODUCTION" ]; then
        echo -e "${RED}⚠️  ATTENTION : Le mode détecté n'est pas PRODUCTION !${NC}"
        echo "Mode détecté : $mode"
        echo ""
        echo "Vérifiez le secret MONETICO_MODE :"
        echo "  supabase secrets list | grep MONETICO_MODE"
        echo ""
        exit 1
    fi

    echo -e "${YELLOW}📋 Prochaines étapes :${NC}"
    echo ""
    echo "1. Un formulaire de paiement va s'ouvrir automatiquement"
    echo "2. Utilisez une VRAIE carte bancaire (pas de carte de test)"
    echo "3. Complétez le paiement"
    echo "4. Vérifiez la redirection vers l'URL de succès"
    echo "5. Vérifiez le webhook dans les logs Supabase"
    echo ""
    echo "6. Vérifier le paiement dans la base de données :"
    echo ""
    echo "   SELECT * FROM monetico_payments WHERE reference = '$reference';"
    echo ""
    echo "7. Vérifier dans le dashboard Monético :"
    echo "   https://www.monetico-services.com/fr"
    echo ""

    # Sauvegarder le formulaire HTML
    html_form=$(echo "$body" | jq -r '.htmlForm' 2>/dev/null)
    if [ ! -z "$html_form" ] && [ "$html_form" != "null" ]; then
        echo "$html_form" > /tmp/monetico_test_payment.html
        echo -e "${BLUE}💾 Formulaire sauvegardé : /tmp/monetico_test_payment.html${NC}"
        echo ""
        echo "Ouvrir le formulaire de paiement dans votre navigateur :"
        echo "  open /tmp/monetico_test_payment.html"
        echo ""
    fi

else
    echo -e "${RED}❌ ERREUR LORS DE LA CRÉATION DU PAIEMENT${NC}"
    echo ""
    echo "Code HTTP : $http_code"
    echo "Réponse :"
    echo "$body" | jq . 2>/dev/null || echo "$body"
    echo ""
    echo -e "${YELLOW}Vérifications :${NC}"
    echo "  1. Les secrets Monético sont-ils configurés ?"
    echo "     supabase secrets list | grep MONETICO"
    echo ""
    echo "  2. Le mode est-il bien 'production' ?"
    echo "     supabase secrets list | grep MONETICO_MODE"
    echo ""
    echo "  3. La clé MAC de production est-elle correcte ?"
    echo ""
    exit 1
fi

echo ""
echo -e "${BLUE}📊 Statistiques des paiements production :${NC}"
echo ""
echo "Pour voir les paiements en production dans la base :"
echo ""
cat << 'SQL'
SELECT
  reference,
  amount,
  status,
  customer_email,
  monetico_data->>'mode' as mode,
  created_at
FROM monetico_payments
WHERE monetico_data->>'mode' = 'PRODUCTION'
ORDER BY created_at DESC
LIMIT 10;
SQL
echo ""
