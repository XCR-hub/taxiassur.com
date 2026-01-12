#!/bin/bash

# Script d'upload automatique vers IONOS
# Usage: ./upload-to-ionos.sh

echo "🚀 Upload vers IONOS - TaxiAssur"
echo "=================================="
echo ""

# Vérifier que le dossier dist existe
if [ ! -d "dist" ]; then
    echo "❌ Erreur : Le dossier /dist n'existe pas"
    echo "   Exécutez d'abord : npm run build"
    exit 1
fi

echo "✅ Dossier /dist trouvé"
echo ""

# Demander les identifiants FTP
read -p "🔐 Hôte FTP IONOS (ex: ftp.taxiassur.com): " FTP_HOST
read -p "👤 Nom d'utilisateur FTP: " FTP_USER
read -sp "🔑 Mot de passe FTP: " FTP_PASS
echo ""
read -p "📁 Dossier distant (ex: /public_html ou /): " FTP_PATH
echo ""

# Vérifier que lftp est installé
if ! command -v lftp &> /dev/null; then
    echo "❌ lftp n'est pas installé"
    echo ""
    echo "Installation :"
    echo "  Ubuntu/Debian: sudo apt-get install lftp"
    echo "  macOS: brew install lftp"
    echo "  Windows: utilisez un client FTP comme FileZilla"
    exit 1
fi

echo "📤 Upload en cours..."
echo ""

# Upload via lftp (plus rapide et fiable que ftp)
lftp -u "$FTP_USER,$FTP_PASS" "$FTP_HOST" <<EOF
set ftp:ssl-allow no
cd $FTP_PATH
mirror --reverse --delete --verbose --parallel=3 dist/ .
bye
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Upload terminé avec succès !"
    echo ""
    echo "🧪 Tests à effectuer :"
    echo "   1. https://taxiassur.com/test-prospect-access.html"
    echo "   2. https://taxiassur.com/prospect/documents/abad70754f988c31533bfa8ce962a4ce4f7f15c1a547fdf4f9a2bf099fd98912"
    echo ""
    echo "💡 N'oubliez pas de vider le cache (Ctrl+Shift+R)"
else
    echo ""
    echo "❌ Erreur lors de l'upload"
    echo "   Vérifiez vos identifiants FTP"
fi
