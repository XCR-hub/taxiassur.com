/*
  # Fix Frontend Compatibility - Documents & Quotes
  
  ## Problèmes
  1. Le frontend utilise `company_id` mais la fonction retourne `insurance_company_id`
  2. Le frontend utilise `quote_file_url` mais la fonction retourne `quote_pdf_url`
  3. Le frontend appelle validate/refuse avec (p_quote_id, p_token) au lieu de (p_token, p_quote_id)
  4. Le frontend s'attend à { success, error, company_name } au lieu d'un boolean
  5. L'upload de documents passe 5 params mais la fonction en attend 6
  
  ## Solutions
  Recréer les fonctions avec les bons paramètres et retours
*/

-- ============================================
-- FONCTIONS DOCUMENTS (compatibilité 5 paramètres)
-- ============================================

DROP FUNCTION IF EXISTS public.upload_prospect_document_by_token(text, text, text, text, text, bigint);

-- Version avec 5 paramètres (sans file_url) - compatible frontend
CREATE OR REPLACE FUNCTION public.upload_prospect_document_by_token(
  p_token text,
  p_document_type text,
  p_file_name text,
  p_file_path text,
  p_file_size bigint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_document_id uuid;
  v_file_url text;
BEGIN
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL
    AND l.archived_at IS NULL;

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'Token invalide';
  END IF;

  -- Générer l'URL publique du fichier
  v_file_url := 'https://drohhxrkoequjphvabvq.supabase.co/storage/v1/object/public/prospect-documents/' || p_file_path;

  INSERT INTO crm_lead_documents (
    lead_id,
    document_type,
    document_name,
    file_path,
    file_url,
    file_size,
    status,
    validated,
    uploaded_at
  )
  VALUES (
    v_lead_id,
    p_document_type,
    p_file_name,
    p_file_path,
    v_file_url,
    p_file_size,
    'pending',
    false,
    NOW()
  )
  RETURNING id INTO v_document_id;

  RETURN v_document_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upload_prospect_document_by_token(text, text, text, text, bigint) TO anon, authenticated;

-- ============================================
-- FONCTIONS DEVIS (noms de colonnes compatibles)
-- ============================================

DROP FUNCTION IF EXISTS public.get_lead_quotes_by_token(text);

CREATE OR REPLACE FUNCTION public.get_lead_quotes_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  company_id uuid,  -- CHANGE: insurance_company_id → company_id
  company_name text,
  company_logo_url text,
  quote_file_url text,  -- CHANGE: quote_pdf_url → quote_file_url
  quote_amount numeric,
  status text,  -- CHANGE: quote_status → status
  submitted_at timestamptz,  -- CHANGE: sent_at → submitted_at
  last_sent_at timestamptz,
  quote_accepted_at timestamptz,
  refusal_reason text,
  created_at timestamptz,
  updated_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  SELECT cl.id INTO v_lead_id
  FROM crm_leads cl
  WHERE cl.access_token = p_token
    AND cl.deleted_at IS NULL
    AND cl.archived_at IS NULL
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    lcq.id,
    lcq.lead_id,
    lcq.insurance_company_id as company_id,  -- Alias pour compatibilité
    COALESCE(ic.name, '') as company_name,
    COALESCE(ic.logo_url, '') as company_logo_url,
    COALESCE(lcq.quote_pdf_url, '') as quote_file_url,  -- Alias pour compatibilité
    lcq.quote_amount,
    COALESCE(lcq.quote_status, 'pending') as status,  -- Alias pour compatibilité
    lcq.sent_at as submitted_at,  -- Alias pour compatibilité
    lcq.last_sent_at,
    lcq.quote_accepted_at,
    lcq.refusal_reason,
    lcq.created_at,
    lcq.updated_at
  FROM lead_company_quotes lcq
  LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
  WHERE lcq.lead_id = v_lead_id
    AND lcq.deleted_at IS NULL
    AND lcq.quote_pdf_url IS NOT NULL
    AND lcq.quote_pdf_url != ''
  ORDER BY lcq.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_quotes_by_token(text) TO anon, authenticated;

-- ============================================
-- FONCTIONS VALIDATION/REFUS (ordre params + retour JSON)
-- ============================================

DROP FUNCTION IF EXISTS public.validate_quote_by_token(text, uuid);

-- Version avec l'ordre des paramètres attendu par le frontend
CREATE OR REPLACE FUNCTION public.validate_quote_by_token(
  p_quote_id uuid,  -- CHANGE: quote_id en premier
  p_token text      -- CHANGE: token en second
)
RETURNS jsonb  -- CHANGE: retour JSON au lieu de boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_count integer;
  v_company_name text;
BEGIN
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL
    AND l.archived_at IS NULL;

  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Token invalide'
    );
  END IF;

  -- Récupérer le nom de la compagnie
  SELECT ic.name INTO v_company_name
  FROM lead_company_quotes lcq
  LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
  WHERE lcq.id = p_quote_id
    AND lcq.lead_id = v_lead_id;

  UPDATE lead_company_quotes
  SET 
    quote_status = 'validated',
    quote_accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_quote_id
    AND lead_id = v_lead_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    UPDATE crm_leads
    SET 
      status = 'signature_devis',
      pipeline_stage = 'signature_devis',
      updated_at = NOW()
    WHERE id = v_lead_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'company_name', COALESCE(v_company_name, ''),
      'message', 'Devis validé avec succès'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', false,
    'error', 'Devis introuvable'
  );
END;
$$;

DROP FUNCTION IF EXISTS public.refuse_quote_by_token(text, uuid, text);

CREATE OR REPLACE FUNCTION public.refuse_quote_by_token(
  p_quote_id uuid,  -- CHANGE: quote_id en premier
  p_token text,     -- CHANGE: token en second
  p_reason text DEFAULT NULL  -- CHANGE: reason → p_reason
)
RETURNS jsonb  -- CHANGE: retour JSON au lieu de boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_count integer;
  v_company_name text;
BEGIN
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL
    AND l.archived_at IS NULL;

  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Token invalide'
    );
  END IF;

  -- Récupérer le nom de la compagnie
  SELECT ic.name INTO v_company_name
  FROM lead_company_quotes lcq
  LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
  WHERE lcq.id = p_quote_id
    AND lcq.lead_id = v_lead_id;

  UPDATE lead_company_quotes
  SET 
    quote_status = 'refused',
    refusal_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_quote_id
    AND lead_id = v_lead_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'company_name', COALESCE(v_company_name, ''),
      'message', 'Devis refusé'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', false,
    'error', 'Devis introuvable'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_quote_by_token(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refuse_quote_by_token(uuid, text, text) TO anon, authenticated;
