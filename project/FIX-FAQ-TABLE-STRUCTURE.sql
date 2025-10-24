/*
  # VÉRIFICATION ET RÉPARATION TABLE FAQ

  ## Objectif
  - Vérifier que la table faq_entries existe
  - Vérifier la structure (colonnes requises)
  - Créer/réparer si nécessaire
  - Activer RLS avec bonnes policies

  ## Colonnes requises par le frontend
  - id, question, answer, category, order_index
  - created_at, updated_at
*/

-- ============================================================================
-- 1. VÉRIFIER SI LA TABLE EXISTE
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'faq_entries'
  ) THEN
    RAISE NOTICE '⚠️ Table faq_entries n''existe pas, création...';

    -- Créer la table
    CREATE TABLE faq_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      question text NOT NULL,
      answer text NOT NULL,
      category text DEFAULT 'Général',
      order_index integer DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    RAISE NOTICE '✅ Table faq_entries créée';
  ELSE
    RAISE NOTICE '✅ Table faq_entries existe déjà';
  END IF;
END $$;

-- ============================================================================
-- 2. VÉRIFIER ET AJOUTER LES COLONNES MANQUANTES
-- ============================================================================

-- Vérifier order_index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'faq_entries'
    AND column_name = 'order_index'
  ) THEN
    ALTER TABLE faq_entries ADD COLUMN order_index integer DEFAULT 0;
    RAISE NOTICE '✅ Colonne order_index ajoutée';
  END IF;
END $$;

-- Vérifier updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'faq_entries'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE faq_entries ADD COLUMN updated_at timestamptz DEFAULT now();
    RAISE NOTICE '✅ Colonne updated_at ajoutée';
  END IF;
END $$;

-- ============================================================================
-- 3. CRÉER LES INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_faq_category ON faq_entries(category);
CREATE INDEX IF NOT EXISTS idx_faq_order ON faq_entries(order_index);
CREATE INDEX IF NOT EXISTS idx_faq_created_at ON faq_entries(created_at DESC);

-- ============================================================================
-- 4. ACTIVER RLS
-- ============================================================================

ALTER TABLE faq_entries ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Allow anonymous users to read FAQ" ON faq_entries;
DROP POLICY IF EXISTS "Allow service role full access to FAQ" ON faq_entries;
DROP POLICY IF EXISTS "Enable read access for all users" ON faq_entries;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON faq_entries;

-- Policy pour lecture publique (anonymous)
CREATE POLICY "Allow anonymous users to read FAQ"
  ON faq_entries
  FOR SELECT
  TO anon
  USING (true);

-- Policy pour lecture authentifiée
CREATE POLICY "Allow authenticated users to read FAQ"
  ON faq_entries
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy pour insertion (service_role uniquement, pour le backoffice)
CREATE POLICY "Allow service role full access to FAQ"
  ON faq_entries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. VÉRIFICATION FINALE
-- ============================================================================

SELECT 'STRUCTURE FINALE FAQ_ENTRIES:' as info;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'faq_entries'
ORDER BY ordinal_position;

SELECT 'TOTAL FAQ:' as info, COUNT(*) as count FROM faq_entries;

SELECT 'POLICIES RLS:' as info;

SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'faq_entries';

-- ============================================================================
-- 6. TEST D'INSERTION
-- ============================================================================

SELECT 'TEST INSERTION FAQ:' as info;

-- Essayer d'insérer une FAQ de test
INSERT INTO faq_entries (question, answer, category, order_index)
VALUES (
  'Test FAQ - Structure vérifiée ?',
  'Oui ! La structure de la table FAQ est correcte et fonctionnelle.',
  'Test Diagnostic',
  999
)
RETURNING id, question, category, created_at;

-- Compter après insertion
SELECT 'FAQ APRÈS TEST:' as info, COUNT(*) as count FROM faq_entries;

-- Nettoyer le test
DELETE FROM faq_entries WHERE category = 'Test Diagnostic' AND order_index = 999;

SELECT '✅ TABLE FAQ_ENTRIES PRÊTE !' as status;
SELECT 'Vous pouvez maintenant générer des articles avec FAQ automatiques.' as info;
