/*
  # Table de configuration des cron jobs pour les actualités
  
  1. Table créée
    - `cron_jobs_config` : Configuration centralisée des tâches planifiées
  
  2. Colonnes
    - `id` : UUID, clé primaire
    - `job_name` : nom unique du job
    - `function_url` : URL de l'Edge Function à appeler
    - `schedule` : format cron (ex: '0 8 * * *')
    - `payload` : données JSON à envoyer
    - `enabled` : actif ou non
    - `last_run` : dernière exécution
    - `last_status` : statut dernière exécution
    - `created_at` : date de création
  
  3. Jobs configurés
    - Agrégation toutes les heures
    - Digest quotidien à 8h
    - Email quotidien à 8h15
    - Digest hebdomadaire lundi 8h
    - Email hebdomadaire lundi 8h15
    - Nettoyage mensuel à 2h
  
  4. Sécurité
    - RLS activé
    - Modification réservée aux authentifiés
*/

CREATE TABLE IF NOT EXISTS cron_jobs_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL UNIQUE,
  function_url text NOT NULL,
  schedule text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  enabled boolean DEFAULT true,
  last_run timestamptz,
  last_status text,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cron_jobs_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage cron jobs"
  ON cron_jobs_config
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can read cron jobs config"
  ON cron_jobs_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO cron_jobs_config (job_name, function_url, schedule, payload, enabled, description) VALUES
  ('news-aggregation-hourly', '/functions/v1/news-aggregator-master', '0 * * * *', '{}'::jsonb, true, 'Agrège les actualités de toutes les sources chaque heure'),
  ('news-digest-daily', '/functions/v1/news-digest-generator', '0 8 * * *', '{"type": "daily"}'::jsonb, true, 'Génère le digest quotidien à 8h'),
  ('news-email-daily', '/functions/v1/news-email-alerts', '15 8 * * *', '{"type": "daily"}'::jsonb, true, 'Envoie le digest quotidien par email à 8h15'),
  ('news-digest-weekly', '/functions/v1/news-digest-generator', '0 8 * * 1', '{"type": "weekly"}'::jsonb, true, 'Génère le digest hebdomadaire le lundi à 8h'),
  ('news-email-weekly', '/functions/v1/news-email-alerts', '15 8 * * 1', '{"type": "weekly"}'::jsonb, true, 'Envoie le digest hebdomadaire par email le lundi à 8h15'),
  ('news-cleanup-monthly', '/functions/v1/news-cleanup', '0 2 1 * *', '{"days": 90}'::jsonb, true, 'Archive les actualités de plus de 90 jours le 1er de chaque mois à 2h')
ON CONFLICT (job_name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_cron_jobs_enabled ON cron_jobs_config(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_cron_jobs_last_run ON cron_jobs_config(last_run);
