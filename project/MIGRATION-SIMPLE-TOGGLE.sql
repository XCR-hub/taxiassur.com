-- ============================================
-- FIX SIMPLE: toggle_automation SECURITY DEFINER
-- Copier/Coller dans Supabase SQL Editor
-- ============================================

-- 1. Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS toggle_automation(TEXT, BOOLEAN) CASCADE;

-- 2. Créer avec SECURITY DEFINER
CREATE FUNCTION toggle_automation(
  automation_name TEXT,
  enabled BOOLEAN
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
    'message', 'OK',
    'affected_rows', affected_count,
    'automation_name', automation_name,
    'enabled', enabled
  );
END;
$$;

-- 3. Permissions
GRANT EXECUTE ON FUNCTION toggle_automation(TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION toggle_automation(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_automation(TEXT, BOOLEAN) TO service_role;

-- 4. Test
SELECT toggle_automation('daily-unified-content-generation', true);
