/*
  # Fix Complet Espace Prospect - Devis et Documents Visibles

  Résout:
  1. Devis Generali non visible dans l'espace prospect
  2. Documents prospect non visibles dans le CRM
  3. Progression à 0% dans l'espace prospect
*/

-- =============================================
-- 1. DROP ET RECRÉER get_lead_by_token avec progression
-- =============================================

DROP FUNCTION IF EXISTS public.get_lead_by_token(text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_lead_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  address text,
  postal_code text,
  city text,
  company_name text,
  siret text,
  status text,
  pipeline_stage text,
  documents_complete boolean,
  progression_percentage integer,
  total_documents integer,
  uploaded_documents integer,
  quote_amount numeric,
  quote_accepted_at timestamptz,
  contract_signed_at timestamptz,
  payment_completed_at timestamptz,
  contract_pdf_url text,
  attestation_pdf_url text,
  converted_to_client boolean,
  client_since timestamptz,
  selected_company_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_docs integer := 8;
  v_uploaded_docs integer;
  v_progression integer;
BEGIN
  -- Calculer les documents uploadés pour ce lead
  SELECT COUNT(DISTINCT document_type) INTO v_uploaded_docs
  FROM crm_lead_documents cld
  WHERE cld.lead_id = (SELECT cl.id FROM crm_leads cl WHERE cl.access_token = p_token AND cl.deleted_at IS NULL LIMIT 1)
    AND cld.document_type IN ('licence_taxi', 'permis_conduire', 'carte_grise', 'releve_information', 'carte_professionnelle', 'kbis_sirene', 'piece_identite', 'rib')
    AND cld.status != 'refused'
    AND cld.deleted_at IS NULL;

  v_uploaded_docs := COALESCE(v_uploaded_docs, 0);
  v_progression := ROUND((v_uploaded_docs::numeric / v_total_docs::numeric) * 100);

  RETURN QUERY
  SELECT
    cl.id,
    cl.first_name,
    cl.last_name,
    cl.email,
    cl.phone,
    cl.address,
    cl.postal_code,
    cl.city,
    cl.company_name,
    cl.siret,
    cl.status,
    cl.pipeline_stage,
    (v_uploaded_docs >= v_total_docs) as documents_complete,
    v_progression as progression_percentage,
    v_total_docs as total_documents,
    v_uploaded_docs as uploaded_documents,
    cl.quote_amount,
    cl.quote_accepted_at,
    cl.contract_signed_at,
    cl.payment_completed_at,
    cl.contract_pdf_url,
    cl.attestation_pdf_url,
    cl.converted_to_client,
    cl.client_since,
    cl.selected_company_id,
    cl.created_at,
    cl.updated_at
  FROM crm_leads cl
  WHERE cl.access_token = p_token
    AND cl.deleted_at IS NULL
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_by_token(text) TO anon, authenticated;

-- =============================================
-- 2. DROP ET RECRÉER get_lead_quotes_by_token
-- =============================================

DROP FUNCTION IF EXISTS public.get_lead_quotes_by_token(text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_lead_quotes_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  lead_id uuid,
  company_id uuid,
  company_name text,
  company_logo_url text,
  company_code text,
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
  WHERE cl.access_token = p_token AND cl.deleted_at IS NULL
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
    COALESCE(ic.code, '') as company_code,
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
    AND lcq.deleted_at IS NULL
    AND lcq.quote_pdf_url IS NOT NULL
    AND lcq.quote_pdf_url != ''
  ORDER BY lcq.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lead_quotes_by_token(text) TO anon, authenticated;

-- =============================================
-- 3. TRIGGER: Sync prospect_documents vers CRM
-- =============================================

CREATE OR REPLACE FUNCTION sync_prospect_document_to_crm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM crm_lead_documents
    WHERE lead_id = NEW.lead_id
      AND document_type = NEW.document_type
      AND file_path = NEW.file_path
      AND deleted_at IS NULL
  ) THEN
    INSERT INTO crm_lead_documents (
      lead_id, document_type, file_name, file_path, file_size, mime_type,
      status, uploaded_by_prospect, uploaded_at
    ) VALUES (
      NEW.lead_id, NEW.document_type, NEW.file_name, NEW.file_path,
      NEW.file_size, NEW.mime_type, 'pending', true, NEW.uploaded_at
    );

    INSERT INTO crm_event_notifications (
      lead_id, event_type, title, message, priority, action_url
    ) VALUES (
      NEW.lead_id, 'document_uploaded', 'Nouveau document prospect',
      'Document uploade: ' || NEW.document_type, 2,
      '/backoffice/crm-killer/' || NEW.lead_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_prospect_document_trigger ON prospect_documents;
CREATE TRIGGER sync_prospect_document_trigger
AFTER INSERT ON prospect_documents
FOR EACH ROW EXECUTE FUNCTION sync_prospect_document_to_crm();

-- =============================================
-- 4. FONCTION: Get documents avec URLs
-- =============================================

DROP FUNCTION IF EXISTS get_lead_documents_by_token(text) CASCADE;

CREATE OR REPLACE FUNCTION get_lead_documents_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  document_type text,
  file_name text,
  file_path text,
  file_url text,
  status text,
  uploaded_at timestamptz,
  validated_at timestamptz,
  refusal_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  SELECT cl.id INTO v_lead_id
  FROM crm_leads cl
  WHERE cl.access_token = p_token AND cl.deleted_at IS NULL
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    cld.id,
    cld.document_type,
    cld.file_name,
    cld.file_path,
    cld.file_path as file_url,
    COALESCE(cld.status, 'pending') as status,
    cld.uploaded_at,
    cld.validated_at,
    cld.refusal_reason
  FROM crm_lead_documents cld
  WHERE cld.lead_id = v_lead_id
    AND cld.deleted_at IS NULL
    AND cld.document_type NOT IN ('devis', 'contrat', 'attestation')
  ORDER BY cld.uploaded_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_lead_documents_by_token(text) TO anon, authenticated;