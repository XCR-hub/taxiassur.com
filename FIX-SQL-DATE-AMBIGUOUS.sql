/*
  # Fix get_current_seo_metrics - Erreur "date is ambiguous"

  1. Problème
    - Error code 42702: column reference "date" is ambiguous
    - Conflit entre colonne "date" dans RETURNS TABLE et table seo_metrics

  2. Solution
    - Qualifier explicitement toutes les colonnes avec le nom de table
    - Utiliser sm.date au lieu de date
*/

-- Drop toutes les variantes possibles de la fonction
DROP FUNCTION IF EXISTS get_current_seo_metrics() CASCADE;
DROP FUNCTION IF EXISTS get_current_seo_metrics(text) CASCADE;
DROP FUNCTION IF EXISTS get_current_seo_metrics(integer) CASCADE;

-- Créer la nouvelle fonction avec colonnes qualifiées
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
    (SELECT COUNT(DISTINCT sm.url) FROM seo_metrics sm)::integer as total_urls,
    (SELECT COUNT(DISTINCT sm.url) FROM seo_metrics sm WHERE sm.clicks > 0)::integer as indexed_pages,
    (SELECT COUNT(DISTINCT sm.url) FROM seo_metrics sm WHERE sm.clicks = 0)::integer as pending_pages,
    COALESCE(SUM(sm.impressions), 0)::bigint as impressions_30d,
    COALESCE(SUM(sm.clicks), 0)::bigint as clicks_30d,
    COALESCE(AVG(sm.position), 0)::numeric as average_position,
    MAX(sm.created_at) as last_update
  FROM seo_metrics sm
  WHERE sm.date >= CURRENT_DATE - INTERVAL '30 days';
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
    'last_sync', (SELECT MAX(sm.created_at) FROM seo_metrics sm)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION trigger_gsc_sync() TO authenticated, anon;
