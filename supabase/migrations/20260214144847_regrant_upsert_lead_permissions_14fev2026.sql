/*
  # Re-Grant Permissions sur upsert_lead - 14 Février 2026
  
  Parfois PostgREST ne voit pas les fonctions si les permissions
  ne sont pas correctement définies.
  
  On va révoquer puis re-granter toutes les permissions.
*/

-- 1. Révoquer toutes les permissions existantes
REVOKE ALL ON FUNCTION public.upsert_lead(text, text, text, text, jsonb, text, text) 
FROM anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.upsert_lead(text, text, text, text, text, text, jsonb) 
FROM anon, authenticated, service_role;

-- 2. Re-granter les permissions sur TOUTES les surcharges

-- Signature alphabétique (celle que PostgREST utilise)
GRANT EXECUTE ON FUNCTION public.upsert_lead(text, text, text, text, jsonb, text, text)
TO anon, authenticated, service_role;

-- Ancienne signature
GRANT EXECUTE ON FUNCTION public.upsert_lead(text, text, text, text, text, text, jsonb)
TO anon, authenticated, service_role;

-- 3. Forcer PostgREST à recharger
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.3);
NOTIFY pgrst, 'reload schema';

-- 4. Vérifier les permissions
DO $$
DECLARE
  v_permissions text;
BEGIN
  SELECT string_agg(grantee::text || ': ' || privilege_type, ', ')
  INTO v_permissions
  FROM information_schema.routine_privileges
  WHERE routine_name = 'upsert_lead'
    AND routine_schema = 'public';
  
  RAISE NOTICE '✅ Permissions upsert_lead: %', COALESCE(v_permissions, 'AUCUNE');
END $$;

-- 5. Message final
DO $$
BEGIN
  RAISE NOTICE '🔐 Permissions re-grantées sur upsert_lead';
  RAISE NOTICE '👥 Roles: anon, authenticated, service_role';
  RAISE NOTICE '🔄 Cache PostgREST rechargé';
END $$;
