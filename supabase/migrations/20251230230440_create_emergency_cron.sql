/*
  # Cron d'Urgence Récupération Leads

  Exécution toutes les heures pour détecter et résoudre
  arrêt génération leads
*/

SELECT cron.schedule(
  'emergency_lead_recovery_hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/emergency-lead-recovery',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);