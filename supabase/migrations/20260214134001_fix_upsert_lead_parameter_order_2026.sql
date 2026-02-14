/*
  # Fix upsert_lead Parameter Order - 14 Février 2026

  ## Problème
  La fonction upsert_lead n'est pas trouvée car Supabase envoie les paramètres
  dans un ordre différent que celui défini dans PostgreSQL.

  Erreur: "Could not find the function public.upsert_lead(p_city, p_email,
  p_first_name, p_last_name, p_metadata, p_phone, p_source) in the schema cache"

  ## Solution
  Supprimer et recréer la fonction en utilisant des paramètres nommés
  et en s'assurant que PostgreSQL les accepte dans n'importe quel ordre.
*/

-- ============================================
-- DROP ANCIENNE FONCTION
-- ============================================

DROP FUNCTION IF EXISTS public.upsert_lead(text, text, text, text, text, text, jsonb);

-- ============================================
-- RECRÉER FONCTION AVEC PARAMÈTRES NOMMÉS
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
  -- Normaliser l'email en lowercase
  p_email := LOWER(TRIM(p_email));

  -- Normaliser les autres champs
  p_first_name := COALESCE(TRIM(p_first_name), '');
  p_last_name := COALESCE(TRIM(p_last_name), '');
  p_phone := COALESCE(TRIM(p_phone), '');
  p_city := COALESCE(TRIM(p_city), '');

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
-- PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.upsert_lead(text, text, text, text, text, text, jsonb)
TO authenticated, anon, service_role;

-- ============================================
-- TEST DE LA FONCTION
-- ============================================

DO $$
DECLARE
  v_result record;
BEGIN
  -- Test : Créer un nouveau lead depuis le formulaire web
  SELECT * INTO v_result
  FROM upsert_lead(
    p_email := 'test.form@example.com',
    p_first_name := 'Jean',
    p_last_name := 'Dupont',
    p_phone := '0601020304',
    p_city := 'Paris',
    p_source := 'website',
    p_metadata := '{"vehicle_type": "Taxi", "immatriculation": "AB-123-CD"}'::jsonb
  );

  IF v_result.is_new = true THEN
    RAISE NOTICE '✅ TEST PASSED: Nouveau lead créé depuis formulaire';
    RAISE NOTICE '   Lead ID: %', v_result.lead_id;
    RAISE NOTICE '   Token: %', v_result.access_token;
  ELSE
    RAISE WARNING '⚠️ TEST FAILED: Should be new lead';
  END IF;

  -- Nettoyer le lead de test
  DELETE FROM crm_leads WHERE email = 'test.form@example.com';
  RAISE NOTICE '🧹 Lead de test nettoyé';
END $$;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON FUNCTION public.upsert_lead IS
'Crée un nouveau lead ou met à jour un lead existant si l''email existe déjà. Accepte les paramètres dans n''importe quel ordre grâce aux valeurs par défaut.';
