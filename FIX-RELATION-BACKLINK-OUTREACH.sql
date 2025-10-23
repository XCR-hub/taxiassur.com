-- ═══════════════════════════════════════════════════════════════
--  ✅ FIX RELATION BACKLINK_OUTREACH_LOG → BACKLINK_OPPORTUNITIES
-- ═══════════════════════════════════════════════════════════════

-- 1. Vérifier la colonne opportunity_id existe
DO $$ 
BEGIN
  -- Ajouter la colonne si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'backlink_outreach_log' 
      AND column_name = 'opportunity_id'
  ) THEN
    ALTER TABLE backlink_outreach_log 
      ADD COLUMN opportunity_id uuid;
    RAISE NOTICE '✅ Colonne opportunity_id ajoutée';
  ELSE
    RAISE NOTICE '⚠️ Colonne opportunity_id existe déjà';
  END IF;
END $$;

-- 2. Supprimer l'ancienne contrainte si elle existe
ALTER TABLE backlink_outreach_log 
  DROP CONSTRAINT IF EXISTS backlink_outreach_log_opportunity_id_fkey;

-- 3. Créer la nouvelle contrainte
ALTER TABLE backlink_outreach_log 
  ADD CONSTRAINT backlink_outreach_log_opportunity_id_fkey 
  FOREIGN KEY (opportunity_id) 
  REFERENCES backlink_opportunities(id) 
  ON DELETE CASCADE;

-- 4. Créer un index pour la performance
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_log_opportunity_id 
  ON backlink_outreach_log(opportunity_id);

-- 5. Vérifier la relation a été créée
SELECT
  'Foreign Key Created' as status,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'backlink_outreach_log'
  AND kcu.column_name = 'opportunity_id';

-- 6. Test: Insérer une opportunité test
INSERT INTO backlink_opportunities (
  domain, 
  url, 
  title, 
  quality_score, 
  status
) VALUES (
  'exemple-test.fr',
  'https://exemple-test.fr/article-test',
  'Article Test Backlink',
  85.5,
  'new'
) ON CONFLICT (url) DO NOTHING
RETURNING id, domain, url, quality_score;

-- 7. Afficher le résultat
SELECT 
  '✅ SUCCÈS - Relation créée et testée' as message,
  COUNT(*) as opportunities_count
FROM backlink_opportunities;
