/*
  # Restauration complète Espace Prospect - Documents et Devis
  
  ## Problème
  Les prospects ne voient ni leurs documents ni leurs devis dans l'espace prospect
  
  ## Solution
  Recréer toutes les fonctions avec les bonnes colonnes et RLS policies
*/

-- ============================================
-- SUPPRIMER LES ANCIENNES FONCTIONS
-- ============================================

DROP FUNCTION IF EXISTS public.get_prospect_documents_by_token(text) CASCADE;
DROP FUNCTION IF EXISTS public.upload_prospect_document_by_token(text, text, text, text, bigint) CASCADE;
DROP FUNCTION IF EXISTS public.upload_prospect_document_by_token(text, text, text, text, text, bigint) CASCADE;
DROP FUNCTION IF EXISTS public.get_lead_quotes_by_token(text) CASCADE;
DROP FUNCTION IF EXISTS public.validate_quote_by_token(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.refuse_quote_by_token(text, uuid, text) CASCADE;

-- ============================================
-- FONCTIONS DOCUMENTS
-- ============================================

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
    AND l.deleted_at IS NULL
    AND l.archived_at IS NULL;

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
    AND d.deleted_at IS NULL
  ORDER BY d.uploaded_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.upload_prospect_document_by_token(
  p_token text,
  p_document_type text,
  p_document_name text,
  p_file_path text,
  p_file_url text,
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
BEGIN
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL
    AND l.archived_at IS NULL;

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'Token invalide';
  END IF;

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
    p_document_name,
    p_file_path,
    p_file_url,
    p_file_size,
    'pending',
    false,
    NOW()
  )
  RETURNING id INTO v_document_id;

  RETURN v_document_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_prospect_documents_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upload_prospect_document_by_token(text, text, text, text, text, bigint) TO anon, authenticated;

-- ============================================
-- FONCTIONS DEVIS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_lead_quotes_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  insurance_company_id uuid,
  company_name text,
  company_logo_url text,
  quote_pdf_url text,
  quote_amount numeric,
  quote_status text,
  sent_at timestamptz,
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
    lcq.insurance_company_id,
    COALESCE(ic.name, '') as company_name,
    COALESCE(ic.logo_url, '') as company_logo_url,
    COALESCE(lcq.quote_pdf_url, '') as quote_pdf_url,
    lcq.quote_amount,
    COALESCE(lcq.quote_status, 'pending') as quote_status,
    lcq.sent_at,
    lcq.quote_accepted_at,
    lcq.refusal_reason,
    lcq.created_at,
    lcq.updated_at
  FROM lead_company_quotes lcq
  LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
  WHERE lcq.lead_id = v_lead_id
    AND lcq.deleted_at IS NULL
  ORDER BY lcq.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_quote_by_token(
  p_token text,
  p_quote_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_count integer;
BEGIN
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL
    AND l.archived_at IS NULL;

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'Token invalide';
  END IF;

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
    
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.refuse_quote_by_token(
  p_token text,
  p_quote_id uuid,
  p_refusal_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_count integer;
BEGIN
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL
    AND l.archived_at IS NULL;

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'Token invalide';
  END IF;

  UPDATE lead_company_quotes
  SET 
    quote_status = 'refused',
    refusal_reason = p_refusal_reason,
    updated_at = NOW()
  WHERE id = p_quote_id
    AND lead_id = v_lead_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_quotes_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_quote_by_token(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refuse_quote_by_token(text, uuid, text) TO anon, authenticated;

-- ============================================
-- RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Prospect can view own documents via token" ON crm_lead_documents;
CREATE POLICY "Prospect can view own documents via token"
  ON crm_lead_documents
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads l
      WHERE l.id = crm_lead_documents.lead_id
        AND l.access_token IS NOT NULL
        AND l.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Prospect can upload documents via token" ON crm_lead_documents;
CREATE POLICY "Prospect can upload documents via token"
  ON crm_lead_documents
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_leads l
      WHERE l.id = crm_lead_documents.lead_id
        AND l.access_token IS NOT NULL
        AND l.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Prospect can view quotes via token" ON lead_company_quotes;
CREATE POLICY "Prospect can view quotes via token"
  ON lead_company_quotes
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads l
      WHERE l.id = lead_company_quotes.lead_id
        AND l.access_token IS NOT NULL
        AND l.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Prospect can update quotes via token" ON lead_company_quotes;
CREATE POLICY "Prospect can update quotes via token"
  ON lead_company_quotes
  FOR UPDATE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads l
      WHERE l.id = lead_company_quotes.lead_id
        AND l.access_token IS NOT NULL
        AND l.deleted_at IS NULL
    )
  );
