-- ══════════════════════════════════════════════════════════════════
--  CRÉER TABLE BACKLINK_OUTREACH (Emails Sortants)
-- ══════════════════════════════════════════════════════════════════

-- Table pour tracer tous les emails envoyés
CREATE TABLE IF NOT EXISTS backlink_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES backlink_opportunities(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES backlink_campaigns(id) ON DELETE CASCADE,
  template_used text NOT NULL,
  email_subject text NOT NULL,
  email_body text NOT NULL,
  recipient_email text NOT NULL,
  follow_up_number integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'replied')),
  sent_at timestamptz,
  replied_at timestamptz,
  reply_content text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_opportunity ON backlink_outreach(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_campaign ON backlink_outreach(campaign_id);
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_status ON backlink_outreach(status);
CREATE INDEX IF NOT EXISTS idx_backlink_outreach_sent_at ON backlink_outreach(sent_at);

-- RLS
ALTER TABLE backlink_outreach ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backlink outreach readable by all"
  ON backlink_outreach FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Backlink outreach writable by authenticated"
  ON backlink_outreach FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER update_backlink_outreach_updated_at
  BEFORE UPDATE ON backlink_outreach
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Vérification
SELECT 
  '✅ TABLE BACKLINK_OUTREACH CRÉÉE' as resultat,
  COUNT(*) as nb_colonnes
FROM information_schema.columns
WHERE table_name = 'backlink_outreach';
