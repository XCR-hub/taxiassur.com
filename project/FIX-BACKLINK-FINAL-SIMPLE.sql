-- ═══════════════════════════════════════════════════════════════
--  ✅ FIX COMPLET BACKLINK - VERSION SIMPLE
-- ═══════════════════════════════════════════════════════════════

-- ÉTAPE 1: Voir les colonnes actuelles de backlink_opportunities
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'backlink_opportunities'
ORDER BY ordinal_position;

-- ÉTAPE 2: Ajouter colonnes manquantes si nécessaire
DO $$ 
BEGIN
  -- Ajouter title si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'backlink_opportunities' 
      AND column_name = 'title'
  ) THEN
    ALTER TABLE backlink_opportunities ADD COLUMN title text;
  END IF;

  -- Ajouter description si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'backlink_opportunities' 
      AND column_name = 'description'
  ) THEN
    ALTER TABLE backlink_opportunities ADD COLUMN description text;
  END IF;

  -- Ajouter contact_email si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'backlink_opportunities' 
      AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE backlink_opportunities ADD COLUMN contact_email text;
  END IF;

  -- Ajouter contact_name si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'backlink_opportunities' 
      AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE backlink_opportunities ADD COLUMN contact_name text;
  END IF;

  -- Ajouter quality_score si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'backlink_opportunities' 
      AND column_name = 'quality_score'
  ) THEN
    ALTER TABLE backlink_opportunities ADD COLUMN quality_score numeric DEFAULT 0;
  END IF;

  -- Ajouter domain_authority si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'backlink_opportunities' 
      AND column_name = 'domain_authority'
  ) THEN
    ALTER TABLE backlink_opportunities ADD COLUMN domain_authority numeric;
  END IF;

  -- Ajouter status si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'backlink_opportunities' 
      AND column_name = 'status'
  ) THEN
    ALTER TABLE backlink_opportunities 
      ADD COLUMN status text DEFAULT 'new' 
      CHECK (status IN ('new', 'contacted', 'replied', 'accepted', 'rejected', 'acquired'));
  END IF;
END $$;

-- ÉTAPE 3: Ajouter colonne opportunity_id à backlink_outreach_log
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'backlink_outreach_log' 
      AND column_name = 'opportunity_id'
  ) THEN
    ALTER TABLE backlink_outreach_log ADD COLUMN opportunity_id uuid;
  END IF;
END $$;

-- ÉTAPE 4: Créer la relation
ALTER TABLE backlink_outreach_log 
  DROP CONSTRAINT IF EXISTS backlink_outreach_log_opportunity_id_fkey;

ALTER TABLE backlink_outreach_log 
  ADD CONSTRAINT backlink_outreach_log_opportunity_id_fkey 
  FOREIGN KEY (opportunity_id) 
  REFERENCES backlink_opportunities(id) 
  ON DELETE CASCADE;

-- ÉTAPE 5: Créer index
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_log_opportunity_id 
  ON backlink_outreach_log(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_status 
  ON backlink_opportunities(status);

-- ÉTAPE 6: Rafraîchir le cache PostgREST
NOTIFY pgrst, 'reload schema';

-- ÉTAPE 7: Test avec colonnes qui existent vraiment
INSERT INTO backlink_opportunities (
  domain, 
  url
) VALUES (
  'test-final.fr',
  'https://test-final.fr/test-relation'
) ON CONFLICT (url) DO NOTHING;

-- ÉTAPE 8: Vérifier le résultat
SELECT 
  '✅ MIGRATION RÉUSSIE' as status,
  COUNT(*) as opportunities_count,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'backlink_opportunities') as columns_count
FROM backlink_opportunities;

-- ÉTAPE 9: Afficher les colonnes finales
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'backlink_opportunities'
ORDER BY ordinal_position;
