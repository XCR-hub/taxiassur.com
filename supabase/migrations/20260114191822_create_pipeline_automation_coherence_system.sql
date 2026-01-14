/*
  # Pipeline Automation Coherence System
  
  1. New Tables
    - `pipeline_action_queue`: Queue for pipeline-triggered actions
    - `pipeline_action_logs`: Detailed logs of executed actions
    - `pipeline_stage_automations`: Configuration for stage-based automations
  
  2. Functions
    - `execute_pipeline_action`: Executes a single pipeline action
    - `process_pipeline_queue`: Processes pending actions
    - `trigger_stage_automations`: Auto-triggers based on stage entry
  
  3. Triggers
    - Auto-trigger on lead status change
    - Update last_contact_at on communication actions
  
  4. Security
    - RLS enabled with admin/service access
*/

-- Pipeline Action Queue Table
CREATE TABLE IF NOT EXISTS pipeline_action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_params JSONB DEFAULT '{}',
  triggered_by TEXT NOT NULL DEFAULT 'system',
  triggered_by_user_id UUID REFERENCES admin_users(id),
  from_status TEXT,
  to_status TEXT,
  priority INTEGER DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_action_queue_status ON pipeline_action_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pipeline_action_queue_lead ON pipeline_action_queue(lead_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_action_queue_scheduled ON pipeline_action_queue(scheduled_at) WHERE status = 'pending';

ALTER TABLE pipeline_action_queue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage pipeline queue" ON pipeline_action_queue;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can manage pipeline queue" ON pipeline_action_queue
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Pipeline Action Logs Table
CREATE TABLE IF NOT EXISTS pipeline_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES pipeline_action_queue(id),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_params JSONB,
  execution_time_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  result JSONB,
  error_details TEXT,
  edge_function_called TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_action_logs_lead ON pipeline_action_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_action_logs_type ON pipeline_action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_pipeline_action_logs_created ON pipeline_action_logs(created_at DESC);

ALTER TABLE pipeline_action_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can view pipeline logs" ON pipeline_action_logs;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can view pipeline logs" ON pipeline_action_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Pipeline Stage Automations Configuration
CREATE TABLE IF NOT EXISTS pipeline_stage_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_status TEXT,
  to_status TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_config JSONB DEFAULT '{}',
  delay_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  requires_conditions JSONB,
  priority INTEGER DEFAULT 5,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_status, to_status, action_type)
);

ALTER TABLE pipeline_stage_automations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage stage automations" ON pipeline_stage_automations;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Admins can manage stage automations" ON pipeline_stage_automations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Insert default stage automations
INSERT INTO pipeline_stage_automations (from_status, to_status, action_type, action_config, description, priority) VALUES
  (NULL, 'NEW_LEAD', 'send_welcome_email', '{"template": "welcome_new_lead", "delay_minutes": 0}', 'Email de bienvenue pour nouveau lead', 10),
  ('NEW_LEAD', 'CONTACT_ATTEMPTED', 'update_last_contact', '{}', 'Mise a jour du dernier contact', 10),
  ('CONTACT_CONFIRMED', 'DOCUMENTS_REQUIRED', 'send_documents_request', '{"template": "request_documents", "documents": ["carte_pro", "permis", "carte_grise", "releve_info"]}', 'Envoi demande de documents', 9),
  ('DOCUMENTS_PARTIAL', 'READY_FOR_QUOTE', 'notify_commercial', '{"message": "Documents complets - pret pour devis"}', 'Notification commercial', 8),
  ('DOCUMENTS_REQUIRED', 'READY_FOR_QUOTE', 'notify_commercial', '{"message": "Documents complets - pret pour devis"}', 'Notification commercial', 8),
  ('READY_FOR_QUOTE', 'QUOTE_SENT', 'send_quote_email', '{"template": "quote_sent", "include_pdf": true}', 'Envoi du devis par email', 10),
  ('QUOTE_SENT', 'SIGNATURE_PENDING', 'send_signature_request', '{"template": "signature_request", "method": "electronic"}', 'Demande de signature electronique', 9),
  ('QUOTE_SENT', 'NO_RESPONSE', 'schedule_followup', '{"delay_hours": 48, "action": "send_followup"}', 'Programmer relance automatique', 7),
  ('NO_RESPONSE', 'RELANCE_ACTIVE', 'send_followup', '{"template": "followup_no_response", "urgency": "high"}', 'Email de relance', 9),
  ('SIGNATURE_PENDING', 'SIGNED', 'notify_signature_received', '{"notify_commercial": true, "update_timeline": true}', 'Notification signature recue', 10),
  ('SIGNED', 'DOWN_PAYMENT_REQUIRED', 'create_payment_link', '{"provider": "cic", "type": "down_payment"}', 'Creation lien paiement comptant CIC', 10),
  ('SIGNED', 'PAYMENT_PENDING', 'send_payment_instructions', '{"template": "payment_instructions", "type": "monthly"}', 'Instructions paiement mensuel', 9),
  ('DOWN_PAYMENT_REQUIRED', 'ACTIVE_CLIENT', 'send_contract_confirmation', '{"template": "contract_active", "include_attestation": true}', 'Confirmation contrat actif + attestation', 10),
  ('PAYMENT_PENDING', 'ACTIVE_CLIENT', 'send_contract_confirmation', '{"template": "contract_active", "include_attestation": true}', 'Confirmation contrat actif + attestation', 10),
  ('ACTIVE_CLIENT', 'SINISTER', 'create_sinister_file', '{"notify_team": true, "priority": "high"}', 'Creation dossier sinistre', 10),
  ('LOST_RECONTACT_SCHEDULED', 'NEW_LEAD', 'send_recontact_email', '{"template": "recontact_win_back"}', 'Email de reconquete', 8)
