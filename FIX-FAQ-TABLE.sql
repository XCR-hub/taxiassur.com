/*
  # FIX: Correction Table FAQ Entries

  Problème: La table faq_entries existe déjà mais sans la colonne priority
  Solution: Ajouter la colonne manquante et recréer les index

  À exécuter dans: Supabase Dashboard > SQL Editor
*/

-- ========================================
-- ÉTAPE 1: Ajouter la colonne priority si elle n'existe pas
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'faq_entries' AND column_name = 'priority'
  ) THEN
    ALTER TABLE faq_entries ADD COLUMN priority integer DEFAULT 0;
    RAISE NOTICE 'Colonne priority ajoutée';
  ELSE
    RAISE NOTICE 'Colonne priority existe déjà';
  END IF;
END $$;

-- ========================================
-- ÉTAPE 2: Créer les index s'ils n'existent pas
-- ========================================

-- Index category
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_faq_category'
  ) THEN
    CREATE INDEX idx_faq_category ON faq_entries(category);
    RAISE NOTICE 'Index idx_faq_category créé';
  END IF;
END $$;

-- Index priority
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_faq_priority'
  ) THEN
    CREATE INDEX idx_faq_priority ON faq_entries(priority DESC);
    RAISE NOTICE 'Index idx_faq_priority créé';
  END IF;
END $$;

-- Index published
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_faq_published'
  ) THEN
    CREATE INDEX idx_faq_published ON faq_entries(published);
    RAISE NOTICE 'Index idx_faq_published créé';
  END IF;
END $$;

-- ========================================
-- VÉRIFICATION
-- ========================================

SELECT
  'Colonnes faq_entries:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'faq_entries'
ORDER BY ordinal_position;
