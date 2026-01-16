/*
  # Synchronisation Automatique des Emails toutes les Minutes

  1. Objectif
    - Synchroniser automatiquement les emails IONOS toutes les minutes
    - Récupérer les pièces jointes et créer des notifications
    - Être réactif sans intervention manuelle

  2. Configuration
    - Cron job exécuté toutes les minutes
    - Appelle l'edge function `sync-all-emails-complete`
    - Utilise net.http_post avec timeout de 55 secondes
*/

-- Supprimer l'ancien cron s'il existe
DO $$
BEGIN
  PERFORM cron.unschedule('auto-sync-emails-every-minute')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'auto-sync-emails-every-minute'
  );
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Créer le cron job pour synchronisation automatique toutes les minutes
SELECT cron.schedule(
  'auto-sync-emails-every-minute',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/sync-all-emails-complete',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}',
      timeout_milliseconds := 55000
    ) as request_id;
  $$
);

-- Mettre à jour la table de configuration des crons
INSERT INTO cron_jobs_config (
  job_name,
  function_url,
  schedule,
  description,
  enabled,
  payload
) VALUES (
  'auto-sync-emails-every-minute',
  '/functions/v1/sync-all-emails-complete',
  '* * * * *',
  'Synchronisation automatique des emails IONOS toutes les minutes avec PJ et notifications',
  true,
  '{}'::jsonb
)
ON CONFLICT (job_name) DO UPDATE SET
  function_url = EXCLUDED.function_url,
  schedule = EXCLUDED.schedule,
  description = EXCLUDED.description,
  enabled = EXCLUDED.enabled,
  payload = EXCLUDED.payload;

-- Créer une fonction pour vérifier le statut du cron
CREATE OR REPLACE FUNCTION get_email_sync_cron_status()
RETURNS TABLE (
  job_name text,
  schedule text,
  active boolean,
  last_run timestamp with time zone,
  last_status text,
  description text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.jobname::text,
    c.schedule::text,
    c.active,
    cfg.last_run,
    cfg.last_status,
    cfg.description
  FROM cron.job c
  LEFT JOIN cron_jobs_config cfg ON cfg.job_name = c.jobname
  WHERE c.jobname = 'auto-sync-emails-every-minute';
END;
$$;

-- Ajouter des politiques RLS pour la fonction de statut
GRANT EXECUTE ON FUNCTION get_email_sync_cron_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_email_sync_cron_status() TO anon;

COMMENT ON FUNCTION get_email_sync_cron_status() IS
'Retourne le statut de la synchronisation automatique des emails';
