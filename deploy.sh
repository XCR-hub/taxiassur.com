#!/bin/bash

# Script de déploiement TaxiAssur.com
# Usage: ./deploy.sh

echo "🚀 Déploiement TaxiAssur.com"

# 1. Build du projet
echo "📦 Build du projet..."
npm run build

# 2. Vérification du build
if [ ! -d "dist" ]; then
    echo "❌ Erreur: Le dossier dist n'existe pas"
    exit 1
fi

# 3. Copie des webhooks dans dist
echo "🔗 Copie des webhooks..."
cp -r webhooks dist/

# 4. Copie des fichiers de configuration
echo "⚙️ Copie des configurations..."
cp public/.htaccess dist/
cp public/webhooks/.htaccess dist/webhooks/

# 5. Création des dossiers nécessaires
echo "📁 Création des dossiers..."
mkdir -p dist/content/leads
mkdir -p dist/content/blog
mkdir -p dist/content/faq
mkdir -p dist/content/reviews
mkdir -p dist/content/offers
mkdir -p dist/feeds
mkdir -p dist/assets

# 6. Permissions
echo "🔐 Configuration des permissions..."
chmod 755 dist/webhooks
chmod 644 dist/webhooks/*.php
chmod 755 dist/content
chmod 755 dist/feeds
chmod 644 dist/content/*.json

# 7. Vérification des fichiers critiques
echo "✅ Vérification des fichiers..."
REQUIRED_FILES=(
    "dist/index.html"
    "dist/webhooks/make.php"
    "dist/content/backlinks.json"
    "dist/content/partners.json"
    "dist/feeds/sitemap.xml"
    "dist/feeds/rss.xml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "⚠️  Attention: $file manquant"
    else
        echo "✓ $file présent"
    fi
done

echo "🎉 Build terminé ! Contenu prêt dans le dossier /dist"
echo ""
echo "📋 Étapes suivantes:"
echo "1. Uploadez tout le contenu de /dist vers votre serveur"
echo "2. Configurez les variables d'environnement PHP"
echo "3. Testez l'accès au webhook: /webhooks/make.php?action=ping"
echo "4. Accédez au backoffice: /backoffice"