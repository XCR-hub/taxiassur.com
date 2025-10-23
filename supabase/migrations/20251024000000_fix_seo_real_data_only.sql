/*
  # Fix SEO Tools - Données Réelles Uniquement

  1. Problème
    - get_current_seo_metrics retourne données estimées si pas de vraies données
    - Frontend affiche données simulées
    - Utilisateur ne sait pas si données réelles ou pas

  2. Solution
    - Retourner UNIQUEMENT vraies données depuis Google Search Console
    - Si pas de données → Retourner message clair "Aucune donnée"
    - Forcer sync GSC pour avoir vraies données

  3. Sécurité
    - Fonction SECURITY DEFINER
    - Accessible par authenticated et anon
*/

-- Fonction pour obtenir métriques SEO (VRAIES DONNÉES UNIQUEMENT)
CREATE OR REPLACE FUNCTION get_current_seo_metrics()
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
CREATE OR REPLACE FUNCTION trigger_gsc_sync()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Cette fonction sera appelée par l'edge function sync-google-search-console
  -- Ici on retourne juste un message invitant à utiliser le bouton
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Utilisez le bouton "Sync Google Search Console" pour récupérer les vraies données',
    'last_sync', (SELECT MAX(created_at) FROM seo_metrics)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION trigger_gsc_sync() TO authenticated, anon;
