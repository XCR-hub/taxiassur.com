/*
  # Fix erreurs du processeur de queue

  1. Corrections
    - Drop et recréate des policies avec IF NOT EXISTS
    - Fix syntaxe de la fonction process_content_queue_trigger
    - Simplification sans dépendance à pg_net
*/

-- 1. Drop les anciennes policies si elles existent
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow service role full access" ON content_generation_queue;
  DROP POLICY IF EXISTS "Allow anon read completed" ON content_generation_queue;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. Recréer les policies proprement
CREATE POLICY "Allow service role full access on queue" ON content_generation_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read completed queue" ON content_generation_queue
  FOR SELECT TO anon USING (status = 'completed');

-- 3. Drop et recréer la fonction processeur SANS pg_net
DROP FUNCTION IF EXISTS process_content_queue_trigger();

-- Version simplifiée qui log seulement (l'Edge Function sera appelée manuellement)
CREATE OR REPLACE FUNCTION process_content_queue_trigger()
RETURNS void AS $$
DECLARE
  v_pending_count INTEGER;
BEGIN
  -- Compter les éléments en attente
  SELECT COUNT(*) INTO v_pending_count
  FROM content_generation_queue
  WHERE status = 'pending';

  -- Logger l'info
  INSERT INTO cron_execution_log (job_name, status, details)
  VALUES (
    'process_content_queue_trigger',
    'info',
    jsonb_build_object(
      'pending_items', v_pending_count,
      'message', 'Appeler manuellement l''Edge Function process-content-queue pour traiter la queue'
    )
  );

  RAISE NOTICE 'Queue: % éléments en attente', v_pending_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Supprimer l'ancien cron job s'il existe
SELECT cron.unschedule('process-content-queue') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-content-queue'
);

-- 5. Commentaire
COMMENT ON FUNCTION process_content_queue_trigger() IS 'Log les éléments en attente. L''Edge Function process-content-queue doit être appelée manuellement ou via webhook externe.';

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION process_content_queue_trigger() TO service_role;
