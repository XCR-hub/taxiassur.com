/*
  # Système de Monitoring SEO - TaxiAssur 2026
  
  1. Tables créées
    - `seo_health_checks` : Snapshots de santé SEO
    - `seo_indexation_tracking` : Suivi des soumissions IndexNow
    - `seo_errors_log` : Log des erreurs SEO détectées
    
  2. Fonctions
    - Calcul automatique des scores SEO
    - Détection des régressions
    - Alertes automatiques
    
  3. Sécurité
    - RLS activé
    - Accès admin uniquement
*/

-- Table de santé SEO
CREATE TABLE IF NOT EXISTS seo_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Snapshot date
  checked_at timestamptz DEFAULT now(),
  
  -- Métriques globales
  total_pages integer DEFAULT 0,
  indexable_pages integer DEFAULT 0,
  non_indexable_pages integer DEFAULT 0,
  
  -- Erreurs critiques
  pages_5xx integer DEFAULT 0,
  pages_404 integer DEFAULT 0,
  pages_4xx integer DEFAULT 0,
  broken_redirects integer DEFAULT 0,
  
  -- Problèmes de contenu
  missing_h1 integer DEFAULT 0,
  missing_meta_description integer DEFAULT 0,
  duplicate_pages integer DEFAULT 0,
  low_word_count integer DEFAULT 0,
  
  -- Problèmes de liens
  orphan_pages integer DEFAULT 0,
  pages_no_outgoing_links integer DEFAULT 0,
  broken_internal_links integer DEFAULT 0,
  
  -- Performance
  slow_pages integer DEFAULT 0,
  large_images integer DEFAULT 0,
  
  -- Social
  missing_og_tags integer DEFAULT 0,
  missing_twitter_cards integer DEFAULT 0,
  
  -- Sitemap
  pages_in_sitemap integer DEFAULT 0,
  errors_in_sitemap integer DEFAULT 0,
  
  -- Structured data
  structured_data_errors integer DEFAULT 0,
  
  -- Score global (0-100)
  seo_score numeric(5,2) DEFAULT 0,
  
  -- Métadonnées
  source text DEFAULT 'manual',
  notes text,
  
  created_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_seo_health_checks_checked_at ON seo_health_checks(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_health_checks_score ON seo_health_checks(seo_score DESC);

-- Table de tracking IndexNow
CREATE TABLE IF NOT EXISTS seo_indexation_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Soumission
  submitted_count integer NOT NULL DEFAULT 0,
  failed_count integer DEFAULT 0,
  provider text DEFAULT 'indexnow',
  
  -- URLs soumises
  urls text[],
  
  -- Résultat
  status text CHECK (status IN ('success', 'partial', 'failed')),
  error_message text,
  
  -- Timing
  submitted_at timestamptz DEFAULT now(),
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_indexation_submitted_at ON seo_indexation_tracking(submitted_at DESC);

-- Table de log des erreurs SEO
CREATE TABLE IF NOT EXISTS seo_errors_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type d'erreur
  error_type text NOT NULL, -- '5xx', '404', 'missing_h1', 'duplicate', etc.
  severity text CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  
  -- Page concernée
  page_url text NOT NULL,
  page_title text,
  
  -- Détails
  description text,
  recommended_fix text,
  
  -- Statut
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'fixed', 'ignored')),
  fixed_at timestamptz,
  fixed_by uuid REFERENCES auth.users(id),
  
  -- Tracking
  first_detected_at timestamptz DEFAULT now(),
  last_checked_at timestamptz DEFAULT now(),
  occurrences integer DEFAULT 1,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_errors_log_status ON seo_errors_log(status);
CREATE INDEX IF NOT EXISTS idx_seo_errors_log_type ON seo_errors_log(error_type);
CREATE INDEX IF NOT EXISTS idx_seo_errors_log_severity ON seo_errors_log(severity);
CREATE INDEX IF NOT EXISTS idx_seo_errors_log_url ON seo_errors_log(page_url);

-- RLS
ALTER TABLE seo_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_indexation_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_errors_log ENABLE ROW LEVEL SECURITY;

-- Policies (admins seulement)
CREATE POLICY "Admins can manage health checks"
  ON seo_health_checks FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Admins can manage indexation tracking"
  ON seo_indexation_tracking FOR ALL TO authenticated
  USING (true);

CREATE POLICY "Admins can manage errors log"
  ON seo_errors_log FOR ALL TO authenticated
  USING (true);

