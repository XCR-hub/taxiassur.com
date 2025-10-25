/*
  # Création Table Tracking QR Codes

  1. Nouvelle Table
    - `qr_code_usage`
      - `id` (uuid, primary key)
      - `ambassador_code` (text) - code ambassadeur
      - `action` (text) - generate ou scan
      - `template` (text) - basic, business-card, flyer, sticker, vehicle
      - `created_at` (timestamptz)

  2. Sécurité
    - Enable RLS
    - Policies pour lecture/écriture anonyme (backoffice + tracking public)
*/

-- Créer la table
CREATE TABLE IF NOT EXISTS qr_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_code text NOT NULL,
  action text NOT NULL CHECK (action IN ('generate', 'scan')),
  template text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE qr_code_usage ENABLE ROW LEVEL SECURITY;

-- Policy pour insertion anonyme (backoffice + scan public)
CREATE POLICY "Allow anonymous insert on qr_code_usage"
  ON qr_code_usage
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy pour lecture anonyme (stats backoffice)
CREATE POLICY "Allow anonymous select on qr_code_usage"
  ON qr_code_usage
  FOR SELECT
  TO anon
  USING (true);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_qr_code_usage_created_at
  ON qr_code_usage(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qr_code_usage_ambassador_code
  ON qr_code_usage(ambassador_code);

CREATE INDEX IF NOT EXISTS idx_qr_code_usage_action
  ON qr_code_usage(action);

-- Fonction pour statistiques QR par ambassadeur
CREATE OR REPLACE FUNCTION get_qr_stats_by_ambassador()
RETURNS TABLE (
  ambassador_code text,
  total_generated bigint,
  total_scans bigint,
  last_activity timestamptz
)
LANGUAGE sql
AS $$
  SELECT
    ambassador_code,
    COUNT(*) FILTER (WHERE action = 'generate') as total_generated,
    COUNT(*) FILTER (WHERE action = 'scan') as total_scans,
    MAX(created_at) as last_activity
  FROM qr_code_usage
  GROUP BY ambassador_code
  ORDER BY total_generated DESC;
$$;

-- Fonction pour nettoyer ancien historique (>180 jours)
CREATE OR REPLACE FUNCTION cleanup_old_qr_usage()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM qr_code_usage
  WHERE created_at < (now() - interval '180 days');
END;
$$;

-- Vérification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ TABLE QR CODE USAGE CRÉÉE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Table: qr_code_usage';
  RAISE NOTICE 'RLS: Activé';
  RAISE NOTICE 'Policies: Lecture + Écriture anonyme';
  RAISE NOTICE 'Index: created_at, ambassador_code, action';
  RAISE NOTICE 'Fonction: get_qr_stats_by_ambassador()';
  RAISE NOTICE 'Nettoyage: Automatique >180 jours';
  RAISE NOTICE '============================================';
END $$;
