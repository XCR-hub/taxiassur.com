-- TEST DIAGNOSTIC COMPLET TABLE LEADS

-- 1. Vérifier si la table existe
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'leads';

-- 2. Vérifier la structure de la table
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'leads'
ORDER BY ordinal_position;

-- 3. Compter les leads
SELECT COUNT(*) as total_leads FROM leads;

-- 4. Afficher les 5 derniers leads (si existants)
SELECT
  id,
  name,
  email,
  phone,
  city,
  lead_status,
  created_at
FROM leads
ORDER BY created_at DESC
LIMIT 5;

-- 5. Vérifier les policies RLS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'leads';

-- 6. Vérifier si RLS est activé
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'leads';

-- 7. INSÉRER UN LEAD DE TEST
INSERT INTO leads (
  name,
  email,
  phone,
  city,
  status,
  immatriculation,
  lead_status,
  source
) VALUES (
  'Test Diagnostic Lead',
  'diagnostic@test.com',
  '0601020304',
  'Paris',
  'taxi',
  'TEST-001',
  'new',
  'diagnostic_test'
)
RETURNING id, name, email, created_at;
