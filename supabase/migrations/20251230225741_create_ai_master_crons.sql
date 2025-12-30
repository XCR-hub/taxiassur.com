/*
  # Crons IA Master Autonome

  Configure les crons pour:
  1. Exécuter l'IA Master toutes les heures
  2. Envoyer notifications email 2x/jour
  3. Nettoyer les vieilles décisions tous les mois
*/

-- Cron: IA Master s'exécute toutes les heures
SELECT cron.schedule(
  'ai_master_hourly_execution',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/master-ai-decision-engine',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Cron: Email notifications 2x par jour (9h et 18h)
SELECT cron.schedule(
  'ai_email_notifications_morning',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/ai-email-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'ai_email_notifications_evening',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/ai-email-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Cron: Nettoyer les vieilles décisions (> 90 jours) chaque mois
SELECT cron.schedule(
  'cleanup_old_ai_decisions',
  '0 2 1 * *',
  $$
  DELETE FROM ai_decisions_log 
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND status = 'executed';
  $$
);