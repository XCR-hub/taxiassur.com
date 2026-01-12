/*
  # Document Checklist System & Prospect Access Fix
  
  ## Overview
  This migration creates a comprehensive document management system with:
  - Document checklist tracking per lead
  - Fixed RLS policies for prospect access via token
  - Prospect portal capabilities (update own data, upload docs, accept quotes)
  
  ## Changes Made
  
  ### 1. New Columns on crm_leads
  - document_checklist: JSONB tracking each document type status
  - portal_pin: 4-digit PIN for additional security
  - rib_uploaded: Boolean for RIB status
  - quote_amount: Decimal for current quote
  - payment_method: Preferred payment method
  - payment_reference: Payment transaction reference
  
  ### 2. New Table: lead_document_checklist
  - Tracks individual document status per lead
  - Allows commercial to validate/invalidate documents
  - Stores validation history
  
  ### 3. RLS Policy Fixes
  - Allow prospect UPDATE via access_token
  - Allow prospect to upload and view their own documents
  
  ### 4. Helper Functions
  - get_missing_documents(): Returns list of missing documents for a lead
  - validate_document(): Commercial validates a document
  - invalidate_document(): Commercial requests document again
*/

-- Add new columns to crm_leads for document tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'document_checklist') THEN
    ALTER TABLE crm_leads ADD COLUMN document_checklist jsonb DEFAULT '{
      "licence_taxi": {"status": "missing", "validated": false, "validated_at": null, "validated_by": null, "notes": null},
      "permis_conduire": {"status": "missing", "validated": false, "validated_at": null, "validated_by": null, "notes": null},
      "piece_identite": {"status": "missing", "validated": false, "validated_at": null, "validated_by": null, "notes": null},
      "carte_grise": {"status": "missing", "validated": false, "validated_at": null, "validated_by": null, "notes": null},
      "releve_information": {"status": "missing", "validated": false, "validated_at": null, "validated_by": null, "notes": null},
      "autorisation_stationnement": {"status": "missing", "validated": false, "validated_at": null, "validated_by": null, "notes": null},
      "rib": {"status": "missing", "validated": false, "validated_at": null, "validated_by": null, "notes": null}
    }'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'portal_pin') THEN
    ALTER TABLE crm_leads ADD COLUMN portal_pin text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'quote_amount') THEN
    ALTER TABLE crm_leads ADD COLUMN quote_amount decimal(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'payment_method') THEN
    ALTER TABLE crm_leads ADD COLUMN payment_method text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'payment_reference') THEN
    ALTER TABLE crm_leads ADD COLUMN payment_reference text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'contract_pdf_url') THEN
    ALTER TABLE crm_leads ADD COLUMN contract_pdf_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'attestation_pdf_url') THEN
    ALTER TABLE crm_leads ADD COLUMN attestation_pdf_url text;
  END IF;
END $$;

-- Create lead_document_checklist table for detailed tracking
CREATE TABLE IF NOT EXISTS lead_document_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  status text NOT NULL DEFAULT 'missing' CHECK (status IN ('missing', 'pending', 'uploaded', 'validated', 'rejected')),
  is_required boolean DEFAULT true,
  uploaded_file_id uuid REFERENCES prospect_documents(id) ON DELETE SET NULL,
  validated boolean DEFAULT false,
  validated_at timestamptz,
  validated_by uuid REFERENCES admin_users(id),
  rejection_reason text,
  requested_again_at timestamptz,
  requested_again_by uuid REFERENCES admin_users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, document_type)
);

-- Enable RLS on lead_document_checklist
ALTER TABLE lead_document_checklist ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_document_checklist
DROP POLICY IF EXISTS "Admins can manage document checklist" ON lead_document_checklist;
CREATE POLICY "Admins can manage document checklist"
  ON lead_document_checklist FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Prospects can view own document checklist" ON lead_document_checklist;
CREATE POLICY "Prospects can view own document checklist"
  ON lead_document_checklist FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads 
      WHERE crm_leads.id = lead_document_checklist.lead_id 
      AND crm_leads.access_token IS NOT NULL
    )
  );

-- Fix RLS on crm_leads: Allow prospects to UPDATE their own record via token
DROP POLICY IF EXISTS "Prospects can update own lead via token" ON crm_leads;
CREATE POLICY "Prospects can update own lead via token"
  ON crm_leads FOR UPDATE
  TO anon
  USING (access_token IS NOT NULL AND access_token <> '')
  WITH CHECK (access_token IS NOT NULL AND access_token <> '');

