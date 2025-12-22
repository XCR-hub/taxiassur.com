/*
  # FIX FAQ MAINTENANT - ÉTAPE PAR ÉTAPE

  À EXÉCUTER DANS SUPABASE SQL EDITOR
*/

-- ============================================
-- ÉTAPE 1: DIAGNOSTIC
-- ============================================

DO $$
DECLARE
  total_faq INTEGER;
  published_faq INTEGER;
  draft_faq INTEGER;
  null_status INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_faq FROM faq_entries;
  SELECT COUNT(*) INTO published_faq FROM faq_entries WHERE status = 'published';
  SELECT COUNT(*) INTO draft_faq FROM faq_entries WHERE status = 'draft';
  SELECT COUNT(*) INTO null_status FROM faq_entries WHERE status IS NULL;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'DIAGNOSTIC FAQ';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total FAQ: %', total_faq;
  RAISE NOTICE 'Published: %', published_faq;
  RAISE NOTICE 'Draft: %', draft_faq;
  RAISE NOTICE 'NULL status: %', null_status;
  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 2: PUBLIER TOUTES LES FAQ
-- ============================================

UPDATE faq_entries
SET
  status = 'published',
  updated_at = now()
WHERE status != 'published' OR status IS NULL;

-- Vérification
DO $$
DECLARE
  published_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO published_count FROM faq_entries WHERE status = 'published';
  RAISE NOTICE '✅ FAQ publiées: %', published_count;
END $$;

-- ============================================
-- ÉTAPE 3: CRÉER LA FONCTION
-- ============================================

DROP FUNCTION IF EXISTS get_faq_entries();

CREATE OR REPLACE FUNCTION get_faq_entries()
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category text,
  tags text[],
  display_order integer,
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
    COALESCE(fe.display_order, 0) as display_order,
    fe.created_at
  FROM faq_entries fe
  WHERE fe.status = 'published'
  ORDER BY fe.display_order ASC, fe.created_at DESC;
END;
$$;

-- ============================================
-- ÉTAPE 4: TESTER LA FONCTION
-- ============================================

DO $$
DECLARE
  func_result_count INTEGER;
  sample_record RECORD;
BEGIN
  -- Compter les résultats
  SELECT COUNT(*) INTO func_result_count FROM get_faq_entries();

  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST FONCTION get_faq_entries()';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Résultats retournés: %', func_result_count;

  IF func_result_count > 0 THEN
    RAISE NOTICE '✅ SUCCESS! La fonction retourne % FAQ', func_result_count;

    -- Afficher 3 exemples
    RAISE NOTICE '';
    RAISE NOTICE 'Exemples de FAQ:';
    FOR sample_record IN
      SELECT question FROM get_faq_entries() LIMIT 3
    LOOP
      RAISE NOTICE '- %', LEFT(sample_record.question, 70);
    END LOOP;
  ELSE
    RAISE WARNING '❌ ERREUR: La fonction ne retourne aucun résultat!';
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 5: VÉRIFIER LES PERMISSIONS RLS
-- ============================================

-- S'assurer que anon peut lire
DO $$
BEGIN
  -- Vérifier si la policy existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'faq_entries'
    AND policyname = 'Allow anonymous read access'
  ) THEN
    -- Créer la policy si elle n'existe pas
    EXECUTE 'CREATE POLICY "Allow anonymous read access" ON faq_entries FOR SELECT TO anon USING (status = ''published'')';
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
  total_published INTEGER;
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_published FROM faq_entries WHERE status = 'published';
  SELECT COUNT(*) INTO func_count FROM get_faq_entries();

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MIGRATION TERMINÉE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FAQ publiées dans table: %', total_published;
  RAISE NOTICE 'FAQ retournées par fonction: %', func_count;
  RAISE NOTICE '';

  IF func_count = total_published AND func_count > 0 THEN
    RAISE NOTICE '✅✅✅ PARFAIT! Tout fonctionne correctement';
    RAISE NOTICE '';
    RAISE NOTICE 'Vérifiez maintenant: https://taxiassur.com/faq';
  ELSE
    RAISE WARNING '⚠️ Problème détecté - Vérifier les logs ci-dessus';
  END IF;

  RAISE NOTICE '============================================';
END $$;
