/*
  # Système de Tracking d'Emails Complet (Remplacement Brevo)

  ## Nouvelles Tables

  ### 1. `email_sends`
  - `id` (uuid, primary key)
  - `lead_id` (uuid, référence vers leads)
  - `email_to` (text)
  - `email_from` (text)
  - `subject` (text)
  - `body_html` (text)
  - `body_text` (text)
  - `tracking_id` (uuid, unique) - Pour tracker cet email
  - `status` (text) - sent, delivered, bounced, failed
  - `sent_at` (timestamptz)
  - `delivered_at` (timestamptz)
  - `bounced_at` (timestamptz)
  - `bounce_reason` (text)
  - `metadata` (jsonb) - Infos supplémentaires

  ### 2. `email_opens`
  - `id` (uuid, primary key)
  - `email_send_id` (uuid, référence vers email_sends)
  - `tracking_id` (uuid, référence vers email_sends.tracking_id)
  - `opened_at` (timestamptz)
  - `ip_address` (text)
  - `user_agent` (text)
  - `location` (jsonb) - Pays, ville si disponible

  ### 3. `email_clicks`
  - `id` (uuid, primary key)
  - `email_send_id` (uuid, référence vers email_sends)
  - `tracking_id` (uuid)
  - `link_url` (text) - URL originale
  - `clicked_at` (timestamptz)
  - `ip_address` (text)
  - `user_agent` (text)

  ### 4. `email_replies`
  - `id` (uuid, primary key)
  - `email_send_id` (uuid, référence vers email_sends)
  - `lead_id` (uuid, référence vers leads)
  - `from_email` (text)
  - `subject` (text)
  - `body` (text)
  - `replied_at` (timestamptz)
  - `is_processed` (boolean)
  - `sentiment` (text) - positive, negative, neutral
  - `metadata` (jsonb)

  ## Sécurité
  - RLS activé sur toutes les tables
  - Policies pour admins et système
*/

-- Table des emails envoyés
CREATE TABLE IF NOT EXISTS email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  email_to text NOT NULL,
  email_from text NOT NULL DEFAULT 'team@taxiassur.com',
  subject text NOT NULL,
  body_html text,
  body_text text,
  tracking_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'bounced', 'failed', 'opened', 'clicked', 'replied')),
  sent_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  bounced_at timestamptz,
  bounce_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des ouvertures d'emails
CREATE TABLE IF NOT EXISTS email_opens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_send_id uuid REFERENCES email_sends(id) ON DELETE CASCADE,
  tracking_id uuid NOT NULL,
  opened_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  location jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table des clics sur liens
CREATE TABLE IF NOT EXISTS email_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_send_id uuid REFERENCES email_sends(id) ON DELETE CASCADE,
  tracking_id uuid NOT NULL,
  link_url text NOT NULL,
  clicked_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Table des réponses aux emails
CREATE TABLE IF NOT EXISTS email_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_send_id uuid REFERENCES email_sends(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  from_email text NOT NULL,
  subject text,
  body text,
  replied_at timestamptz DEFAULT now(),
  is_processed boolean DEFAULT false,
  sentiment text CHECK (sentiment IN ('positive', 'negative', 'neutral', 'unknown')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_email_sends_lead_id ON email_sends(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_tracking_id ON email_sends(tracking_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_sent_at ON email_sends(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_opens_email_send_id ON email_opens(email_send_id);
CREATE INDEX IF NOT EXISTS idx_email_opens_tracking_id ON email_opens(tracking_id);
CREATE INDEX IF NOT EXISTS idx_email_opens_opened_at ON email_opens(opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_clicks_email_send_id ON email_clicks(email_send_id);
CREATE INDEX IF NOT EXISTS idx_email_clicks_tracking_id ON email_clicks(tracking_id);
CREATE INDEX IF NOT EXISTS idx_email_clicks_clicked_at ON email_clicks(clicked_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_replies_lead_id ON email_replies(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_replies_is_processed ON email_replies(is_processed);
CREATE INDEX IF NOT EXISTS idx_email_replies_replied_at ON email_replies(replied_at DESC);

-- RLS Policies
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_opens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_replies ENABLE ROW LEVEL SECURITY;

-- Policies pour email_sends
CREATE POLICY "Admins can view all email sends"
  ON email_sends FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "System can insert email sends"
  ON email_sends FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update email sends"
  ON email_sends FOR UPDATE
  TO authenticated
  USING (true);

-- Policies pour email_opens
CREATE POLICY "Admins can view email opens"
  ON email_opens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Public can track opens"
  ON email_opens FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policies pour email_clicks
CREATE POLICY "Admins can view email clicks"
  ON email_clicks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Public can track clicks"
  ON email_clicks FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policies pour email_replies
CREATE POLICY "Admins can view email replies"
  ON email_replies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "System can insert email replies"
  ON email_replies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update email replies"
  ON email_replies FOR UPDATE
  TO authenticated
  USING (true);

-- Fonction pour mettre à jour le statut de l'email
CREATE OR REPLACE FUNCTION update_email_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour le statut de l'email quand il y a une ouverture
  IF TG_TABLE_NAME = 'email_opens' THEN
    UPDATE email_sends
    SET status = 'opened', updated_at = now()
    WHERE tracking_id = NEW.tracking_id
    AND status = 'sent';
  END IF;

  -- Mettre à jour le statut de l'email quand il y a un clic
  IF TG_TABLE_NAME = 'email_clicks' THEN
    UPDATE email_sends
    SET status = 'clicked', updated_at = now()
    WHERE tracking_id = NEW.tracking_id
    AND status IN ('sent', 'opened');
  END IF;

  -- Mettre à jour le statut de l'email quand il y a une réponse
  IF TG_TABLE_NAME = 'email_replies' THEN
    UPDATE email_sends
    SET status = 'replied', updated_at = now()
    WHERE id = NEW.email_send_id
    AND status IN ('sent', 'opened', 'clicked');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers pour mise à jour automatique du statut
DROP TRIGGER IF EXISTS trigger_update_status_on_open ON email_opens;
CREATE TRIGGER trigger_update_status_on_open
  AFTER INSERT ON email_opens
  FOR EACH ROW
  EXECUTE FUNCTION update_email_status();

DROP TRIGGER IF EXISTS trigger_update_status_on_click ON email_clicks;
CREATE TRIGGER trigger_update_status_on_click
  AFTER INSERT ON email_clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_email_status();

DROP TRIGGER IF EXISTS trigger_update_status_on_reply ON email_replies;
CREATE TRIGGER trigger_update_status_on_reply
  AFTER INSERT ON email_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_email_status();

-- Vue pour statistiques rapides
CREATE OR REPLACE VIEW email_stats AS
SELECT
  es.id,
  es.tracking_id,
  es.lead_id,
  es.email_to,
  es.subject,
  es.status,
  es.sent_at,
  COUNT(DISTINCT eo.id) as open_count,
  COUNT(DISTINCT ec.id) as click_count,
  MAX(eo.opened_at) as last_opened_at,
  MAX(ec.clicked_at) as last_clicked_at,
  CASE WHEN COUNT(DISTINCT eo.id) > 0 THEN true ELSE false END as was_opened,
  CASE WHEN COUNT(DISTINCT ec.id) > 0 THEN true ELSE false END as was_clicked
FROM email_sends es
LEFT JOIN email_opens eo ON es.id = eo.email_send_id
LEFT JOIN email_clicks ec ON es.id = ec.email_send_id
GROUP BY es.id, es.tracking_id, es.lead_id, es.email_to, es.subject, es.status, es.sent_at;