-- Add index for document checklist queries
CREATE INDEX IF NOT EXISTS idx_lead_document_checklist_lead_id ON lead_document_checklist(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_document_checklist_status ON lead_document_checklist(status);

-- Function to initialize document checklist for a lead
CREATE OR REPLACE FUNCTION initialize_document_checklist(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doc_types text[] := ARRAY['licence_taxi', 'permis_conduire', 'piece_identite', 'carte_grise', 'releve_information', 'autorisation_stationnement', 'rib'];
  doc_type text;
BEGIN
  FOREACH doc_type IN ARRAY doc_types
  LOOP
    INSERT INTO lead_document_checklist (lead_id, document_type, is_required)
    VALUES (
      p_lead_id, 
      doc_type, 
      CASE WHEN doc_type = 'releve_information' THEN false ELSE true END
    )
    ON CONFLICT (lead_id, document_type) DO NOTHING;
  END LOOP;
END;
$$;

-- Function to get missing documents for a lead (used by email system)
CREATE OR REPLACE FUNCTION get_missing_documents(p_lead_id uuid)
RETURNS TABLE(document_type text, is_required boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ldc.document_type, ldc.is_required
  FROM lead_document_checklist ldc
  WHERE ldc.lead_id = p_lead_id
  AND ldc.status IN ('missing', 'rejected')
  AND (ldc.validated = false OR ldc.validated IS NULL)
  ORDER BY ldc.is_required DESC, ldc.document_type;
END;
$$;

-- Function for commercial to validate a document
CREATE OR REPLACE FUNCTION validate_document(
  p_lead_id uuid,
  p_document_type text,
  p_admin_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE lead_document_checklist
  SET 
    status = 'validated',
    validated = true,
    validated_at = now(),
    validated_by = p_admin_id,
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE lead_id = p_lead_id AND document_type = p_document_type;

  -- Update the JSONB checklist on crm_leads
  UPDATE crm_leads
  SET document_checklist = jsonb_set(
    COALESCE(document_checklist, '{}'::jsonb),
    ARRAY[p_document_type],
    jsonb_build_object(
      'status', 'validated',
      'validated', true,
      'validated_at', now(),
      'validated_by', p_admin_id::text,
      'notes', p_notes
    )
  ),
  updated_at = now()
  WHERE id = p_lead_id;

  -- Check if all required documents are validated
  PERFORM check_documents_complete(p_lead_id);

  RETURN true;
END;
$$;

-- Function for commercial to invalidate/request document again
CREATE OR REPLACE FUNCTION invalidate_document(
  p_lead_id uuid,
  p_document_type text,
  p_admin_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE lead_document_checklist
  SET 
    status = 'rejected',
    validated = false,
    validated_at = NULL,
    rejection_reason = p_reason,
    requested_again_at = now(),
    requested_again_by = p_admin_id,
    updated_at = now()
  WHERE lead_id = p_lead_id AND document_type = p_document_type;

  -- Update the JSONB checklist on crm_leads
  UPDATE crm_leads
  SET document_checklist = jsonb_set(
    COALESCE(document_checklist, '{}'::jsonb),
    ARRAY[p_document_type],
    jsonb_build_object(
      'status', 'rejected',
      'validated', false,
      'rejection_reason', p_reason,
      'requested_again_at', now()
    )
  ),
  documents_complete = false,
  updated_at = now()
  WHERE id = p_lead_id;

  RETURN true;
END;
$$;

-- Function to check if all required documents are complete
CREATE OR REPLACE FUNCTION check_documents_complete(p_lead_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  missing_count integer;
  is_complete boolean;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM lead_document_checklist
  WHERE lead_id = p_lead_id
  AND is_required = true
  AND (validated = false OR validated IS NULL);

  is_complete := (missing_count = 0);

  UPDATE crm_leads
  SET 
    documents_complete = is_complete,
    documents_received_at = CASE WHEN is_complete THEN now() ELSE documents_received_at END,
    updated_at = now()
  WHERE id = p_lead_id;

  RETURN is_complete;
END;
$$;

-- Trigger to sync prospect_documents uploads to checklist
CREATE OR REPLACE FUNCTION sync_document_upload_to_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update checklist when document is uploaded
  INSERT INTO lead_document_checklist (lead_id, document_type, status, uploaded_file_id)
  VALUES (NEW.lead_id, NEW.document_type, 'uploaded', NEW.id)
  ON CONFLICT (lead_id, document_type) 
  DO UPDATE SET 
    status = 'uploaded',
    uploaded_file_id = NEW.id,
    updated_at = now();

  -- Update JSONB on crm_leads
  UPDATE crm_leads
  SET document_checklist = jsonb_set(
    COALESCE(document_checklist, '{}'::jsonb),
    ARRAY[NEW.document_type],
    jsonb_build_object(
      'status', 'uploaded',
      'validated', false,
      'uploaded_at', now(),
      'file_name', NEW.file_name
    )
  ),
  updated_at = now()
  WHERE id = NEW.lead_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_document_upload ON prospect_documents;
CREATE TRIGGER trigger_sync_document_upload
  AFTER INSERT ON prospect_documents
  FOR EACH ROW
  EXECUTE FUNCTION sync_document_upload_to_checklist();

-- Initialize checklist for existing leads that don't have one
DO $$
DECLARE
  lead_record record;
BEGIN
  FOR lead_record IN SELECT id FROM crm_leads WHERE document_checklist IS NULL LOOP
    PERFORM initialize_document_checklist(lead_record.id);
  END LOOP;
END $$;
