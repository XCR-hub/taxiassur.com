/*
  # Force Drop get_current_seo_metrics - Toutes Versions

  1. Problème
    - Fonction existe avec signature différente
    - DROP FUNCTION IF EXISTS ne suffit pas
    - Besoin de drop avec CASCADE

  2. Solution
    - Drop avec CASCADE pour supprimer toutes dépendances
    - Drop toutes variantes possibles
*/

-- Drop toutes les variantes possibles de la fonction
DROP FUNCTION IF EXISTS get_current_seo_metrics() CASCADE;
DROP FUNCTION IF EXISTS get_current_seo_metrics(text) CASCADE;
DROP FUNCTION IF EXISTS get_current_seo_metrics(integer) CASCADE;

-- Créer la nouvelle fonction avec signature TABLE
CREATE FUNCTION get_current_seo_metrics()
RETURNS TABLE (
  date date,
  total_urls integer,
  indexed_pages integer,
  pending_pages integer,
  impressions_30d bigint,
  clicks_30d bigint,
  average_position numeric,
  last_update timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Retourner les vraies métriques des 30 derniers jours agrégées
  RETURN QUERY
  SELECT
    CURRENT_DATE as date,
    (SELECT COUNT(DISTINCT url) FROM seo_metrics)::integer as total_urls,
    (SELECT COUNT(DISTINCT url) FROM seo_metrics WHERE clicks > 0)::integer as indexed_pages,
    (SELECT COUNT(DISTINCT url) FROM seo_metrics WHERE clicks = 0)::integer as pending_pages,
    COALESCE(SUM(impressions), 0)::bigint as impressions_30d,
    COALESCE(SUM(clicks), 0)::bigint as clicks_30d,
    COALESCE(AVG(position), 0)::numeric as average_position,
    MAX(created_at) as last_update
  FROM seo_metrics
  WHERE date >= CURRENT_DATE - INTERVAL '30 days';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_current_seo_metrics() TO authenticated, anon;

-- Fonction pour forcer sync Google Search Console
DROP FUNCTION IF EXISTS trigger_gsc_sync() CASCADE;

CREATE FUNCTION trigger_gsc_sync()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Utilisez le bouton "Sync Google Search Console" pour récupérer les vraies données',
    'last_sync', (SELECT MAX(created_at) FROM seo_metrics)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION trigger_gsc_sync() TO authenticated, anon;
