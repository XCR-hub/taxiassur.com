/*
  # Notification Templates Complete Setup v3
  
  1. New Templates
    - SMS templates for all events
    - WhatsApp templates for all events
    
  2. Event to Template Mapping
    - Map events to templates with proper channels
    
  3. Updated Functions (with proper DROP first)
*/

-- Drop existing functions first
DROP FUNCTION IF EXISTS queue_event_notifications(uuid, text, jsonb);
DROP FUNCTION IF EXISTS on_lead_status_change() CASCADE;
DROP FUNCTION IF EXISTS on_new_lead_created() CASCADE;

-- Add more notification templates for SMS (variables as jsonb)
INSERT INTO crm_notification_templates (template_id, name, channel, subject, content, variables, is_active)
VALUES
-- SMS Templates
('welcome_lead_sms', 'SMS de bienvenue lead', 'sms', NULL, 
'TaxiAssur: Bienvenue {{first_name}}! Deposez vos docs sur {{upload_link}} pour accelerer votre devis. 01 76 39 00 60',
'["first_name", "upload_link"]'::jsonb, true),

('document_received_sms', 'SMS document recu', 'sms', NULL,
'TaxiAssur: Votre document ({{document_type}}) a ete recu. Merci!',
'["document_type"]'::jsonb, true),

('documents_complete_sms', 'SMS dossier complet', 'sms', NULL,
'TaxiAssur: {{first_name}}, votre dossier est complet! Votre devis arrive sous 24h.',
'["first_name"]'::jsonb, true),

('quote_available_sms', 'SMS devis disponible', 'sms', NULL,
'TaxiAssur: {{first_name}}, votre devis est pret! Consultez-le: {{upload_link}}',
'["first_name", "upload_link"]'::jsonb, true),

('contract_ready_sms', 'SMS contrat pret', 'sms', NULL,
'TaxiAssur: {{first_name}}, signez votre contrat en ligne: {{upload_link}}',
'["first_name", "upload_link"]'::jsonb, true),

('contract_signed_sms', 'SMS contrat signe', 'sms', NULL,
'TaxiAssur: Contrat signe! Votre attestation sera disponible apres paiement.',
'["first_name"]'::jsonb, true),

('payment_received_sms', 'SMS paiement recu', 'sms', NULL,
'TaxiAssur: Paiement recu {{first_name}}! Votre attestation est disponible sur {{upload_link}}',
'["first_name", "upload_link"]'::jsonb, true),

('reminder_documents_sms', 'SMS rappel documents', 'sms', NULL,
'TaxiAssur: {{first_name}}, documents manquants pour votre devis. Deposez-les: {{upload_link}}',
'["first_name", "upload_link"]'::jsonb, true),

-- WhatsApp Templates
('welcome_lead_whatsapp', 'WhatsApp de bienvenue lead', 'whatsapp', NULL,
E'Bonjour {{first_name}} !\n\nMerci d''avoir choisi TaxiAssur.\n\nPour obtenir rapidement votre devis, deposez vos documents ici :\n{{upload_link}}\n\nDocuments necessaires :\n- Carte grise\n- Permis de conduire\n- Licence taxi\n- Piece d''identite\n- RIB\n\nL''equipe TaxiAssur\n01 76 39 00 60',
'["first_name", "upload_link"]'::jsonb, true),

('quote_available_whatsapp', 'WhatsApp devis disponible', 'whatsapp', NULL,
E'Bonjour {{first_name}} !\n\nVotre devis d''assurance taxi est pret !\n\nConsultez-le et comparez les offres :\n{{upload_link}}\n\nDes questions ? Repondez a ce message.\n\nL''equipe TaxiAssur',
'["first_name", "upload_link"]'::jsonb, true),

('contract_ready_whatsapp', 'WhatsApp contrat pret', 'whatsapp', NULL,
E'Bonjour {{first_name}} !\n\nVotre contrat d''assurance taxi est pret a etre signe.\n\nSignez electroniquement ici :\n{{upload_link}}\n\nL''equipe TaxiAssur',
'["first_name", "upload_link"]'::jsonb, true),

