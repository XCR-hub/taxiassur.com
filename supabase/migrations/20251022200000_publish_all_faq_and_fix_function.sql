/*
  # Publier toutes les FAQ et corriger la fonction

  1. Mettre à jour tous les statuts à 'published'
  2. Recréer la fonction get_faq_entries()
  3. Vérifier les résultats
*/

-- ============================================
-- ÉTAPE 1: PUBLIER TOUTES LES FAQ
-- ============================================

-- Mettre à jour TOUS les statuts à 'published'
UPDATE faq_entries
SET status = 'published'
WHERE status IS NULL OR status != 'published';

-- Vérifier
DO $$
DECLARE
  total_count INTEGER;
  published_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM faq_entries;
  SELECT COUNT(*) INTO published_count FROM faq_entries WHERE status = 'published';

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ÉTAPE 1: PUBLICATION DES FAQ';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FAQ totales: %', total_count;
  RAISE NOTICE 'FAQ publiées: %', published_count;
  RAISE NOTICE '';
END $$;

-- ============================================
-- ÉTAPE 2: FONCTION get_faq_entries()
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
-- ÉTAPE 3: VÉRIFICATION
-- ============================================

DO $$
DECLARE
  faq_count INTEGER;
  func_count INTEGER;
BEGIN
  -- Compter dans la table
  SELECT COUNT(*) INTO faq_count
  FROM faq_entries
  WHERE status = 'published';

  -- Compter via la fonction
  SELECT COUNT(*) INTO func_count
  FROM get_faq_entries();

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ÉTAPE 2: VÉRIFICATION';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FAQ dans la table: %', faq_count;
  RAISE NOTICE 'FAQ retournées par fonction: %', func_count;
  RAISE NOTICE '';

  IF func_count > 0 THEN
    RAISE NOTICE '✅ SUCCESS! % FAQ prêtes à être affichées', func_count;
  ELSE
    RAISE WARNING '⚠️ Aucune FAQ retournée par la fonction!';
  END IF;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- ÉTAPE 4: EXEMPLE DE FAQ
-- ============================================

DO $$
DECLARE
  sample_faq RECORD;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '📋 EXEMPLE DE FAQ (5 premières)';
  RAISE NOTICE '============================================';

  FOR sample_faq IN
    SELECT question, category
    FROM get_faq_entries()
    LIMIT 5
  LOOP
    RAISE NOTICE '- [%] %', sample_faq.category, LEFT(sample_faq.question, 60);
  END LOOP;

  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- RÉSUMÉ FINAL
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ MIGRATION TERMINÉE AVEC SUCCÈS';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Actions effectuées:';
  RAISE NOTICE '1. ✅ Toutes les FAQ mises à status = ''published''';
  RAISE NOTICE '2. ✅ Fonction get_faq_entries() créée';
  RAISE NOTICE '3. ✅ Vérifications effectuées';
  RAISE NOTICE '';
  RAISE NOTICE 'Vérification sur le site:';
  RAISE NOTICE '→ https://taxiassur.com/faq';
  RAISE NOTICE '';
  RAISE NOTICE 'La page FAQ doit maintenant afficher toutes les questions !';
  RAISE NOTICE '============================================';
END $$;
