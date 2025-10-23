/*
  # Fix toggle_automation - Version Correcte avec automation_name
  
  1. Supprime toutes les anciennes versions (p_job_id)
  2. Crée la nouvelle version avec automation_name
  3. Accorde les permissions correctes
  
  ## Changements
  - DROP anciennes versions toggle_automation(bigint, boolean)
  - CREATE nouvelle version toggle_automation(text, boolean)
  - GRANT permissions à anon, authenticated, service_role
  - SECURITY DEFINER pour accès cron.job
*/

-- ============================================
-- 1. SUPPRIMER TOUTES LES ANCIENNES VERSIONS
-- ============================================

DROP FUNCTION IF EXISTS toggle_automation(bigint, boolean) CASCADE;
DROP FUNCTION IF EXISTS toggle_automation(p_job_id bigint, p_enabled boolean) CASCADE;

-- ============================================
-- 2. CRÉER LA BONNE VERSION
-- ============================================

CREATE OR REPLACE FUNCTION toggle_automation(
  automation_name text,
  enabled boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- CRITICAL: Permet à anon d'accéder cron.job
SET search_path = public, cron
AS $$
DECLARE
  v_rows_affected integer;
BEGIN
  -- Update le cron job par son nom
  UPDATE cron.job
  SET active = enabled
  WHERE jobname = automation_name;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  IF v_rows_affected > 0 THEN
    -- Logger l'action
    PERFORM log_automation_run(
      automation_name,
      'success',
      CASE 
        WHEN enabled THEN 'Automatisation activée via dashboard'
        ELSE 'Automatisation désactivée via dashboard'
      END,
      jsonb_build_object(
        'action', 'toggle',
        'enabled', enabled,
        'source', 'backoffice'
      ),
      0
    );
    
    RETURN true;
  ELSE
    -- Job non trouvé
    RAISE NOTICE 'Aucun cron job trouvé avec le nom: %', automation_name;
    RETURN false;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Logger l'erreur
    PERFORM log_automation_run(
      automation_name,
      'error',
      'Erreur lors du toggle: ' || SQLERRM,
      jsonb_build_object(
        'action', 'toggle',
        'enabled', enabled,
        'error', SQLERRM
      ),
      0
    );
    RETURN false;
END;
$$;

-- ============================================
-- 3. GRANT PERMISSIONS
-- ============================================

-- CRITICAL: Permettre à TOUS (y compris anon) d'exécuter
GRANT EXECUTE ON FUNCTION toggle_automation(text, boolean) TO anon, authenticated, service_role;

-- ============================================
-- 4. GRANT USAGE SUR LE SCHEMA CRON
-- ============================================

-- Permet au DEFINER d'accéder au schema cron
GRANT USAGE ON SCHEMA cron TO postgres, authenticated, anon;

-- ============================================
-- 5. VÉRIFICATION
-- ============================================

DO $$
DECLARE
  v_function_exists boolean;
  v_count integer;
BEGIN
  -- Vérifier qu'une seule version existe
  SELECT COUNT(*) INTO v_count
  FROM pg_proc
  WHERE proname = 'toggle_automation';
  
  IF v_count = 1 THEN
    RAISE NOTICE '✅ Une seule version de toggle_automation existe';
  ELSE
    RAISE WARNING '⚠️ % versions de toggle_automation trouvées (devrait être 1)', v_count;
  END IF;
  
  -- Vérifier la signature
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'toggle_automation'
    AND pg_get_function_arguments(oid) = 'automation_name text, enabled boolean'
  ) INTO v_function_exists;
  
  IF v_function_exists THEN
    RAISE NOTICE '✅ Fonction toggle_automation(text, boolean) créée avec succès';
  ELSE
    RAISE WARNING '❌ Fonction toggle_automation avec bonne signature non trouvée';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ FIX TOGGLE_AUTOMATION APPLIQUÉ';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Test: SELECT toggle_automation(''test-job'', true);';
  RAISE NOTICE 'Dashboard: https://taxiassur.com/backoffice/auto-optimizer';
  RAISE NOTICE '============================================';
END $$;
