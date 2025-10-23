-- ═══════════════════════════════════════════════════════════════
--  PARTIE 2: CRÉER LES RELATIONS ET TESTER
-- ═══════════════════════════════════════════════════════════════

-- Créer la relation
ALTER TABLE backlink_outreach_log 
  DROP CONSTRAINT IF EXISTS backlink_outreach_log_opportunity_id_fkey;

ALTER TABLE backlink_outreach_log 
  ADD CONSTRAINT backlink_outreach_log_opportunity_id_fkey 
  FOREIGN KEY (opportunity_id) 
  REFERENCES backlink_opportunities(id) 
  ON DELETE CASCADE;

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_log_opportunity_id 
  ON backlink_outreach_log(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_status 
  ON backlink_opportunities(status);

CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_domain 
  ON backlink_opportunities(domain);

-- Rafraîchir le cache
NOTIFY pgrst, 'reload schema';

-- Test avec toutes les colonnes
INSERT INTO backlink_opportunities (
  domain, 
  url,
  title,
  quality_score,
  status
) VALUES (
  'test-complet.fr',
  'https://test-complet.fr/test-final',
  'Test Final Backlink',
  80.0,
  'new'
) ON CONFLICT (url) DO NOTHING;

-- Vérifier
SELECT 
  '✅ PARTIE 2 TERMINÉE - Tout fonctionne!' as status,
  COUNT(*) as total_opportunities,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'backlink_opportunities') as total_columns
FROM backlink_opportunities;

-- Afficher les colonnes
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'backlink_opportunities'
ORDER BY ordinal_position;

-- Vérifier la relation
SELECT
  'Relation créée' as message,
  tc.table_name,
  kcu.column_name as from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'backlink_outreach_log'
  AND kcu.column_name = 'opportunity_id';
