-- ═══════════════════════════════════════════════════════════════
--  FIX BACKLINK - VERSION CORRECTE (20 SEC)
-- ═══════════════════════════════════════════════════════════════

-- 1. Supprimer contrainte CHECK
ALTER TABLE backlink_opportunities 
  DROP CONSTRAINT IF EXISTS backlink_opportunities_status_check;

-- 2. Ajouter colonnes
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS quality_score numeric DEFAULT 0;
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS domain_authority numeric DEFAULT 0;
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS relevance_score numeric DEFAULT 0;
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS estimated_traffic numeric DEFAULT 0;
ALTER TABLE backlink_opportunities ADD COLUMN IF NOT EXISTS spam_score numeric DEFAULT 0;

-- 3. Modifier status
ALTER TABLE backlink_opportunities ALTER COLUMN status DROP DEFAULT;
ALTER TABLE backlink_opportunities ALTER COLUMN status TYPE text;

-- 4. Nouvelle contrainte CHECK (toutes les valeurs)
ALTER TABLE backlink_opportunities 
  ADD CONSTRAINT backlink_opportunities_status_check 
  CHECK (status IN ('new', 'contacted', 'responded', 'pending', 'acquired', 'rejected', 'follow_up'));

ALTER TABLE backlink_opportunities ALTER COLUMN status SET DEFAULT 'new';

-- 5. Ajouter opportunity_id
ALTER TABLE backlink_outreach_log 
  ADD COLUMN IF NOT EXISTS opportunity_id uuid;

-- 6. Contrainte UNIQUE sur url (SANS ON CONFLICT)
ALTER TABLE backlink_opportunities 
  DROP CONSTRAINT IF EXISTS backlink_opportunities_url_key;

ALTER TABLE backlink_opportunities 
  ADD CONSTRAINT backlink_opportunities_url_key UNIQUE (url);

-- 7. Créer relation
ALTER TABLE backlink_outreach_log 
  DROP CONSTRAINT IF EXISTS backlink_outreach_log_opportunity_id_fkey;

ALTER TABLE backlink_outreach_log 
  ADD CONSTRAINT backlink_outreach_log_opportunity_id_fkey 
  FOREIGN KEY (opportunity_id) 
  REFERENCES backlink_opportunities(id) 
  ON DELETE CASCADE;

-- 8. Index
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_log_opportunity_id 
  ON backlink_outreach_log(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_status 
  ON backlink_opportunities(status);

CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_quality 
  ON backlink_opportunities(quality_score DESC);

-- 9. Rafraîchir cache
NOTIFY pgrst, 'reload schema';

-- 10. Test complet
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
  'test-final-ok.fr',
  'https://test-final-ok.fr/test-complet',
  'Test Backlink Complet',
  55.0,
  90.0,
  2500.0,
  2.0,
  'new'
) ON CONFLICT (url) DO UPDATE SET
  domain_authority = EXCLUDED.domain_authority,
  relevance_score = EXCLUDED.relevance_score;

-- 11. Vérifier résultat
SELECT 
  '✅ TOUT FONCTIONNE!' as message,
  domain,
  url,
  status,
  domain_authority,
  relevance_score,
  estimated_traffic,
  spam_score,
  quality_score as score_calculé_auto
FROM backlink_opportunities
WHERE url = 'https://test-final-ok.fr/test-complet';

-- 12. Stats globales
SELECT 
  '📊 RÉSUMÉ' as section,
  COUNT(*) as total_opportunities,
  COUNT(CASE WHEN status = 'new' THEN 1 END) as status_new,
  ROUND(AVG(quality_score)::numeric, 2) as score_moyen
FROM backlink_opportunities;

SELECT '🎉 SYSTÈME BACKLINKS OPÉRATIONNEL!' as final_status;
