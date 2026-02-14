/*
  # Fix upsert_lead - Force Cache Refresh - 14 Février 2026

  ## Problème
  La fonction upsert_lead existe avec les bons paramètres mais le cache Supabase
  ne la trouve toujours pas. Erreur :
  "Could not find the function public.upsert_lead(...) in the schema cache"

  ## Solution
  1. DROP toutes les versions de la fonction
  2. Recréer avec une signature qui force le refresh du cache
  3. Utiliser ONLY nommé parameters
*/

-- ============================================
-- 1. SUPPRIMER TOUTES LES VERSIONS
-- ============================================

-- Supprimer toutes les surcharges possibles
DROP FUNCTION IF EXISTS public.upsert_lead(text, text, text, text, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_lead(text, text, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_lead(text, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_lead(text) CASCADE;

-- ============================================
-- 2. RECRÉER LA FONCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.upsert_lead(
  p_email text,
  p_first_name text DEFAULT '',
  p_last_name text DEFAULT '',
  p_phone text DEFAULT '',
  p_city text DEFAULT '',
  p_source text DEFAULT 'website',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  lead_id uuid,
  access_token text,
  is_new boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_access_token text;
  v_is_new boolean := false;
  v_existing_id uuid;
BEGIN
  -- Validation de l'email
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RAISE EXCEPTION 'Email requis';
  END IF;

  -- Normaliser l'email en lowercase
  p_email := LOWER(TRIM(p_email));

  -- Normaliser les autres champs
  p_first_name := COALESCE(TRIM(p_first_name), '');
  p_last_name := COALESCE(TRIM(p_last_name), '');
  p_phone := COALESCE(TRIM(p_phone), '');
  p_city := COALESCE(TRIM(p_city), '');
  p_source := COALESCE(TRIM(p_source), 'website');
  p_metadata := COALESCE(p_metadata, '{}'::jsonb);

  -- Vérifier si un lead existe déjà avec cet email
  SELECT cl.id INTO v_existing_id
  FROM crm_leads cl
  WHERE LOWER(cl.email) = p_email
    AND cl.deleted_at IS NULL
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Lead existe : mettre à jour ses informations
    v_lead_id := v_existing_id;
    v_is_new := false;

    -- Régénérer le token d'accès
    v_access_token := md5(gen_random_uuid()::text || clock_timestamp()::text || random()::text);

    UPDATE crm_leads
    SET
      first_name = CASE WHEN p_first_name != '' THEN p_first_name ELSE first_name END,
      last_name = CASE WHEN p_last_name != '' THEN p_last_name ELSE last_name END,
      phone = CASE WHEN p_phone != '' THEN p_phone ELSE phone END,
      city = CASE WHEN p_city != '' THEN p_city ELSE city END,
      source = p_source,
      metadata = COALESCE(crm_leads.metadata, '{}'::jsonb) || p_metadata,
      access_token = v_access_token,
      updated_at = NOW(),
      -- Réactiver si c'était perdu ou archivé
      status = CASE
        WHEN status IN ('perdu', 'lost') THEN 'NOUVEAU_LEAD'
        ELSE status
      END,
      -- Remettre archived_at à NULL si le lead était archivé
      archived_at = NULL
    WHERE id = v_lead_id;

    RAISE NOTICE 'Lead existant mis à jour: %', v_lead_id;
  ELSE
    -- Nouveau lead : créer
    v_is_new := true;
    v_access_token := md5(gen_random_uuid()::text || clock_timestamp()::text || random()::text);

    INSERT INTO crm_leads (
      first_name,
      last_name,
      email,
      phone,
      city,
      source,
      status,
      metadata,
      access_token,
      consent_marketing
    )
    VALUES (
      p_first_name,
      p_last_name,
      p_email,
      p_phone,
      p_city,
      p_source,
      'NOUVEAU_LEAD',
      p_metadata,
      v_access_token,
      true
    )
    RETURNING id INTO v_lead_id;

    RAISE NOTICE 'Nouveau lead créé: %', v_lead_id;
  END IF;

  RETURN QUERY
  SELECT v_lead_id, v_access_token, v_is_new;
END;
$$;

-- ============================================
-- 3. PERMISSIONS COMPLÈTES
-- ============================================

-- Révoquer toutes les permissions existantes
REVOKE ALL ON FUNCTION public.upsert_lead(text, text, text, text, text, text, jsonb) FROM PUBLIC;

-- Accorder les nouvelles permissions
GRANT EXECUTE ON FUNCTION public.upsert_lead(text, text, text, text, text, text, jsonb)
TO anon, authenticated, service_role;

-- ============================================
-- 4. COMMENTAIRE
-- ============================================

COMMENT ON FUNCTION public.upsert_lead IS
'[v2.0] Crée ou met à jour un lead (évite doublons email). Cache refresh forcé 14/02/2026.';

-- ============================================
-- 5. TEST RAPIDE
-- ============================================

DO $$
DECLARE
  v_result record;
BEGIN
  -- Test simple
  SELECT * INTO v_result
  FROM upsert_lead(
    p_email := 'test.cache@example.com',
    p_first_name := 'Test',
    p_last_name := 'Cache'
  );

  IF v_result.lead_id IS NOT NULL THEN
    RAISE NOTICE '✅ Fonction upsert_lead OK (lead_id: %)', v_result.lead_id;
    -- Nettoyer
    DELETE FROM crm_leads WHERE email = 'test.cache@example.com';
  ELSE
    RAISE WARNING '⚠️ Problème avec upsert_lead';
  END IF;
END $$;
