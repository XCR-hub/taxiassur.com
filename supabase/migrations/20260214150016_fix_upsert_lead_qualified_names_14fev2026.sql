/*
  # Fix Définitif Cache PostgREST - upsert_lead - 14 Février 2026 v2
  
  Fix des noms de variables ambigus avec qualification explicite.
*/

-- Supprimer l'ancienne version
DROP FUNCTION IF EXISTS public.upsert_lead(text, text, text, text, jsonb, text, text) CASCADE;

SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);

-- Recréer avec noms qualifiés
CREATE OR REPLACE FUNCTION public.upsert_lead(
  p_city text,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_metadata jsonb,
  p_phone text,
  p_source text
)
RETURNS TABLE (
  lead_id uuid,
  access_token text,
  is_new boolean
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_access_token text;
  v_existing_lead record;
  v_is_new boolean := false;
BEGIN
  -- Normaliser l'email
  p_email := LOWER(TRIM(p_email));
  
  -- Chercher un lead existant avec cet email (qualification explicite)
  SELECT 
    crm_leads.id,
    crm_leads.access_token
  INTO v_existing_lead
  FROM crm_leads
  WHERE crm_leads.email = p_email
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
    v_is_new := true;
    v_access_token := md5(random()::text || clock_timestamp()::text);
    
    INSERT INTO crm_leads (
      email,
      first_name,
      last_name,
      phone,
      city,
      source,
      metadata,
      access_token,
      status
    )
    VALUES (
      p_email,
      p_first_name,
      p_last_name,
      p_phone,
      p_city,
      p_source,
      p_metadata,
      v_access_token,
      'nouveau_lead'
    )
    RETURNING crm_leads.id INTO v_lead_id;
  END IF;
  
  -- Retourner les informations
  RETURN QUERY
  SELECT 
    v_lead_id AS lead_id,
    v_access_token AS access_token,
    v_is_new AS is_new;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.upsert_lead(text, text, text, text, jsonb, text, text)
TO anon, authenticated, service_role;

-- Commentaire
COMMENT ON FUNCTION public.upsert_lead(text, text, text, text, jsonb, text, text) IS 
'Crée ou met à jour un lead. Paramètres: p_city, p_email, p_first_name, p_last_name, p_metadata, p_phone, p_source';

-- Forcer rechargement
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.3);
NOTIFY pgrst, 'reload config';
SELECT pg_sleep(0.3);
NOTIFY pgrst, 'reload schema';

-- Test simple
DO $$
DECLARE
  v_result record;
BEGIN
  SELECT * INTO v_result
  FROM upsert_lead(
    'Paris',
    'test.qualified@example.com',
    'Test',
    'Qualified',
    '{"test": true}'::jsonb,
    '0601020304',
    'test'
  );
  
  IF v_result.lead_id IS NOT NULL THEN
    RAISE NOTICE '✅ Fonction créée avec succès (ID: %)', v_result.lead_id;
    DELETE FROM crm_leads WHERE email = 'test.qualified@example.com';
  ELSE
    RAISE WARNING '⚠️ Problème de création';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '🎉 FONCTION RECRÉÉE !';
  RAISE NOTICE '📋 Signature: (p_city, p_email, p_first_name, p_last_name, p_metadata, p_phone, p_source)';
  RAISE NOTICE '🔄 PostgREST devrait la voir maintenant';
END $$;
