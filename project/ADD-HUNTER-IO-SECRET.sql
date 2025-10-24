/*
  ✅ AJOUTER CLÉ HUNTER.IO DANS SUPABASE
  
  Exécuter dans: SQL Editor Supabase
  https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql
*/

-- 1. Vérifier si le secret existe déjà
SELECT name, created_at 
FROM vault.secrets 
WHERE name = 'HUNTER_IO_API_KEY';

-- 2. Si pas trouvé, créer le secret
SELECT vault.create_secret(
  'HUNTER_IO_API_KEY',
  '1e15e1c7b4db255256872dc4bf9939f3b655981c',
  'Hunter.io API Key - 25 emails gratuits/mois'
);

-- 3. Vérifier la création
SELECT 
  name, 
  description,
  created_at,
  '✅ Secret créé avec succès' as status
FROM vault.secrets
WHERE name = 'HUNTER_IO_API_KEY';

-- 4. Vérifier TOUS les secrets backlinks
SELECT 
  name,
  created_at,
  CASE 
    WHEN name = 'GOOGLE_CSE_API_KEY' THEN '✅ Google Custom Search'
    WHEN name = 'GOOGLE_CSE_CX_ID' THEN '✅ Google Search Engine ID'
    WHEN name = 'HUNTER_IO_API_KEY' THEN '✅ Hunter.io Email Finder'
    ELSE name
  END as description
FROM vault.secrets
WHERE name IN ('GOOGLE_CSE_API_KEY', 'GOOGLE_CSE_CX_ID', 'HUNTER_IO_API_KEY')
ORDER BY name;

-- Résultat attendu:
-- 3 secrets trouvés ✅
