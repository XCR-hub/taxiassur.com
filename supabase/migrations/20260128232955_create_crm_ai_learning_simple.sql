/*
  # IA Autoapprenante CRM - Version simplifiée

  Capture tous les événements commerciaux pour apprentissage et suggestions automatiques
*/

-- Table des événements commerciaux
CREATE TABLE IF NOT EXISTS crm_ai_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  action text NOT NULL,
  lead_id uuid REFERENCES crm_leads(id) ON DELETE CASCADE,
  user_id uuid,
  event_data jsonb DEFAULT '{}',
  before_state jsonb,
  after_state jsonb,
  occurred_at timestamptz DEFAULT now(),
  day_of_week integer,
  hour_of_day integer,
  led_to_conversion boolean DEFAULT false,
  next_stage text,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Table des patterns détectés
CREATE TABLE IF NOT EXISTS crm_ai_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name text NOT NULL,
  pattern_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  confidence_score numeric(5,2) NOT NULL,
  success_rate numeric(5,2) NOT NULL,
  sample_size integer NOT NULL,
  conditions jsonb DEFAULT '[]',
  pattern_definition jsonb DEFAULT '{}',
  status text DEFAULT 'detected',
  times_observed integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Table des suggestions
CREATE TABLE IF NOT EXISTS crm_ai_workflow_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  trigger_event text NOT NULL,
  trigger_conditions jsonb DEFAULT '{}',
  suggested_actions jsonb DEFAULT '[]',
  predicted_success_rate numeric(5,2),
  workflow_priority integer DEFAULT 5,
  status text DEFAULT 'suggested',
  times_triggered integer DEFAULT 0,
  times_successful integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_ai_events_lead ON crm_ai_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_ai_events_occurred ON crm_ai_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_ai_events_unprocessed ON crm_ai_events(processed) WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_crm_ai_patterns_status ON crm_ai_patterns(status);
CREATE INDEX IF NOT EXISTS idx_crm_ai_patterns_score ON crm_ai_patterns(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_crm_ai_suggestions_status ON crm_ai_workflow_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_crm_ai_suggestions_priority ON crm_ai_workflow_suggestions(workflow_priority DESC);

-- RLS
ALTER TABLE crm_ai_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_ai_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_ai_workflow_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read events" ON crm_ai_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "System insert events" ON crm_ai_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth read patterns" ON crm_ai_patterns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage patterns" ON crm_ai_patterns FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth read suggestions" ON crm_ai_workflow_suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth manage suggestions" ON crm_ai_workflow_suggestions FOR ALL TO authenticated USING (true);

-- Stats
CREATE OR REPLACE FUNCTION get_crm_ai_learning_stats()
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'events_captured', (SELECT COUNT(*) FROM crm_ai_events),
    'events_analyzed', (SELECT COUNT(*) FROM crm_ai_events WHERE processed = true),
    'patterns_detected', (SELECT COUNT(*) FROM crm_ai_patterns),
    'suggestions_pending', (SELECT COUNT(*) FROM crm_ai_workflow_suggestions WHERE status = 'suggested'),
    'suggestions_active', (SELECT COUNT(*) FROM crm_ai_workflow_suggestions WHERE status = 'implemented')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Capturer les changements leads
CREATE OR REPLACE FUNCTION capture_lead_ai_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO crm_ai_events (
    event_type,
    action,
    lead_id,
    event_data,
    before_state,
    after_state,
    day_of_week,
    hour_of_day,
    led_to_conversion,
    next_stage
  ) VALUES (
    'pipeline',
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN OLD.status != NEW.status THEN 'status_changed'
      ELSE 'updated'
    END,
    NEW.id,
    jsonb_build_object(
      'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      'new_status', NEW.status
    ),
    CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
    row_to_json(NEW)::jsonb,
    EXTRACT(ISODOW FROM now())::integer,
    EXTRACT(HOUR FROM now())::integer,
    NEW.status IN ('CLIENT_ACTIF', 'CONTRAT_SIGNATURE'),
    NEW.status
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_capture_lead_ai ON crm_leads;
CREATE TRIGGER trigger_capture_lead_ai
  AFTER INSERT OR UPDATE ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION capture_lead_ai_event();

-- Capturer les emails
CREATE OR REPLACE FUNCTION capture_email_ai_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    INSERT INTO crm_ai_events (
      event_type,
      action,
      lead_id,
      event_data,
      day_of_week,
      hour_of_day
    ) VALUES (
      'email',
      NEW.direction,
      NEW.lead_id,
      jsonb_build_object(
        'from', NEW.from_email,
        'subject', NEW.subject,
        'has_attachments', (NEW.attachments IS NOT NULL AND jsonb_array_length(NEW.attachments) > 0)
      ),
      EXTRACT(ISODOW FROM NEW.received_at)::integer,
      EXTRACT(HOUR FROM NEW.received_at)::integer
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_capture_email_ai ON email_messages;
CREATE TRIGGER trigger_capture_email_ai
  AFTER INSERT ON email_messages
  FOR EACH ROW
  EXECUTE FUNCTION capture_email_ai_event();
