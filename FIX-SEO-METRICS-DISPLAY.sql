/*
  # Fix SEO Metrics Display - Afficher les VRAIES données

  ## Problème
  - L'edge function `seo-daily-refresh` récupère les vraies données Google Search Console
  - Mais `get_current_seo_metrics()` appelle `populate_real_seo_metrics()` qui ÉCRASE avec des estimations
  - Résultat : le backoffice affiche des fausses données (142 pages au lieu de 9)

  ## Solution
  1. Supprimer l'appel à `populate_real_seo_metrics()`
  2. Lire directement depuis `seo_metrics` (rempli par l'edge function)
  3. Si pas de données, retourner des zéros propres
*/

-- 1. Recréer get_current_seo_metrics() pour lire les VRAIES données
DROP FUNCTION IF EXISTS get_current_seo_metrics() CASCADE;

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
  v_avg_position decimal;
BEGIN
  -- Vérifier si données récentes existent
  SELECT EXISTS(
    SELECT 1 FROM seo_metrics
    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  ) INTO v_has_data;

  IF v_has_data THEN
    -- Calculer les sommes des 30 derniers jours
    SELECT
      COALESCE(SUM(impressions), 0),
      COALESCE(SUM(clicks), 0),
      COALESCE(AVG(average_position), 0)
    INTO v_impressions_sum, v_clicks_sum, v_avg_position
    FROM seo_metrics
    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
      AND source IN ('google', 'automated'); -- Seulement sources fiables

    -- Retourner les données les plus récentes avec sommes calculées
    RETURN QUERY
    SELECT
      sm.total_urls,
      sm.indexed_pages,
      sm.pending_pages,
      v_impressions_sum::bigint as impressions_30d,
      v_clicks_sum::bigint as clicks_30d,
      v_avg_position::decimal as average_position,
      sm.updated_at as last_update,
      (sm.source = 'google')::boolean as is_real_data -- TRUE si données Google
    FROM seo_metrics sm
    WHERE sm.date = (SELECT MAX(date) FROM seo_metrics)
    LIMIT 1;
  ELSE
    -- Aucune donnée : retourner des zéros (pas d'estimation)
    RETURN QUERY
    SELECT
      0::int as total_urls,
      0::int as indexed_pages,
      0::int as pending_pages,
      0::bigint as impressions_30d,
      0::bigint as clicks_30d,
      0::decimal as average_position,
      NULL::timestamptz as last_update,
      false::boolean as is_real_data;
  END IF;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION get_current_seo_metrics() TO authenticated, anon, service_role;

-- 2. Vérifier les données actuelles
SELECT
  date,
  total_urls,
  indexed_pages,
  impressions,
  clicks,
  average_position,
  source,
  updated_at
FROM seo_metrics
ORDER BY date DESC
LIMIT 5;

-- 3. Test de la fonction
SELECT * FROM get_current_seo_metrics();
