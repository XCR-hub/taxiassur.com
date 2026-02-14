/*
  # Fix génération token dans upsert_lead
  
  Utilise gen_random_uuid() au lieu de gen_random_bytes() pour compatibilité
*/

-- S'assurer que l'extension pgcrypto est activée
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recréer la fonction avec génération de token compatible
CREATE OR REPLACE FUNCTION public.upsert_lead(
  p_email text,
  p_first_name text,
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
  v_token text;
  v_is_new boolean := false;
  v_existing_id uuid;
  v_existing_token text;
BEGIN
  -- Vérifier si un lead existe déjà avec cet email
  SELECT crm_leads.id, crm_leads.access_token 
  INTO v_existing_id, v_existing_token
  FROM public.crm_leads
  WHERE crm_leads.email = p_email
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Lead existant : mise à jour
    v_lead_id := v_existing_id;
    v_is_new := false;
    
    -- Générer un nouveau token si vide
    IF v_existing_token IS NULL OR v_existing_token = '' THEN
      v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    ELSE
      v_token := v_existing_token;
    END IF;
    
    -- Mettre à jour le lead
    UPDATE public.crm_leads SET
      first_name = COALESCE(p_first_name, crm_leads.first_name),
      last_name = COALESCE(NULLIF(p_last_name, ''), crm_leads.last_name),
      phone = COALESCE(NULLIF(p_phone, ''), crm_leads.phone),
      city = COALESCE(NULLIF(p_city, ''), crm_leads.city),
      source = COALESCE(NULLIF(p_source, ''), crm_leads.source),
      metadata = COALESCE(p_metadata, crm_leads.metadata),
      access_token = v_token,
      updated_at = now()
    WHERE crm_leads.id = v_lead_id;
    
  ELSE
    -- Nouveau lead : création
    v_is_new := true;
    v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    v_lead_id := gen_random_uuid();
    
    INSERT INTO public.crm_leads (
      id,
      email,
      first_name,
      last_name,
      phone,
      city,
      source,
      status,
      current_stage,
      metadata,
      access_token,
      created_at,
      updated_at
    ) VALUES (
      v_lead_id,
      p_email,
      p_first_name,
      COALESCE(p_last_name, ''),
      COALESCE(p_phone, ''),
      COALESCE(p_city, ''),
      COALESCE(p_source, 'website'),
      'nouveau_lead',
      'nouveau_lead',
      COALESCE(p_metadata, '{}'::jsonb),
      v_token,
      now(),
      now()
    );
  END IF;

  -- Retourner les résultats
  RETURN QUERY SELECT v_lead_id, v_token, v_is_new;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.upsert_lead TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_lead TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_lead TO service_role;

-- Générer des tokens pour les leads existants qui n'en ont pas
UPDATE public.crm_leads 
SET access_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE access_token IS NULL OR access_token = '';
