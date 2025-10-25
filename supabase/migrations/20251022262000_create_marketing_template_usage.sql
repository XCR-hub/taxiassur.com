/*
  # Cr\u00e9ation Table Tracking Templates Marketing

  1. Nouvelle Table
    - `marketing_template_usage`
      - `id` (uuid, primary key)
      - `template_type` (text) - whatsapp, email, linkedin, presse
      - `template_id` (text) - identifiant du template
      - `action` (text) - copy ou download
      - `ambassador_code` (text) - code ambassadeur
      - `created_at` (timestamptz)

  2. S\u00e9curit\u00e9
    - Enable RLS
    - Policies pour lecture/\u00e9criture anonyme (backoffice)
*/

-- Cr\u00e9er la table
CREATE TABLE IF NOT EXISTS marketing_template_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text NOT NULL,
  template_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('copy', 'download')),
  ambassador_code text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE marketing_template_usage ENABLE ROW LEVEL SECURITY;

-- Policy pour insertion anonyme (backoffice)
CREATE POLICY "Allow anonymous insert on marketing_template_usage"
  ON marketing_template_usage
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy pour lecture anonyme (stats backoffice)
CREATE POLICY "Allow anonymous select on marketing_template_usage"
  ON marketing_template_usage
  FOR SELECT
  TO anon
  USING (true);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_marketing_template_usage_created_at
  ON marketing_template_usage(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_template_usage_template_id
  ON marketing_template_usage(template_id);

-- Fonction pour nettoyer ancien historique (>90 jours)
CREATE OR REPLACE FUNCTION cleanup_old_marketing_usage()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM marketing_template_usage
  WHERE created_at < (now() - interval '90 days');
END;
$$;

-- V\u00e9rification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '\u2705 TABLE MARKETING TEMPLATE USAGE CR\u00c9\u00c9E';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Table: marketing_template_usage';
  RAISE NOTICE 'RLS: Activ\u00e9';
  RAISE NOTICE 'Policies: Lecture + \u00c9criture anonyme';
  RAISE NOTICE 'Index: created_at, template_id';
  RAISE NOTICE 'Nettoyage: Automatique >90 jours';
  RAISE NOTICE '============================================';
END $$;
