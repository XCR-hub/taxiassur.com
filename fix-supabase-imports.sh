#!/bin/bash

# Fix Supabase imports to use consistent @/lib/supabase path
# This prevents multiple GoTrueClient instances

echo "🔧 Fixing Supabase imports to use @/lib/supabase..."

# Find all TypeScript/TSX files and replace relative imports with alias
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  -e "s|from ['\"]\.\.\/lib\/supabase['\"]|from '@/lib/supabase'|g" \
  -e "s|from ['\"]\.\.\/\.\.\/lib\/supabase['\"]|from '@/lib/supabase'|g" \
  -e "s|from ['\"]\.\.\/\.\.\/\.\.\/lib\/supabase['\"]|from '@/lib/supabase'|g" \
  {} \;

echo "✅ Fixed Supabase imports in src/"

# Count how many files were affected
count=$(grep -r "from '@/lib/supabase'" src --include="*.ts" --include="*.tsx" | wc -l)
echo "📊 Total imports using @/lib/supabase: $count"

echo "🎉 Done! All imports now use consistent path."
