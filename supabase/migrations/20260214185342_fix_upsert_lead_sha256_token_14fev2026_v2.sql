/*
  # Fix upsert_lead pour utiliser SHA256 tokens

  1. Modifications
    - Laisser le trigger générer automatiquement le token SHA256
    - Ne plus utiliser MD5
    - Régénérer les tokens courts existants

  2. Objectif
    - Cohérence : tous les tokens = 64 caractères (SHA256)
    - Trigger automatique pour tous les nouveaux leads
*/

-- Corriger la fonction upsert_lead
CREATE OR REPLACE FUNCTION public.upsert_lead(
  p_city text,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_metadata jsonb,
  p_phone text,
  p_source text
)
RETURNS TABLE(lead_id uuid, access_token text, is_new boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_lead_id uuid;
  v_access_token text;
  v_existing_lead record;
  v_is_new boolean := false;
BEGIN
  -- Normaliser l'email
  p_email := LOWER(TRIM(p_email));

  -- Chercher un lead existant avec cet email
  SELECT 
    crm_leads.id,
    crm_leads.access_token
  INTO v_existing_lead
  FROM crm_leads
  WHERE crm_leads.email = p_email
  AND crm_leads.deleted_at IS NULL
  LIMIT 1;

  IF v_existing_lead.id IS NOT NULL THEN
    -- Lead existant : on met à jour
    v_lead_id := v_existing_lead.id;
    v_access_token := v_existing_lead.access_token;
    v_is_new := false;

    UPDATE crm_leads
    SET
      first_name = COALESCE(p_first_name, crm_leads.first_name),
      last_name = COALESCE(p_last_name, crm_leads.last_name),
      phone = COALESCE(p_phone, crm_leads.phone),
      city = COALESCE(p_city, crm_leads.city),
      source = COALESCE(p_source, crm_leads.source),
      metadata = COALESCE(p_metadata, crm_leads.metadata),
      updated_at = NOW()
    WHERE crm_leads.id = v_lead_id;

  ELSE
    -- Nouveau lead : on insère
    -- Le trigger ensure_lead_access_token va générer automatiquement le token SHA256
    v_is_new := true;

    INSERT INTO crm_leads (
      email,
      first_name,
      last_name,
      phone,
      city,
      source,
      metadata,
      status
      -- Note: pas de access_token ici, le trigger le génère automatiquement
    )
    VALUES (
      p_email,
      p_first_name,
      p_last_name,
      p_phone,
      p_city,
      p_source,
      p_metadata,
      'nouveau_lead'
    )
    RETURNING crm_leads.id, crm_leads.access_token 
    INTO v_lead_id, v_access_token;
  END IF;

  -- Retourner les informations
  RETURN QUERY
  SELECT 
    v_lead_id AS lead_id,
    v_access_token AS access_token,
    v_is_new AS is_new;
END;
$function$;

-- Régénérer les tokens courts (MD5) vers SHA256
UPDATE crm_leads
SET access_token = generate_lead_access_token()
WHERE LENGTH(access_token) < 64
AND deleted_at IS NULL;

-- Vérifier les résultats
DO $$
DECLARE
  v_count_short integer;
  v_count_long integer;
  v_total integer;
BEGIN
  SELECT COUNT(*) INTO v_count_short FROM crm_leads WHERE LENGTH(access_token) < 64 AND deleted_at IS NULL;
  SELECT COUNT(*) INTO v_count_long FROM crm_leads WHERE LENGTH(access_token) = 64 AND deleted_at IS NULL;
  SELECT COUNT(*) INTO v_total FROM crm_leads WHERE deleted_at IS NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VÉRIFICATION DES TOKENS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total leads actifs: %', v_total;
  RAISE NOTICE 'Tokens SHA256 (64 car.): % ✅', v_count_long;
  RAISE NOTICE 'Tokens MD5 restants (32 car.): % %', v_count_short, CASE WHEN v_count_short = 0 THEN '✅' ELSE '❌' END;
  RAISE NOTICE '========================================';
  
  IF v_count_short > 0 THEN
    RAISE WARNING 'Il reste % tokens courts à corriger!', v_count_short;
  ELSE
    RAISE NOTICE '✅ Tous les tokens sont maintenant en SHA256!';
  END IF;
END $$;
