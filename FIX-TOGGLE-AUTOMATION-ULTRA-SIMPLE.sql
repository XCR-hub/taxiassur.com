-- ============================================
-- FIX TOGGLE_AUTOMATION - VERSION ULTRA SIMPLE
-- ============================================
-- Exécuter ce SQL dans Supabase SQL Editor
-- ============================================

-- 1️⃣ SUPPRIMER TOUTES LES VERSIONS EXISTANTES
-- Forcer la suppression avec CASCADE pour éviter erreur "cannot change return type"
DROP FUNCTION IF EXISTS toggle_automation CASCADE;

-- 2️⃣ CRÉER LA BONNE VERSION
CREATE FUNCTION toggle_automation(
  automation_name text,
  enabled boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_rows_affected integer;
BEGIN
  -- Update le cron job
  UPDATE cron.job
  SET active = enabled
  WHERE jobname = automation_name;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  IF v_rows_affected > 0 THEN
    -- Logger le succès
    BEGIN
      PERFORM log_automation_run(
        automation_name,
        'success',
        CASE WHEN enabled THEN 'Activée via dashboard' ELSE 'Désactivée via dashboard' END,
        jsonb_build_object('action', 'toggle', 'enabled', enabled, 'source', 'backoffice'),
        0
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Si log_automation_run n'existe pas, ignorer
        NULL;
    END;
    
    RETURN true;
  ELSE
    RETURN false;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erreur toggle_automation: %', SQLERRM;
    RETURN false;
END;
$$;

-- 3️⃣ GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION toggle_automation(text, boolean) TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA cron TO postgres, authenticated, anon;

-- 4️⃣ VÉRIFICATION
DO $$
DECLARE
  v_count integer;
  v_signature text;
BEGIN
  -- Compter versions
  SELECT COUNT(*) INTO v_count
  FROM pg_proc
  WHERE proname = 'toggle_automation';
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  
  IF v_count = 1 THEN
    -- Vérifier signature
    SELECT pg_get_function_arguments(oid) INTO v_signature
    FROM pg_proc
    WHERE proname = 'toggle_automation';
    
    RAISE NOTICE '✅ SUCCÈS - Fonction créée correctement';
    RAISE NOTICE '   Signature: toggle_automation(%)' , v_signature;
  ELSE
    RAISE WARNING '⚠️ % versions trouvées (devrait être 1)', v_count;
  END IF;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 TEST: Aller sur https://taxiassur.com/backoffice/auto-optimizer';
  RAISE NOTICE '   1. Vider cache (Ctrl+Shift+R)';
  RAISE NOTICE '   2. Cliquer sur un switch';
  RAISE NOTICE '   3. Plus d''erreur 401 ✅';
  RAISE NOTICE '';
END $$;
