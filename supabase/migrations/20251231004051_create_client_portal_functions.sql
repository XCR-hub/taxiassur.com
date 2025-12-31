/*
  # FONCTIONS ESPACE CLIENT AUTOMATIQUE
  
  1. Création compte client automatique
  2. Génération demandes documents
  3. Workflow validation documents
  4. Emails automatiques
*/

-- ==============================
-- FONCTION : CRÉER COMPTE CLIENT AUTO
-- ==============================

CREATE OR REPLACE FUNCTION create_client_portal_account(
  p_contract_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_client record;
  v_contract record;
  v_portal_user_id uuid;
  v_temp_password text;
BEGIN
  -- Récupérer contrat et client
  SELECT * INTO v_contract FROM client_contracts WHERE id = p_contract_id;
  SELECT * INTO v_client FROM crm_leads_enhanced WHERE id = v_contract.client_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract or client not found';
  END IF;
  
  -- Vérifier si compte existe déjà
  SELECT id INTO v_portal_user_id
  FROM client_portal_users
  WHERE client_id = v_client.id;
  
  IF FOUND THEN
    RETURN v_portal_user_id;
  END IF;
  
  -- Générer mot de passe temporaire (sera changé au premier login)
  v_temp_password := md5(random()::text || clock_timestamp()::text);
  
  -- Créer compte portal
  INSERT INTO client_portal_users (
    client_id,
    contract_id,
    email,
    password_hash,
    phone,
    first_name,
    last_name,
    company_name
  ) VALUES (
    v_client.id,
    p_contract_id,
    v_client.email,
    crypt(v_temp_password, gen_salt('bf')),
    v_client.phone,
    COALESCE(v_client.first_name, split_part(v_client.full_name, ' ', 1)),
    COALESCE(v_client.last_name, split_part(v_client.full_name, ' ', 2)),
    v_client.company_name
  ) RETURNING id INTO v_portal_user_id;
  
  -- Générer demandes documents automatiquement
  PERFORM generate_document_requests_for_client(v_portal_user_id);
  
  -- Envoyer email bienvenue avec lien activation
  INSERT INTO ia_actions_log (
    action_type,
    action_category,
    entity_type,
    entity_id,
    status,
    action_data,
    reasoning,
    confidence_score
  ) VALUES (
    'send_email',
    'client_onboarding',
    'client_portal_user',
    v_portal_user_id,
    'suggested',
    jsonb_build_object(
      'to', v_client.email,
      'template', 'welcome_portal',
      'subject', '🎉 Bienvenue ! Accédez à votre espace client TaxiAssur',
      'data', jsonb_build_object(
        'first_name', COALESCE(v_client.first_name, split_part(v_client.full_name, ' ', 1)),
        'portal_url', 'https://taxiassur.com/espace-client',
        'temp_password', v_temp_password,
        'contract_number', v_contract.contract_number
      )
    ),
    'Contrat signé, compte client créé automatiquement',
    100.0
  );
  
  RETURN v_portal_user_id;
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- FONCTION : GÉNÉRER DEMANDES DOCUMENTS
-- ==============================

CREATE OR REPLACE FUNCTION generate_document_requests_for_client(
  p_portal_user_id uuid
)
RETURNS integer AS $$
DECLARE
  v_user record;
  v_contract record;
  v_client record;
  v_count integer := 0;
BEGIN
  -- Récupérer user, contrat, client
  SELECT * INTO v_user FROM client_portal_users WHERE id = p_portal_user_id;
  SELECT * INTO v_contract FROM client_contracts WHERE id = v_user.contract_id;
  SELECT * INTO v_client FROM crm_leads_enhanced WHERE id = v_user.client_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Identifier type contrat et activité
  -- Pour l'instant, on utilise 'general' comme défaut
  -- TODO: Ajouter champ contract_type dans client_contracts
  
  -- Générer demandes pour tous templates applicables
  INSERT INTO client_document_requests (
    portal_user_id,
    client_id,
    contract_id,
    template_id,
    template_key,
    status,
    requested_at,
    expires_at
  )
  SELECT
    p_portal_user_id,
    v_user.client_id,
    v_user.contract_id,
    dt.id,
    dt.template_key,
    'pending',
    NOW(),
    NOW() + INTERVAL '30 days'
  FROM document_templates dt
  WHERE dt.is_active = true
    AND dt.document_type = 'to_provide'
    AND (
      -- Match activity type
      v_client.activity_type = ANY(dt.applies_to_activity_types)
      OR dt.applies_to_activity_types = '{}'
    )
    AND NOT EXISTS (
      SELECT 1 FROM client_document_requests cdr
      WHERE cdr.portal_user_id = p_portal_user_id
        AND cdr.template_key = dt.template_key
    );
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- FONCTION : VALIDER DOCUMENT
-- ==============================

CREATE OR REPLACE FUNCTION validate_client_document(
  p_request_id uuid,
  p_validator_user_id uuid,
  p_approved boolean,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_request record;
  v_all_validated boolean;
BEGIN
  -- Récupérer demande
  SELECT * INTO v_request FROM client_document_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Request not found');
  END IF;
  
  -- Mettre à jour statut
  UPDATE client_document_requests
  SET 
    status = CASE WHEN p_approved THEN 'validated' ELSE 'rejected' END,
    validated_by = p_validator_user_id,
    validated_at = NOW(),
    rejection_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE id = p_request_id;
  
  -- Logger activité
  INSERT INTO client_portal_activities (
    portal_user_id,
    activity_type,
    activity_description,
    metadata
  ) VALUES (
    v_request.portal_user_id,
    'document_validated',
    CASE 
      WHEN p_approved THEN 'Document validé : ' || v_request.template_key
      ELSE 'Document rejeté : ' || v_request.template_key
    END,
    jsonb_build_object(
      'request_id', p_request_id,
      'approved', p_approved,
      'validator', p_validator_user_id
    )
  );
  
  -- Si rejet, envoyer email explicatif
  IF NOT p_approved THEN
    INSERT INTO ia_actions_log (
      action_type,
      action_category,
      entity_type,
      entity_id,
      status,
      action_data,
      reasoning
    ) VALUES (
      'send_email',
      'document_management',
      'client_portal_user',
      v_request.portal_user_id,
      'suggested',
      jsonb_build_object(
        'template', 'document_rejected',
        'subject', '⚠️ Document à renvoyer',
        'data', jsonb_build_object(
          'document_name', v_request.template_key,
          'rejection_reason', p_rejection_reason
        )
      ),
      'Document rejeté, informer client'
    );
  END IF;
  
  -- Vérifier si tous documents validés
  SELECT COUNT(*) = 0 INTO v_all_validated
  FROM client_document_requests
  WHERE portal_user_id = v_request.portal_user_id
    AND status IN ('pending', 'uploaded', 'rejected');
  
  -- Si tous validés, activer contrat et envoyer félicitations
  IF v_all_validated AND p_approved THEN
    -- Activer contrat
    UPDATE client_contracts
    SET status = 'active'
    WHERE id = v_request.contract_id;
    
    -- Email félicitations
    INSERT INTO ia_actions_log (
      action_type,
      action_category,
      entity_type,
      entity_id,
      status,
      action_data,
      reasoning,
      confidence_score
    ) VALUES (
      'send_email',
      'client_onboarding',
      'client_portal_user',
      v_request.portal_user_id,
      'suggested',
      jsonb_build_object(
        'template', 'all_documents_validated',
        'subject', '✅ Félicitations ! Votre contrat est actif'
      ),
      'Tous documents validés',
      100.0
    );
  END IF;
  
  RETURN jsonb_build_object(
    'validated', p_approved,
    'all_complete', v_all_validated
  );
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- FONCTION : RELANCES AUTOMATIQUES
-- ==============================

CREATE OR REPLACE FUNCTION send_document_reminders()
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
  v_request record;
BEGIN
  -- Trouver demandes en attente depuis > 24h sans relance récente
  FOR v_request IN
    SELECT *
    FROM client_document_requests
    WHERE status IN ('pending', 'rejected')
      AND requested_at < NOW() - INTERVAL '24 hours'
      AND (
        last_reminder_sent_at IS NULL
        OR last_reminder_sent_at < NOW() - INTERVAL '48 hours'
      )
      AND expires_at > NOW()
      AND reminder_count < 5
    LIMIT 100
  LOOP
    -- Créer action IA pour relance
    INSERT INTO ia_actions_log (
      action_type,
      action_category,
      entity_type,
      entity_id,
      status,
      action_data,
      reasoning,
      confidence_score
    ) VALUES (
      'send_email',
      'document_management',
      'client_portal_user',
      v_request.portal_user_id,
      'auto_executed',
      jsonb_build_object(
        'template', 'reminder_documents',
        'subject', '📄 Rappel : Documents en attente',
        'data', jsonb_build_object(
          'document_name', v_request.template_key,
          'days_remaining', EXTRACT(DAY FROM (v_request.expires_at - NOW()))
        )
      ),
      'Relance automatique documents manquants',
      95.0
    );
    
    -- Mettre à jour compteur relances
    UPDATE client_document_requests
    SET 
      reminder_count = reminder_count + 1,
      last_reminder_sent_at = NOW()
    WHERE id = v_request.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- TRIGGER : AUTO PORTAL CREATION
-- ==============================

CREATE OR REPLACE FUNCTION trigger_create_portal_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer compte portal automatiquement
  PERFORM create_client_portal_account(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_contract_signed_create_portal
  AFTER INSERT ON client_contracts
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION trigger_create_portal_account();

-- ==============================
-- CRON : RELANCES DOCUMENTS
-- ==============================

SELECT cron.schedule(
  'send_document_reminders_daily',
  '0 10 * * *',
  $$
  SELECT send_document_reminders();
  $$
);