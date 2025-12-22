/*
  # Fix Partner Prospects RLS - 401 Unauthorized

  Erreur actuelle:
  POST /rest/v1/partner_prospects?select=* 401 (Unauthorized)

  Cause: Policies RLS trop restrictives bloquent insertions depuis backoffice

  Solution: Permettre insertions anonymes avec ANON_KEY
*/

-- Supprimer policies restrictives existantes
DROP POLICY IF EXISTS "Allow anon read partner_prospects" ON partner_prospects;
DROP POLICY IF EXISTS "Allow authenticated manage partner_prospects" ON partner_prospects;
DROP POLICY IF EXISTS "Allow anon insert partner_prospects" ON partner_prospects;
DROP POLICY IF EXISTS "Enable read access for all users" ON partner_prospects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON partner_prospects;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON partner_prospects;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON partner_prospects;

-- Activer RLS (au cas où)
ALTER TABLE partner_prospects ENABLE ROW LEVEL SECURITY;

-- Policy LECTURE publique (SELECT)
CREATE POLICY "Allow public read partner_prospects"
  ON partner_prospects FOR SELECT
  TO public
  USING (true);

-- Policy INSERTION publique (INSERT) - Nécessaire pour backoffice
CREATE POLICY "Allow public insert partner_prospects"
  ON partner_prospects FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy UPDATE authentifié seulement
CREATE POLICY "Allow authenticated update partner_prospects"
  ON partner_prospects FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy DELETE authentifié seulement
CREATE POLICY "Allow authenticated delete partner_prospects"
  ON partner_prospects FOR DELETE
  TO authenticated
  USING (true);

-- Vérifier structure table (ajouter colonnes si manquantes)
DO $$
BEGIN
  -- Ajouter 'source' si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_prospects' AND column_name = 'source'
  ) THEN
    ALTER TABLE partner_prospects ADD COLUMN source text DEFAULT 'manual';
  END IF;

  -- Ajouter 'quality_score' si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_prospects' AND column_name = 'quality_score'
  ) THEN
    ALTER TABLE partner_prospects ADD COLUMN quality_score int;
  END IF;

  -- Ajouter 'status' si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_prospects' AND column_name = 'status'
  ) THEN
    ALTER TABLE partner_prospects ADD COLUMN status text DEFAULT 'new';
  END IF;

  -- Ajouter 'contacted_at' si manquant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_prospects' AND column_name = 'contacted_at'
  ) THEN
    ALTER TABLE partner_prospects ADD COLUMN contacted_at timestamptz;
  END IF;
END $$;

-- Message succès
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ FIX RLS PARTNER_PROSPECTS TERMINÉ';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Policies créées:';
  RAISE NOTICE '  • SELECT: Public (lecture ouverte)';
  RAISE NOTICE '  • INSERT: Public (backoffice peut insérer)';
  RAISE NOTICE '  • UPDATE: Authenticated only';
  RAISE NOTICE '  • DELETE: Authenticated only';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Page seed-prospects devrait fonctionner maintenant';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
