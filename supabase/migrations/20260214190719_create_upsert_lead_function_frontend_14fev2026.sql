/*
  # Fonction upsert_lead pour formulaire frontend
  
  Création de la fonction RPC upsert_lead qui :
  - Crée ou met à jour un lead depuis le formulaire
  - Génère automatiquement un access_token unique
  - Retourne l'ID du lead et le token pour accès espace prospect
  - Gère les doublons intelligemment (email)
  
  ## Fonctionnement
  - Si l'email existe déjà : met à jour le lead existant
  - Si nouvel email : crée un nouveau lead
  - Génère toujours un nouveau token d'accès
  - Retourne lead_id, access_token, is_new
*/

-- Créer la fonction upsert_lead pour le frontend
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
  v_access_token text;
  v_is_new boolean := false;
  v_existing_lead record;
BEGIN
  -- Vérifier si un lead existe déjà avec cet email
  SELECT id, access_token INTO v_existing_lead
  FROM public.crm_leads
  WHERE email = p_email
  LIMIT 1;

  IF v_existing_lead.id IS NOT NULL THEN
    -- Lead existant : mise à jour
    v_lead_id := v_existing_lead.id;
    v_is_new := false;
    
    -- Générer un nouveau token si vide
    IF v_existing_lead.access_token IS NULL OR v_existing_lead.access_token = '' THEN
      v_access_token := encode(extensions.gen_random_bytes(32), 'hex');
    ELSE
      v_access_token := v_existing_lead.access_token;
    END IF;
    
    -- Mettre à jour le lead
    UPDATE public.crm_leads SET
      first_name = COALESCE(p_first_name, first_name),
      last_name = COALESCE(NULLIF(p_last_name, ''), last_name),
      phone = COALESCE(NULLIF(p_phone, ''), phone),
      city = COALESCE(NULLIF(p_city, ''), city),
      source = COALESCE(NULLIF(p_source, ''), source),
      metadata = COALESCE(p_metadata, metadata),
      access_token = v_access_token,
      updated_at = now()
    WHERE id = v_lead_id;
    
  ELSE
    -- Nouveau lead : création
    v_is_new := true;
    v_access_token := encode(extensions.gen_random_bytes(32), 'hex');
    v_lead_id := extensions.gen_random_uuid();
    
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
      v_access_token,
      now(),
      now()
    );
  END IF;

  -- Retourner les résultats
  RETURN QUERY SELECT v_lead_id, v_access_token, v_is_new;
END;
$$;

-- Donner les permissions nécessaires
GRANT EXECUTE ON FUNCTION public.upsert_lead TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_lead TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_lead TO service_role;

-- Créer un index sur email pour optimiser la recherche
CREATE INDEX IF NOT EXISTS idx_crm_leads_email_upsert 
ON public.crm_leads(email) 
WHERE email IS NOT NULL;

-- Créer un index sur access_token pour l'espace prospect
CREATE INDEX IF NOT EXISTS idx_crm_leads_access_token 
ON public.crm_leads(access_token) 
WHERE access_token IS NOT NULL;

-- Vérifier que la table crm_leads a bien la colonne access_token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'crm_leads'
    AND column_name = 'access_token'
  ) THEN
    ALTER TABLE public.crm_leads 
    ADD COLUMN access_token text UNIQUE;
    
    -- Générer des tokens pour les leads existants sans token
    UPDATE public.crm_leads 
    SET access_token = encode(extensions.gen_random_bytes(32), 'hex')
    WHERE access_token IS NULL OR access_token = '';
  END IF;
END $$;
