/*
  # Diagnostic GSC - Problèmes d'indexation
  
  1. Tables
    - gsc_indexation_issues: Suivi des problèmes GSC
    - gsc_url_status: Statut de chaque URL
  
  2. Fonctions
    - log_gsc_issue: Enregistrer un problème
    - get_indexation_report: Rapport complet
*/

-- Table pour suivre les problèmes d'indexation
CREATE TABLE IF NOT EXISTS gsc_indexation_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type text NOT NULL, -- '5xx', 'redirect', 'duplicate', 'soft_404', etc.
  url text NOT NULL,
  detected_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolution_notes text,
  priority integer DEFAULT 1, -- 1=urgent, 2=important, 3=normal
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table pour le statut des URLs
CREATE TABLE IF NOT EXISTS gsc_url_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text UNIQUE NOT NULL,
  last_check timestamptz DEFAULT now(),
  http_status integer,
  is_indexed boolean DEFAULT false,
  indexation_status text, -- 'indexed', 'discovered', 'crawled_not_indexed', 'error_5xx', etc.
  canonical_url text,
  has_redirect boolean DEFAULT false,
  redirect_target text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_gsc_issues_type ON gsc_indexation_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_gsc_issues_resolved ON gsc_indexation_issues(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gsc_url_status_indexed ON gsc_url_status(is_indexed);
CREATE INDEX IF NOT EXISTS idx_gsc_url_status_status ON gsc_url_status(indexation_status);

-- RLS
ALTER TABLE gsc_indexation_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE gsc_url_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gsc_issues_select_all" ON gsc_indexation_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "gsc_issues_insert_authenticated" ON gsc_indexation_issues FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "gsc_issues_update_authenticated" ON gsc_indexation_issues FOR UPDATE TO authenticated USING (true);

CREATE POLICY "gsc_url_status_select_all" ON gsc_url_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "gsc_url_status_insert_authenticated" ON gsc_url_status FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "gsc_url_status_update_authenticated" ON gsc_url_status FOR UPDATE TO authenticated USING (true);

-- Fonction pour logger un problème
CREATE OR REPLACE FUNCTION log_gsc_issue(
  p_issue_type text,
  p_url text,
  p_priority integer DEFAULT 1,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issue_id uuid;
BEGIN
  INSERT INTO gsc_indexation_issues (
    issue_type,
    url,
    priority,
    metadata
  )
  VALUES (
    p_issue_type,
    p_url,
    p_priority,
    p_metadata
  )
  RETURNING id INTO v_issue_id;
  
  RETURN v_issue_id;
END;
$$;

-- Fonction pour obtenir le rapport d'indexation
CREATE OR REPLACE FUNCTION get_indexation_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_issues', COUNT(*),
    'unresolved_issues', COUNT(*) FILTER (WHERE resolved_at IS NULL),
    'by_type', jsonb_object_agg(
      issue_type,
      COUNT(*)
    ),
    'by_priority', jsonb_build_object(
      'urgent', COUNT(*) FILTER (WHERE priority = 1),
      'important', COUNT(*) FILTER (WHERE priority = 2),
      'normal', COUNT(*) FILTER (WHERE priority = 3)
    ),
    'recent_issues', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'type', issue_type,
          'url', url,
          'priority', priority,
          'detected_at', detected_at
        )
      )
      FROM (
        SELECT * FROM gsc_indexation_issues
        WHERE resolved_at IS NULL
        ORDER BY priority ASC, detected_at DESC
        LIMIT 20
      ) recent
    )
  )
  INTO v_result
  FROM gsc_indexation_issues;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

COMMENT ON TABLE gsc_indexation_issues IS 'Suivi des problèmes d indexation Google Search Console';
COMMENT ON TABLE gsc_url_status IS 'Statut des URLs pour l indexation';
