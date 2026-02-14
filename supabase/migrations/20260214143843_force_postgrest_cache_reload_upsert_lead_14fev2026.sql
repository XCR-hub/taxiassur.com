/*
  # Force PostgREST Cache Reload - upsert_lead - 14 Février 2026
  
  Ce problème survient après un redémarrage ou un déploiement.
  Le cache de schéma de PostgREST n'a pas détecté la fonction upsert_lead.
  
  ## Solution
  1. Vérifier que la fonction existe
  2. Forcer le rechargement du cache PostgREST
  3. Notifier PostgREST du changement de schéma
*/

-- Vérifier que la fonction existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'upsert_lead'
      AND pg_get_function_arguments(p.oid) = 'p_city text, p_email text, p_first_name text, p_last_name text, p_metadata jsonb, p_phone text, p_source text'
  ) THEN
    RAISE EXCEPTION 'La fonction upsert_lead avec la signature alphabétique n''existe pas. Veuillez exécuter la migration 20260214140813 d''abord.';
  END IF;
  
  RAISE NOTICE '✅ Fonction upsert_lead trouvée avec la bonne signature';
END $$;

-- Forcer le rechargement du cache PostgREST via NOTIFY
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Attendre un instant pour que PostgREST traite la notification
SELECT pg_sleep(0.5);

-- Vérifier à nouveau et notifier
NOTIFY pgrst, 'reload schema';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '🔄 Cache PostgREST rechargé - fonction upsert_lead disponible';
  RAISE NOTICE '📋 Signature: upsert_lead(p_city, p_email, p_first_name, p_last_name, p_metadata, p_phone, p_source)';
END $$;
