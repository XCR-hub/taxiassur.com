#!/bin/bash

# Script de Vérification SEO Ahrefs
# Date: 11 Mars 2026

echo "🔍 Vérification des Corrections SEO Ahrefs"
echo "=========================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
TOTAL=0
PASSED=0
FAILED=0

# Fonction de test
test_check() {
    TOTAL=$((TOTAL + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC} $2"
        FAILED=$((FAILED + 1))
    fi
}

echo "1️⃣  VÉRIFICATION FICHIERS CRITIQUES"
echo "-----------------------------------"

# Vérifier .htaccess
test_check $([ -f "public/.htaccess" ] && echo 0 || echo 1) ".htaccess présent"

# Vérifier sitemap
test_check $([ -f "public/sitemap.xml" ] && echo 0 || echo 1) "sitemap.xml présent"

# Vérifier robots.txt
test_check $([ -f "public/robots.txt" ] && echo 0 || echo 1) "robots.txt présent"

# Vérifier composant UnifiedSEO
test_check $([ -f "src/components/UnifiedSEO.tsx" ] && echo 0 || echo 1) "UnifiedSEO.tsx présent"

echo ""
echo "2️⃣  VÉRIFICATION SEO DANS LES PAGES"
echo "-----------------------------------"

# Compter les pages avec UnifiedSEO
UNIFIED_COUNT=$(grep -r "UnifiedSEO" src/pages/ 2>/dev/null | wc -l)
echo -e "${YELLOW}ℹ${NC}  $UNIFIED_COUNT pages utilisent UnifiedSEO"

# Vérifier les doublons de meta description
DUPLICATE_META=$(grep -r "name=\"description\"" src/pages/ 2>/dev/null | wc -l)
if [ $DUPLICATE_META -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC}  Attention: meta descriptions hardcodées trouvées"
fi

# Vérifier les H1
MISSING_H1=$(grep -L "<h1\|<H1" src/pages/*.tsx 2>/dev/null | wc -l)
if [ $MISSING_H1 -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC}  $MISSING_H1 pages sans H1"
fi

echo ""
echo "3️⃣  VÉRIFICATION .HTACCESS"
echo "-----------------------------------"

# Vérifier ErrorDocument
test_check $(grep -q "ErrorDocument 500" public/.htaccess && echo 0 || echo 1) "ErrorDocument 500 configuré"
test_check $(grep -q "ErrorDocument 404" public/.htaccess && echo 0 || echo 1) "ErrorDocument 404 configuré"

# Vérifier redirections HTTPS
test_check $(grep -q "RewriteRule.*https" public/.htaccess && echo 0 || echo 1) "Redirection HTTPS active"

# Vérifier non-www
test_check $(grep -q "www\.taxiassur\.com" public/.htaccess && echo 0 || echo 1) "Redirection non-www active"

echo ""
echo "4️⃣  VÉRIFICATION BUILD"
echo "-----------------------------------"

# Vérifier que le build fonctionne
if [ -d "dist" ]; then
    echo -e "${GREEN}✓${NC} Dossier dist/ existe"
    
    # Vérifier fichiers critiques dans dist
    test_check $([ -f "dist/index.html" ] && echo 0 || echo 1) "dist/index.html présent"
    test_check $([ -f "dist/.htaccess" ] && echo 0 || echo 1) "dist/.htaccess présent"
    test_check $([ -f "dist/sitemap.xml" ] && echo 0 || echo 1) "dist/sitemap.xml présent"
else
    echo -e "${YELLOW}⚠${NC}  Dossier dist/ absent - Lancez 'npm run build'"
fi

echo ""
echo "5️⃣  VÉRIFICATION SITEMAP"
echo "-----------------------------------"

if [ -f "public/sitemap.xml" ]; then
    # Vérifier que le sitemap est bien formé
    if grep -q "<?xml" public/sitemap.xml; then
        test_check 0 "Sitemap bien formé (XML)"
    else
        test_check 1 "Sitemap mal formé"
    fi
    
    # Compter les URLs
    URL_COUNT=$(grep -c "<loc>" public/sitemap.xml)
    echo -e "${YELLOW}ℹ${NC}  $URL_COUNT URLs dans le sitemap"
    
    # Vérifier qu'il n'y a pas de www
    if grep -q "www.taxiassur.com" public/sitemap.xml; then
        echo -e "${RED}✗${NC} URLs avec www trouvées dans sitemap"
        FAILED=$((FAILED + 1))
    else
        echo -e "${GREEN}✓${NC} Pas de www dans le sitemap"
        PASSED=$((PASSED + 1))
    fi
    
    TOTAL=$((TOTAL + 2))
fi

echo ""
echo "=========================================="
echo "📊 RÉSULTATS"
echo "=========================================="
echo -e "Total tests: $TOTAL"
echo -e "${GREEN}Réussis: $PASSED${NC}"
echo -e "${RED}Échoués: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TOUT EST BON !${NC}"
    echo ""
    echo "🚀 Prêt pour le déploiement:"
    echo "   npm run build"
    echo "   npm run deploy"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠️  CORRECTIONS NÉCESSAIRES${NC}"
    echo ""
    echo "🔧 Actions à prendre:"
    echo "   1. Corriger les erreurs ci-dessus"
    echo "   2. Relancer ce script"
    echo "   3. Build et déployer"
    exit 1
fi
