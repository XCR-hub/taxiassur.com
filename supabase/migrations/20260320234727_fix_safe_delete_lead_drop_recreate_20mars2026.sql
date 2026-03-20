/*
  # Fix safe_delete_lead - Drop and recreate with static table list

  ## Problem
  The existing safe_delete_lead function queries information_schema dynamically,
  causing ~30s+ timeout. This drops and recreates it with a hardcoded static list.
*/

DROP FUNCTION IF EXISTS safe_delete_lead(uuid, text);

CREATE OR REPLACE FUNCTION safe_delete_lead(p_lead_id uuid, p_deletion_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_data jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès refusé - admins uniquement');
  END IF;

  SELECT jsonb_build_object(
    'id', id,
    'name', COALESCE(first_name || ' ' || last_name, email),
    'email', email,
    'phone', phone,
    'status', status,
    'pipeline_stage', pipeline_stage,
    'created_at', created_at
  )
  INTO v_lead_data
  FROM crm_leads WHERE id = p_lead_id;

  IF v_lead_data IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead introuvable');
  END IF;

  INSERT INTO lead_deletion_log (lead_id, lead_email, lead_name, deletion_reason, deleted_by, lead_data)
  VALUES (
    p_lead_id,
    v_lead_data->>'email',
    v_lead_data->>'name',
    p_deletion_reason,
    auth.uid(),
    v_lead_data
  );

  -- Static delete list (avoids slow information_schema lookup)
  DELETE FROM ultron_lead_queue WHERE lead_id = p_lead_id;
  DELETE FROM telephony_calls WHERE lead_id = p_lead_id;
  DELETE FROM scheduled_followups WHERE lead_id = p_lead_id;
  DELETE FROM ready_for_quote_queue WHERE lead_id = p_lead_id;
  DELETE FROM prospect_documents_archive_20260114 WHERE lead_id = p_lead_id;
  DELETE FROM prospect_documents WHERE lead_id = p_lead_id;
  DELETE FROM pipeline_action_queue WHERE lead_id = p_lead_id;
  DELETE FROM pipeline_action_logs WHERE lead_id = p_lead_id;
  DELETE FROM notification_queue WHERE lead_id = p_lead_id;
  DELETE FROM monetico_payments WHERE lead_id = p_lead_id;
  DELETE FROM lead_subscription_details WHERE lead_id = p_lead_id;
  DELETE FROM lead_signatures WHERE lead_id = p_lead_id;
  DELETE FROM lead_signature_history WHERE lead_id = p_lead_id;
  DELETE FROM lead_rib_uploads WHERE lead_id = p_lead_id;
  DELETE FROM lead_quotes_contracts WHERE lead_id = p_lead_id;
  DELETE FROM lead_quote_validations WHERE lead_id = p_lead_id;
  DELETE FROM lead_journey WHERE lead_id = p_lead_id;
  DELETE FROM lead_down_payments WHERE lead_id = p_lead_id;
  DELETE FROM lead_document_checklist WHERE lead_id = p_lead_id;
  DELETE FROM lead_contract_signatures WHERE lead_id = p_lead_id;
  DELETE FROM lead_contract_payments WHERE lead_id = p_lead_id;
  DELETE FROM lead_contract_documents WHERE lead_id = p_lead_id;
  DELETE FROM lead_contracts WHERE lead_id = p_lead_id;
  DELETE FROM lead_company_quotes WHERE lead_id = p_lead_id;
  DELETE FROM lead_client_requests WHERE lead_id = p_lead_id;
  DELETE FROM lead_attestations WHERE lead_id = p_lead_id;
  DELETE FROM insurance_contracts WHERE lead_id = p_lead_id;
  DELETE FROM insurance_claims WHERE lead_id = p_lead_id;
  DELETE FROM inbox_folders WHERE lead_id = p_lead_id;
  DELETE FROM email_sends WHERE lead_id = p_lead_id;
  DELETE FROM email_replies WHERE lead_id = p_lead_id;
  DELETE FROM email_messages WHERE lead_id = p_lead_id;
  DELETE FROM email_messages WHERE case_id = p_lead_id;
  DELETE FROM email_lead_mapping WHERE lead_id = p_lead_id;
  DELETE FROM email_conversations WHERE lead_id = p_lead_id;
  DELETE FROM document_validation_status WHERE lead_id = p_lead_id;
  DELETE FROM document_validation_history WHERE lead_id = p_lead_id;
  DELETE FROM document_requests WHERE lead_id = p_lead_id;
  DELETE FROM document_collection_status WHERE lead_id = p_lead_id;
  DELETE FROM crm_workflow_steps_completed WHERE lead_id = p_lead_id;
  DELETE FROM crm_workflow_step_actions WHERE lead_id = p_lead_id;
  DELETE FROM crm_workflow_runs WHERE lead_id = p_lead_id;
  DELETE FROM crm_vehicles WHERE lead_id = p_lead_id;
  DELETE FROM crm_user_lead_views WHERE lead_id = p_lead_id;
  DELETE FROM crm_tasks WHERE lead_id = p_lead_id;
  DELETE FROM crm_state_transitions WHERE lead_id = p_lead_id;
  DELETE FROM crm_signatures WHERE lead_id = p_lead_id;
  DELETE FROM crm_review_requests WHERE lead_id = p_lead_id;
  DELETE FROM crm_retention_alerts WHERE lead_id = p_lead_id;
  DELETE FROM crm_quotes_sent WHERE lead_id = p_lead_id;
  DELETE FROM crm_quote_history WHERE lead_id = p_lead_id;
  DELETE FROM crm_payments WHERE lead_id = p_lead_id;
  DELETE FROM crm_notifications WHERE lead_id = p_lead_id;
  DELETE FROM crm_notification_queue WHERE lead_id = p_lead_id;
  DELETE FROM crm_notes WHERE lead_id = p_lead_id;
  DELETE FROM crm_lead_signatures WHERE lead_id = p_lead_id;
  DELETE FROM crm_lead_scoring_history WHERE lead_id = p_lead_id;
  DELETE FROM crm_lead_merges WHERE primary_lead_id = p_lead_id;
  DELETE FROM crm_lead_documents WHERE lead_id = p_lead_id;
  DELETE FROM crm_lead_companies_archive_20260114 WHERE lead_id = p_lead_id;
  DELETE FROM crm_interactions WHERE lead_id = p_lead_id;
  DELETE FROM crm_gdpr_requests WHERE lead_id = p_lead_id;
  DELETE FROM crm_event_notifications WHERE lead_id = p_lead_id;
  DELETE FROM crm_documents WHERE lead_id = p_lead_id;
  DELETE FROM crm_document_validations WHERE lead_id = p_lead_id;
  DELETE FROM crm_document_validation_actions WHERE lead_id = p_lead_id;
  DELETE FROM crm_document_requests WHERE lead_id = p_lead_id;
  DELETE FROM crm_document_notifications WHERE lead_id = p_lead_id;
  DELETE FROM crm_contracts_signed WHERE lead_id = p_lead_id;
  DELETE FROM crm_claims WHERE lead_id = p_lead_id;
  DELETE FROM crm_claim_events WHERE lead_id = p_lead_id;
  DELETE FROM crm_clients WHERE lead_id = p_lead_id;
  DELETE FROM crm_call_logs WHERE lead_id = p_lead_id;
  DELETE FROM crm_automation_events WHERE lead_id = p_lead_id;
  DELETE FROM crm_auto_responses WHERE lead_id = p_lead_id;
  DELETE FROM crm_ai_suggestions WHERE lead_id = p_lead_id;
  DELETE FROM crm_ai_recommendations WHERE lead_id = p_lead_id;
  DELETE FROM crm_ai_learning_features WHERE lead_id = p_lead_id;
  DELETE FROM crm_ai_governance_sessions WHERE lead_id = p_lead_id;
  DELETE FROM crm_ai_events WHERE lead_id = p_lead_id;
  DELETE FROM crm_ai_email_queue WHERE lead_id = p_lead_id;
  DELETE FROM crm_ai_decisions WHERE lead_id = p_lead_id;
  DELETE FROM contract_portfolio WHERE lead_id = p_lead_id;
  DELETE FROM contract_modifications WHERE lead_id = p_lead_id;
  DELETE FROM contract_documents_test WHERE lead_id = p_lead_id;
  DELETE FROM contract_document_associations WHERE lead_id = p_lead_id;
  DELETE FROM contact_sequences WHERE lead_id = p_lead_id;
  DELETE FROM company_quotes WHERE lead_id = p_lead_id;
  DELETE FROM commercial_checklist_items WHERE lead_id = p_lead_id;
  DELETE FROM client_taxi_profiles WHERE lead_id = p_lead_id;
  DELETE FROM client_tasks WHERE lead_id = p_lead_id;
  DELETE FROM client_product_recommendations WHERE lead_id = p_lead_id;
  DELETE FROM client_portal_users WHERE lead_id = p_lead_id;
  DELETE FROM client_modification_requests WHERE lead_id = p_lead_id;
  DELETE FROM client_claims WHERE lead_id = p_lead_id;
  DELETE FROM client_choices WHERE lead_id = p_lead_id;
  DELETE FROM client_alerts WHERE lead_id = p_lead_id;
  DELETE FROM client_activity_log WHERE lead_id = p_lead_id;
  DELETE FROM client_activity_history WHERE lead_id = p_lead_id;
  DELETE FROM client_accounts WHERE lead_id = p_lead_id;
  DELETE FROM claims WHERE lead_id = p_lead_id;
  DELETE FROM attestations WHERE lead_id = p_lead_id;
  DELETE FROM ai_autonomous_tasks WHERE lead_id = p_lead_id;

  -- Finally delete the lead itself
  DELETE FROM crm_leads WHERE id = p_lead_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Lead supprimé avec succès',
    'deleted_lead', v_lead_data
  );
END;
$$;

GRANT EXECUTE ON FUNCTION safe_delete_lead(uuid, text) TO authenticated;
