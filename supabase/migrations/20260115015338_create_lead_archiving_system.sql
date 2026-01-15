/*
  # Create Lead Archiving and Secure Delete System

  1. New Tables
    - `crm_deleted_leads` - Archive deleted leads for audit

  2. Changes
    - Add `is_archived` column to crm_leads
    - Add RLS policies for archived leads

  3. Security
    - Enable RLS on crm_deleted_leads
    - Only admins can delete/archive leads
*/

-- Add is_archived column to crm_leads if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_leads' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE crm_leads ADD COLUMN is_archived boolean DEFAULT false;
  END IF;
END $$;

-- Create crm_deleted_leads table
CREATE TABLE IF NOT EXISTS crm_deleted_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_lead_id uuid NOT NULL,
  lead_data jsonb NOT NULL,
  deleted_reason text NOT NULL,
  deleted_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add index for archived leads
CREATE INDEX IF NOT EXISTS idx_crm_leads_archived ON crm_leads(is_archived) WHERE is_archived = true;

-- Add index for deleted leads lookups
CREATE INDEX IF NOT EXISTS idx_crm_deleted_leads_original_id ON crm_deleted_leads(original_lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_deleted_leads_deleted_at ON crm_deleted_leads(deleted_at DESC);

-- Enable RLS on crm_deleted_leads
ALTER TABLE crm_deleted_leads ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view deleted leads
DROP POLICY IF EXISTS "Admins can view deleted leads" ON crm_deleted_leads;
CREATE POLICY "Admins can view deleted leads"
  ON crm_deleted_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('admin', 'superadmin')
    )
  );

-- Policy: Admins can insert deleted leads
DROP POLICY IF EXISTS "Admins can archive leads" ON crm_deleted_leads;
CREATE POLICY "Admins can archive leads"
  ON crm_deleted_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('admin', 'superadmin', 'commercial')
    )
  );

-- Update RLS policy for crm_leads to hide archived leads by default
DROP POLICY IF EXISTS "Admin users can view all leads" ON crm_leads;
CREATE POLICY "Admin users can view all leads"
  ON crm_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
    AND (is_archived = false OR is_archived IS NULL)
  );

-- Policy to view archived leads only when explicitly requested
DROP POLICY IF EXISTS "Admin users can view archived leads" ON crm_leads;
CREATE POLICY "Admin users can view archived leads"
  ON crm_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role IN ('admin', 'superadmin')
    )
    AND is_archived = true
  );

-- Function to get deleted leads stats
CREATE OR REPLACE FUNCTION get_deleted_leads_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_deleted', COUNT(*),
    'last_30_days', COUNT(*) FILTER (WHERE deleted_at > now() - interval '30 days'),
    'by_reason', jsonb_agg(
      jsonb_build_object(
        'reason', deleted_reason,
        'count', reason_count
      )
    )
  ) INTO result
  FROM (
    SELECT
      deleted_reason,
      COUNT(*) as reason_count
    FROM crm_deleted_leads
    GROUP BY deleted_reason
  ) reasons;

  RETURN result;
END;
$$;

-- Comment the tables
COMMENT ON TABLE crm_deleted_leads IS 'Archive des leads supprimés pour audit et traçabilité';
COMMENT ON COLUMN crm_leads.is_archived IS 'Indique si le lead est archivé (soft delete)';
