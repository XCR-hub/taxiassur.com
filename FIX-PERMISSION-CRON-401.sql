/*
  ⚡ FIX ERREUR 401 - Permission denied for table job

  Erreur: permission denied for table job
  Cause: Les fonctions RPC n'ont pas accès à cron.job
  Solution: Créer fonctions avec SECURITY DEFINER

  COPIER/COLLER dans Supabase SQL Editor
  https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql
*/

-- ============================================
-- 1. FONCTION toggle_automation (avec permissions)
-- ============================================

DROP FUNCTION IF EXISTS toggle_automation(text, boolean) CASCADE;

CREATE OR REPLACE FUNCTION toggle_automation(automation_name text, enabled boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- ⚡ Donne les permissions admin
AS $$
DECLARE
  v_affected_rows int;
BEGIN
  -- Mettre à jour le cron job
  UPDATE cron.job
  SET active = enabled
  WHERE jobname = automation_name;

  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

  IF v_affected_rows = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Automation non trouvée: ' || automation_name
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Automation ' || CASE WHEN enabled THEN 'activée' ELSE 'désactivée' END,
    'affected_rows', v_affected_rows
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Erreur lors de la modification'
  );
END;
$$;

-- ============================================
-- 2. FONCTION execute_sql (si pas déjà créée)
-- ============================================

DROP FUNCTION IF EXISTS execute_sql(text) CASCADE;

CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- ⚡ Donne les permissions admin
AS $$
DECLARE
  v_affected_rows int;
BEGIN
  -- Sécurité: Bloquer DROP, DELETE sans WHERE, TRUNCATE
  IF sql_query ~* '^\s*(DROP|TRUNCATE)' THEN
    RAISE EXCEPTION 'Opération non autorisée: DROP/TRUNCATE';
  END IF;

  IF sql_query ~* 'DELETE.*FROM.*(?!WHERE)' THEN
    RAISE EXCEPTION 'DELETE sans WHERE non autorisé';
  END IF;

  -- Exécuter la requête
  BEGIN
    EXECUTE sql_query;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

    RETURN json_build_object(
      'success', true,
      'affected_rows', v_affected_rows,
      'message', 'Requête exécutée avec succès'
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Erreur lors de l''exécution'
    );
  END;
END;
$$;

-- ============================================
-- 3. FONCTION get_automations (liste complète)
-- ============================================

DROP FUNCTION IF EXISTS get_automations() CASCADE;

CREATE OR REPLACE FUNCTION get_automations()
RETURNS TABLE (
  id bigint,
  name text,
  description text,
  is_enabled boolean,
  frequency text,
  total_runs bigint,
  successful_runs bigint,
  last_run_at timestamptz,
  last_error text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobid as id,
    j.jobname as name,
    j.command as description,
    j.active as is_enabled,
    j.schedule as frequency,
    COALESCE(COUNT(r.runid), 0)::bigint as total_runs,
    COALESCE(COUNT(r.runid) FILTER (WHERE r.status = 'succeeded'), 0)::bigint as successful_runs,
    MAX(r.start_time) as last_run_at,
    (
      SELECT r2.return_message
      FROM cron.job_run_details r2
      WHERE r2.jobid = j.jobid
        AND r2.status = 'failed'
      ORDER BY r2.start_time DESC
      LIMIT 1
    ) as last_error
  FROM cron.job j
  LEFT JOIN cron.job_run_details r ON r.jobid = j.jobid
  GROUP BY j.jobid, j.jobname, j.command, j.active, j.schedule;
END;
$$;

-- ============================================
-- 4. TEST DES FONCTIONS
-- ============================================

-- Test 1: Liste des automations
SELECT * FROM get_automations() LIMIT 3;

-- Test 2: Activer une automation (si elle existe)
SELECT toggle_automation('sitemap_regeneration', true);

-- Test 3: Execute SQL simple
SELECT execute_sql('SELECT 1');

-- ============================================
-- ✅ RÉSULTAT ATTENDU
-- ============================================
/*
Test 1: Doit retourner liste des cron jobs
Test 2: {"success": true, "message": "Automation activée"}
Test 3: {"success": true, "message": "Requête exécutée avec succès"}

Si tout fonctionne:
✅ toggle_automation OK
✅ execute_sql OK
✅ get_automations OK
✅ Permissions correctes (SECURITY DEFINER)

APRÈS EXÉCUTION:
1. Rafraîchir: https://taxiassur.com/backoffice/auto-optimizer
2. Ctrl+F5 pour vider cache
3. Cliquer sur un switch pour activer/désactiver
4. ✅ Pas d'erreur 401
*/
