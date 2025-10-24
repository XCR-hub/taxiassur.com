-- Create Leads Management System
-- This migration creates a comprehensive system for managing leads from the TaxiAssur website

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  status text DEFAULT 'taxi',
  immatriculation text,
  fingerprint text,
  behavior_score integer DEFAULT 0,
  time_on_page integer DEFAULT 0,
  source text DEFAULT 'website_form',
  lead_status text DEFAULT 'new',
  emails_sent integer DEFAULT 0,
  last_email_sent_at timestamptz,
  conversion_date timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('taxi', 'vtc', 'autre')),
  CONSTRAINT valid_lead_status CHECK (lead_status IN ('new', 'contacted', 'interested', 'converted', 'lost')),
  CONSTRAINT valid_behavior_score CHECK (behavior_score >= 0 AND behavior_score <= 100)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_lead_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (full access)
CREATE POLICY "Service role has full access to leads"
  ON leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
