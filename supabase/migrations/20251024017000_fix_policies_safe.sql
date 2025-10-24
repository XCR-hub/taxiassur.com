/*
  # Fix policies - Version ultra-safe

  1. Utilise DO $$ pour gérer les erreurs
  2. Drop uniquement si existe
  3. Recrée avec des noms uniques
*/

-- Drop les policies existantes de manière safe
DO $$
BEGIN
  -- Drop policy service role
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'content_generation_queue'
    AND policyname = 'Allow service role full access'
  ) THEN
    DROP POLICY "Allow service role full access" ON content_generation_queue;
  END IF;

  -- Drop policy anon
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'content_generation_queue'
    AND policyname = 'Allow anon read completed'
  ) THEN
    DROP POLICY "Allow anon read completed" ON content_generation_queue;
  END IF;

  -- Drop autres variants possibles
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'content_generation_queue'
    AND policyname = 'Allow service role full access on queue'
  ) THEN
    DROP POLICY "Allow service role full access on queue" ON content_generation_queue;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'content_generation_queue'
    AND policyname = 'Allow anon read completed queue'
  ) THEN
    DROP POLICY "Allow anon read completed queue" ON content_generation_queue;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erreur lors du drop des policies: %', SQLERRM;
END $$;

-- Créer les policies avec des noms uniques finaux
DO $$
BEGIN
  -- Policy service role
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'content_generation_queue'
    AND policyname = 'service_role_full_access_queue'
  ) THEN
    CREATE POLICY "service_role_full_access_queue" ON content_generation_queue
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- Policy anon read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'content_generation_queue'
    AND policyname = 'anon_read_completed_queue'
  ) THEN
    CREATE POLICY "anon_read_completed_queue" ON content_generation_queue
      FOR SELECT TO anon USING (status = 'completed');
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erreur lors de la création des policies: %', SQLERRM;
END $$;

-- Vérification finale
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'content_generation_queue';

  RAISE NOTICE '✅ Policies actives sur content_generation_queue: %', policy_count;
END $$;
