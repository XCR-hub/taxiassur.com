/*
  # Tables pour Webhooks Twilio

  1. Nouvelle table `sms_logs`
    - Enregistre tous les SMS envoyés avec leur statut
    
  2. Nouvelle table `sms_received`
    - Enregistre les SMS reçus (réponses clients)

  3. Security
    - Enable RLS on both tables
    - Add policies for service role
*/

-- Table pour logs d'envoi SMS
CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_sid text UNIQUE NOT NULL,
  to_number text NOT NULL,
  from_number text,
  message_body text,
  status text DEFAULT 'queued',
  error_code text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_sms_logs_message_sid ON sms_logs(message_sid);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);

-- Table pour SMS reçus
CREATE TABLE IF NOT EXISTS sms_received (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_sid text UNIQUE NOT NULL,
  from_number text NOT NULL,
  to_number text NOT NULL,
  message_body text NOT NULL,
  raw_data jsonb DEFAULT '{}'::jsonb,
  processed boolean DEFAULT false,
  received_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_sms_received_from_number ON sms_received(from_number);
CREATE INDEX IF NOT EXISTS idx_sms_received_processed ON sms_received(processed);
CREATE INDEX IF NOT EXISTS idx_sms_received_received_at ON sms_received(received_at DESC);

-- Enable RLS
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_received ENABLE ROW LEVEL SECURITY;

-- Policies pour sms_logs (service role seulement)
DROP POLICY IF EXISTS "Service role can manage sms logs" ON sms_logs;
CREATE POLICY "Service role can manage sms logs"
  ON sms_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view sms logs" ON sms_logs;
CREATE POLICY "Authenticated users can view sms logs"
  ON sms_logs FOR SELECT
  TO authenticated
  USING (true);

-- Policies pour sms_received
DROP POLICY IF EXISTS "Service role can manage received sms" ON sms_received;
CREATE POLICY "Service role can manage received sms"
  ON sms_received FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view received sms" ON sms_received;
CREATE POLICY "Authenticated users can view received sms"
  ON sms_received FOR SELECT
  TO authenticated
  USING (true);

-- Function pour auto-update updated_at
CREATE OR REPLACE FUNCTION update_sms_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sms_logs_updated_at_trigger ON sms_logs;
CREATE TRIGGER update_sms_logs_updated_at_trigger
  BEFORE UPDATE ON sms_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_logs_updated_at();
