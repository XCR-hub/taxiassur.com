-- ============================================================================
-- DIAGNOSTIC : Structure table FAQ
-- ============================================================================

-- 1. Vérifier si la table existe
SELECT 'TABLE FAQ_ENTRIES:' as info;

SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'faq_entries'
) as table_exists;

-- 2. Afficher la structure si elle existe
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'faq_entries'
ORDER BY ordinal_position;

-- 3. Compter les FAQ existantes
SELECT 'TOTAL FAQ:' as info, COUNT(*) as total FROM faq_entries;

-- 4. Afficher les dernières FAQ
SELECT
  id,
  question,
  category,
  created_at
FROM faq_entries
ORDER BY created_at DESC
LIMIT 10;

-- 5. Vérifier les policies RLS
SELECT 'POLICIES RLS:' as info;

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
WHERE tablename = 'faq_entries';

-- 6. Test d'insertion simple
SELECT 'TEST INSERTION:' as info;

INSERT INTO faq_entries (question, answer, category, order_index)
VALUES (
  'Test FAQ automatique ?',
  'Ceci est un test d''insertion automatique de FAQ.',
  'Test',
  999
)
RETURNING id, question, category, created_at;

-- 7. Supprimer le test
DELETE FROM faq_entries WHERE category = 'Test' AND order_index = 999;

SELECT '✅ DIAGNOSTIC TERMINÉ' as status;
