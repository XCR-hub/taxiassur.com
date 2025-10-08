-- Système de Tracking Automation Backlinks
--
-- 1. Nouvelles Tables
--    - backlink_campaigns : Campagnes d'outreach automatisées
--    - backlink_outreach_log : Log des actions d'outreach
--
-- 2. Security
--    - Enable RLS on both tables
--    - Add policies for authenticated access

-- Table des campagnes de backlinks
CREATE TABLE IF NOT EXISTS backlink_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  target_count integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  opened_count integer DEFAULT 0,
  replied_count integer DEFAULT 0,
  positive_count integer DEFAULT 0,
  negative_count integer DEFAULT 0,
  backlinks_acquired integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des logs d'outreach
CREATE TABLE IF NOT EXISTS backlink_outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES backlink_campaigns(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES backlink_opportunities(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('email_sent', 'email_opened', 'email_replied', 'backlink_verified', 'follow_up_sent')),
  recipient_email text NOT NULL,
  subject text,
  message_sent text,
  message_received text,
  sentiment text CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE backlink_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlink_outreach_log ENABLE ROW LEVEL SECURITY;

-- Policies pour backlink_campaigns
CREATE POLICY "Public can view campaigns"
  ON backlink_campaigns FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated can manage campaigns"
  ON backlink_campaigns FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies pour backlink_outreach_log
CREATE POLICY "Public can view outreach logs"
  ON backlink_outreach_log FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated can manage outreach logs"
  ON backlink_outreach_log FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_backlink_campaigns_status ON backlink_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_campaign ON backlink_outreach_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_opportunity ON backlink_outreach_log(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_action ON backlink_outreach_log(action_type);
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_date ON backlink_outreach_log(created_at DESC);