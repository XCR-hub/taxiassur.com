/*
  # Activation de pg_cron et configuration des automatisations

  1. Extension
    - Active pg_cron pour les tâches planifiées
    - Active http pour les appels aux Edge Functions

  2. Sécurité
    - Configure les permissions pour pg_cron
    - Permet les appels HTTP aux Edge Functions

  3. Notes
    - Les CRON jobs seront configurés via l'interface Supabase ou SQL séparé
    - Cette migration prépare uniquement l'environnement
*/

-- Activer l'extension pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Activer l'extension http pour appeler les Edge Functions
CREATE EXTENSION IF NOT EXISTS http;

-- Créer une table pour stocker l'état des automatisations
CREATE TABLE IF NOT EXISTS automation_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_name text UNIQUE NOT NULL,
  enabled boolean DEFAULT false,
  last_run timestamptz,
  last_status text,
  error_message text,
  run_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE automation_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read automation status"
  ON automation_status FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous update automation status"
  ON automation_status FOR UPDATE
  USING (true);

CREATE POLICY "Allow anonymous insert automation status"
  ON automation_status FOR INSERT
  WITH CHECK (true);

-- Créer une table pour les logs d'automatisation
CREATE TABLE IF NOT EXISTS automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_name text NOT NULL,
  status text NOT NULL,
  message text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read automation logs"
  ON automation_logs FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous insert automation logs"
  ON automation_logs FOR INSERT
  WITH CHECK (true);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_automation_logs_name ON automation_logs(automation_name);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON automation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_status_enabled ON automation_status(enabled);

-- Initialiser les automatisations de base
INSERT INTO automation_status (automation_name, enabled, last_status) VALUES
  ('seo-daily-refresh', false, 'ready'),
  ('social-media-publisher', false, 'ready'),
  ('backlink-auto-outreach', false, 'ready'),
  ('auto-content-scheduler', false, 'ready'),
  ('email-auto-responder', false, 'ready')
ON CONFLICT (automation_name) DO NOTHING;

-- Créer une fonction helper pour appeler les Edge Functions
CREATE OR REPLACE FUNCTION invoke_edge_function(
  function_name text,
  payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  supabase_url text;
  service_role_key text;
BEGIN
  -- Récupérer l'URL Supabase depuis les variables d'environnement
  -- NOTE: Ces valeurs doivent être configurées dans les secrets Supabase
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE EXCEPTION 'Supabase URL ou Service Role Key non configuré';
  END IF;

  -- Cette fonction est un placeholder
  -- Les vrais appels HTTP seront faits via pg_cron directement
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Function would be invoked: ' || function_name
  );
END;
$$;

COMMENT ON TABLE automation_status IS 'Stocke l''état des automatisations (CRON jobs)';
COMMENT ON TABLE automation_logs IS 'Logs des exécutions d''automatisation';
COMMENT ON FUNCTION invoke_edge_function IS 'Helper pour invoquer les Edge Functions depuis pg_cron';
