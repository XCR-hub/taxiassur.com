/*
  # Force PostgREST Cache Reload AGRESSIF - 14 Février 2026
  
  Le cache PostgREST ne se recharge pas avec un simple NOTIFY.
  On va utiliser plusieurs techniques pour forcer le rechargement.
*/

-- 1. Vérifier que la fonction existe
DO $$
DECLARE
  v_function_count integer;
BEGIN
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'upsert_lead';
  
  IF v_function_count = 0 THEN
    RAISE EXCEPTION '❌ Fonction upsert_lead introuvable !';
  END IF;
  
  RAISE NOTICE '✅ % surcharges de upsert_lead trouvées', v_function_count;
END $$;

-- 2. Forcer rechargement schema PostgREST (plusieurs fois)
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.2);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.2);
NOTIFY pgrst, 'reload schema';

-- 3. Forcer rechargement config PostgREST
NOTIFY pgrst, 'reload config';
SELECT pg_sleep(0.2);

-- 4. Re-notifier schema
NOTIFY pgrst, 'reload schema';

-- 5. Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '🔄 Cache PostgREST rechargé agressivement';
  RAISE NOTICE '📋 Fonction: public.upsert_lead';
  RAISE NOTICE '📋 Signature 1: (p_city, p_email, p_first_name, p_last_name, p_metadata, p_phone, p_source)';
  RAISE NOTICE '📋 Signature 2: (p_email, p_first_name, p_last_name, p_phone, p_city, p_source, p_metadata)';
  RAISE NOTICE '⏰ Cache devrait être disponible dans 1-2 secondes';
END $$;
