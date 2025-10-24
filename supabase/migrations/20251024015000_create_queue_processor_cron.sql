/*
  # Processeur de queue automatique

  1. Cron Job
    - S'exécute toutes les 5 minutes
    - Appelle l'Edge Function process-content-queue
    - Traite les demandes de génération IA en attente

  2. Workflow complet
    - generate_daily_blog_post() ajoute à la queue
    - Ce cron traite la queue et génère le contenu IA complet
    - Les articles sont mis à jour avec 4000 mots
*/

-- Fonction wrapper pour appeler l'Edge Function
CREATE OR REPLACE FUNCTION process_content_queue_trigger()
RETURNS void AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_response JSONB;
BEGIN
  -- Récupérer les variables d'environnement
  BEGIN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_key := current_setting('app.settings.supabase_service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Variables non configurées, skip';
    RETURN;
  END;

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE NOTICE 'URL ou clé manquante, skip';
    RETURN;
  END;

  -- Appeler l'Edge Function
  BEGIN
    SELECT content::jsonb INTO v_response
    FROM net.http_post(
      url := v_supabase_url || '/functions/v1/process-content-queue',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_service_key,
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );

    RAISE NOTICE 'Queue processée: %', v_response->>'processed';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erreur appel queue processor: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le cron job (toutes les 5 minutes)
SELECT cron.schedule(
  'process-content-queue',
  '*/5 * * * *', -- Toutes les 5 minutes
  $$SELECT process_content_queue_trigger();$$
);

-- Note: Permissions
GRANT EXECUTE ON FUNCTION process_content_queue_trigger() TO service_role;

-- Commentaire
COMMENT ON FUNCTION process_content_queue_trigger() IS 'Traite la queue de génération de contenu IA toutes les 5 minutes';
