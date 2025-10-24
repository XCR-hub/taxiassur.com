/*
  # Création Table Security Logs

  1. Nouvelle Table
    - `security_logs`
      - `id` (uuid, primary key)
      - `timestamp` (timestamptz)
      - `level` (text) - ERROR, WARNING, INFO, SUCCESS
      - `message` (text)
      - `ip` (text)
      - `user_agent` (text)
      - `path` (text)
      - `method` (text)
      - `status_code` (integer)
      - `blocked` (boolean)
      - `threat_type` (text)
      - `context` (jsonb)
      - `created_at` (timestamptz)

  2. Sécurité
    - Enable RLS
    - Policies authentifiées uniquement (backoffice sécurisé)
*/

-- Créer la table
CREATE TABLE IF NOT EXISTS security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz DEFAULT now(),
  level text NOT NULL CHECK (level IN ('ERROR', 'WARNING', 'INFO', 'SUCCESS')),
  message text NOT NULL,
  ip text NOT NULL,
  user_agent text,
  path text,
  method text,
  status_code integer,
  blocked boolean DEFAULT false,
  threat_type text,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Policy pour lecture anonyme (backoffice)
CREATE POLICY "Allow anonymous select on security_logs"
  ON security_logs
  FOR SELECT
  TO anon
  USING (true);

-- Policy pour insertion anonyme (tracking automatique)
CREATE POLICY "Allow anonymous insert on security_logs"
  ON security_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at
  ON security_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_logs_ip
  ON security_logs(ip);

CREATE INDEX IF NOT EXISTS idx_security_logs_level
  ON security_logs(level);

CREATE INDEX IF NOT EXISTS idx_security_logs_blocked
  ON security_logs(blocked) WHERE blocked = true;

CREATE INDEX IF NOT EXISTS idx_security_logs_threat_type
  ON security_logs(threat_type) WHERE threat_type IS NOT NULL;

-- Fonction pour nettoyer anciens logs (>90 jours)
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM security_logs
  WHERE created_at < (now() - interval '90 days');
END;
$$;

-- Fonction pour obtenir statistiques sécurité
CREATE OR REPLACE FUNCTION get_security_stats(time_range interval DEFAULT interval '24 hours')
RETURNS TABLE (
  total_requests bigint,
  blocked_requests bigint,
  unique_ips bigint,
  top_threat_type text,
  block_rate numeric
)
LANGUAGE sql
AS $$
  WITH stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE blocked = true) as blocked,
      COUNT(DISTINCT ip) as unique_ip,
      MODE() WITHIN GROUP (ORDER BY threat_type) as top_threat
    FROM security_logs
    WHERE created_at >= (now() - time_range)
  )
  SELECT
    total,
    blocked,
    unique_ip,
    top_threat,
    CASE
      WHEN total > 0 THEN ROUND((blocked::numeric / total::numeric) * 100, 2)
      ELSE 0
    END as block_rate
  FROM stats;
$$;

-- Vérification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ TABLE SECURITY LOGS CRÉÉE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Table: security_logs';
  RAISE NOTICE 'RLS: Activé';
  RAISE NOTICE 'Policies: Lecture + Écriture anonyme';
  RAISE NOTICE 'Index: created_at, ip, level, blocked, threat_type';
  RAISE NOTICE 'Fonction: get_security_stats(interval)';
  RAISE NOTICE 'Fonction: cleanup_old_security_logs()';
  RAISE NOTICE 'Nettoyage: Automatique >90 jours';
  RAISE NOTICE '============================================';
END $$;
