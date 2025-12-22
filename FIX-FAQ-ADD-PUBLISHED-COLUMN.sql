/*
  # FIX FAQ - Ajouter colonne published

  1. Ajouter la colonne published à la table faq
  2. Publier toutes les FAQ existantes
  3. Vérifier la fonction get_faq()
*/

-- ============================================
-- ÉTAPE 1: DIAGNOSTIC - Structure actuelle
-- ============================================

DO $$
DECLARE
  col_record RECORD;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'STRUCTURE ACTUELLE TABLE faq';
  RAISE NOTICE '============================================';

  FOR col_record IN
    SELECT
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'faq'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '- % (%) %',
      col_record.column_name,
      col_record.data_type,
      CASE WHEN col_record.is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END;
  END LOOP;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 2: Ajouter colonne published si manquante
-- ============================================

DO $$
BEGIN
  -- Vérifier si la colonne existe déjà
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'faq'
    AND column_name = 'published'
  ) THEN
    -- Ajouter la colonne
    ALTER TABLE faq ADD COLUMN published BOOLEAN DEFAULT true NOT NULL;
    RAISE NOTICE '✅ Colonne published ajoutée à faq';
  ELSE
    RAISE NOTICE '✅ Colonne published existe déjà';
  END IF;
END $$;

-- ============================================
-- ÉTAPE 3: Publier toutes les FAQ existantes
-- ============================================

UPDATE faq
SET published = true
WHERE published IS NULL OR published = false;

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ % FAQ publiées', updated_count;
END $$;

-- ============================================
-- ÉTAPE 4: Vérifier la fonction get_faq()
-- ============================================

DO $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'VÉRIFICATION FONCTION get_faq()';
  RAISE NOTICE '============================================';

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_faq'
  ) INTO func_exists;

  IF func_exists THEN
    RAISE NOTICE '✅ Fonction get_faq() existe';
  ELSE
    RAISE WARNING '❌ Fonction get_faq() manquante - création nécessaire';
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 5: Créer/Recréer fonction get_faq()
-- ============================================

DROP FUNCTION IF EXISTS get_faq() CASCADE;

CREATE OR REPLACE FUNCTION get_faq()
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.question,
    f.answer,
    COALESCE(f.category, 'Général') as category,
    f.created_at,
    f.updated_at
  FROM faq f
  WHERE f.published = true
  ORDER BY f.category, f.created_at;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fonction get_faq() créée';
  RAISE NOTICE '';
END $$;

-- ============================================
-- ÉTAPE 6: Vérifier RLS
-- ============================================

DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'faq';

  RAISE NOTICE '============================================';
  RAISE NOTICE 'RLS STATUS';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RLS activé: %', rls_enabled;

  -- Créer policy anon si manquante
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'faq'
    AND policyname = 'Allow anonymous read access'
  ) THEN
    CREATE POLICY "Allow anonymous read access"
      ON faq
      FOR SELECT
      TO anon
      USING (published = true);
    RAISE NOTICE '✅ Policy anon créée pour faq';
  ELSE
    RAISE NOTICE '✅ Policy anon existe déjà';
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 7: Tester la fonction
-- ============================================

DO $$
DECLARE
  faq_count INTEGER;
  sample_question TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST FONCTION get_faq()';
  RAISE NOTICE '============================================';

  BEGIN
    SELECT COUNT(*) INTO faq_count FROM get_faq();
    RAISE NOTICE '✅ Fonction fonctionne: % FAQ', faq_count;

    IF faq_count > 0 THEN
      SELECT question INTO sample_question FROM get_faq() LIMIT 1;
      RAISE NOTICE 'Exemple: %', LEFT(sample_question, 60);
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '❌ Erreur: %', SQLERRM;
  END;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 8: Comptage final
-- ============================================

DO $$
DECLARE
  total_count INTEGER;
  published_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM faq;
  SELECT COUNT(*) INTO published_count FROM faq WHERE published = true;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'COMPTAGE FINAL';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total FAQ: %', total_count;
  RAISE NOTICE 'Publiées: %', published_count;
  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- RÉSUMÉ FINAL
-- ============================================

DO $$
DECLARE
  faq_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO faq_count FROM faq WHERE published = true;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MIGRATION FAQ TERMINÉE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FAQ publiées: %', faq_count;
  RAISE NOTICE '';
  RAISE NOTICE 'TEST MANUEL:';
  RAISE NOTICE 'SELECT COUNT(*) FROM get_faq();';
  RAISE NOTICE 'SELECT * FROM get_faq() LIMIT 3;';
  RAISE NOTICE '';

  IF faq_count > 0 THEN
    RAISE NOTICE '✅✅✅ SUCCESS!';
    RAISE NOTICE 'Vérifier: https://taxiassur.com/faq';
  ELSE
    RAISE WARNING '⚠️ Aucune FAQ publiée';
  END IF;

  RAISE NOTICE '============================================';
END $$;
