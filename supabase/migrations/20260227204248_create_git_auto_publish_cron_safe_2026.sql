/*
  # Cron de publication automatique Git

  1. Cron Jobs
    - Publication Git toutes les 10 minutes
    - Nettoyage des anciennes publications

  2. Fonctionnalités
    - Publie automatiquement les modifications en attente
    - Déclenche le rebuild Bolt.new
    - Archive les anciennes publications
*/

-- Cron: Publication Git toutes les 10 minutes
SELECT cron.schedule(
  'git-auto-publish-every-10min',
  '*/10 * * * *',
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url') || '/functions/v1/git-auto-publisher'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_service_role_key'))
      ),
      body := jsonb_build_object(
        'trigger', 'cron',
        'timestamp', now()
      ),
      timeout_milliseconds := 30000
    );
  $$
);

-- Cron: Nettoyage de l'historique ancien (> 90 jours)
SELECT cron.schedule(
  'cleanup-old-publish-history',
  '0 3 * * *',
  $$
  DELETE FROM code_publish_history
  WHERE published_at < now() - interval '90 days';

  DELETE FROM code_publish_queue
  WHERE status IN ('published', 'cancelled', 'failed')
    AND created_at < now() - interval '30 days';
  $$
);

-- Fonction helper pour déclencher une publication immédiate
CREATE OR REPLACE FUNCTION trigger_immediate_publish()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT content::jsonb INTO v_result
  FROM net.http_post(
    url := (SELECT current_setting('app.settings.supabase_url') || '/functions/v1/git-auto-publisher'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_service_role_key'))
    ),
    body := jsonb_build_object(
      'trigger', 'manual',
      'timestamp', now()
    )
  );

  RETURN v_result;
END;
$$;
