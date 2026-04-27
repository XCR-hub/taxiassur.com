/*
  # Manual Merge of 2 Arbitrary Leads - 27 April 2026

  1. New Functions
    - `merge_two_leads_manual(p_source_id, p_target_id)` : Manually merges 2 leads
      regardless of email match. Source is archived, target keeps all data and
      receives all related records (interactions, documents, quotes, contracts,
      payments, emails) from source.

  2. Behavior
    - Target lead is the one preserved
    - Source lead is archived (soft-deleted via status='archived')
    - Empty fields on target are filled with values from source
    - Notes from source are appended to target's notes
    - All foreign key references are repointed to target

  3. Security
    - SECURITY DEFINER for cross-table updates
    - Granted to authenticated only
    - Logs every merge in lead_merge_log with reason='manual'
*/

CREATE OR REPLACE FUNCTION merge_two_leads_manual(
  p_source_id uuid,
  p_target_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source crm_leads;
  v_target crm_leads;
  v_merged_data jsonb;
  v_docs_count integer := 0;
  v_interactions_count integer := 0;
  v_quotes_count integer := 0;
  v_emails_count integer := 0;
BEGIN
  IF p_source_id = p_target_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source et cible identiques');
  END IF;

  SELECT * INTO v_source FROM crm_leads WHERE id = p_source_id;
  SELECT * INTO v_target FROM crm_leads WHERE id = p_target_id;

  IF v_source IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead source introuvable');
  END IF;
  IF v_target IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead cible introuvable');
  END IF;

  -- Merge fields: target keeps its values, fills blanks from source
  UPDATE crm_leads SET
    first_name = COALESCE(NULLIF(first_name, ''), v_source.first_name, first_name),
    last_name = COALESCE(NULLIF(last_name, ''), v_source.last_name, last_name),
    email = COALESCE(NULLIF(email, ''), v_source.email, email),
    phone = COALESCE(NULLIF(phone, ''), v_source.phone, phone),
    city = COALESCE(NULLIF(city, ''), v_source.city, city),
    postal_code = COALESCE(NULLIF(postal_code, ''), v_source.postal_code, postal_code),
    vehicle_type = COALESCE(NULLIF(vehicle_type, ''), v_source.vehicle_type, vehicle_type),
    immatriculation = COALESCE(NULLIF(immatriculation, ''), v_source.immatriculation, immatriculation),
    siret = COALESCE(NULLIF(siret, ''), v_source.siret, siret),
    company_name = COALESCE(NULLIF(company_name, ''), v_source.company_name, company_name),
    notes = CASE
      WHEN notes IS NULL OR notes = '' THEN v_source.notes
      WHEN v_source.notes IS NOT NULL AND v_source.notes != ''
        THEN notes || E'\n\n--- Fusionné depuis lead ' || p_source_id::text || ' ---\n' || v_source.notes
      ELSE notes
    END,
    updated_at = now()
  WHERE id = p_target_id;

  -- Move all related records
  UPDATE crm_lead_documents SET lead_id = p_target_id WHERE lead_id = p_source_id;
  GET DIAGNOSTICS v_docs_count = ROW_COUNT;

  UPDATE crm_interactions SET lead_id = p_target_id WHERE lead_id = p_source_id;
  GET DIAGNOSTICS v_interactions_count = ROW_COUNT;

  UPDATE lead_company_quotes SET lead_id = p_target_id WHERE lead_id = p_source_id;
  GET DIAGNOSTICS v_quotes_count = ROW_COUNT;

  BEGIN
    UPDATE lead_contracts SET lead_id = p_target_id WHERE lead_id = p_source_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    UPDATE monetico_payment_tracking SET lead_id = p_target_id WHERE lead_id = p_source_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    UPDATE email_messages SET lead_id = p_target_id WHERE lead_id = p_source_id;
    GET DIAGNOSTICS v_emails_count = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    UPDATE prospect_documents SET lead_id = p_target_id WHERE lead_id = p_source_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  v_merged_data := to_jsonb(v_source);

  -- Archive source
  UPDATE crm_leads SET
    status = 'archived',
    notes = COALESCE(notes, '') || E'\n\n--- FUSIONNÉ MANUELLEMENT vers lead ' || p_target_id::text || ' le ' || now()::text || ' ---',
    updated_at = now()
  WHERE id = p_source_id;

  INSERT INTO lead_merge_log (
    master_lead_id, merged_lead_ids, merged_leads_data, merge_reason,
    documents_count, interactions_count, merged_by
  ) VALUES (
    p_target_id, ARRAY[p_source_id],
    jsonb_build_object(p_source_id::text, v_merged_data),
    'manual',
    v_docs_count, v_interactions_count, auth.uid()
  );

  RETURN jsonb_build_object(
    'success', true,
    'target_id', p_target_id,
    'source_id', p_source_id,
    'documents_moved', v_docs_count,
    'interactions_moved', v_interactions_count,
    'quotes_moved', v_quotes_count,
    'emails_moved', v_emails_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION merge_two_leads_manual(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION merge_two_leads_manual(uuid, uuid) IS 'Fusionne manuellement 2 leads arbitraires (source archivée, cible préservée)';
