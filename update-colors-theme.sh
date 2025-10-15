#!/bin/bash

# Script de mise à jour automatique des couleurs vers le thème TaxiAssur
# Remplace bleu/violet/indigo par jaune/noir

echo "🎨 Mise à jour des couleurs vers le thème TaxiAssur..."

# Répertoires à traiter
DIRS=("src/pages" "src/components")

for DIR in "${DIRS[@]}"; do
  echo "📁 Traitement de $DIR..."

  # Trouver tous les fichiers .tsx
  find "$DIR" -name "*.tsx" -type f | while read file; do
    # Sauvegarde temporaire
    cp "$file" "$file.bak"

    # Remplacements de couleurs
    sed -i 's/from-blue-600/from-yellow-500/g' "$file"
    sed -i 's/to-blue-600/to-yellow-600/g' "$file"
    sed -i 's/from-blue-500/from-yellow-400/g' "$file"
    sed -i 's/to-blue-500/to-yellow-500/g' "$file"
    sed -i 's/from-blue-700/from-yellow-600/g' "$file"
    sed -i 's/to-blue-700/to-yellow-700/g' "$file"

    sed -i 's/from-purple-600/from-gray-900/g' "$file"
    sed -i 's/to-purple-600/to-yellow-600/g' "$file"
    sed -i 's/from-purple-500/from-gray-800/g' "$file"
    sed -i 's/to-purple-500/to-yellow-500/g' "$file"

    sed -i 's/from-indigo-600/from-yellow-500/g' "$file"
    sed -i 's/to-indigo-600/to-yellow-600/g' "$file"

    sed -i 's/bg-blue-600/bg-yellow-500/g' "$file"
    sed -i 's/bg-blue-500/bg-yellow-500/g' "$file"
    sed -i 's/bg-blue-700/bg-yellow-600/g' "$file"
    sed -i 's/bg-blue-50/bg-yellow-50/g' "$file"
    sed -i 's/bg-blue-100/bg-yellow-100/g' "$file"

    sed -i 's/hover:bg-blue-700/hover:bg-yellow-600/g' "$file"
    sed -i 's/hover:bg-blue-600/hover:bg-yellow-500/g' "$file"
    sed -i 's/hover:bg-blue-50/hover:bg-yellow-50/g' "$file"

    sed -i 's/text-blue-600/text-yellow-600/g' "$file"
    sed -i 's/text-blue-500/text-yellow-500/g' "$file"
    sed -i 's/text-blue-400/text-yellow-400/g' "$file"
    sed -i 's/text-blue-700/text-yellow-700/g' "$file"
    sed -i 's/text-blue-800/text-yellow-800/g' "$file"
    sed -i 's/text-blue-100/text-yellow-100/g' "$file"
    sed -i 's/text-blue-200/text-yellow-200/g' "$file"

    sed -i 's/border-blue-600/border-yellow-500/g' "$file"
    sed -i 's/border-blue-500/border-yellow-500/g' "$file"
    sed -i 's/border-blue-200/border-yellow-200/g' "$file"

    sed -i 's/bg-purple-600/bg-gray-900/g' "$file"
    sed -i 's/bg-purple-500/bg-gray-800/g' "$file"
    sed -i 's/bg-purple-100/bg-yellow-100/g' "$file"

    sed -i 's/text-purple-600/text-yellow-600/g' "$file"
    sed -i 's/text-purple-500/text-yellow-500/g' "$file"
    sed -i 's/text-purple-400/text-yellow-400/g' "$file"

    sed -i 's/bg-indigo-600/bg-yellow-500/g' "$file"
    sed -i 's/bg-indigo-500/bg-yellow-500/g' "$file"

    sed -i 's/text-indigo-600/text-yellow-600/g' "$file"
    sed -i 's/text-indigo-500/text-yellow-500/g' "$file"

    sed -i 's/shadow-blue-500/shadow-yellow-500/g' "$file"
    sed -i 's/shadow-blue-600/shadow-yellow-600/g' "$file"

    sed -i 's/ring-blue-500/ring-yellow-500/g' "$file"
    sed -i 's/ring-blue-600/ring-yellow-600/g' "$file"

    sed -i 's/focus:ring-blue-500/focus:ring-yellow-500/g' "$file"
    sed -i 's/focus:border-blue-500/focus:border-yellow-500/g' "$file"

    # Vérifier si des changements ont été effectués
    if ! cmp -s "$file" "$file.bak"; then
      echo "  ✅ Mis à jour: $(basename $file)"
    fi

    # Supprimer la sauvegarde
    rm "$file.bak"
  done
done

echo ""
echo "✅ Mise à jour terminée !"
echo "🎨 Tous les bleu/violet/indigo ont été remplacés par jaune/noir"
