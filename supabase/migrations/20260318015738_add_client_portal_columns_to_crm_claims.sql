/*
  # Add client portal columns to crm_claims

  ## Summary
  The crm_claims table is missing several columns required by the client portal
  (ClientSinistres.tsx). This migration adds:

  1. New Columns
    - `lead_id` (uuid, nullable) — FK to crm_leads, allows querying claims by lead
    - `incident_type` (text, nullable) — human-readable incident category
    - `incident_location` is already present; also aliases `location` is NOT added (use incident_location)
    - `third_party_involved` (boolean) — whether a third party was involved
    - `third_party_info` (text, nullable) — details about the third party
    - `police_report_number` (text, nullable) — PV number (string, separate from police_report_id uuid)
    - `reported_by` (text, nullable) — who reported: 'client' or 'commercial'

  2. Index
    - Index on lead_id for fast lookups

  3. Notes
    - `claim_status` is the authoritative status column (existing)
    - `claim_type` already exists and maps to incident_type values
    - We add `incident_type` as a separate free-text field for client-facing labels
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_claims' AND column_name = 'lead_id'
  ) THEN
    ALTER TABLE crm_claims ADD COLUMN lead_id uuid REFERENCES crm_leads(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_claims' AND column_name = 'incident_type'
  ) THEN
    ALTER TABLE crm_claims ADD COLUMN incident_type text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_claims' AND column_name = 'third_party_involved'
  ) THEN
    ALTER TABLE crm_claims ADD COLUMN third_party_involved boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_claims' AND column_name = 'third_party_info'
  ) THEN
    ALTER TABLE crm_claims ADD COLUMN third_party_info text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_claims' AND column_name = 'police_report_number'
  ) THEN
    ALTER TABLE crm_claims ADD COLUMN police_report_number text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_claims' AND column_name = 'reported_by'
  ) THEN
    ALTER TABLE crm_claims ADD COLUMN reported_by text DEFAULT 'commercial';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_claims_lead_id ON crm_claims(lead_id);
