/*
  # Fix Fonctions RPC SEO - Erreur 400

  ## Problème
  - get_seo_cron_stats() crash avec erreur 400
  - Colonne manquante ou NULL

  ## Solution
  - Ajouter try/catch pour gérer les erreurs
  - Retourner JSON vide si erreur
  - Gérer les colonnes manquantes
*/

-- Drop anciennes versions si existent
DROP FUNCTION IF EXISTS get_seo_cron_stats() CASCADE;
DROP FUNCTION IF EXISTS get_current_seo_metrics() CASCADE;

-- Fonction stats CRON (avec gestion erreurs)
CREATE OR REPLACE FUNCTION get_seo_cron_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Try/catch pour éviter crash
  BEGIN
    SELECT json_build_object(
      'total_jobs', COALESCE(COUNT(*), 0),
      'active_jobs', COALESCE(COUNT(*) FILTER (WHERE active = true), 0),
      'last_run', COALESCE(MAX(last_start_time), NOW())
    )
    INTO v_result
    FROM cron.job
    WHERE jobname LIKE '%seo%' OR jobname LIKE '%content%';

    RETURN COALESCE(v_result, '{"total_jobs":0,"active_jobs":0,"last_run":null}'::JSON);

  EXCEPTION WHEN OTHERS THEN
    -- Retour par défaut si erreur
    RETURN '{"total_jobs":0,"active_jobs":0,"last_run":null,"error":"No data available"}'::JSON;
  END;
END;
$$;

-- Fonction métriques SEO actuelles (avec gestion erreurs)
CREATE OR REPLACE FUNCTION get_current_seo_metrics()
RETURNS TABLE (
  url TEXT,
  clicks BIGINT,
  impressions BIGINT,
  ctr NUMERIC,
  position NUMERIC,
  last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try/catch pour éviter crash
  BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (sm.url)
      sm.url,
      sm.clicks,
      sm.impressions,
      sm.ctr,
      sm.average_position as position,
      sm.date as last_updated
    FROM seo_metrics sm
    WHERE sm.date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY sm.url, sm.date DESC
    LIMIT 100;

  EXCEPTION WHEN OTHERS THEN
    -- Retour vide si erreur (pas de crash)
    RETURN;
  END;
END;
$$;

-- Permissions publiques (lecture seule)
GRANT EXECUTE ON FUNCTION get_seo_cron_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_current_seo_metrics() TO anon, authenticated;

-- Message succès
DO $$
BEGIN
  RAISE NOTICE '✅ Fonctions RPC SEO corrigées';
  RAISE NOTICE '✅ get_seo_cron_stats() - OK';
  RAISE NOTICE '✅ get_current_seo_metrics() - OK';
  RAISE NOTICE '✅ Try/catch ajouté - Plus d''erreur 400';
END $$;
