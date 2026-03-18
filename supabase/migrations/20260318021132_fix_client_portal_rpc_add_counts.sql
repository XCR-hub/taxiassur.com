/*
  # Fix get_client_portal_data_by_email - Add doc_count, quote_count, notification_count

  ## Summary
  The client dashboard expects doc_count, quote_count, and notification_count fields
  from the RPC, but the function was only returning total_uploaded_files, etc.
  This migration adds the three missing count fields by querying the relevant tables.

  1. Changes
    - Add `doc_count` (count of prospect_documents for the lead)
    - Add `quote_count` (count of lead_company_quotes with quote_file_url not null)
    - Add `notification_count` (count of unread crm_event_notifications)
    - Keep all existing fields unchanged
    - Also expose lead_created_at for dashboard display
*/

CREATE OR REPLACE FUNCTION public.get_client_portal_data_by_email(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user record;
  v_lead record;
  v_doc_count integer := 0;
  v_quote_count integer := 0;
  v_notif_count integer := 0;
  v_lead_id uuid;
BEGIN
  IF p_email IS NULL OR p_email = '' THEN
    RETURN json_build_object('success', false, 'error', 'Email invalide');
  END IF;

  SELECT
    id, email, first_name, last_name, phone, company_name,
    is_active, lead_id, created_at
  INTO v_user
  FROM client_portal_users
  WHERE email = lower(trim(p_email))
  LIMIT 1;

  IF v_user IS NULL OR NOT v_user.is_active THEN
    RETURN json_build_object('success', false, 'error', 'Compte non trouvé ou inactif');
  END IF;

  IF v_user.lead_id IS NOT NULL THEN
    SELECT
      id, first_name, last_name, phone, email,
      address, postal_code, city,
      immatriculation, company_name,
      status, pipeline_stage, current_stage_key,
      quote_amount, payment_method,
      contract_signed, contract_signed_at,
      client_since, created_at,
      selected_company_id, selected_quote_id,
      documents_complete, total_uploaded_files, validated_files,
      metadata, access_token
    INTO v_lead
    FROM crm_leads
    WHERE id = v_user.lead_id AND deleted_at IS NULL
    LIMIT 1;
  END IF;

  IF v_lead IS NULL THEN
    SELECT
      id, first_name, last_name, phone, email,
      address, postal_code, city,
      immatriculation, company_name,
      status, pipeline_stage, current_stage_key,
      quote_amount, payment_method,
      contract_signed, contract_signed_at,
      client_since, created_at,
      selected_company_id, selected_quote_id,
      documents_complete, total_uploaded_files, validated_files,
      metadata, access_token
    INTO v_lead
    FROM crm_leads
    WHERE email = lower(trim(p_email)) AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_lead IS NOT NULL AND v_user.lead_id IS NULL THEN
      UPDATE client_portal_users SET lead_id = v_lead.id WHERE id = v_user.id;
    END IF;
  END IF;

  v_lead_id := COALESCE(v_user.lead_id, v_lead.id);

  IF v_lead_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_doc_count
    FROM prospect_documents
    WHERE lead_id = v_lead_id;

    SELECT COUNT(*) INTO v_quote_count
    FROM lead_company_quotes
    WHERE lead_id = v_lead_id AND quote_file_url IS NOT NULL;

    SELECT COUNT(*) INTO v_notif_count
    FROM crm_event_notifications
    WHERE lead_id = v_lead_id AND (is_read = false OR is_read IS NULL);
  END IF;

  RETURN json_build_object(
    'success', true,
    'id', v_user.id,
    'email', v_user.email,
    'is_active', v_user.is_active,
    'portal_created_at', v_user.created_at,
    'lead_id', v_lead_id,
    'first_name', COALESCE(v_lead.first_name, v_user.first_name),
    'last_name', COALESCE(v_lead.last_name, v_user.last_name),
    'full_name', CASE
      WHEN v_lead.first_name IS NOT NULL OR v_lead.last_name IS NOT NULL
      THEN trim(COALESCE(v_lead.first_name, '') || ' ' || COALESCE(v_lead.last_name, ''))
      ELSE NULL
    END,
    'phone', COALESCE(v_lead.phone, v_user.phone),
    'company_name', COALESCE(v_lead.company_name, v_user.company_name),
    'address', v_lead.address,
    'postal_code', v_lead.postal_code,
    'city', v_lead.city,
    'immatriculation', v_lead.immatriculation,
    'status', v_lead.status,
    'pipeline_stage', v_lead.pipeline_stage,
    'current_stage_key', v_lead.current_stage_key,
    'workflow_stage', v_lead.current_stage_key,
    'lead_status', v_lead.status,
    'lead_created_at', v_lead.created_at,
    'created_at', COALESCE(v_lead.created_at, v_user.created_at),
    'quote_amount', v_lead.quote_amount,
    'payment_method', v_lead.payment_method,
    'contract_signed', v_lead.contract_signed,
    'contract_signed_at', v_lead.contract_signed_at,
    'client_since', v_lead.client_since,
    'documents_complete', v_lead.documents_complete,
    'total_uploaded_files', v_lead.total_uploaded_files,
    'validated_files', v_lead.validated_files,
    'selected_company_id', v_lead.selected_company_id,
    'selected_quote_id', v_lead.selected_quote_id,
    'access_token', v_lead.access_token,
    'doc_count', v_doc_count,
    'quote_count', v_quote_count,
    'notification_count', v_notif_count
  );
END;
$$;
