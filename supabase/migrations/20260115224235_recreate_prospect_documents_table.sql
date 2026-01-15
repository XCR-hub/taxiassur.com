/*
  # Recreate prospect_documents table
  
  1. New Tables
    - `prospect_documents`
      - `id` (uuid, primary key)
      - `lead_id` (uuid, references crm_leads)
      - `document_type` (text)
      - `file_name` (text)
      - `file_path` (text)
      - `file_size` (bigint)
      - `mime_type` (text)
      - `status` (text)
      - `uploaded_by` (text)
      - `uploaded_at` (timestamptz)
      - `validated_by` (text)
      - `validated_at` (timestamptz)
      - `rejection_reason` (text)
      - `notes` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `prospect_documents` table
    - Allow public access via valid access_token
    - Allow authenticated admins full access
*/

-- Create prospect_documents table
CREATE TABLE IF NOT EXISTS prospect_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  status text DEFAULT 'pending',
  uploaded_by text,
  uploaded_at timestamptz DEFAULT now(),
  validated_by text,
  validated_at timestamptz,
  rejection_reason text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE prospect_documents ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prospect_documents_lead_id ON prospect_documents(lead_id);
CREATE INDEX IF NOT EXISTS idx_prospect_documents_document_type ON prospect_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_prospect_documents_status ON prospect_documents(status);
CREATE INDEX IF NOT EXISTS idx_prospect_documents_uploaded_at ON prospect_documents(uploaded_at DESC);

-- RLS Policies
CREATE POLICY "Public can insert prospect documents with valid token"
  ON prospect_documents
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = lead_id
      AND crm_leads.access_token IS NOT NULL
    )
  );

CREATE POLICY "Public can read own prospect documents with valid token"
  ON prospect_documents
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = lead_id
      AND crm_leads.access_token IS NOT NULL
    )
  );

CREATE POLICY "Public can update own prospect documents with valid token"
  ON prospect_documents
  FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = lead_id
      AND crm_leads.access_token IS NOT NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = lead_id
      AND crm_leads.access_token IS NOT NULL
    )
  );

CREATE POLICY "Authenticated admins can read all prospect documents"
  ON prospect_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Authenticated admins can update prospect documents"
  ON prospect_documents
  FOR UPDATE
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

CREATE POLICY "Authenticated admins can delete prospect documents"
  ON prospect_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Service role full access"
  ON prospect_documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_prospect_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prospect_documents_updated_at
  BEFORE UPDATE ON prospect_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_prospect_documents_updated_at();
