/*
  # Cron pour le moteur autonome GSC
  
  Exécution automatique :
  - Toutes les 6 heures
  - Traite 1 tâche à chaque exécution
  - Auto-apprentissage continu
  
  Sécurité :
  - Utilise system_config pour les secrets
  - Service role uniquement
*/

-- Cron moteur autonome (toutes les 6 heures)
SELECT cron.schedule(
  'gsc-autonomous-engine',
  '0 */6 * * *',
  $$
  SELECT
    net.http_post(
      url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/gsc-ultra-autonomous-engine',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
      ),
      body := jsonb_build_object('auto_mode', true),
      timeout_milliseconds := 120000
    ) as request_id;
  $$
);

-- Cron apprentissage (quotidien à 4h)
SELECT cron.schedule(
  'gsc-learning-engine',
  '0 4 * * *',
  $$
  SELECT learn_from_successful_optimizations();
  $$
);