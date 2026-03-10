/*
  # FIX get_lead_by_token - Accès espace prospect
  
  1. Correctif
    - Recréation de la fonction get_lead_by_token qui ne retournait pas les leads correctement
    - La fonction retournait {"lead": null} alors que les leads existent
    - Fix du SELECT INTO pour gérer correctement les cas où aucune ligne n'est trouvée
  
  2. Sécurité
    - SECURITY DEFINER pour permettre l'accès avec token
    - Vérification is_archived = false
*/

DROP FUNCTION IF EXISTS get_lead_by_token(text);

CREATE OR REPLACE FUNCTION get_lead_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_result jsonb;
BEGIN
  -- Vérifier d'abord si le lead existe
  SELECT id INTO v_lead_id
  FROM crm_leads
  WHERE access_token = p_token
  AND is_archived = false
  LIMIT 1;

  -- Si aucun lead trouvé, retourner une erreur
  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object(
      'lead', NULL,
      'error', 'Lead non trouvé ou token invalide'
    );
  END IF;

  -- Construire le résultat complet
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

-- Permissions
GRANT EXECUTE ON FUNCTION get_lead_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_lead_by_token(text) TO authenticated;

COMMENT ON FUNCTION get_lead_by_token IS 'Récupère les infos complètes d un lead via son token pour l espace prospect';
