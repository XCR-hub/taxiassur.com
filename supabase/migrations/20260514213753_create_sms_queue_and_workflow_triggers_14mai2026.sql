/*
  # Create SMS Queue and Automated SMS Workflow

  1. New Tables
    - `sms_queue`
      - `id` (uuid, primary key)
      - `lead_id` (uuid, nullable, FK to crm_leads)
      - `recipient` (text, phone number)
      - `template_key` (text, template identifier)
      - `content` (text, optional raw content)
      - `variables` (jsonb, template variables)
      - `status` (text: pending, processing, sent, failed)
      - `priority` (integer, 1=high)
      - `scheduled_for` (timestamptz)
      - `sent_at` (timestamptz)
      - `attempts` (integer)
      - `error_message` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

  2. Functions
    - `enqueue_sms_for_lead()` - Enqueues SMS when notification_queue gets an email entry
    - `enqueue_sms_on_new_lead()` - Trigger on new lead creation to send SMS

  3. Security
    - Enable RLS on `sms_queue`
    - Policy for authenticated admin users
    - Service role full access

  4. Cron
    - Process SMS queue every minute via edge function

  5. Notes
    - SMS are sent in parallel with emails for maximum engagement
    - Only sends SMS to prospect (not to team emails) for cost efficiency
    - Team notifications go to commercial phone numbers
*/

-- Create SMS queue table
CREATE TABLE IF NOT EXISTS sms_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL,
  recipient text NOT NULL,
  template_key text NOT NULL,
  content text,
  variables jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  priority integer NOT NULL DEFAULT 5,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  attempts integer DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add constraint on status
ALTER TABLE sms_queue ADD CONSTRAINT sms_queue_status_check
  CHECK (status IN ('pending', 'processing', 'sent', 'failed'));

-- Create indexes for queue processing
CREATE INDEX IF NOT EXISTS idx_sms_queue_status_scheduled
  ON sms_queue(status, scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_sms_queue_lead_id
  ON sms_queue(lead_id)
  WHERE lead_id IS NOT NULL;

-- Enable RLS
ALTER TABLE sms_queue ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated admin users can manage SMS queue"
  ON sms_queue FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to SMS queue"
  ON sms_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to automatically enqueue SMS when an email notification is queued
CREATE OR REPLACE FUNCTION enqueue_sms_for_lead_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_lead_id uuid;
  v_vars jsonb;
  v_template text;
  v_team_phone text := '0180855786';
BEGIN
  -- Only process prospect-facing email templates (not internal team ones)
  v_template := NEW.template_key;
  v_vars := COALESCE(NEW.variables, '{}'::jsonb);
  v_lead_id := NEW.lead_id;

  -- Get lead phone number
  IF v_lead_id IS NOT NULL THEN
    SELECT phone INTO v_phone
    FROM crm_leads
    WHERE id = v_lead_id;
  END IF;

  -- If no phone from lead, try variables
  IF v_phone IS NULL OR v_phone = '' THEN
    v_phone := v_vars->>'lead_phone';
  END IF;

  -- Skip if no phone number available
  IF v_phone IS NULL OR v_phone = '' THEN
    RETURN NEW;
  END IF;

  -- Enqueue SMS for prospect-facing templates
  IF v_template IN (
    'new_lead_prospect',
    'new_lead_confirmation',
    'relance_documents',
    'document_reminder',
    'quote_ready',
    'devis_envoye',
    'relance_devis',
    'quote_reminder',
    'relance_paiement',
    'payment_reminder',
    'relance_signature',
    'signature_reminder',
    'welcome_client',
    'client_actif'
  ) THEN
    INSERT INTO sms_queue (
      lead_id,
      recipient,
      template_key,
      variables,
      status,
      priority,
      scheduled_for
    ) VALUES (
      v_lead_id,
      v_phone,
      v_template,
      v_vars,
      'pending',
      NEW.priority,
      NOW()
    );
  END IF;

  -- For team notifications, send SMS to commercial phone
  IF v_template IN ('new_lead_team', 'new_lead_commercial') THEN
    INSERT INTO sms_queue (
      lead_id,
      recipient,
      template_key,
      variables,
      status,
      priority,
      scheduled_for
    ) VALUES (
      v_lead_id,
      v_team_phone,
      v_template,
      v_vars,
      'pending',
      1,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: when email is queued, also queue SMS
DROP TRIGGER IF EXISTS trg_enqueue_sms_on_email ON notification_queue;
CREATE TRIGGER trg_enqueue_sms_on_email
  AFTER INSERT ON notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_sms_for_lead_notification();

-- Function to enqueue SMS directly on new lead creation (backup path)
CREATE OR REPLACE FUNCTION enqueue_sms_new_lead_direct()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access_token text;
  v_upload_link text;
  v_first_name text;
BEGIN
  -- Only on INSERT (new leads)
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Skip if no phone
  IF NEW.phone IS NULL OR NEW.phone = '' THEN
    RETURN NEW;
  END IF;

  -- Get access token
  v_access_token := NEW.access_token;
  IF v_access_token IS NULL OR v_access_token = '' THEN
    v_access_token := encode(gen_random_bytes(32), 'hex');
    UPDATE crm_leads SET access_token = v_access_token WHERE id = NEW.id;
  END IF;

  v_upload_link := 'https://taxiassur.com/espace-prospect?token=' || v_access_token;
  v_first_name := COALESCE(
    split_part(COALESCE(NEW.first_name, NEW.name, ''), ' ', 1),
    'Prospect'
  );

  -- Check if SMS already queued via notification_queue trigger
  IF NOT EXISTS (
    SELECT 1 FROM sms_queue
    WHERE lead_id = NEW.id
    AND template_key = 'new_lead_prospect'
    AND created_at > NOW() - interval '2 minutes'
  ) THEN
    -- SMS to prospect
    INSERT INTO sms_queue (lead_id, recipient, template_key, variables, priority, scheduled_for)
    VALUES (
      NEW.id,
      NEW.phone,
      'new_lead_prospect',
      jsonb_build_object(
        'first_name', v_first_name,
        'lead_name', COALESCE(NEW.first_name, NEW.name, ''),
        'lead_phone', NEW.phone,
        'lead_email', NEW.email,
        'lead_city', COALESCE(NEW.city, ''),
        'upload_link', v_upload_link,
        'prospect_link', v_upload_link
      ),
      1,
      NOW()
    );

    -- SMS to commercial team
    INSERT INTO sms_queue (lead_id, recipient, template_key, variables, priority, scheduled_for)
    VALUES (
      NEW.id,
      '0180855786',
      'new_lead_team',
      jsonb_build_object(
        'lead_name', COALESCE(NEW.first_name, NEW.name, ''),
        'lead_phone', NEW.phone,
        'lead_email', COALESCE(NEW.email, ''),
        'lead_city', COALESCE(NEW.city, '')
      ),
      1,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on crm_leads for direct SMS on new leads
DROP TRIGGER IF EXISTS trg_sms_new_lead_direct ON crm_leads;
CREATE TRIGGER trg_sms_new_lead_direct
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_sms_new_lead_direct();

-- Cron job to process SMS queue every minute
SELECT cron.schedule(
  'process-sms-queue-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/process-sms-queue',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
