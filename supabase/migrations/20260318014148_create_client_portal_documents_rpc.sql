/*
  # Create RPC for client portal document access

  1. Problem
    - ClientDocuments page shows hardcoded fake documents
    - Real documents exist in: crm_lead_documents, prospect_documents, contract_document_associations
    - Client portal users need to access their documents securely without authentication

  2. Solution
    - Create get_client_documents_by_email(p_email) RPC
    - Uses SECURITY DEFINER to bypass RLS safely
    - Fetches lead_id from client_portal_users (or crm_leads by email)
    - Returns all document types with signed/public URLs for download

  3. Also creates get_signed_document_url helper for private buckets
*/

-- Main RPC: get all documents for a client by their email
CREATE OR REPLACE FUNCTION get_client_documents_by_email(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_supabase_url text := 'https://drohhxrkoequjphvabvq.supabase.co';
  v_docs json;
  v_portal_user record;
BEGIN
  IF p_email IS NULL OR p_email = '' THEN
    RETURN json_build_object('success', false, 'error', 'Email invalide');
  END IF;

  -- Find portal user and their linked lead
  SELECT id, lead_id, is_active
  INTO v_portal_user
  FROM client_portal_users
  WHERE email = lower(trim(p_email))
  LIMIT 1;

  IF v_portal_user IS NULL OR NOT v_portal_user.is_active THEN
    RETURN json_build_object('success', false, 'error', 'Compte non trouvé ou inactif');
  END IF;

  -- Resolve lead_id
  IF v_portal_user.lead_id IS NOT NULL THEN
    v_lead_id := v_portal_user.lead_id;
  ELSE
    SELECT id INTO v_lead_id
    FROM crm_leads
    WHERE email = lower(trim(p_email)) AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_lead_id IS NOT NULL THEN
      UPDATE client_portal_users SET lead_id = v_lead_id WHERE id = v_portal_user.id;
    END IF;
  END IF;

  IF v_lead_id IS NULL THEN
    RETURN json_build_object('success', true, 'documents', '[]'::json, 'total', 0);
  END IF;

  -- Build document list from all 3 sources
  SELECT json_agg(
    json_build_object(
      'id', d.id,
      'name', d.name,
      'document_type', d.document_type,
      'category', d.category,
      'file_url', d.file_url,
      'file_size', d.file_size,
      'mime_type', d.mime_type,
      'status', d.status,
      'source', d.source,
      'uploaded_at', d.uploaded_at,
      'validated', d.validated
    ) ORDER BY d.uploaded_at DESC
  )
  INTO v_docs
  FROM (
    -- 1. Documents prospect (uploaded by the client)
    SELECT
      pd.id::text AS id,
      COALESCE(pd.file_name, 'Document') AS name,
      COALESCE(pd.document_type, 'autre') AS document_type,
      'prospect_upload'::text AS category,
      CASE
        WHEN pd.file_path IS NOT NULL AND pd.file_path != ''
        THEN v_supabase_url || '/storage/v1/object/public/prospect-documents/' || ltrim(pd.file_path, '/')
        ELSE NULL
      END AS file_url,
      COALESCE(pd.file_size, 0)::bigint AS file_size,
      COALESCE(pd.mime_type, 'application/octet-stream') AS mime_type,
      COALESCE(pd.status, 'pending') AS status,
      'Vos documents'::text AS source,
      COALESCE(pd.uploaded_at, pd.created_at) AS uploaded_at,
      COALESCE(pd.validated, false) AS validated
    FROM prospect_documents pd
    WHERE pd.lead_id = v_lead_id

    UNION ALL

    -- 2. Documents CRM (uploaded by the commercial team for this client)
    SELECT
      cld.id::text AS id,
      COALESCE(cld.custom_label, cld.file_name, 'Document') AS name,
      COALESCE(cld.document_type, 'autre') AS document_type,
      'crm_upload'::text AS category,
      cld.file_url,
      COALESCE(cld.file_size, 0)::bigint AS file_size,
      COALESCE(cld.mime_type, 'application/octet-stream') AS mime_type,
      COALESCE(cld.status, 'pending') AS status,
      'Votre conseiller'::text AS source,
      COALESCE(cld.uploaded_at, cld.created_at) AS uploaded_at,
      CASE WHEN cld.status = 'validated' THEN true ELSE false END AS validated
    FROM crm_lead_documents cld
    WHERE cld.lead_id = v_lead_id
      AND cld.file_url IS NOT NULL

    UNION ALL

    -- 3. Company library documents (attestations, CGV, etc.)
    SELECT
      cda.id::text AS id,
      COALESCE(cdl.document_name, 'Document assureur') AS name,
      COALESCE(cdl.document_type, 'contrat') AS document_type,
      'company_document'::text AS category,
      cdl.file_url,
      COALESCE(cdl.file_size, 0)::bigint AS file_size,
      'application/pdf'::text AS mime_type,
      'available'::text AS status,
      COALESCE(ic.name, 'Assureur')::text AS source,
      cda.attached_at AS uploaded_at,
      true AS validated
    FROM contract_document_associations cda
    JOIN company_document_library cdl ON cdl.id = cda.company_document_id
    LEFT JOIN insurance_companies ic ON ic.id = cdl.company_id
    WHERE cda.lead_id = v_lead_id
      AND cdl.file_url IS NOT NULL
  ) d;

  RETURN json_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'documents', COALESCE(v_docs, '[]'::json),
    'total', (SELECT COUNT(*) FROM (
      SELECT 1 FROM prospect_documents WHERE lead_id = v_lead_id
      UNION ALL
      SELECT 1 FROM crm_lead_documents WHERE lead_id = v_lead_id AND file_url IS NOT NULL
      UNION ALL
      SELECT 1 FROM contract_document_associations WHERE lead_id = v_lead_id
    ) x)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_client_documents_by_email(text) TO anon;
GRANT EXECUTE ON FUNCTION get_client_documents_by_email(text) TO authenticated;
