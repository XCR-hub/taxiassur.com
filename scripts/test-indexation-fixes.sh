#!/bin/bash

# Script de test des corrections d'indexation GSC
# Vérifie que toutes les redirections et canonical tags fonctionnent

echo "🧪 TEST DES CORRECTIONS D'INDEXATION GSC"
echo "========================================"
echo ""

DOMAIN="https://taxiassur.com"
ERRORS=0
WARNINGS=0
SUCCESS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test URL redirect
test_redirect() {
    local url=$1
    local expected=$2

    echo -n "Testing: $url → "

    response=$(curl -s -o /dev/null -w "%{http_code}:%{redirect_url}" -L "$url")
    status_code=$(echo "$response" | cut -d':' -f1)
    redirect_url=$(echo "$response" | cut -d':' -f2-)

    if [ "$status_code" = "301" ] || [ "$status_code" = "302" ]; then
        if [ "$redirect_url" = "$expected" ] || [ "$redirect_url" = "${expected}/" ]; then
            echo -e "${GREEN}✓ OK${NC} (${status_code})"
            ((SUCCESS++))
        else
            echo -e "${RED}✗ FAIL${NC} (redirects to $redirect_url instead of $expected)"
            ((ERRORS++))
        fi
    elif [ "$status_code" = "200" ]; then
        if [ "$url" = "$expected" ]; then
            echo -e "${GREEN}✓ OK${NC} (200 - correct canonical)"
            ((SUCCESS++))
        else
            echo -e "${YELLOW}⚠ WARNING${NC} (200 but should redirect to $expected)"
            ((WARNINGS++))
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (status: $status_code)"
        ((ERRORS++))
    fi
}

# Function to check canonical tag
check_canonical() {
    local url=$1
    local expected_canonical=$2

    echo -n "Checking canonical for: $url → "

    canonical=$(curl -s "$url" | grep -oP '(?<=<link rel="canonical" href=")[^"]+' | head -1)

    if [ -z "$canonical" ]; then
        echo -e "${RED}✗ FAIL${NC} (no canonical tag found)"
        ((ERRORS++))
    elif [ "$canonical" = "$expected_canonical" ]; then
        echo -e "${GREEN}✓ OK${NC}"
        ((SUCCESS++))
    else
        echo -e "${YELLOW}⚠ WARNING${NC} (found: $canonical, expected: $expected_canonical)"
        ((WARNINGS++))
    fi
}

echo "📋 SECTION 1: TEST DES REDIRECTIONS CANONIQUES"
echo "───────────────────────────────────────────────"
echo ""

# Test HTTP → HTTPS
test_redirect "http://taxiassur.com/" "$DOMAIN/"
test_redirect "http://www.taxiassur.com/" "$DOMAIN/"

# Test www → non-www
test_redirect "https://www.taxiassur.com/" "$DOMAIN/"
test_redirect "https://www.taxiassur.com/assurance-taxi" "$DOMAIN/assurance-taxi"

# Test trailing slash removal
test_redirect "$DOMAIN/assurance-taxi/" "$DOMAIN/assurance-taxi"
test_redirect "$DOMAIN/blog/" "$DOMAIN/blog"

echo ""
echo "📋 SECTION 2: TEST DES REDIRECTIONS SPÉCIFIQUES"
echo "───────────────────────────────────────────────"
echo ""

# Test Soft 404 fix
test_redirect "$DOMAIN/offres" "$DOMAIN/assurance-taxi"

# Test erreur redirection
test_redirect "$DOMAIN/comparateur-axa-taxi" "$DOMAIN/assurance-taxi"

# Test ancien lien
test_redirect "$DOMAIN/devis-instantane" "$DOMAIN/contact"

echo ""
echo "📋 SECTION 3: TEST DES CANONICAL TAGS"
echo "───────────────────────────────────────────────"
echo ""

# Test pages principales
check_canonical "$DOMAIN/" "$DOMAIN/"
check_canonical "$DOMAIN/assurance-taxi" "$DOMAIN/assurance-taxi"
check_canonical "$DOMAIN/prix-assurance-taxi" "$DOMAIN/prix-assurance-taxi"
check_canonical "$DOMAIN/rc-professionnelle" "$DOMAIN/rc-professionnelle"
check_canonical "$DOMAIN/contact" "$DOMAIN/contact"

echo ""
echo "📋 SECTION 4: TEST DES PAGES CORRIGÉES"
echo "───────────────────────────────────────────────"
echo ""

# Test page ville/amiens (ancienne erreur 5xx)
echo -n "Testing /ville/amiens (should be 200): "
amiens_status=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/ville/amiens")
if [ "$amiens_status" = "200" ]; then
    echo -e "${GREEN}✓ OK${NC}"
    ((SUCCESS++))
else
    echo -e "${RED}✗ FAIL${NC} (status: $amiens_status)"
    ((ERRORS++))
fi

echo ""
echo "📋 SECTION 5: TEST DES META TAGS ROBOTS"
echo "───────────────────────────────────────────────"
echo ""

# Check robots meta tag
echo -n "Checking robots meta tag on homepage: "
robots=$(curl -s "$DOMAIN/" | grep -oP '(?<=<meta name="robots" content=")[^"]+')
if [[ "$robots" == *"index"* ]] && [[ "$robots" == *"follow"* ]]; then
    echo -e "${GREEN}✓ OK${NC} ($robots)"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠ WARNING${NC} (found: $robots)"
    ((WARNINGS++))
fi

echo ""
echo "========================================"
echo "📊 RÉSULTATS DES TESTS"
echo "========================================"
echo ""
echo -e "✅ Succès: ${GREEN}$SUCCESS${NC}"
echo -e "⚠️  Avertissements: ${YELLOW}$WARNINGS${NC}"
echo -e "❌ Erreurs: ${RED}$ERRORS${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 TOUS LES TESTS SONT PASSÉS !${NC}"
    echo ""
    echo "✅ Les redirections canoniques fonctionnent correctement"
    echo "✅ Les balises canonical sont présentes et correctes"
    echo "✅ Les erreurs spécifiques sont corrigées"
    echo ""
    echo "🚀 PROCHAINES ÉTAPES:"
    echo "  1. Déployer en production"
    echo "  2. Soumettre sitemap à Google Search Console"
    echo "  3. Demander réindexation des pages prioritaires"
    echo "  4. Monitorer GSC pendant 7-14 jours"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️ Tests passés avec avertissements${NC}"
    echo ""
    echo "Les redirections fonctionnent mais certains détails peuvent être améliorés."
    echo "Vérifiez les avertissements ci-dessus."
    exit 0
else
    echo -e "${RED}❌ DES ERREURS ONT ÉTÉ DÉTECTÉES${NC}"
    echo ""
    echo "Veuillez corriger les erreurs avant de déployer en production."
    echo "Vérifiez:"
    echo "  - Le fichier .htaccess est bien copié sur le serveur"
    echo "  - Le fichier _redirects est configuré (Netlify/Cloudflare)"
    echo "  - Le serveur Apache a mod_rewrite activé"
    exit 1
fi
