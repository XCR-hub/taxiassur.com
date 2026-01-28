/*
  # Cron job pour l'analyse automatique des patterns IA

  Exécute l'analyse des patterns commerciaux toutes les 6 heures
*/

-- Cron pour analyser les patterns toutes les 6 heures
SELECT cron.schedule(
  'ai-pattern-analysis-every-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/ai-pattern-analyzer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
