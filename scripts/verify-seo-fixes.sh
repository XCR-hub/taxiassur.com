#!/bin/bash
# Script de vérification des corrections SEO
# À exécuter APRÈS le déploiement en production

SITE_URL="https://taxiassur.com"
ERRORS=0

echo "======================================================"
echo "🔍 Vérification des corrections SEO Ahrefs"
echo "======================================================"
echo ""

# Fonction pour vérifier une URL
check_url() {
  local url=$1
  local description=$2
  echo -n "Vérification: $description... "

  http_code=$(curl -s -o /dev/null -w "%{http_code}" -L "$url")

  if [ "$http_code" = "200" ]; then
    echo "✅ OK (200)"
  else
    echo "❌ ERREUR ($http_code)"
    ((ERRORS++))
  fi
}

# 1. REDIRECTIONS WWW → NON-WWW
echo "1️⃣  REDIRECTIONS WWW → NON-WWW"
echo "---"

echo -n "www → non-www... "
redirect=$(curl -s -I "https://www.taxiassur.com" | grep -i "location:" | head -1)
if echo "$redirect" | grep -q "https://taxiassur.com"; then
  echo "✅ OK (301 redirection)"
else
  echo "❌ ERREUR - Redirection incorrecte"
  echo "   Reçu: $redirect"
  ((ERRORS++))
fi

echo ""

# 2. PAGES PRINCIPALES
echo "2️⃣  PAGES PRINCIPALES (Status HTTP)"
echo "---"

check_url "$SITE_URL/" "Page d'accueil"
check_url "$SITE_URL/assurance-taxi" "Assurance Taxi"
check_url "$SITE_URL/assurance-taxi-paris" "Assurance Taxi Paris"
check_url "$SITE_URL/contact" "Contact"
check_url "$SITE_URL/blog" "Blog"
check_url "$SITE_URL/sitemap.xml" "Sitemap"

echo ""

# 3. META TAGS
echo "3️⃣  META TAGS (Duplications)"
echo "---"

echo -n "Meta description (page accueil)... "
meta_count=$(curl -s "$SITE_URL" | grep -c 'meta name="description"' || echo "0")
if [ "$meta_count" = "1" ]; then
  echo "✅ OK (1 seule meta description)"
elif [ "$meta_count" = "0" ]; then
  echo "⚠️  AVERTISSEMENT (aucune meta description trouvée)"
  ((ERRORS++))
else
  echo "❌ ERREUR ($meta_count meta descriptions trouvées)"
  ((ERRORS++))
fi

echo ""

# 4. CANONICAL & OPEN GRAPH
echo "4️⃣  CANONICAL & OPEN GRAPH URL"
echo "---"

echo -n "Canonical sans www... "
canonical=$(curl -s "$SITE_URL" | grep 'rel="canonical"' | grep -o 'href="[^"]*"' | cut -d'"' -f2)
if echo "$canonical" | grep -q "www\."; then
  echo "❌ ERREUR (contient www)"
  echo "   Canonical: $canonical"
  ((ERRORS++))
elif [ -n "$canonical" ]; then
  echo "✅ OK (sans www)"
  echo "   Canonical: $canonical"
else
  echo "⚠️  AVERTISSEMENT (canonical non trouvé)"
fi

echo -n "Open Graph URL = Canonical... "
og_url=$(curl -s "$SITE_URL" | grep 'property="og:url"' | grep -o 'content="[^"]*"' | cut -d'"' -f2)
if [ "$og_url" = "$canonical" ]; then
  echo "✅ OK (identiques)"
  echo "   OG URL: $og_url"
elif [ -z "$og_url" ]; then
  echo "⚠️  AVERTISSEMENT (og:url non trouvé)"
else
  echo "❌ ERREUR (différents)"
  echo "   Canonical: $canonical"
  echo "   OG URL: $og_url"
  ((ERRORS++))
fi

echo ""

# 5. SITEMAP
echo "5️⃣  SITEMAP"
echo "---"

echo -n "Sitemap accessible... "
sitemap_code=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/sitemap.xml")
if [ "$sitemap_code" = "200" ]; then
  echo "✅ OK (200)"

  echo -n "Sitemap sans www... "
  www_count=$(curl -s "$SITE_URL/sitemap.xml" | grep -c "www.taxiassur.com" || echo "0")
  if [ "$www_count" = "0" ]; then
    echo "✅ OK (0 occurrence de www)"
  else
    echo "❌ ERREUR ($www_count occurrences de www trouvées)"
    ((ERRORS++))
  fi

  echo -n "Nombre d'URLs dans sitemap... "
  url_count=$(curl -s "$SITE_URL/sitemap.xml" | grep -c "<loc>" || echo "0")
  echo "$url_count URLs"
else
  echo "❌ ERREUR ($sitemap_code)"
  ((ERRORS++))
fi

echo ""

# 6. ROBOTS.TXT
echo "6️⃣  ROBOTS.TXT"
echo "---"

echo -n "robots.txt accessible... "
robots_code=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/robots.txt")
if [ "$robots_code" = "200" ]; then
  echo "✅ OK (200)"

  echo -n "Référence au sitemap... "
  if curl -s "$SITE_URL/robots.txt" | grep -q "Sitemap:"; then
    echo "✅ OK"
    sitemap_ref=$(curl -s "$SITE_URL/robots.txt" | grep "Sitemap:")
    echo "   $sitemap_ref"
  else
    echo "⚠️  AVERTISSEMENT (pas de référence au sitemap)"
  fi
else
  echo "❌ ERREUR ($robots_code)"
  ((ERRORS++))
fi

echo ""

# 7. .HTACCESS (vérification indirecte)
echo "7️⃣  .HTACCESS (Redirections)"
echo "---"

echo -n "HTTP → HTTPS... "
http_redirect=$(curl -s -I "http://taxiassur.com" | grep -i "location:" | head -1)
if echo "$http_redirect" | grep -q "https://"; then
  echo "✅ OK (redirection HTTPS)"
else
  echo "❌ ERREUR - Pas de redirection HTTPS"
  ((ERRORS++))
fi

echo ""

# RÉSUMÉ
echo "======================================================"
echo "📊 RÉSUMÉ"
echo "======================================================"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo "✅ TOUTES LES VÉRIFICATIONS SONT PASSÉES"
  echo ""
  echo "🎉 Les corrections SEO sont bien déployées!"
  echo ""
  echo "Prochaines étapes:"
  echo "  1. Soumettre le sitemap à Google Search Console"
  echo "  2. Demander l'indexation des pages principales"
  echo "  3. Relancer un crawl Ahrefs dans 7 jours"
  echo ""
  exit 0
else
  echo "❌ $ERRORS ERREUR(S) DÉTECTÉE(S)"
  echo ""
  echo "⚠️  Action requise:"
  echo "  1. Vérifier que .htaccess est bien uploadé"
  echo "  2. Vérifier que sitemap.xml est uploadé"
  echo "  3. Vider le cache IONOS"
  echo "  4. Relancer ce script après correction"
  echo ""
  exit 1
fi