('payment_received_whatsapp', 'WhatsApp paiement confirme', 'whatsapp', NULL,
E'Bonjour {{first_name}} !\n\nPaiement confirme ! Merci pour votre confiance.\n\nVotre attestation d''assurance est disponible dans votre espace client :\n{{upload_link}}\n\nBonne route !\nL''equipe TaxiAssur',
'["first_name", "upload_link"]'::jsonb, true),

('reminder_quote_whatsapp', 'WhatsApp rappel devis', 'whatsapp', NULL,
E'Bonjour {{first_name}} !\n\nVotre devis expire bientot.\n\nDes questions sur les garanties ? Repondez directement a ce message.\n\nConsultez votre devis :\n{{upload_link}}\n\nL''equipe TaxiAssur',
'["first_name", "upload_link"]'::jsonb, true)

ON CONFLICT (template_id) DO UPDATE SET
  name = EXCLUDED.name,
  content = EXCLUDED.content,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Create event to template mapping table
CREATE TABLE IF NOT EXISTS crm_event_template_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  template_id text NOT NULL,
  recipient_type text NOT NULL DEFAULT 'lead' CHECK (recipient_type IN ('lead', 'team', 'both')),
  delay_minutes int DEFAULT 0,
  is_active boolean DEFAULT true,
  conditions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_type, template_id)
);

-- Enable RLS
ALTER TABLE crm_event_template_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access crm_event_template_mapping" ON crm_event_template_mapping;
CREATE POLICY "Admin full access crm_event_template_mapping" ON crm_event_template_mapping
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = (SELECT auth.uid()))
  );

-- Insert event to template mappings
INSERT INTO crm_event_template_mapping (event_type, template_id, recipient_type, delay_minutes, is_active)
VALUES
-- New Lead
('new_lead', 'welcome_lead', 'lead', 0, true),
('new_lead', 'welcome_lead_sms', 'lead', 5, true),
('new_lead', 'welcome_lead_whatsapp', 'lead', 10, true),
('new_lead', 'new_lead_alert', 'team', 0, true),

-- Document Received
('document_received', 'document_received', 'lead', 0, true),
('document_received', 'document_received_sms', 'lead', 0, false),

-- Documents Complete
('documents_complete', 'documents_complete', 'lead', 0, true),
('documents_complete', 'documents_complete_sms', 'lead', 5, true),

-- Quote Available
('quote_sent', 'quote_available', 'lead', 0, true),
('quote_sent', 'quote_available_sms', 'lead', 30, true),
('quote_sent', 'quote_available_whatsapp', 'lead', 60, true),

-- Contract Ready
('contract_ready', 'contract_ready_sms', 'lead', 0, true),
('contract_ready', 'contract_ready_whatsapp', 'lead', 5, true),

-- Contract Signed
('contract_signed', 'contract_signed_sms', 'lead', 0, true),

-- Payment Received
('payment_received', 'payment_received_sms', 'lead', 0, true),
('payment_received', 'payment_received_whatsapp', 'lead', 5, true)

ON CONFLICT (event_type, template_id) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  delay_minutes = EXCLUDED.delay_minutes;

