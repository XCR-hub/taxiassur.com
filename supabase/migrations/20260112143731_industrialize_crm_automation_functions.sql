/*
  # Industrialisation CRM - Fonctions d'automatisation
  
  ## Fonctions créées
    - create_automation_event: Crée un event d'automatisation
    - queue_notification: Queue une notification multicanale
    - on_lead_status_change: Trigger changement statut
    - on_new_lead_created: Trigger nouveau lead
    - on_quote_sent: Trigger devis envoyé
    - on_contract_signed: Trigger contrat signé
    - get_lead_pipeline_summary: Résumé pipeline lead
*/

-- ================================================================
-- 1. FONCTION: Créer un event d'automatisation
-- ================================================================

CREATE OR REPLACE FUNCTION create_automation_event(
  p_lead_id uuid,
  p_event_type text,
  p_event_data jsonb DEFAULT '{}',
  p_old_status text DEFAULT NULL,
  p_new_status text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO crm_automation_events (
    lead_id, event_type, event_data, old_status, new_status
  ) VALUES (
    p_lead_id, p_event_type, p_event_data, p_old_status, p_new_status
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- ================================================================
-- 2. FONCTION: Queue une notification
-- ================================================================

CREATE OR REPLACE FUNCTION queue_notification(
  p_lead_id uuid,
  p_channel text,
  p_recipient_type text,
  p_template_id text,
  p_variables jsonb DEFAULT '{}',
  p_priority integer DEFAULT 5,
  p_scheduled_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id uuid;
  v_lead record;
BEGIN
  SELECT * INTO v_lead FROM crm_leads WHERE id = p_lead_id;
  
  IF v_lead IS NULL THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO crm_notification_queue (
    lead_id, channel, recipient_type, template_id,
    recipient_email, recipient_phone,
    variables, priority, scheduled_at
  ) VALUES (
    p_lead_id, p_channel, p_recipient_type, p_template_id,
    CASE WHEN p_recipient_type = 'client' THEN v_lead.email ELSE NULL END,
    CASE WHEN p_recipient_type = 'client' THEN v_lead.phone ELSE NULL END,
    p_variables, p_priority, p_scheduled_at
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- ================================================================
-- 3. FONCTION: Queue notifications multicanales pour un event
-- ================================================================

CREATE OR REPLACE FUNCTION queue_event_notifications(
  p_lead_id uuid,
  p_event_type text,
  p_event_data jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_variables jsonb;
BEGIN
  SELECT * INTO v_lead FROM crm_leads WHERE id = p_lead_id;
  
  IF v_lead IS NULL THEN
    RETURN;
  END IF;
  
  v_variables := jsonb_build_object(
    'first_name', COALESCE(v_lead.first_name, 'Client'),
    'last_name', COALESCE(v_lead.last_name, ''),
    'email', v_lead.email,
    'phone', v_lead.phone,
    'access_token', v_lead.access_token,
    'upload_link', 'https://taxiassur.com/prospect/documents/' || COALESCE(v_lead.access_token, '')
  ) || p_event_data;
  
  CASE p_event_type
    WHEN 'lead_created' THEN
      PERFORM queue_notification(p_lead_id, 'email', 'client', 'welcome_lead', v_variables, 1);
      PERFORM queue_notification(p_lead_id, 'email', 'team', 'new_lead_alert', v_variables, 1);
      PERFORM queue_notification(p_lead_id, 'internal', 'team', 'new_lead_notification', v_variables, 1);
      
    WHEN 'document_uploaded' THEN
      PERFORM queue_notification(p_lead_id, 'email', 'client', 'document_received', v_variables, 3);
      PERFORM queue_notification(p_lead_id, 'email', 'team', 'document_uploaded_alert', v_variables, 2);
      
    WHEN 'documents_complete' THEN
      PERFORM queue_notification(p_lead_id, 'email', 'client', 'documents_complete', v_variables, 2);
      PERFORM queue_notification(p_lead_id, 'email', 'team', 'ready_for_quote', v_variables, 1);
      PERFORM queue_notification(p_lead_id, 'internal', 'team', 'documents_complete_notification', v_variables, 1);
      
    WHEN 'quote_sent' THEN
      PERFORM queue_notification(p_lead_id, 'email', 'client', 'quote_available', v_variables, 1);
      IF v_lead.consent_sms THEN
        PERFORM queue_notification(p_lead_id, 'sms', 'client', 'quote_sms', v_variables, 2);
      END IF;
      IF v_lead.consent_whatsapp THEN
        PERFORM queue_notification(p_lead_id, 'whatsapp', 'client', 'quote_whatsapp', v_variables, 2);
      END IF;
      
    WHEN 'quote_accepted' THEN
      PERFORM queue_notification(p_lead_id, 'email', 'client', 'quote_accepted_confirmation', v_variables, 1);
      PERFORM queue_notification(p_lead_id, 'email', 'team', 'quote_accepted_alert', v_variables, 1);
      PERFORM queue_notification(p_lead_id, 'internal', 'team', 'quote_accepted_notification', v_variables, 1);
      
    WHEN 'signature_sent' THEN
      PERFORM queue_notification(p_lead_id, 'email', 'client', 'signature_ready', v_variables, 1);
      IF v_lead.consent_sms THEN
        PERFORM queue_notification(p_lead_id, 'sms', 'client', 'signature_sms', v_variables, 2);
      END IF;
      
    WHEN 'contract_signed' THEN
      PERFORM queue_notification(p_lead_id, 'email', 'client', 'contract_signed_confirmation', v_variables, 1);
      PERFORM queue_notification(p_lead_id, 'email', 'team', 'contract_signed_alert', v_variables, 1);
      
    WHEN 'payment_completed' THEN
      PERFORM queue_notification(p_lead_id, 'email', 'client', 'payment_confirmation', v_variables, 1);
      PERFORM queue_notification(p_lead_id, 'email', 'team', 'payment_received_alert', v_variables, 1);
      PERFORM queue_notification(p_lead_id, 'email', 'company', 'new_client_notification', v_variables, 2);
      
    WHEN 'client_activated' THEN
      PERFORM queue_notification(p_lead_id, 'email', 'client', 'welcome_client', v_variables, 1);
      
    ELSE
      NULL;
  END CASE;
END;
$$;

-- ================================================================
-- 4. TRIGGER: Changement de statut lead
-- ================================================================

CREATE OR REPLACE FUNCTION on_lead_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_event_id := create_automation_event(
      NEW.id,
      'status_change',
      jsonb_build_object(
        'lead_name', COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''),
        'lead_email', NEW.email
      ),
      OLD.status::text,
      NEW.status::text
    );
    
    NEW.updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_status_change ON crm_leads;
CREATE TRIGGER trg_lead_status_change
  BEFORE UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION on_lead_status_change();

-- ================================================================
-- 5. TRIGGER: Nouveau lead créé
-- ================================================================

CREATE OR REPLACE FUNCTION on_new_lead_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_automation_event(
    NEW.id,
    'lead_created',
    jsonb_build_object(
      'lead_name', COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''),
      'lead_email', NEW.email,
      'lead_phone', NEW.phone,
      'source', NEW.source
    ),
    NULL,
    NEW.status::text
  );
  
  PERFORM queue_event_notifications(NEW.id, 'lead_created', '{}'::jsonb);
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_lead_created ON crm_leads;
CREATE TRIGGER trg_new_lead_created
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION on_new_lead_created();

-- ================================================================
-- 6. TRIGGER: Devis mis à jour
-- ================================================================

CREATE OR REPLACE FUNCTION on_quote_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'draft' AND NEW.status = 'sent' THEN
    NEW.sent_at := now();
    
    PERFORM create_automation_event(
      NEW.lead_id,
      'quote_sent',
      jsonb_build_object(
        'quote_id', NEW.id,
        'company_id', NEW.company_id,
        'annual_premium', NEW.annual_premium
      ),
      NULL,
      NULL
    );
    
    PERFORM queue_event_notifications(NEW.lead_id, 'quote_sent', jsonb_build_object(
      'quote_id', NEW.id,
      'annual_premium', NEW.annual_premium
    ));
    
    UPDATE crm_leads 
    SET status = 'QUOTE_SENT'
    WHERE id = NEW.lead_id
    AND status::text NOT IN ('CONTRACT_ACCEPTED', 'CONTRACT_SIGNED', 'ACTIVE_CLIENT');
  END IF;
  
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    NEW.accepted_at := now();
    NEW.is_selected := true;
    
    UPDATE lead_quotes SET is_selected = false 
    WHERE lead_id = NEW.lead_id AND id != NEW.id;
    
    UPDATE crm_leads 
    SET 
      quote_accepted_at = now(),
      selected_company_id = NEW.company_id,
      selected_quote_id = NEW.id
    WHERE id = NEW.lead_id;
    
    PERFORM create_automation_event(
      NEW.lead_id,
      'quote_accepted',
      jsonb_build_object(
        'quote_id', NEW.id,
        'company_id', NEW.company_id
      ),
      'QUOTE_SENT',
      'CONTRACT_ACCEPTED'
    );
    
    PERFORM queue_event_notifications(NEW.lead_id, 'quote_accepted', jsonb_build_object(
      'quote_id', NEW.id
    ));
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_status_change ON lead_quotes;
CREATE TRIGGER trg_quote_status_change
  BEFORE UPDATE ON lead_quotes
  FOR EACH ROW
  EXECUTE FUNCTION on_quote_status_change();

-- ================================================================
-- 7. TRIGGER: Contrat mis à jour
-- ================================================================

CREATE OR REPLACE FUNCTION on_contract_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.signature_status = 'sent' AND OLD.signature_status = 'pending' THEN
    NEW.signature_sent_at := now();
    
    PERFORM queue_event_notifications(NEW.lead_id, 'signature_sent', jsonb_build_object(
      'contract_id', NEW.id,
      'signature_url', NEW.signature_url
    ));
  END IF;
  
  IF NEW.signature_status = 'signed' AND OLD.signature_status != 'signed' THEN
    NEW.signature_completed_at := now();
    
    PERFORM create_automation_event(
      NEW.lead_id,
      'contract_signed',
      jsonb_build_object(
        'contract_id', NEW.id,
        'company_id', NEW.company_id
      ),
      'CONTRACT_ACCEPTED',
      'CONTRACT_SIGNED'
    );
    
    PERFORM queue_event_notifications(NEW.lead_id, 'contract_signed', jsonb_build_object(
      'contract_id', NEW.id
    ));
    
    UPDATE crm_leads 
    SET 
      contract_signed_at = now()
    WHERE id = NEW.lead_id;
  END IF;
  
  IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' THEN
    NEW.payment_date := now();
    
    PERFORM create_automation_event(
      NEW.lead_id,
      'payment_completed',
      jsonb_build_object(
        'contract_id', NEW.id,
        'amount', NEW.payment_amount,
        'method', NEW.payment_method
      ),
      'CONTRACT_SIGNED',
      'ACTIVE_CLIENT'
    );
    
    PERFORM queue_event_notifications(NEW.lead_id, 'payment_completed', jsonb_build_object(
      'contract_id', NEW.id,
      'amount', NEW.payment_amount
    ));
    
    UPDATE crm_leads 
    SET 
      status = 'ACTIVE_CLIENT',
      payment_completed_at = now(),
      client_since = now(),
      converted_to_client = true,
      converted_at = now()
    WHERE id = NEW.lead_id;
    
    PERFORM queue_event_notifications(NEW.lead_id, 'client_activated', '{}'::jsonb);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contract_status_change ON lead_contracts;
CREATE TRIGGER trg_contract_status_change
  BEFORE UPDATE ON lead_contracts
  FOR EACH ROW
  EXECUTE FUNCTION on_contract_status_change();

-- ================================================================
-- 8. FONCTION: Résumé pipeline pour un lead
-- ================================================================

CREATE OR REPLACE FUNCTION get_lead_pipeline_summary(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'lead', jsonb_build_object(
      'id', l.id,
      'name', COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, ''),
      'email', l.email,
      'phone', l.phone,
      'status', l.status,
      'documents_complete', l.documents_complete,
      'created_at', l.created_at
    ),
    'documents', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'type', document_type,
        'status', status,
        'uploaded_at', uploaded_at
      )), '[]'::jsonb)
      FROM prospect_documents WHERE lead_id = p_lead_id
    ),
    'quotes', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', q.id,
        'company_id', q.company_id,
        'company_name', ic.name,
        'annual_premium', q.annual_premium,
        'monthly_premium', q.monthly_premium,
        'status', q.status,
        'is_selected', q.is_selected,
        'file_url', q.file_url,
        'sent_at', q.sent_at
      ) ORDER BY q.is_selected DESC, q.created_at DESC), '[]'::jsonb)
      FROM lead_quotes q
      LEFT JOIN insurance_companies ic ON ic.id = q.company_id
      WHERE q.lead_id = p_lead_id
    ),
    'contract', (
      SELECT jsonb_build_object(
        'id', c.id,
        'company_id', c.company_id,
        'company_name', ic.name,
        'signature_status', c.signature_status,
        'payment_status', c.payment_status,
        'signature_url', c.signature_url,
        'payment_url', c.payment_url
      )
      FROM lead_contracts c
      LEFT JOIN insurance_companies ic ON ic.id = c.company_id
      WHERE c.lead_id = p_lead_id
      ORDER BY c.created_at DESC
      LIMIT 1
    ),
    'events_count', (
      SELECT COUNT(*) FROM crm_automation_events WHERE lead_id = p_lead_id
    ),
    'notifications_pending', (
      SELECT COUNT(*) FROM crm_notification_queue WHERE lead_id = p_lead_id AND status = 'pending'
    )
  ) INTO v_result
  FROM crm_leads l
  WHERE l.id = p_lead_id;
  
  RETURN v_result;
END;
$$;

-- ================================================================
-- 9. VUE: Pipeline stats
-- ================================================================

DROP VIEW IF EXISTS v_pipeline_stats;
CREATE VIEW v_pipeline_stats AS
SELECT 
  status::text as status,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') as last_24h,
  COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') as last_7_days,
  COUNT(*) FILTER (WHERE created_at > now() - interval '30 days') as last_30_days
FROM crm_leads
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY 
  CASE status::text
    WHEN 'NEW_LEAD' THEN 1
    WHEN 'DOCUMENTS_REQUESTED' THEN 2
    WHEN 'DOCUMENTS_REQUIRED' THEN 3
    WHEN 'DOCUMENTS_RECEIVED' THEN 4
    WHEN 'QUOTE_IN_PROGRESS' THEN 5
    WHEN 'QUOTE_SENT' THEN 6
    WHEN 'CONTRACT_ACCEPTED' THEN 7
    WHEN 'CONTRACT_SIGNED' THEN 8
    WHEN 'PAYMENT_PENDING' THEN 9
    WHEN 'ACTIVE_CLIENT' THEN 10
    ELSE 99
  END;
