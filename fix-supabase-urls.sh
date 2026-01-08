#!/bin/bash

# Script pour corriger les URLs Supabase dans tous les fichiers HTML de test

echo "🔧 Correction des URLs Supabase hardcodées..."

# Liste des fichiers à corriger
FILES=(
  "public/reset-admin-password.html"
  "public/test-admin-login.html"
  "public/test-crm-leads.html"
  "public/test-email-ionos.html"
  "public/test-hunter-scan.html"
  "public/test-login-direct.html"
)

# Ancienne URL et clé
OLD_URL="https://xxunrkyfavznfoxfqgci.supabase.co"
OLD_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dW5ya3lmYXZ6bmZveGZxZ2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MTA0MTQsImV4cCI6MjA1MDI4NjQxNH0.vc-LKqBJPKK5NmA1dBFCt1aR9EVyZN5L0q-FBdLVBzo"

# Nouvelle URL et clé
NEW_URL="https://drohhxrkoequjphvabvq.supabase.co"
NEW_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg"

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  📝 Correction de $file..."

    # Remplacer l'ancienne URL par la nouvelle
    sed -i "s|$OLD_URL|$NEW_URL|g" "$file"

    # Remplacer l'ancienne clé par la nouvelle
    sed -i "s|$OLD_KEY|$NEW_KEY|g" "$file"

    echo "  ✅ $file corrigé"
  else
    echo "  ⚠️  $file n'existe pas"
  fi
done

echo ""
echo "✅ Correction terminée! Tous les fichiers utilisent maintenant la bonne URL Supabase."