-- Create function to queue all notifications for an event
CREATE FUNCTION queue_event_notifications(
  p_lead_id uuid,
  p_event_type text,
  p_event_data jsonb DEFAULT '{}'
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_mapping record;
  v_variables jsonb;
  v_scheduled_at timestamptz;
  v_queued int := 0;
  v_upload_link text;
BEGIN
  -- Get lead info
  SELECT * INTO v_lead 
  FROM crm_leads 
  WHERE id = p_lead_id;
  
  IF v_lead IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Build upload link
  v_upload_link := 'https://taxiassur.com/prospect/documents/' || COALESCE(v_lead.access_token, '');
  
  -- Build variables for templates
  v_variables := jsonb_build_object(
    'first_name', COALESCE(v_lead.first_name, split_part(COALESCE(v_lead.full_name, 'Client'), ' ', 1)),
    'last_name', COALESCE(v_lead.last_name, ''),
    'email', COALESCE(v_lead.email, ''),
    'phone', COALESCE(v_lead.phone, ''),
    'upload_link', v_upload_link,
    'source', COALESCE(v_lead.source, 'site')
  ) || COALESCE(p_event_data, '{}');
  
  -- Get all active mappings for this event
  FOR v_mapping IN
    SELECT etm.*, nt.channel
    FROM crm_event_template_mapping etm
    JOIN crm_notification_templates nt ON nt.template_id = etm.template_id
    WHERE etm.event_type = p_event_type
      AND etm.is_active = true
      AND nt.is_active = true
  LOOP
    -- Calculate scheduled time
    v_scheduled_at := now() + (v_mapping.delay_minutes || ' minutes')::interval;
    
    -- Queue for lead
    IF v_mapping.recipient_type = 'lead' OR v_mapping.recipient_type = 'both' THEN
      INSERT INTO crm_notification_queue (
        lead_id,
        channel,
        recipient_type,
        template_id,
        variables,
        priority,
        scheduled_at,
        status
      ) VALUES (
        p_lead_id,
        v_mapping.channel,
        'lead',
        v_mapping.template_id,
        v_variables,
        CASE WHEN v_mapping.delay_minutes = 0 THEN 'high' ELSE 'normal' END,
        v_scheduled_at,
        'pending'
      );
      v_queued := v_queued + 1;
    END IF;
    
    -- Queue for team
    IF v_mapping.recipient_type = 'team' OR v_mapping.recipient_type = 'both' THEN
      INSERT INTO crm_notification_queue (
        lead_id,
        channel,
        recipient_type,
        template_id,
        variables,
        priority,
        scheduled_at,
        status
      ) VALUES (
        p_lead_id,
        v_mapping.channel,
        'team',
        v_mapping.template_id,
        v_variables,
        'high',
        now(),
        'pending'
      );
      v_queued := v_queued + 1;
    END IF;
  END LOOP;
  
  RETURN v_queued;
END;
$$;

-- Create the lead status change trigger function
CREATE FUNCTION on_lead_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type text;
  v_event_data jsonb;
BEGIN
  -- Determine event type based on status change
  CASE NEW.status
    WHEN 'documents_pending' THEN v_event_type := 'documents_requested';
    WHEN 'documents_complete' THEN v_event_type := 'documents_complete';
    WHEN 'quote_sent' THEN v_event_type := 'quote_sent';
    WHEN 'quote_accepted' THEN v_event_type := 'quote_accepted';
    WHEN 'contract_pending' THEN v_event_type := 'contract_ready';
    WHEN 'contract_signed' THEN v_event_type := 'contract_signed';
    WHEN 'active' THEN v_event_type := 'client_activated';
    WHEN 'lost' THEN v_event_type := 'lead_lost';
    ELSE v_event_type := 'status_changed';
  END CASE;
  
  -- Build event data
  v_event_data := jsonb_build_object(
    'old_status', OLD.status,
    'new_status', NEW.status,
    'changed_at', now()
  );
  
  -- Create automation event
  INSERT INTO crm_automation_events (lead_id, event_type, event_data, old_status, new_status)
  VALUES (NEW.id, v_event_type, v_event_data, OLD.status::text, NEW.status::text);
  
  -- Queue notifications for significant status changes
  IF v_event_type NOT IN ('status_changed') THEN
    PERFORM queue_event_notifications(NEW.id, v_event_type, v_event_data);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the new lead trigger function
CREATE FUNCTION on_new_lead_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure access token exists
  IF NEW.access_token IS NULL THEN
    NEW.access_token := encode(sha256((NEW.id::text || COALESCE(NEW.email, '') || random()::text)::bytea), 'hex');
  END IF;
  
  -- Create automation event
  INSERT INTO crm_automation_events (lead_id, event_type, event_data, new_status)
  VALUES (NEW.id, 'new_lead', jsonb_build_object('source', NEW.source, 'created_at', now()), NEW.status::text);
  
  -- Queue welcome notifications
  PERFORM queue_event_notifications(NEW.id, 'new_lead', jsonb_build_object('source', NEW.source));
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trg_new_lead_created
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION on_new_lead_created();

CREATE TRIGGER trg_lead_status_change
  AFTER UPDATE OF status ON crm_leads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION on_lead_status_change();

-- Add index for faster notification queue processing
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending 
  ON crm_notification_queue(scheduled_at) 
  WHERE status = 'pending';
