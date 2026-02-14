/*
  # Force PostgREST Schema Cache Reload - 14 Février 2026

  ## Problème
  Le cache de PostgREST (API Supabase) n'a pas été actualisé après la modification
  de la fonction upsert_lead.

  ## Solution
  Forcer un reload du cache en émettant un NOTIFY sur le canal pgrst
*/

-- ============================================
-- 1. NOTIFIER POSTGREST DE RECHARGER LE CACHE
-- ============================================

-- PostgREST écoute ce canal pour savoir quand recharger son cache de schéma
NOTIFY pgrst, 'reload schema';

-- ============================================
-- 2. VÉRIFIER LA FONCTION
-- ============================================

DO $$
DECLARE
  v_function_exists boolean;
BEGIN
  -- Vérifier que la fonction existe
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'upsert_lead'
      AND n.nspname = 'public'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE '✅ Fonction upsert_lead existe';
    RAISE NOTICE '✅ Cache PostgREST notifié pour reload';
  ELSE
    RAISE WARNING '⚠️ Fonction upsert_lead introuvable';
  END IF;
END $$;

-- ============================================
-- 3. COMMENTAIRE METADATA
-- ============================================

COMMENT ON FUNCTION public.upsert_lead IS
'[v2.1] Crée ou met à jour un lead. Cache PostgREST rechargé le 14/02/2026 13:45.';
