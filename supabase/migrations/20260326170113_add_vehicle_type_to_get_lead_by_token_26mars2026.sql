/*
  # Add vehicle_type to get_lead_by_token RPC

  1. Modified Functions
    - `get_lead_by_token` - Now returns `vehicle_type` field in the lead object
    
  2. Notes
    - Needed so the prospect space can adapt document requirements based on vehicle type
    - No breaking changes, just adds a new field to the JSON response
*/

CREATE OR REPLACE FUNCTION public.get_lead_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_lead_id
  FROM crm_leads
  WHERE access_token = p_token
  AND is_archived = false
  LIMIT 1;

  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object(
      'lead', NULL,
      'error', 'Lead non trouve ou token invalide'
    );
  END IF;

  SELECT jsonb_build_object(
    'lead', jsonb_build_object(
      'id', l.id,
      'full_name', COALESCE(l.full_name, l.first_name || ' ' || l.last_name),
      'first_name', l.first_name,
      'last_name', l.last_name,
      'email', l.email,
      'phone', l.phone,
      'city', l.city,
      'status', l.status,
      'immatriculation', l.immatriculation,
      'vehicle_type', COALESCE(l.vehicle_type, ''),
      'access_token', l.access_token,
      'created_at', l.created_at,
      'pipeline_stage', l.pipeline_stage,
      'current_stage_key', l.pipeline_stage,
      'converted_to_client', COALESCE(l.converted_to_client, false)
    ),
    'documents', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pd.id,
          'document_type', pd.document_type,
          'file_name', pd.file_name,
          'file_path', pd.file_path,
          'file_size', pd.file_size,
          'mime_type', pd.mime_type,
          'status', pd.status,
          'uploaded_at', pd.uploaded_at,
          'validated', COALESCE(pd.validated, false),
          'validated_at', pd.validated_at
        )
      )
      FROM prospect_documents pd
      WHERE pd.lead_id = v_lead_id
    ), '[]'::jsonb),
    'quotes', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', lq.id,
          'insurance_company_id', lq.insurance_company_id,
          'company_name', ic.name,
          'company_logo', ic.logo_url,
          'quote_amount', lq.quote_amount,
          'status', lq.status,
          'created_at', lq.created_at,
          'quote_accepted_at', lq.quote_accepted_at
        )
      )
      FROM lead_company_quotes lq
      LEFT JOIN insurance_companies ic ON ic.id = lq.insurance_company_id
      WHERE lq.lead_id = v_lead_id
      AND lq.status IN ('pending', 'quote_submitted', 'validated')
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM crm_leads l
  WHERE l.id = v_lead_id;

  RETURN v_result;
END;
$$;