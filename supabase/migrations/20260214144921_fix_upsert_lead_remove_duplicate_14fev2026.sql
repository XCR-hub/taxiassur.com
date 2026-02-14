/*
  # Fix upsert_lead - Supprimer la Surcharge Dupliquée - 14 Février 2026
  
  ## Problème IDENTIFIÉ
  Il existe DEUX surcharges de upsert_lead:
  1. (p_city, p_email, p_first_name, p_last_name, p_metadata, p_phone, p_source) - Ordre alphabétique
  2. (p_email, p_first_name, p_last_name, p_phone, p_city, p_source, p_metadata) - Ancien ordre
  
  Quand on appelle avec des paramètres nommés, PostgreSQL retourne:
  "function upsert_lead(...) is not unique"
  
  ## Solution
  Supprimer l'ancienne surcharge et garder UNIQUEMENT celle avec l'ordre alphabétique
  que PostgREST attend.
*/

-- ============================================
-- SUPPRIMER L'ANCIENNE SURCHARGE
-- ============================================

DROP FUNCTION IF EXISTS public.upsert_lead(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_city text,
  p_source text,
  p_metadata jsonb
) CASCADE;

-- ============================================
-- VÉRIFIER QU'IL NE RESTE QU'UNE SEULE VERSION
-- ============================================

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
    RAISE EXCEPTION '❌ Aucune fonction upsert_lead trouvée !';
  ELSIF v_function_count > 1 THEN
    RAISE EXCEPTION '❌ Encore % surcharges de upsert_lead !', v_function_count;
  END IF;
  
  RAISE NOTICE '✅ Une seule fonction upsert_lead présente';
END $$;

-- ============================================
-- RE-GRANTER LES PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.upsert_lead(text, text, text, text, jsonb, text, text)
TO anon, authenticated, service_role;

-- ============================================
-- FORCER RECHARGEMENT POSTGREST
-- ============================================

NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.3);
NOTIFY pgrst, 'reload schema';

-- ============================================
-- TESTER LA FONCTION
-- ============================================

DO $$
DECLARE
  v_result record;
BEGIN
  -- Test avec paramètres nommés (comme le frontend)
  SELECT * INTO v_result
  FROM upsert_lead(
    p_city => 'Paris',
    p_email => 'test.unique.function@example.com',
    p_first_name => 'Test',
    p_last_name => 'Unique',
    p_metadata => '{"test": "unique_function"}'::jsonb,
    p_phone => '0601020304',
    p_source => 'website'
  );
  
  IF v_result.lead_id IS NOT NULL THEN
    RAISE NOTICE '✅ Fonction upsert_lead fonctionne correctement';
    RAISE NOTICE '   Lead ID: %', v_result.lead_id;
    RAISE NOTICE '   Token: %', v_result.access_token;
    RAISE NOTICE '   Is new: %', v_result.is_new;
    
    -- Nettoyer
    DELETE FROM crm_leads WHERE email = 'test.unique.function@example.com';
    RAISE NOTICE '🧹 Lead de test nettoyé';
  ELSE
    RAISE WARNING '⚠️ Problème avec la fonction';
  END IF;
END $$;

-- ============================================
-- MESSAGE FINAL
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '🎉 PROBLÈME RÉSOLU !';
  RAISE NOTICE '📋 Fonction unique: upsert_lead(p_city, p_email, p_first_name, p_last_name, p_metadata, p_phone, p_source)';
  RAISE NOTICE '✅ Appels avec paramètres nommés maintenant possibles';
  RAISE NOTICE '🔄 Cache PostgREST rechargé';
END $$;
