-- ═══════════════════════════════════════════════════════════════
--  FIX BACKLINK - AVEC CORRECTION STATUS
-- ═══════════════════════════════════════════════════════════════

-- 1. Vérifier la contrainte actuelle sur status
SELECT 
  '📋 CONTRAINTE ACTUELLE' as section,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname LIKE '%status%'
  AND conrelid = 'backlink_opportunities'::regclass;

-- 2. Supprimer l'ancienne contrainte
ALTER TABLE backlink_opportunities 
  DROP CONSTRAINT IF EXISTS backlink_opportunities_status_check;

-- 3. Ajouter TOUTES les colonnes nécessaires
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS quality_score numeric DEFAULT 0;
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS domain_authority numeric DEFAULT 0;
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS relevance_score numeric DEFAULT 0;
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS estimated_traffic numeric DEFAULT 0;
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS spam_score numeric DEFAULT 0;

-- 4. Modifier la colonne status pour supprimer les contraintes
ALTER TABLE backlink_opportunities 
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE backlink_opportunities 
  ALTER COLUMN status TYPE text;

-- 5. Créer la nouvelle contrainte avec toutes les valeurs possibles
ALTER TABLE backlink_opportunities 
  ADD CONSTRAINT backlink_opportunities_status_check 
  CHECK (status IN ('new', 'contacted', 'responded', 'pending', 'acquired', 'rejected', 'follow_up'));

-- 6. Remettre le default
ALTER TABLE backlink_opportunities 
  ALTER COLUMN status SET DEFAULT 'new';

-- 7. Ajouter la colonne opportunity_id
ALTER TABLE backlink_outreach_log 
  ADD COLUMN IF NOT EXISTS opportunity_id uuid;

-- 8. Ajouter contrainte unique sur URL
ALTER TABLE backlink_opportunities 
  DROP CONSTRAINT IF EXISTS backlink_opportunities_url_key;

ALTER TABLE backlink_opportunities 
  ADD CONSTRAINT backlink_opportunities_url_key UNIQUE (url);

-- 9. Créer la relation
ALTER TABLE backlink_outreach_log 
  DROP CONSTRAINT IF EXISTS backlink_outreach_log_opportunity_id_fkey;

ALTER TABLE backlink_outreach_log 
  ADD CONSTRAINT backlink_outreach_log_opportunity_id_fkey 
  FOREIGN KEY (opportunity_id) 
  REFERENCES backlink_opportunities(id) 
  ON DELETE CASCADE;

-- 10. Créer les index
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_log_opportunity_id ON backlink_outreach_log(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_status ON backlink_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_quality ON backlink_opportunities(quality_score DESC);

-- 11. Rafraîchir le cache PostgREST
NOTIFY pgrst, 'reload schema';

-- 12. Test d'insertion avec status 'new' (valeur autorisée)
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
  'test-ok.fr',
  'https://test-ok.fr/test-backlink-final',
  'Test Backlink Final OK',
  50.0,
  85.0,
  2000.0,
  3.0,
  'new'
) ON CONFLICT (url) DO UPDATE SET
  domain_authority = EXCLUDED.domain_authority,
  relevance_score = EXCLUDED.relevance_score,
  estimated_traffic = EXCLUDED.estimated_traffic,
  spam_score = EXCLUDED.spam_score;

-- 13. Vérifier le résultat
SELECT 
  '✅ SUCCÈS COMPLET!' as message,
  domain,
  url,
  status,
  domain_authority,
  relevance_score,
  estimated_traffic,
  spam_score,
  quality_score as score_auto_calculé
FROM backlink_opportunities
WHERE url = 'https://test-ok.fr/test-backlink-final';

-- 14. Afficher les valeurs de status autorisées
SELECT 
  '📋 VALEURS STATUS AUTORISÉES' as section,
  unnest(ARRAY['new', 'contacted', 'responded', 'pending', 'acquired', 'rejected', 'follow_up']) as status_value,
  CASE unnest(ARRAY['new', 'contacted', 'responded', 'pending', 'acquired', 'rejected', 'follow_up'])
    WHEN 'new' THEN 'Nouvelle opportunité détectée'
    WHEN 'contacted' THEN 'Email d''outreach envoyé'
    WHEN 'responded' THEN 'Réponse reçue'
    WHEN 'pending' THEN 'En attente de validation'
    WHEN 'acquired' THEN 'Backlink obtenu ✅'
    WHEN 'rejected' THEN 'Refusé'
    WHEN 'follow_up' THEN 'Follow-up nécessaire'
  END as description;

-- 15. Statistiques globales
SELECT 
  '📊 STATISTIQUES' as section,
  COUNT(*) as total_opportunities,
  COUNT(CASE WHEN status = 'new' THEN 1 END) as new_status,
  ROUND(AVG(quality_score)::numeric, 2) as avg_quality_score,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'backlink_opportunities') as total_columns
FROM backlink_opportunities;

-- 16. Vérifier la contrainte mise à jour
SELECT 
  '✅ CONTRAINTE MISE À JOUR' as section,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'backlink_opportunities_status_check';

SELECT '🎉 TOUT EST CONFIGURÉ ET TESTÉ!' as final_message;
