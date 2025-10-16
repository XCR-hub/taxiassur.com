-- ============================================================================
-- DIAGNOSTIC COMPLET STRUCTURE TABLE LEADS
-- ============================================================================

-- 1. Vérifier si la table existe
SELECT 'TABLE EXISTS:' as check_type,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads')
       THEN 'YES' ELSE 'NO' END as result;

-- 2. Lister TOUTES les colonnes de la table leads
SELECT
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'leads'
ORDER BY ordinal_position;

-- 3. Compter les colonnes
SELECT COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'leads';

-- 4. Vérifier si les colonnes essentielles existent
SELECT
  'name' as column_check,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'name')
  THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT
  'email',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'email')
  THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT
  'phone',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'phone')
  THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT
  'city',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'city')
  THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT
  'lead_status',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'lead_status')
  THEN 'EXISTS' ELSE 'MISSING' END;

-- 5. Compter les leads existants
SELECT COUNT(*) as total_leads FROM leads;

-- 6. Afficher un échantillon (si la table a des données)
SELECT * FROM leads LIMIT 1;
