/*
  # Fix colonnes manquantes pour l'espace prospect
  
  ## Problème
  Les fonctions utilisent des colonnes qui n'existent pas :
  - crm_lead_documents.validated
  - crm_lead_documents.deleted_at
  - lead_company_quotes.deleted_at
  - crm_leads.deleted_at et archived_at
  
  ## Solution
  1. Ajouter les colonnes manquantes
  2. Mettre à jour les fonctions
*/

-- ============================================
-- AJOUTER LES COLONNES MANQUANTES
-- ============================================

-- crm_lead_documents
ALTER TABLE crm_lead_documents 
ADD COLUMN IF NOT EXISTS validated boolean DEFAULT false;

ALTER TABLE crm_lead_documents 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- lead_company_quotes  
ALTER TABLE lead_company_quotes 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- crm_leads
ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- ============================================
-- RECRÉER LES FONCTIONS AVEC LES BONNES COLONNES
-- ============================================

-- Documents : récupération
DROP FUNCTION IF EXISTS public.get_prospect_documents_by_token(text);

CREATE OR REPLACE FUNCTION public.get_prospect_documents_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  document_type text,
  document_name text,
  file_path text,
  file_url text,
  file_size bigint,
  status text,
  validated boolean,
  uploaded_at timestamptz,
  validated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND (l.deleted_at IS NULL OR l.deleted_at > NOW())
    AND (l.archived_at IS NULL OR l.archived_at > NOW());

  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    d.id,
    d.lead_id,
    d.document_type,
    d.document_name,
    d.file_path,
    COALESCE(d.file_url, '') as file_url,
    COALESCE(d.file_size, 0) as file_size,
    COALESCE(d.status, 'pending') as status,
    COALESCE(d.validated, false) as validated,
    d.uploaded_at,
    d.validated_at
  FROM crm_lead_documents d
  WHERE d.lead_id = v_lead_id
    AND (d.deleted_at IS NULL OR d.deleted_at > NOW())
  ORDER BY d.uploaded_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_prospect_documents_by_token(text) TO anon, authenticated;

-- Documents : upload
DROP FUNCTION IF EXISTS public.upload_prospect_document_by_token(text, text, text, text, bigint);

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
    AND (l.deleted_at IS NULL OR l.deleted_at > NOW())
    AND (l.archived_at IS NULL OR l.archived_at > NOW());

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'Token invalide';
  END IF;

  -- Générer l'URL publique
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

-- Devis : récupération
DROP FUNCTION IF EXISTS public.get_lead_quotes_by_token(text);

CREATE OR REPLACE FUNCTION public.get_lead_quotes_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  company_id uuid,
  company_name text,
  company_logo_url text,
  quote_file_url text,
  quote_amount numeric,
  status text,
  submitted_at timestamptz,
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
    AND (cl.deleted_at IS NULL OR cl.deleted_at > NOW())
    AND (cl.archived_at IS NULL OR cl.archived_at > NOW())
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    lcq.id,
    lcq.lead_id,
    lcq.insurance_company_id as company_id,
    COALESCE(ic.name, '') as company_name,
    COALESCE(ic.logo_url, '') as company_logo_url,
    COALESCE(lcq.quote_pdf_url, '') as quote_file_url,
    lcq.quote_amount,
    COALESCE(lcq.quote_status, 'pending') as status,
    lcq.sent_at as submitted_at,
    lcq.last_sent_at,
    lcq.quote_accepted_at,
    lcq.refusal_reason,
    lcq.created_at,
    lcq.updated_at
  FROM lead_company_quotes lcq
  LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
  WHERE lcq.lead_id = v_lead_id
    AND (lcq.deleted_at IS NULL OR lcq.deleted_at > NOW())
    AND lcq.quote_pdf_url IS NOT NULL
    AND lcq.quote_pdf_url != ''
  ORDER BY lcq.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_quotes_by_token(text) TO anon, authenticated;

-- Devis : validation
DROP FUNCTION IF EXISTS public.validate_quote_by_token(uuid, text);

CREATE OR REPLACE FUNCTION public.validate_quote_by_token(
  p_quote_id uuid,
  p_token text
)
RETURNS jsonb
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
    AND (l.deleted_at IS NULL OR l.deleted_at > NOW())
    AND (l.archived_at IS NULL OR l.archived_at > NOW());

  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Token invalide'
    );
  END IF;

  SELECT ic.name INTO v_company_name
  FROM lead_company_quotes lcq
  LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
  WHERE lcq.id = p_quote_id
    AND lcq.lead_id = v_lead_id;

  UPDATE lead_company_quotes
  SET 
    quote_status = 'validated',
    quote_accepted_at = NOW(),
    validated_by_prospect = true,
    updated_at = NOW()
  WHERE id = p_quote_id
    AND lead_id = v_lead_id
    AND (deleted_at IS NULL OR deleted_at > NOW());

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

GRANT EXECUTE ON FUNCTION public.validate_quote_by_token(uuid, text) TO anon, authenticated;

-- Devis : refus
DROP FUNCTION IF EXISTS public.refuse_quote_by_token(uuid, text, text);

CREATE OR REPLACE FUNCTION public.refuse_quote_by_token(
  p_quote_id uuid,
  p_token text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
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
    AND (l.deleted_at IS NULL OR l.deleted_at > NOW())
    AND (l.archived_at IS NULL OR l.archived_at > NOW());

  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Token invalide'
    );
  END IF;

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
    AND (deleted_at IS NULL OR deleted_at > NOW());

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

GRANT EXECUTE ON FUNCTION public.refuse_quote_by_token(uuid, text, text) TO anon, authenticated;

-- ============================================
-- CRÉER DES INDEX POUR LES PERFORMANCES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_crm_lead_documents_deleted_at 
ON crm_lead_documents(deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lead_company_quotes_deleted_at 
ON lead_company_quotes(deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_leads_deleted_archived 
ON crm_leads(deleted_at, archived_at) 
WHERE deleted_at IS NULL AND archived_at IS NULL;
