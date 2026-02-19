/*
  # Correction de la fonction merge_duplicate_leads

  1. Problème
    - La fonction essayait d'UPDATE email_attachments avec lead_id
    - Mais email_attachments n'a pas de colonne lead_id
    - Elle est liée via email_message_id

  2. Solution
    - Supprimer la partie qui update email_attachments
    - Les attachments suivent automatiquement via email_messages
*/

-- Recréer la fonction corrigée
CREATE OR REPLACE FUNCTION merge_duplicate_leads(
  p_primary_lead_id uuid,
  p_leads_to_merge uuid[]
)
RETURNS jsonb AS $$
DECLARE
  v_merged_count int := 0;
  v_interactions_moved int := 0;
  v_documents_moved int := 0;
  v_emails_moved int := 0;
  v_quotes_moved int := 0;
  v_lead_id uuid;
  v_user_id uuid;
  v_row_count int;
BEGIN
  -- Vérifier que le lead principal existe
  IF NOT EXISTS (SELECT 1 FROM crm_leads WHERE id = p_primary_lead_id AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Le lead principal n''existe pas ou est supprimé'
    );
  END IF;

  -- Récupérer l'utilisateur connecté
  v_user_id := auth.uid();

  -- Traiter chaque lead à fusionner
  FOREACH v_lead_id IN ARRAY p_leads_to_merge
  LOOP
    -- Ignorer le lead principal s'il est dans la liste
    IF v_lead_id = p_primary_lead_id THEN
      CONTINUE;
    END IF;

    -- Vérifier que le lead existe
    IF NOT EXISTS (SELECT 1 FROM crm_leads WHERE id = v_lead_id AND deleted_at IS NULL) THEN
      CONTINUE;
    END IF;

    -- 1. Transférer les interactions
    UPDATE crm_interactions
    SET lead_id = p_primary_lead_id
    WHERE lead_id = v_lead_id;
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_interactions_moved := v_interactions_moved + v_row_count;

    -- 2. Transférer les documents
    UPDATE crm_lead_documents
    SET lead_id = p_primary_lead_id
    WHERE lead_id = v_lead_id;
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_documents_moved := v_documents_moved + v_row_count;

    -- 3. Transférer les emails
    UPDATE email_messages
    SET lead_id = p_primary_lead_id
    WHERE lead_id = v_lead_id;
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_emails_moved := v_emails_moved + v_row_count;

    -- 4. Transférer les devis (supprimer les doublons d'abord)
    DELETE FROM lead_company_quotes
    WHERE lead_id = v_lead_id
      AND company_id IN (
        SELECT company_id FROM lead_company_quotes WHERE lead_id = p_primary_lead_id
      );

    UPDATE lead_company_quotes
    SET lead_id = p_primary_lead_id
    WHERE lead_id = v_lead_id;
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    v_quotes_moved := v_quotes_moved + v_row_count;

    -- 5. Transférer les conversations email (si la table existe)
    BEGIN
      UPDATE email_conversations
      SET lead_id = p_primary_lead_id
      WHERE lead_id = v_lead_id;
    EXCEPTION
      WHEN undefined_table THEN NULL;
      WHEN undefined_column THEN NULL;
    END;

    -- NOTE: email_attachments n'a pas de lead_id
    -- Les attachments sont liés via email_message_id
    -- Donc ils suivent automatiquement quand on transfère les emails

    -- 6. Transférer les documents prospect (si la table existe)
    BEGIN
      UPDATE prospect_documents
      SET lead_id = p_primary_lead_id
      WHERE lead_id = v_lead_id;
    EXCEPTION
      WHEN undefined_table THEN NULL;
      WHEN undefined_column THEN NULL;
    END;

    -- 7. Transférer les contrats (si la table existe)
    BEGIN
      UPDATE crm_contracts
      SET lead_id = p_primary_lead_id
      WHERE lead_id = v_lead_id;
    EXCEPTION
      WHEN undefined_table THEN NULL;
      WHEN undefined_column THEN NULL;
    END;

    -- 8. Transférer les paiements (si la table existe)
    BEGIN
      UPDATE monetico_payments
      SET lead_id = p_primary_lead_id
      WHERE lead_id = v_lead_id;
    EXCEPTION
      WHEN undefined_table THEN NULL;
      WHEN undefined_column THEN NULL;
    END;

    -- 9. Soft delete le lead fusionné
    UPDATE crm_leads
    SET
      deleted_at = now(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'merged_into', p_primary_lead_id,
        'merged_at', now(),
        'merged_by', v_user_id
      )
    WHERE id = v_lead_id;

    v_merged_count := v_merged_count + 1;
  END LOOP;

  -- Créer l'enregistrement de fusion
  INSERT INTO crm_lead_merges (
    primary_lead_id,
    merged_lead_ids,
    merged_by,
    stats
  ) VALUES (
    p_primary_lead_id,
    p_leads_to_merge,
    v_user_id,
    jsonb_build_object(
      'merged_count', v_merged_count,
      'interactions_moved', v_interactions_moved,
      'documents_moved', v_documents_moved,
      'emails_moved', v_emails_moved,
      'quotes_moved', v_quotes_moved
    )
  );

  -- Mettre à jour les métadonnées du lead principal
  UPDATE crm_leads
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'last_merge_at', now(),
    'total_merges', COALESCE((metadata->>'total_merges')::int, 0) + v_merged_count
  )
  WHERE id = p_primary_lead_id;

  RETURN jsonb_build_object(
    'success', true,
    'merged_count', v_merged_count,
    'interactions_moved', v_interactions_moved,
    'documents_moved', v_documents_moved,
    'emails_moved', v_emails_moved,
    'quotes_moved', v_quotes_moved
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute
GRANT EXECUTE ON FUNCTION merge_duplicate_leads TO authenticated;
