/*
  # Fix upsert_lead - Signature Alphabétique Exacte - 14 Février 2026

  ## Problème CRITIQUE
  PostgREST cherche la fonction avec les paramètres dans l'ordre ALPHABÉTIQUE :
  (p_city, p_email, p_first_name, p_last_name, p_metadata, p_phone, p_source)

  Mais notre fonction a les paramètres dans cet ordre :
  (p_email, p_first_name, p_last_name, p_phone, p_city, p_source, p_metadata)

  ## Solution
  Créer une SURCHARGE de la fonction avec EXACTEMENT l'ordre alphabétique
  que PostgREST attend, SANS valeurs par défaut.
*/

-- ============================================
-- CRÉER SURCHARGE AVEC ORDRE ALPHABÉTIQUE
-- ============================================

CREATE OR REPLACE FUNCTION public.upsert_lead(
  p_city text,              -- 1. Alphabétiquement premier
  p_email text,             -- 2. 
  p_first_name text,        -- 3.
  p_last_name text,         -- 4.
  p_metadata jsonb,         -- 5.
  p_phone text,             -- 6.
  p_source text             -- 7. Alphabétiquement dernier
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
-- PERMISSIONS POUR LA NOUVELLE SURCHARGE
-- ============================================

GRANT EXECUTE ON FUNCTION public.upsert_lead(text, text, text, text, jsonb, text, text)
TO anon, authenticated, service_role;

-- ============================================
-- TEST AVEC ORDRE ALPHABÉTIQUE
-- ============================================

DO $$
DECLARE
  v_result record;
BEGIN
  -- Test avec l'ordre EXACT que PostgREST utilise
  SELECT * INTO v_result
  FROM upsert_lead(
    'Paris'::text,                                    -- p_city
    'test.alphabetic.order@example.com'::text,        -- p_email
    'Jean'::text,                                     -- p_first_name
    'Dupont'::text,                                   -- p_last_name
    '{"vehicle_type": "Taxi"}'::jsonb,                -- p_metadata
    '0601020304'::text,                               -- p_phone
    'website'::text                                   -- p_source
  );

  IF v_result.lead_id IS NOT NULL THEN
    RAISE NOTICE '✅ Fonction upsert_lead (ordre alphabétique) OK';
    RAISE NOTICE '   Lead ID: %', v_result.lead_id;
    RAISE NOTICE '   Token: %', v_result.access_token;
    RAISE NOTICE '   Is new: %', v_result.is_new;
    
    -- Nettoyer
    DELETE FROM crm_leads WHERE email = 'test.alphabetic.order@example.com';
    RAISE NOTICE '🧹 Lead de test nettoyé';
  ELSE
    RAISE WARNING '⚠️ Problème avec la fonction';
  END IF;
END $$;

-- ============================================
-- NOTIFIER POSTGREST
-- ============================================

NOTIFY pgrst, 'reload schema';

-- ============================================
-- COMMENTAIRE
-- ============================================

COMMENT ON FUNCTION public.upsert_lead(text, text, text, text, jsonb, text, text) IS
'[v3.0] Surcharge avec ordre alphabétique exact pour PostgREST. Créé le 14/02/2026 14:00.';
