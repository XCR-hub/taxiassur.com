/*
  # Fix Fonction RPC - Erreur "position" Keyword

  ## Problème
  "position" est un mot-clé SQL réservé

  ## Solution
  Renommer en "avg_position"
*/

-- Drop ancienne version
DROP FUNCTION IF EXISTS get_current_seo_metrics() CASCADE;

-- Fonction avec nom colonne valide
CREATE OR REPLACE FUNCTION get_current_seo_metrics()
RETURNS TABLE (
  url TEXT,
  clicks BIGINT,
  impressions BIGINT,
  ctr NUMERIC,
  avg_position NUMERIC,
  last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (sm.url)
      sm.url,
      sm.clicks,
      sm.impressions,
      sm.ctr,
      sm.average_position,
      sm.date
    FROM seo_metrics sm
    WHERE sm.date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY sm.url, sm.date DESC
    LIMIT 100;

  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION get_current_seo_metrics() TO anon, authenticated;

-- Message succès
DO $$
BEGIN
  RAISE NOTICE '✅ Fonction RPC corrigée - position → avg_position';
END $$;
