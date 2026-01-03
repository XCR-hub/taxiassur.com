/*
  # Système de Tracking Email Backlinks avec Brevo

  1. Nouvelles Tables
    - `backlink_email_campaigns` - Campagnes d'outreach email
    - `backlink_email_tracking` - Tracking détaillé des emails

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated admin users only

  3. Indexes
    - Performance indexes pour tracking rapide
*/

-- Create campaigns table
CREATE TABLE IF NOT EXISTS backlink_email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  total_sent int DEFAULT 0,
  total_opened int DEFAULT 0,
  total_clicked int DEFAULT 0,
  total_replied int DEFAULT 0,
  total_backlinks int DEFAULT 0,
  conversion_rate numeric(5,2) DEFAULT 0.0
);

-- Create email tracking table (sans foreign key vers backlink_prospects qui n'existe pas)
CREATE TABLE IF NOT EXISTS backlink_email_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES backlink_email_campaigns(id) ON DELETE CASCADE,
  prospect_website text,
  recipient_email text NOT NULL,
  recipient_name text,
  recipient_domain text,
  subject text NOT NULL,
  content text,
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  bounced_at timestamptz,
  backlink_obtained boolean DEFAULT false,
  backlink_url text,
  brevo_message_id text UNIQUE,
  brevo_event_data jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'clicked', 'replied', 'bounced', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE backlink_email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlink_email_tracking ENABLE ROW LEVEL SECURITY;

-- Policies for campaigns
CREATE POLICY "Admins can view all campaigns"
  ON backlink_email_campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can create campaigns"
  ON backlink_email_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update campaigns"
  ON backlink_email_campaigns FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('super_admin', 'admin')
    )
  );

-- Policies for email tracking
CREATE POLICY "Admins can view all email tracking"
  ON backlink_email_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can create email tracking"
  ON backlink_email_tracking FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update email tracking"
  ON backlink_email_tracking FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('super_admin', 'admin')
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_tracking_campaign ON backlink_email_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_status ON backlink_email_tracking(status);
CREATE INDEX IF NOT EXISTS idx_email_tracking_sent_at ON backlink_email_tracking(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_tracking_brevo_id ON backlink_email_tracking(brevo_message_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_recipient ON backlink_email_tracking(recipient_email);

-- Function to update campaign stats
CREATE OR REPLACE FUNCTION update_campaign_stats(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE backlink_email_campaigns
  SET
    total_sent = (SELECT COUNT(*) FROM backlink_email_tracking WHERE campaign_id = p_campaign_id),
    total_opened = (SELECT COUNT(*) FROM backlink_email_tracking WHERE campaign_id = p_campaign_id AND opened_at IS NOT NULL),
    total_clicked = (SELECT COUNT(*) FROM backlink_email_tracking WHERE campaign_id = p_campaign_id AND clicked_at IS NOT NULL),
    total_replied = (SELECT COUNT(*) FROM backlink_email_tracking WHERE campaign_id = p_campaign_id AND replied_at IS NOT NULL),
    total_backlinks = (SELECT COUNT(*) FROM backlink_email_tracking WHERE campaign_id = p_campaign_id AND backlink_obtained = true),
    conversion_rate = CASE
      WHEN (SELECT COUNT(*) FROM backlink_email_tracking WHERE campaign_id = p_campaign_id) > 0
      THEN ((SELECT COUNT(*) FROM backlink_email_tracking WHERE campaign_id = p_campaign_id AND backlink_obtained = true)::numeric /
            (SELECT COUNT(*) FROM backlink_email_tracking WHERE campaign_id = p_campaign_id)::numeric * 100)
      ELSE 0
    END,
    updated_at = now()
  WHERE id = p_campaign_id;
END;
$$;

-- Trigger to auto-update campaign stats
CREATE OR REPLACE FUNCTION trigger_update_campaign_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM update_campaign_stats(NEW.campaign_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_campaign_stats_on_email_change
AFTER INSERT OR UPDATE ON backlink_email_tracking
FOR EACH ROW
EXECUTE FUNCTION trigger_update_campaign_stats();