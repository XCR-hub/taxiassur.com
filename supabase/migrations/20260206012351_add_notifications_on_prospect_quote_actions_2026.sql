/*
  # Add notifications when prospect validates or refuses a quote

  Modifie les fonctions validate_quote_by_token() et refuse_quote_by_token()
  pour créer automatiquement une notification destinée au commercial dans
  crm_event_notifications.
  
  Notifications créées:
  - quote_validated: Quand le prospect accepte un devis
  - quote_refused: Quand le prospect refuse un devis
*/

-- Fonction pour valider un devis (avec notification)
CREATE OR REPLACE FUNCTION validate_quote_by_token(
  p_quote_id uuid,
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_company_name text;
  v_lead_name text;
  v_quote_amount numeric;
BEGIN
  -- Vérifier que le token est valide et récupérer le lead_id
  SELECT lcq.lead_id
  INTO v_lead_id
  FROM lead_company_quotes lcq
  INNER JOIN crm_leads cl ON cl.id = lcq.lead_id
  WHERE lcq.id = p_quote_id
    AND cl.access_token = p_token
    AND cl.access_token IS NOT NULL;

  -- Si aucun lead trouvé, token invalide
  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Token invalide ou devis non trouvé'
    );
  END IF;

  -- Mettre à jour le devis avec le bon statut
  UPDATE lead_company_quotes
  SET 
    status = 'validated',
    quote_accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_quote_id
    AND lead_id = v_lead_id;

  -- Récupérer les infos pour la notification
  SELECT 
    ic.name,
    COALESCE(cl.first_name || ' ' || cl.last_name, cl.email),
    lcq.quote_amount
  INTO 
    v_company_name,
    v_lead_name,
    v_quote_amount
  FROM lead_company_quotes lcq
  INNER JOIN insurance_companies ic ON ic.id = lcq.company_id
  INNER JOIN crm_leads cl ON cl.id = lcq.lead_id
  WHERE lcq.id = p_quote_id;

  -- Créer une notification pour le commercial
  INSERT INTO crm_event_notifications (
    lead_id,
    event_type,
    title,
    message,
    priority,
    metadata
  ) VALUES (
    v_lead_id,
    'quote_validated',
    '✅ Devis accepté par le prospect',
    format('%s a accepté le devis de %s (%s €)', 
      v_lead_name, 
      v_company_name,
      COALESCE(v_quote_amount::text, 'montant non défini')
    ),
    10, -- high priority
    jsonb_build_object(
      'quote_id', p_quote_id,
      'company_name', v_company_name,
      'quote_amount', v_quote_amount,
      'validated_at', NOW(),
      'action_source', 'prospect_portal'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Devis validé avec succès',
    'company_name', v_company_name
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Fonction pour refuser un devis (avec notification)
CREATE OR REPLACE FUNCTION refuse_quote_by_token(
  p_quote_id uuid,
  p_token text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_company_name text;
  v_lead_name text;
  v_quote_amount numeric;
BEGIN
  -- Vérifier que le token est valide et récupérer le lead_id
  SELECT lcq.lead_id
  INTO v_lead_id
  FROM lead_company_quotes lcq
  INNER JOIN crm_leads cl ON cl.id = lcq.lead_id
  WHERE lcq.id = p_quote_id
    AND cl.access_token = p_token
    AND cl.access_token IS NOT NULL;

  -- Si aucun lead trouvé, token invalide
  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Token invalide ou devis non trouvé'
    );
  END IF;

  -- Mettre à jour le devis avec le statut refused
  UPDATE lead_company_quotes
  SET 
    status = 'refused',
    refused_at = NOW(),
    refusal_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_quote_id
    AND lead_id = v_lead_id;

  -- Récupérer les infos pour la notification
  SELECT 
    ic.name,
    COALESCE(cl.first_name || ' ' || cl.last_name, cl.email),
    lcq.quote_amount
  INTO 
    v_company_name,
    v_lead_name,
    v_quote_amount
  FROM lead_company_quotes lcq
  INNER JOIN insurance_companies ic ON ic.id = lcq.company_id
  INNER JOIN crm_leads cl ON cl.id = lcq.lead_id
  WHERE lcq.id = p_quote_id;

  -- Créer une notification pour le commercial
  INSERT INTO crm_event_notifications (
    lead_id,
    event_type,
    title,
    message,
    priority,
    metadata
  ) VALUES (
    v_lead_id,
    'quote_refused',
    '❌ Devis refusé par le prospect',
    format('%s a refusé le devis de %s%s', 
      v_lead_name, 
      v_company_name,
      CASE 
        WHEN p_reason IS NOT NULL THEN ' - Raison: ' || p_reason
        ELSE ''
      END
    ),
    8, -- medium-high priority
    jsonb_build_object(
      'quote_id', p_quote_id,
      'company_name', v_company_name,
      'quote_amount', v_quote_amount,
      'refusal_reason', p_reason,
      'refused_at', NOW(),
      'action_source', 'prospect_portal'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Devis refusé',
    'company_name', v_company_name
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Recréer les grants
GRANT EXECUTE ON FUNCTION validate_quote_by_token(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION validate_quote_by_token(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION refuse_quote_by_token(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION refuse_quote_by_token(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION validate_quote_by_token(uuid, text) IS 'Valide un devis depuis l''espace prospect et notifie le commercial';
COMMENT ON FUNCTION refuse_quote_by_token(uuid, text, text) IS 'Refuse un devis depuis l''espace prospect et notifie le commercial';
