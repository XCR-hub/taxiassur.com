/*
  # Système Intégrations Cloud

  1. Tables
    - integrations - Config intégrations (Calendly, Stripe, Make, Zapier)
    - integration_webhooks - Webhooks entrants
    - integration_actions - Actions sortantes
    - integration_logs - Logs d'activité

  2. Intégrations supportées
    - Calendly (prise RDV automatique)
    - Stripe (paiements)
    - Make.com (automations)
    - Zapier (workflows)
    - Twilio (SMS/Calls déjà existant)
*/

CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  category text, -- scheduling, payment, automation, communication
  enabled boolean DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  api_key_encrypted text,
  webhook_url text,
  webhook_secret text,
  last_sync_at timestamptz,
  sync_status text DEFAULT 'idle',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integration_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES integrations(id),
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integration_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES integrations(id),
  user_id uuid REFERENCES auth.users(id),
  action_type text NOT NULL,
  payload jsonb NOT NULL,
  status text DEFAULT 'pending',
  response jsonb,
  error_message text,
  retry_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  executed_at timestamptz
);

CREATE TABLE IF NOT EXISTS integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES integrations(id),
  log_level text DEFAULT 'info',
  message text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_integration ON integration_webhooks(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_processed ON integration_webhooks(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_integration_actions_integration ON integration_actions(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_actions_status ON integration_actions(status);
CREATE INDEX IF NOT EXISTS idx_integration_logs_integration ON integration_logs(integration_id);

-- RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage integrations" ON integrations FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));
CREATE POLICY "Admins view webhooks" ON integration_webhooks FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));
CREATE POLICY "System create webhooks" ON integration_webhooks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users view own actions" ON integration_actions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users create actions" ON integration_actions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins view logs" ON integration_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

-- Insérer intégrations par défaut
INSERT INTO integrations (name, display_name, description, category) VALUES
('calendly', 'Calendly', 'Prise de rendez-vous automatique', 'scheduling'),
('stripe', 'Stripe', 'Traitement des paiements', 'payment'),
('make', 'Make.com', 'Automations avancées', 'automation'),
('zapier', 'Zapier', 'Connexions multi-apps', 'automation')
ON CONFLICT (name) DO NOTHING;
