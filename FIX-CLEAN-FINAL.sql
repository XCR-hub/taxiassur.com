-- ========================================
-- FIX: toggle_automation SECURITY DEFINER
-- ========================================

-- Supprimer complètement l'ancienne version
DROP FUNCTION IF EXISTS toggle_automation(TEXT, BOOLEAN) CASCADE;

-- Créer avec SECURITY DEFINER (ligne CRITIQUE)
CREATE FUNCTION toggle_automation(
  automation_name TEXT, 
  enabled BOOLEAN
) 
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER  -- ← LIGNE CRITIQUE
SET search_path = public, cron 
AS $$ 
DECLARE 
  affected_count INT; 
BEGIN 
  UPDATE cron.job 
  SET active = enabled 
  WHERE jobname = automation_name; 
  
  GET DIAGNOSTICS affected_count = ROW_COUNT; 
  
  RETURN jsonb_build_object(
    'success', true, 
    'affected_rows', affected_count
  ); 
END; 
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION toggle_automation(TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION toggle_automation(TEXT, BOOLEAN) TO authenticated;
