/*
  # Fix get_client_portal_data_by_email function

  ## Problem
  The function references `read_at` column which does not exist on `crm_event_notifications`.
  The correct column is `is_read` (boolean).

  ## Fix
  Replace `AND read_at IS NULL` with `AND (is_read IS NULL OR is_read = false)`.
*/

CREATE OR REPLACE FUNCTION get_client_portal_data_by_email(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_lead record;
  v_doc_count integer;
  v_quote_count integer;
  v_notif_count integer;
BEGIN
  IF p_email IS NULL OR p_email = '' THEN
    RETURN json_build_object('success', false, 'error', 'Email invalide');
  END IF;

  SELECT
    id, email, first_name, last_name, phone,
    company_name, is_active, created_at
  INTO v_user
  FROM client_portal_users
  WHERE email = lower(trim(p_email))
  LIMIT 1;

  IF v_user IS NULL OR NOT v_user.is_active THEN
    RETURN json_build_object('success', false, 'error', 'Compte non trouvé ou inactif');
  END IF;

  SELECT
    id, access_token, workflow_stage, pipeline_stage, status, created_at
  INTO v_lead
  FROM crm_leads
  WHERE lower(trim(email)) = lower(trim(p_email))
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_lead.id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_doc_count
    FROM prospect_documents
    WHERE lead_id = v_lead.id;

    SELECT COUNT(*) INTO v_quote_count
    FROM lead_company_quotes
    WHERE lead_id = v_lead.id
    AND quote_file_url IS NOT NULL;

    SELECT COUNT(*) INTO v_notif_count
    FROM crm_event_notifications
    WHERE lead_id = v_lead.id
    AND (dismissed IS NULL OR dismissed = false)
    AND (is_read IS NULL OR is_read = false);
  ELSE
    v_doc_count := 0;
    v_quote_count := 0;
    v_notif_count := 0;
  END IF;

  RETURN json_build_object(
    'success', true,
    'id', v_user.id,
    'email', v_user.email,
    'first_name', v_user.first_name,
    'last_name', v_user.last_name,
    'phone', v_user.phone,
    'company_name', v_user.company_name,
    'is_active', v_user.is_active,
    'created_at', v_user.created_at,
    'lead_id', v_lead.id,
    'access_token', v_lead.access_token,
    'pipeline_stage', v_lead.pipeline_stage,
    'workflow_stage', v_lead.workflow_stage,
    'lead_status', v_lead.status::text,
    'lead_created_at', v_lead.created_at,
    'doc_count', v_doc_count,
    'quote_count', v_quote_count,
    'notification_count', v_notif_count
  );
END;
$$;
