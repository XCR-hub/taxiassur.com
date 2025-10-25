-- FIX RAPIDE: Ajouter SECURITY DEFINER à toggle_automation

DROP FUNCTION IF EXISTS toggle_automation(TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION toggle_automation(
  automation_name TEXT,
  enabled BOOLEAN
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- ← FIX ICI
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
    'affected_rows', affected_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_automation(TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION toggle_automation(TEXT, BOOLEAN) TO authenticated;

-- Test
SELECT toggle_automation('daily-unified-content-generation', true);
