-- ========================================
-- FIX DÉFINITIF: Supprimer TOUTES les versions
-- de toggle_automation et recréer UNE SEULE
-- ========================================

-- Étape 1: Lister toutes les signatures existantes
DO $$ 
DECLARE 
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT 
      'DROP FUNCTION IF EXISTS ' || 
      ns.nspname || '.' || 
      p.proname || '(' || 
      pg_get_function_identity_arguments(p.oid) || ') CASCADE;' as drop_cmd
    FROM pg_proc p
    JOIN pg_namespace ns ON p.pronamespace = ns.oid
    WHERE p.proname = 'toggle_automation'
  LOOP
    EXECUTE func_record.drop_cmd;
    RAISE NOTICE 'Supprimé: %', func_record.drop_cmd;
  END LOOP;
END $$;

-- Étape 2: Créer LA fonction unique avec SECURITY DEFINER
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
  -- Mettre à jour le cron job
  UPDATE cron.job 
  SET active = enabled 
  WHERE jobname = automation_name; 
  
  GET DIAGNOSTICS affected_count = ROW_COUNT; 
  
  RETURN jsonb_build_object(
    'success', true, 
    'affected_rows', affected_count,
    'automation', automation_name,
    'enabled', enabled
  ); 
END; 
$$;

-- Étape 3: Permissions
GRANT EXECUTE ON FUNCTION toggle_automation(TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION toggle_automation(TEXT, BOOLEAN) TO authenticated;

-- Étape 4: Vérification
SELECT 
  proname as "Fonction",
  prosecdef as "SECURITY DEFINER",
  pg_get_function_arguments(oid) as "Paramètres"
FROM pg_proc 
WHERE proname = 'toggle_automation';

-- On doit voir 1 SEULE ligne avec prosecdef = true
