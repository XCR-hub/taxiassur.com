-- ═══════════════════════════════════════════════════════════════
--  🔍 DIAGNOSTIC RELATION BACKLINK_OUTREACH_LOG
-- ═══════════════════════════════════════════════════════════════

-- 1. Vérifier que les tables existent
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('backlink_opportunities', 'backlink_outreach_log', 'backlink_campaigns')
ORDER BY table_name;

-- 2. Vérifier les colonnes de backlink_outreach_log
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'backlink_outreach_log'
ORDER BY ordinal_position;

-- 3. Vérifier les foreign keys existantes
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'backlink_outreach_log';

-- 4. Compter les enregistrements
SELECT 
  'backlink_opportunities' as table_name,
  COUNT(*) as count
FROM backlink_opportunities
UNION ALL
SELECT 
  'backlink_outreach_log',
  COUNT(*)
FROM backlink_outreach_log
UNION ALL
SELECT 
  'backlink_campaigns',
  COUNT(*)
FROM backlink_campaigns;
