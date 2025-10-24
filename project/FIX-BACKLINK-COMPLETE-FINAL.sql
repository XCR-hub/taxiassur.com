-- ═══════════════════════════════════════════════════════════════
--  FIX BACKLINK COMPLET - TOUTES COLONNES + RELATION
-- ═══════════════════════════════════════════════════════════════

-- 1. Ajouter TOUTES les colonnes nécessaires
ALTER TABLE backlink_opportunities 
  ADD COLUMN IF NOT EXISTS title text;

ALTER TABLE backlink_opportunities 
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE backlink_opportunities 
  ADD COLUMN IF NOT EXISTS contact_email text;

ALTER TABLE backlink_opportunities 
  ADD COLUMN IF NOT EXISTS contact_name text;

ALTER TABLE backlink_opportunities 
  ADD COLUMN IF NOT EXISTS quality_score numeric DEFAULT 0;

ALTER TABLE backlink_opportunities 
  ADD COLUMN IF NOT EXISTS domain_authority numeric DEFAULT 0;

ALTER TABLE backlink_opportunities 
  ADD COLUMN IF NOT EXISTS relevance_score numeric DEFAULT 0;

ALTER TABLE backlink_opportunities 
  ADD COLUMN IF NOT EXISTS estimated_traffic numeric DEFAULT 0;

ALTER TABLE backlink_opportunities 
  ADD COLUMN IF NOT EXISTS spam_score numeric DEFAULT 0;

ALTER TABLE backlink_opportunities 
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'new';

ALTER TABLE backlink_outreach_log 
  ADD COLUMN IF NOT EXISTS opportunity_id uuid;

-- 2. Ajouter contrainte unique sur URL
ALTER TABLE backlink_opportunities 
  DROP CONSTRAINT IF EXISTS backlink_opportunities_url_key;

ALTER TABLE backlink_opportunities 
  ADD CONSTRAINT backlink_opportunities_url_key UNIQUE (url);

-- 3. Créer la relation
ALTER TABLE backlink_outreach_log 
  DROP CONSTRAINT IF EXISTS backlink_outreach_log_opportunity_id_fkey;

ALTER TABLE backlink_outreach_log 
  ADD CONSTRAINT backlink_outreach_log_opportunity_id_fkey 
  FOREIGN KEY (opportunity_id) 
  REFERENCES backlink_opportunities(id) 
  ON DELETE CASCADE;

-- 4. Créer les index
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_log_opportunity_id 
  ON backlink_outreach_log(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_status 
  ON backlink_opportunities(status);

CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_domain 
  ON backlink_opportunities(domain);

CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_quality 
  ON backlink_opportunities(quality_score DESC);

-- 5. Rafraîchir le cache PostgREST
NOTIFY pgrst, 'reload schema';

-- 6. Test d'insertion (va déclencher le trigger)
INSERT INTO backlink_opportunities (
  domain, 
  url, 
  title,
  domain_authority,
  relevance_score,
  estimated_traffic,
  spam_score,
  status
) VALUES (
  'test-complet.fr',
  'https://test-complet.fr/test-trigger-ok',
  'Test Backlink avec Trigger',
  45.0,
  80.0,
  1500.0,
  5.0,
  'new'
) ON CONFLICT (url) DO UPDATE SET
  domain_authority = EXCLUDED.domain_authority,
  relevance_score = EXCLUDED.relevance_score,
  estimated_traffic = EXCLUDED.estimated_traffic,
  spam_score = EXCLUDED.spam_score;

-- 7. Vérifier que le quality_score a été calculé automatiquement
SELECT 
  '✅ TOUT FONCTIONNE!' as message,
  domain,
  url,
  domain_authority,
  relevance_score,
  estimated_traffic,
  spam_score,
  quality_score as quality_score_auto_calculated,
  status
FROM backlink_opportunities
WHERE url = 'https://test-complet.fr/test-trigger-ok';

-- 8. Statistiques globales
SELECT 
  '📊 STATISTIQUES' as section,
  COUNT(*) as total_opportunities,
  COUNT(CASE WHEN status = 'new' THEN 1 END) as new_status,
  ROUND(AVG(quality_score)::numeric, 2) as avg_quality_score,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'backlink_opportunities') as total_columns
FROM backlink_opportunities;

-- 9. Liste complète des colonnes
SELECT 
  '📋 COLONNES' as section,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'backlink_opportunities'
ORDER BY ordinal_position;

-- 10. Vérifier la relation
SELECT
  '🔗 RELATION' as section,
  tc.constraint_name,
  kcu.column_name as from_column,
  ccu.table_name AS to_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'backlink_outreach_log'
  AND kcu.column_name = 'opportunity_id';

SELECT '🎉 MIGRATION TERMINÉE AVEC SUCCÈS!' as final_message;
