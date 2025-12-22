/*
  # Fix get_current_seo_metrics() GROUP BY Error

  1. Problème
    - Erreur: column "sm.total_urls" must appear in the GROUP BY clause
    - Cause: SUM() avec FILTER sur colonnes non agrégées

  2. Solution
    - Simplifier requête pour éviter GROUP BY avec colonnes non agrégées
    - Utiliser subquery pour calculer sommes séparément
    - Retourner données les plus récentes sans agrégation complexe
*/

-- Drop et recréer fonction avec logique simplifiée
DROP FUNCTION IF EXISTS get_current_seo_metrics();

CREATE OR REPLACE FUNCTION get_current_seo_metrics()
RETURNS TABLE (
  total_urls int,
  indexed_pages int,
  pending_pages int,
  impressions_30d bigint,
  clicks_30d bigint,
  average_position decimal,
  last_update timestamptz,
  is_real_data boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_data boolean;
  v_impressions_sum bigint;
  v_clicks_sum bigint;
BEGIN
  -- Vérifier si données récentes existent
  SELECT EXISTS(
    SELECT 1 FROM seo_metrics
    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  ) INTO v_has_data;

  IF v_has_data THEN
    -- Calculer sommes des 30 derniers jours séparément
    SELECT
      COALESCE(SUM(impressions), 0),
      COALESCE(SUM(clicks), 0)
    INTO v_impressions_sum, v_clicks_sum
    FROM seo_metrics
    WHERE date >= CURRENT_DATE - INTERVAL '30 days';

    -- Retourner données les plus récentes avec sommes calculées
    RETURN QUERY
    SELECT
      sm.total_urls,
      sm.indexed_pages,
      sm.pending_pages,
      v_impressions_sum::bigint as impressions_30d,
      v_clicks_sum::bigint as clicks_30d,
      sm.average_position,
      sm.updated_at as last_update,
      true as is_real_data
    FROM seo_metrics sm
    WHERE sm.date = (SELECT MAX(date) FROM seo_metrics)
    LIMIT 1;
  ELSE
    -- Générer nouvelles données
    PERFORM populate_real_seo_metrics();

    -- Retourner données fraîches
    RETURN QUERY
    SELECT
      sm.total_urls,
      sm.indexed_pages,
      sm.pending_pages,
      0::bigint as impressions_30d,
      0::bigint as clicks_30d,
      0::decimal as average_position,
      sm.updated_at as last_update,
      true as is_real_data
    FROM seo_metrics sm
    WHERE sm.date = CURRENT_DATE
    LIMIT 1;
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_current_seo_metrics() TO authenticated, anon;

-- Test fonction
-- SELECT * FROM get_current_seo_metrics();
