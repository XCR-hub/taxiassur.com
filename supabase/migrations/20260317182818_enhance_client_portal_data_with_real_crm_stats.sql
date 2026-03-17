/*
  # Enhance get_client_portal_data_by_email with real CRM stats

  1. Updated Function
    - `get_client_portal_data_by_email` now returns real data from crm_leads:
      - `lead_id`: UUID of the linked crm_leads record
      - `access_token`: token for prospect space
      - `pipeline_stage` / `workflow_stage`: current stage in the pipeline
      - `doc_count`: number of documents uploaded (prospect_documents)
      - `quote_count`: number of quotes available (lead_company_quotes)
      - `notification_count`: unread notifications (crm_event_notifications)

  2. Design
    - Links client_portal_users to crm_leads via matching email (case-insensitive)
    - All counts are safe subqueries — return 0 if no rows
    - SECURITY DEFINER so anon role can call it safely
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

  -- Find linked lead in CRM by email
  SELECT
    id, access_token, workflow_stage, pipeline_stage, status, created_at
  INTO v_lead
  FROM crm_leads
  WHERE lower(trim(email)) = lower(trim(p_email))
  ORDER BY created_at DESC
  LIMIT 1;

  -- Count real documents
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
      AND read_at IS NULL;
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
    -- CRM lead data
    'lead_id', v_lead.id,
    'access_token', v_lead.access_token,
    'pipeline_stage', v_lead.pipeline_stage,
    'workflow_stage', v_lead.workflow_stage,
    'lead_status', v_lead.status::text,
    'lead_created_at', v_lead.created_at,
    -- Real counts
    'doc_count', v_doc_count,
    'quote_count', v_quote_count,
    'notification_count', v_notif_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_client_portal_data_by_email(text) TO anon;
GRANT EXECUTE ON FUNCTION get_client_portal_data_by_email(text) TO authenticated;
