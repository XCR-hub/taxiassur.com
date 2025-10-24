/*
  # Fix FAQ Function - Utiliser faq_entries directement

  Crée simplement la fonction get_faq_entries() qui lit depuis la table existante
*/

-- ============================================
-- FONCTION get_faq_entries - LIT faq_entries
-- ============================================

DROP FUNCTION IF EXISTS get_faq_entries();

CREATE OR REPLACE FUNCTION get_faq_entries()
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category text,
  city text,
  tags text[],
  display_order integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fe.id,
    fe.question,
    fe.answer,
    fe.category,
    NULL::text as city,  -- faq_entries n'a pas de colonne city
    fe.tags,
    fe.display_order,
    fe.created_at
  FROM faq_entries fe
  WHERE fe.status = 'published'
  ORDER BY fe.display_order ASC, fe.created_at DESC;
END;
$$;

-- ============================================
-- RÉSUMÉ
-- ============================================

DO $$
DECLARE
  total_faq INTEGER;
  published_faq INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_faq FROM faq_entries;
  SELECT COUNT(*) INTO published_faq FROM faq_entries WHERE status = 'published';

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ FONCTION FAQ CRÉÉE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FAQ totales: %', total_faq;
  RAISE NOTICE 'FAQ publiées: %', published_faq;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fonction get_faq_entries() lit depuis faq_entries';
  RAISE NOTICE '✅ Filtre: status = ''published''';
  RAISE NOTICE '';
  RAISE NOTICE 'La page FAQ affiche maintenant toutes les FAQ !';
  RAISE NOTICE '============================================';
END $$;
