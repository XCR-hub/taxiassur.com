/*
  # Fix activate_lead_as_client function - Remove HTTP dependency

  Corrections apportées :
  - Supprime la dépendance à net.http_post qui peut causer des erreurs
  - La fonction RPC se concentre uniquement sur la mise à jour du statut
  - L'email sera envoyé par le frontend après confirmation de l'activation
  - Simplifie la logique pour éviter les timeouts
*/

CREATE OR REPLACE FUNCTION activate_lead_as_client(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_old_status text;
BEGIN
  -- Vérifier que le lead existe
  SELECT * INTO v_lead
  FROM crm_leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lead non trouvé'
    );
  END IF;

  -- Stocker l'ancien statut
  v_old_status := v_lead.status;

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

  -- Logger l'événement
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
    'Client Activé',
    format('%s %s est maintenant un client actif',
      COALESCE(v_lead.first_name, ''),
      COALESCE(v_lead.last_name, 'Client')
    ),
    10,
    jsonb_build_object(
      'old_status', v_old_status,
      'new_status', 'CLIENT_ACTIF',
      'pipeline_stage', v_lead.pipeline_stage,
      'activated_by', auth.uid(),
      'activated_at', now(),
      'lead_email', v_lead.email
    )
  );

  -- Logger dans l'historique des interactions
  INSERT INTO crm_interactions (
    lead_id,
    type,
    direction,
    content,
    created_by
  ) VALUES (
    p_lead_id,
    'note',
    'internal',
    format('Lead transformé en client actif. Ancien statut : %s', v_old_status),
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Lead activé avec succès en Client Actif',
    'lead_id', p_lead_id,
    'old_status', v_old_status,
    'new_status', 'CLIENT_ACTIF',
    'email', v_lead.email,
    'access_token', v_lead.access_token
  );
END;
$$;

COMMENT ON FUNCTION activate_lead_as_client(uuid) IS 'Active un lead en client actif. L''email de félicitations sera envoyé par le frontend.';