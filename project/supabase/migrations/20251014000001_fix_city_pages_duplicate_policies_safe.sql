/*
  # Fix City Pages Duplicate Policies - Version Sécurisée

  1. Problème
    - Erreur: column "status" does not exist
    - Les tables city_pages et faq_entries peuvent exister sans colonne status
    - Policies dupliquées créent erreur 409

  2. Solution
    - Ajouter colonne status si manquante
    - Supprimer toutes policies existantes
    - Recréer policies unifiées

  3. Sécurité
    - Utilise IF NOT EXISTS
    - Ajoute colonnes manquantes avant policies
    - Gère tous les cas de figure
*/

-- Ajouter colonne status à city_pages si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'status'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN status text DEFAULT 'draft' CHECK (status IN ('draft', 'published'));
    RAISE NOTICE 'Colonne status ajoutée à city_pages';
  ELSE
    RAISE NOTICE 'Colonne status existe déjà dans city_pages';
  END IF;
END $$;

-- Ajouter colonne status à faq_entries si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'faq_entries' AND column_name = 'status'
  ) THEN
    ALTER TABLE faq_entries ADD COLUMN status text DEFAULT 'draft' CHECK (status IN ('draft', 'published'));
    RAISE NOTICE 'Colonne status ajoutée à faq_entries';
  ELSE
    RAISE NOTICE 'Colonne status existe déjà dans faq_entries';
  END IF;
END $$;

-- Supprimer TOUTES les policies existantes sur city_pages
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'city_pages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON city_pages', policy_record.policyname);
    RAISE NOTICE 'Policy supprimée: %', policy_record.policyname;
  END LOOP;
END $$;

-- Supprimer TOUTES les policies existantes sur faq_entries
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'faq_entries'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON faq_entries', policy_record.policyname);
    RAISE NOTICE 'Policy supprimée: %', policy_record.policyname;
  END LOOP;
END $$;

-- Recréer policies unifiées pour city_pages

-- SELECT: Lecture publique (tous les statuts pour simplifier)
CREATE POLICY "unified_city_pages_public_select"
  ON city_pages
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- INSERT: Backoffice peut créer
CREATE POLICY "unified_city_pages_anon_insert"
  ON city_pages
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- UPDATE: Backoffice peut modifier
CREATE POLICY "unified_city_pages_anon_update"
  ON city_pages
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- DELETE: Backoffice peut supprimer
CREATE POLICY "unified_city_pages_anon_delete"
  ON city_pages
  FOR DELETE
  TO anon
  USING (true);

-- Recréer policies unifiées pour faq_entries

-- SELECT: Lecture publique (tous les statuts pour simplifier)
CREATE POLICY "unified_faq_entries_public_select"
  ON faq_entries
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- INSERT: Backoffice peut créer
CREATE POLICY "unified_faq_entries_anon_insert"
  ON faq_entries
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- UPDATE: Backoffice peut modifier
CREATE POLICY "unified_faq_entries_anon_update"
  ON faq_entries
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- DELETE: Backoffice peut supprimer
CREATE POLICY "unified_faq_entries_anon_delete"
  ON faq_entries
  FOR DELETE
  TO anon
  USING (true);

-- Vérification finale
DO $$
DECLARE
  city_policies_count INTEGER;
  faq_policies_count INTEGER;
  city_has_status BOOLEAN;
  faq_has_status BOOLEAN;
BEGIN
  -- Vérifier policies
  SELECT COUNT(*) INTO city_policies_count
  FROM pg_policies
  WHERE tablename = 'city_pages';

  SELECT COUNT(*) INTO faq_policies_count
  FROM pg_policies
  WHERE tablename = 'faq_entries';

  -- Vérifier colonnes status
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'status'
  ) INTO city_has_status;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'faq_entries' AND column_name = 'status'
  ) INTO faq_has_status;

  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE '✅ city_pages: % policies | status: %', city_policies_count, CASE WHEN city_has_status THEN 'OUI' ELSE 'NON' END;
  RAISE NOTICE '✅ faq_entries: % policies | status: %', faq_policies_count, CASE WHEN faq_has_status THEN 'OUI' ELSE 'NON' END;
  RAISE NOTICE '════════════════════════════════════════';

  IF city_policies_count = 4 AND faq_policies_count = 4 AND city_has_status AND faq_has_status THEN
    RAISE NOTICE '✅ Migration réussie ! Toutes les policies sont configurées.';
  ELSE
    RAISE WARNING '⚠️ Vérification recommandée. Compteurs inattendus.';
  END IF;
END $$;
