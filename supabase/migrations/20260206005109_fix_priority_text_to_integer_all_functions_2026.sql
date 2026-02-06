/*
  # Fix priority text to integer in all functions

  Corrige toutes les fonctions qui utilisent des valeurs texte ('high', 'low', 'normal')
  pour la colonne priority qui est de type INTEGER.
  
  Mapping:
  - 'high' → 10
  - 'normal' → 5
  - 'low' → 1
*/

-- ================================================================
-- 1. Fix sync_pipeline_to_kanban function
-- ================================================================
CREATE OR REPLACE FUNCTION sync_pipeline_to_kanban()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status lead_status;
BEGIN
  -- Ne rien faire si le lead est déjà client actif ou perdu
  IF NEW.status IN ('CLIENT_ACTIF', 'PERDU', 'CLIENT_LOST') THEN
    RETURN NEW;
  END IF;

  -- Calculer le nouveau statut Kanban
  v_new_status := map_pipeline_stage_to_status(NEW.pipeline_stage);

  -- Mettre à jour le statut si mapping trouvé
  IF v_new_status IS NOT NULL AND v_new_status != OLD.status THEN
    NEW.status := v_new_status;

    -- Logger le changement avec priority INTEGER
    INSERT INTO crm_event_notifications (
      lead_id,
      event_type,
      title,
      message,
      priority,
      metadata
    ) VALUES (
      NEW.id,
      'status_auto_updated',
      'Statut Kanban mis à jour',
      format('Passage automatique de "%s" à "%s" (étape commercial: %s)', 
        OLD.status, v_new_status, NEW.pipeline_stage),
      1, -- low = 1
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', v_new_status,
        'pipeline_stage', NEW.pipeline_stage,
        'trigger', 'automatic'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ================================================================
-- 2. Fix activate_lead_as_client function
-- ================================================================
CREATE OR REPLACE FUNCTION activate_lead_as_client(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
BEGIN
  -- Vérifier que le lead existe et est à l'étape contrat_final
  SELECT * INTO v_lead
  FROM crm_leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lead non trouvé'
    );
  END IF;

  -- Vérifier qu'on est bien à l'étape contrat_final
  IF v_lead.pipeline_stage != 'contrat_final' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Le lead doit être à l''étape "Contrat Final" (actuellement: %s)', v_lead.pipeline_stage),
      'current_stage', v_lead.pipeline_stage
    );
  END IF;

  -- Vérifier que le statut n'est pas déjà CLIENT_ACTIF
  IF v_lead.status = 'CLIENT_ACTIF' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Le lead est déjà un client actif'
    );
  END IF;

  -- Mettre à jour le statut en CLIENT_ACTIF
  UPDATE crm_leads
  SET 
    status = 'CLIENT_ACTIF'::lead_status,
    updated_at = now()
  WHERE id = p_lead_id;

  -- Logger l'événement avec priority INTEGER
  INSERT INTO crm_event_notifications (
    lead_id,
    event_type,
    title,
    message,
    priority,
    metadata
  ) VALUES (
    p_lead_id,
    'lead_activated',
    'Lead activé en Client Actif',
    format('%s %s est maintenant un client actif !', v_lead.first_name, v_lead.last_name),
    10, -- high = 10
    jsonb_build_object(
      'old_status', v_lead.status,
      'new_status', 'CLIENT_ACTIF',
      'pipeline_stage', 'contrat_final',
      'activated_by', auth.uid(),
      'activated_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Lead activé avec succès en Client Actif',
    'lead_id', p_lead_id,
    'new_status', 'CLIENT_ACTIF'
  );
END;
$$;

-- ================================================================
-- 3. Fix reject_document function (si elle existe)
-- ================================================================
CREATE OR REPLACE FUNCTION reject_document(
  p_document_id uuid,
  p_rejection_reason text,
  p_rejection_details text DEFAULT NULL,
  p_validated_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_document record;
  v_lead_id uuid;
  v_reason_label text;
BEGIN
  -- Get document info
  SELECT * INTO v_document
  FROM prospect_documents
  WHERE id = p_document_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Document non trouvé');
  END IF;

  v_lead_id := v_document.lead_id;

  -- Get reason label
  v_reason_label := CASE p_rejection_reason
    WHEN 'illegible' THEN 'Document illisible'
    WHEN 'expired' THEN 'Document expiré'
    WHEN 'incomplete' THEN 'Document incomplet'
    WHEN 'wrong_type' THEN 'Mauvais type de document'
    ELSE 'Raison non spécifiée'
  END;

  -- Update document status
  UPDATE prospect_documents
  SET 
    status = 'rejected',
    rejection_reason = p_rejection_reason,
    rejection_details = p_rejection_details,
    validated_by = p_validated_by,
    validated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_document_id;

  -- Create notification with INTEGER priority
  INSERT INTO crm_event_notifications (
    lead_id,
    type,
    priority,
    title,
    message,
    action_url,
    metadata
  ) VALUES (
    v_lead_id,
    'document_rejected',
    10, -- high = 10
    'Document à remplacer',
    'Votre document "' || v_document.document_type || '" a été rejeté. ' || v_reason_label || '. ' ||
    COALESCE(p_rejection_details, 'Merci de télécharger à nouveau ce document.'),
    '/espace-prospect?section=documents',
    jsonb_build_object(
      'document_id', p_document_id,
      'document_type', v_document.document_type,
      'rejection_reason', p_rejection_reason,
      'rejection_details', p_rejection_details
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Document rejeté avec succès',
    'document_id', p_document_id
  );
END;
$$;

COMMENT ON FUNCTION sync_pipeline_to_kanban() IS 'Synchronise automatiquement le statut Kanban avec l''étape du pipeline commercial (FIXED: priority INTEGER)';
COMMENT ON FUNCTION activate_lead_as_client(uuid) IS 'Active manuellement un lead en Client Actif (FIXED: priority INTEGER)';
COMMENT ON FUNCTION reject_document(uuid, text, text, uuid) IS 'Rejette un document avec notification (FIXED: priority INTEGER)';
