/*
  # FIX FAQ - STRUCTURE RÉELLE

  Utiliser seulement les colonnes qui existent vraiment
*/

-- ============================================
-- ÉTAPE 1: VÉRIFIER LA STRUCTURE
-- ============================================

DO $$
DECLARE
  col_record RECORD;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'STRUCTURE RÉELLE DE faq_entries';
  RAISE NOTICE '============================================';

  FOR col_record IN
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'faq_entries'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '- % (%)', col_record.column_name, col_record.data_type;
  END LOOP;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 2: PUBLIER TOUTES LES FAQ
-- ============================================

UPDATE faq_entries
SET status = 'published', updated_at = now()
WHERE status != 'published' OR status IS NULL;

DO $$
DECLARE
  published_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO published_count FROM faq_entries WHERE status = 'published';
  RAISE NOTICE '✅ % FAQ publiées', published_count;
END $$;

-- ============================================
-- ÉTAPE 3: CRÉER LA FONCTION AVEC COLONNES RÉELLES
-- ============================================

DROP FUNCTION IF EXISTS get_faq_entries();

CREATE OR REPLACE FUNCTION get_faq_entries()
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category text,
  tags text[],
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fe.id,
    fe.question,
    fe.answer,
    COALESCE(fe.category, 'Assurance Taxi') as category,
    COALESCE(fe.tags, ARRAY[]::text[]) as tags,
    fe.created_at
  FROM faq_entries fe
  WHERE fe.status = 'published'
  ORDER BY fe.created_at DESC;
END;
$$;

-- ============================================
-- ÉTAPE 4: TESTER LA FONCTION
-- ============================================

DO $$
DECLARE
  func_count INTEGER;
  sample_record RECORD;
BEGIN
  SELECT COUNT(*) INTO func_count FROM get_faq_entries();

  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST FONCTION';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FAQ retournées: %', func_count;

  IF func_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCCESS! % FAQ disponibles', func_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Exemples:';

    FOR sample_record IN
      SELECT question FROM get_faq_entries() LIMIT 3
    LOOP
      RAISE NOTICE '- %', LEFT(sample_record.question, 70);
    END LOOP;
  ELSE
    RAISE WARNING '❌ Aucune FAQ retournée';
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 5: PERMISSIONS RLS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'faq_entries'
    AND policyname = 'Allow anonymous read access'
  ) THEN
    CREATE POLICY "Allow anonymous read access"
      ON faq_entries
      FOR SELECT
      TO anon
      USING (status = 'published');
    RAISE NOTICE '✅ Policy anon créée';
  ELSE
    RAISE NOTICE '✅ Policy anon existe déjà';
  END IF;
END $$;

-- ============================================
-- RÉSUMÉ FINAL
-- ============================================

DO $$
DECLARE
  table_count INTEGER;
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count FROM faq_entries WHERE status = 'published';
  SELECT COUNT(*) INTO func_count FROM get_faq_entries();

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MIGRATION TERMINÉE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FAQ dans table: %', table_count;
  RAISE NOTICE 'FAQ via fonction: %', func_count;
  RAISE NOTICE '';

  IF func_count > 0 THEN
    RAISE NOTICE '✅✅✅ SUCCÈS! Page FAQ prête';
    RAISE NOTICE '';
    RAISE NOTICE 'Vérifier: https://taxiassur.com/faq';
  ELSE
    RAISE WARNING '⚠️ Problème: Vérifier les logs ci-dessus';
  END IF;

  RAISE NOTICE '============================================';
END $$;
