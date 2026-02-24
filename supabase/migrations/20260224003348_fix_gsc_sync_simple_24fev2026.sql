/*
  # Diagnostic Google Search Console simplifié
  
  1. Fonctions de diagnostic
    - `check_gsc_configuration()` - Vérifie la configuration GSC
    - `get_gsc_sync_status()` - Retourne l'état de la synchronisation
  
  2. Tables
    - gsc_sync_logs pour le suivi des synchronisations
*/

-- Table pour les logs de synchronisation GSC
CREATE TABLE IF NOT EXISTS gsc_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('started', 'success', 'error', 'warning')),
  message text,
  queries_fetched int DEFAULT 0,
  error_details jsonb,
  duration_ms int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gsc_sync_logs_date ON gsc_sync_logs(sync_date DESC);
ALTER TABLE gsc_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view GSC logs" ON gsc_sync_logs;
CREATE POLICY "Admins can view GSC logs"
  ON gsc_sync_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

-- Fonction de vérification
CREATE OR REPLACE FUNCTION check_gsc_configuration()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_status jsonb;
BEGIN
  config_status := jsonb_build_object(
    'last_sync', (SELECT MAX(created_at) FROM gsc_sync_logs WHERE status = 'success'),
    'query_count', (SELECT COUNT(*) FROM gsc_queries),
    'published_count', (SELECT COUNT(*) FROM gsc_published_content),
    'crons_active', (SELECT COUNT(*) FROM cron.job WHERE active = true AND jobname LIKE '%gsc%'),
    'status', CASE
      WHEN (SELECT MAX(created_at) FROM gsc_sync_logs WHERE status = 'success') IS NULL THEN 'never_synced'
      WHEN (SELECT MAX(created_at) FROM gsc_sync_logs WHERE status = 'success') < now() - interval '2 days' THEN 'outdated'
      ELSE 'ok'
    END,
    'checked_at', now()
  );
  RETURN config_status;
END;
$$;

-- Ajouter configuration
INSERT INTO system_config (key, value, description)
VALUES 
  ('gsc_site_url', 'https://www.taxiassur.fr', 'URL du site pour GSC'),
  ('gsc_enabled', 'true', 'Activer GSC')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

GRANT SELECT ON gsc_sync_logs TO authenticated;
GRANT EXECUTE ON FUNCTION check_gsc_configuration TO authenticated, service_role;