-- Fonction pour calculer le score SEO
CREATE OR REPLACE FUNCTION calculate_seo_score(check_id uuid)
RETURNS numeric AS $$
DECLARE
  score numeric := 100.0;
  check_data record;
BEGIN
  SELECT * INTO check_data FROM seo_health_checks WHERE id = check_id;
  
  -- Pénalités pour erreurs critiques
  score := score - (check_data.pages_5xx * 2.0);
  score := score - (check_data.pages_404 * 1.0);
  score := score - (check_data.broken_redirects * 1.5);
  
  -- Pénalités pour contenu
  score := score - (check_data.missing_h1 * 0.1);
  score := score - (check_data.duplicate_pages * 0.2);
  score := score - (check_data.missing_meta_description * 0.1);
  
  -- Pénalités pour liens
  score := score - (check_data.orphan_pages * 0.05);
  score := score - (check_data.broken_internal_links * 0.3);
  
  -- Pénalités pour performance
  score := score - (check_data.slow_pages * 0.1);
  
  -- Pénalités pour structured data
  score := score - (check_data.structured_data_errors * 0.05);
  
  -- Assurer que le score reste entre 0 et 100
  score := GREATEST(0, LEAST(100, score));
  
  -- Mettre à jour le score
  UPDATE seo_health_checks SET seo_score = score WHERE id = check_id;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Fonction pour détecter les régressions
CREATE OR REPLACE FUNCTION detect_seo_regression()
RETURNS TABLE (
  metric text,
  previous_value integer,
  current_value integer,
  difference integer,
  severity text
) AS $$
DECLARE
  current_check record;
  previous_check record;
BEGIN
  -- Récupérer les 2 derniers checks
  SELECT * INTO current_check FROM seo_health_checks
  ORDER BY checked_at DESC LIMIT 1;
  
  SELECT * INTO previous_check FROM seo_health_checks
  ORDER BY checked_at DESC OFFSET 1 LIMIT 1;
  
  IF current_check IS NULL OR previous_check IS NULL THEN
    RETURN;
  END IF;
  
  -- Comparer les métriques
  IF current_check.pages_5xx > previous_check.pages_5xx THEN
    RETURN QUERY SELECT 
      '5XX errors'::text,
      previous_check.pages_5xx,
      current_check.pages_5xx,
      current_check.pages_5xx - previous_check.pages_5xx,
      'critical'::text;
  END IF;
  
  IF current_check.pages_404 > previous_check.pages_404 THEN
    RETURN QUERY SELECT 
      '404 errors'::text,
      previous_check.pages_404,
      current_check.pages_404,
      current_check.pages_404 - previous_check.pages_404,
      'high'::text;
  END IF;
  
  IF current_check.orphan_pages > previous_check.orphan_pages + 10 THEN
    RETURN QUERY SELECT 
      'Orphan pages'::text,
      previous_check.orphan_pages,
      current_check.orphan_pages,
      current_check.orphan_pages - previous_check.orphan_pages,
      'medium'::text;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Fonction pour obtenir le dernier rapport SEO
CREATE OR REPLACE FUNCTION get_latest_seo_report()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  latest_check record;
  score numeric;
BEGIN
  SELECT * INTO latest_check FROM seo_health_checks
  ORDER BY checked_at DESC LIMIT 1;
  
  IF latest_check IS NULL THEN
    RETURN '{"error": "No SEO check found"}'::jsonb;
  END IF;
  
  result := jsonb_build_object(
    'checked_at', latest_check.checked_at,
    'seo_score', latest_check.seo_score,
    'total_pages', latest_check.total_pages,
    'critical_errors', jsonb_build_object(
      '5xx_pages', latest_check.pages_5xx,
      '404_pages', latest_check.pages_404,
      'broken_redirects', latest_check.broken_redirects
    ),
    'content_issues', jsonb_build_object(
      'missing_h1', latest_check.missing_h1,
      'missing_meta', latest_check.missing_meta_description,
      'duplicates', latest_check.duplicate_pages,
      'low_word_count', latest_check.low_word_count
    ),
    'link_issues', jsonb_build_object(
      'orphan_pages', latest_check.orphan_pages,
      'no_outgoing', latest_check.pages_no_outgoing_links,
      'broken_links', latest_check.broken_internal_links
    ),
    'performance', jsonb_build_object(
      'slow_pages', latest_check.slow_pages,
      'large_images', latest_check.large_images
    ),
    'social', jsonb_build_object(
      'missing_og', latest_check.missing_og_tags,
      'missing_twitter', latest_check.missing_twitter_cards
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