ON CONFLICT (from_status, to_status, action_type) DO UPDATE SET
  action_config = EXCLUDED.action_config,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Function to queue pipeline actions
CREATE OR REPLACE FUNCTION queue_pipeline_action(
  p_lead_id UUID,
  p_action_type TEXT,
  p_action_params JSONB DEFAULT '{}',
  p_from_status TEXT DEFAULT NULL,
  p_to_status TEXT DEFAULT NULL,
  p_triggered_by TEXT DEFAULT 'system',
  p_user_id UUID DEFAULT NULL,
  p_priority INTEGER DEFAULT 5,
  p_delay_minutes INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_id UUID;
BEGIN
  INSERT INTO pipeline_action_queue (
    lead_id,
    action_type,
    action_params,
    from_status,
    to_status,
    triggered_by,
    triggered_by_user_id,
    priority,
    scheduled_at
  ) VALUES (
    p_lead_id,
    p_action_type,
    p_action_params,
    p_from_status,
    p_to_status,
    p_triggered_by,
    p_user_id,
    p_priority,
    NOW() + (p_delay_minutes || ' minutes')::INTERVAL
  )
  RETURNING id INTO v_queue_id;
  
  RETURN v_queue_id;
END;
$$;

-- Function to process status change and trigger automations
CREATE OR REPLACE FUNCTION trigger_pipeline_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_automation RECORD;
  v_old_status TEXT;
  v_new_status TEXT;
BEGIN
  v_old_status := COALESCE(OLD.status::TEXT, 'NONE');
  v_new_status := NEW.status::TEXT;
  
  -- Skip if status hasn't changed
  IF v_old_status = v_new_status THEN
    RETURN NEW;
  END IF;
  
  -- Update updated_at
  NEW.updated_at := NOW();
  
  -- Find and queue matching automations
  FOR v_automation IN
    SELECT * FROM pipeline_stage_automations
    WHERE is_active = true
      AND to_status = v_new_status
      AND (from_status IS NULL OR from_status = v_old_status)
    ORDER BY priority DESC
  LOOP
    PERFORM queue_pipeline_action(
      NEW.id,
      v_automation.action_type,
      v_automation.action_config,
      v_old_status,
      v_new_status,
      'pipeline_trigger',
      NULL,
      v_automation.priority,
      COALESCE(v_automation.delay_minutes, 0)
    );
  END LOOP;
  
  -- Record state transition
  INSERT INTO crm_state_transitions (
    lead_id,
    from_state,
    to_state,
    triggered_by,
    transitioned_at
  ) VALUES (
    NEW.id,
    v_old_status::lead_status,
    v_new_status::lead_status,
    'PIPELINE',
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on crm_leads for status changes
DROP TRIGGER IF EXISTS trg_pipeline_automations ON crm_leads;
CREATE TRIGGER trg_pipeline_automations
  BEFORE UPDATE OF status ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_pipeline_automations();

-- Function to get pending actions for processing
CREATE OR REPLACE FUNCTION get_pending_pipeline_actions(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  lead_id UUID,
  action_type TEXT,
  action_params JSONB,
  from_status TEXT,
  to_status TEXT,
  priority INTEGER,
  lead_email TEXT,
  lead_phone TEXT,
  lead_first_name TEXT,
  lead_last_name TEXT,
  lead_full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    paq.id,
    paq.lead_id,
    paq.action_type,
    paq.action_params,
    paq.from_status,
    paq.to_status,
    paq.priority,
    cl.email AS lead_email,
    cl.phone AS lead_phone,
    cl.first_name AS lead_first_name,
    cl.last_name AS lead_last_name,
    COALESCE(cl.first_name || ' ' || cl.last_name, cl.email) AS lead_full_name
  FROM pipeline_action_queue paq
  JOIN crm_leads cl ON paq.lead_id = cl.id
  WHERE paq.status = 'pending'
    AND paq.scheduled_at <= NOW()
    AND paq.attempts < paq.max_attempts
  ORDER BY paq.priority DESC, paq.scheduled_at ASC
  LIMIT p_limit;
END;
$$;

-- Function to mark action as processing
CREATE OR REPLACE FUNCTION start_pipeline_action(p_action_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pipeline_action_queue
  SET 
    status = 'processing',
    started_at = NOW(),
    attempts = attempts + 1
  WHERE id = p_action_id
    AND status IN ('pending', 'failed');
  
  RETURN FOUND;
END;
$$;

-- Function to complete pipeline action
CREATE OR REPLACE FUNCTION complete_pipeline_action(
  p_action_id UUID,
  p_success BOOLEAN,
  p_result JSONB DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action RECORD;
BEGIN
  SELECT * INTO v_action FROM pipeline_action_queue WHERE id = p_action_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Update queue status
  UPDATE pipeline_action_queue
  SET 
    status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
    completed_at = NOW(),
    result = p_result,
    error_message = p_error
  WHERE id = p_action_id;
  
  -- Log the action
  INSERT INTO pipeline_action_logs (
    queue_id,
    lead_id,
    action_type,
    action_params,
    execution_time_ms,
    status,
    result,
    error_details
  ) VALUES (
    p_action_id,
    v_action.lead_id,
    v_action.action_type,
    v_action.action_params,
    EXTRACT(EPOCH FROM (NOW() - v_action.started_at)) * 1000,
    CASE WHEN p_success THEN 'success' ELSE 'failed' END,
    p_result,
    p_error
  );
  
  -- Update lead's last_contact_at for communication actions
  IF p_success AND v_action.action_type IN ('send_welcome_email', 'send_documents_request', 'send_quote_email', 'send_followup', 'send_signature_request', 'send_recontact_email') THEN
    UPDATE crm_leads
    SET last_contact_at = NOW()
    WHERE id = v_action.lead_id;
  END IF;
  
  -- Add timeline event
  INSERT INTO crm_timeline (
    lead_id,
    event_type,
    title,
    description,
    metadata,
    created_at
  ) VALUES (
    v_action.lead_id,
    CASE 
      WHEN v_action.action_type LIKE 'send_%' THEN 'email_sent'
      WHEN v_action.action_type LIKE 'create_%' THEN 'ai_decision'
      ELSE 'note'
    END,
    CASE WHEN p_success THEN 'Action automatique executee' ELSE 'Echec action automatique' END,
    v_action.action_type || ': ' || COALESCE(p_error, 'Success'),
    jsonb_build_object(
      'action_type', v_action.action_type,
      'from_status', v_action.from_status,
      'to_status', v_action.to_status,
      'success', p_success,
      'result', p_result
    ),
    NOW()
  );
END;
$$;

-- Function to get pipeline action stats
CREATE OR REPLACE FUNCTION get_pipeline_action_stats()
RETURNS TABLE (
  action_type TEXT,
  total_count BIGINT,
  success_count BIGINT,
  failed_count BIGINT,
  pending_count BIGINT,
  avg_execution_ms NUMERIC,
  success_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    paq.action_type,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE paq.status = 'completed') AS success_count,
    COUNT(*) FILTER (WHERE paq.status = 'failed') AS failed_count,
    COUNT(*) FILTER (WHERE paq.status = 'pending') AS pending_count,
    COALESCE(AVG(pal.execution_time_ms), 0) AS avg_execution_ms,
    CASE 
      WHEN COUNT(*) FILTER (WHERE paq.status IN ('completed', 'failed')) > 0 
      THEN ROUND(COUNT(*) FILTER (WHERE paq.status = 'completed')::NUMERIC / 
           COUNT(*) FILTER (WHERE paq.status IN ('completed', 'failed')) * 100, 2)
      ELSE 0 
    END AS success_rate
  FROM pipeline_action_queue paq
  LEFT JOIN pipeline_action_logs pal ON paq.id = pal.queue_id
  WHERE paq.created_at > NOW() - INTERVAL '30 days'
  GROUP BY paq.action_type
  ORDER BY total_count DESC;
END;
$$;

-- Add column to track automation execution on leads
DO $$ BEGIN
  ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS last_automation_at TIMESTAMPTZ;
  ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS automation_count INTEGER DEFAULT 0;
  ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS last_automation_result TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Create index for automation tracking
CREATE INDEX IF NOT EXISTS idx_crm_leads_last_automation ON crm_leads(last_automation_at DESC);

-- Cron to process pipeline action queue every minute
SELECT cron.unschedule('process-pipeline-actions') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-pipeline-actions'
);

SELECT cron.schedule(
  'process-pipeline-actions',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/pipeline-action-executor',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('action', 'process_queue', 'limit', 20)
  );
  $$
);
