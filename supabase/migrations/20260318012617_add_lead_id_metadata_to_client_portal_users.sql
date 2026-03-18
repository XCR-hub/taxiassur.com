/*
  # Add lead_id and metadata columns to client_portal_users

  1. Changes
    - Add `lead_id` (uuid, nullable) column referencing crm_leads.id
    - Add `metadata` (jsonb) column with empty default
    - Add index on lead_id for faster lookups

  2. Notes
    - Both columns are nullable to avoid breaking existing rows
    - The lead_id links a portal user to their CRM lead record
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_portal_users' AND column_name = 'lead_id'
  ) THEN
    ALTER TABLE client_portal_users ADD COLUMN lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_portal_users' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE client_portal_users ADD COLUMN metadata jsonb DEFAULT '{}';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_client_portal_users_lead_id ON client_portal_users(lead_id);
