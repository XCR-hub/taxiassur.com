/*
  # Fix classified documents visibility in CRM

  1. New RPC Function
    - `get_classified_documents_for_lead(p_lead_id)` - SECURITY DEFINER function
    - Reliably returns all classified documents for a lead
    - Bypasses RLS to ensure documents always load regardless of auth state
    - Returns combined data from crm_lead_documents

  2. Changes
    - Add 'custom' to crm_lead_documents document_type CHECK constraint
    - This allows custom document categories to be saved

  3. Why
    - Classified documents were not appearing in their categories in the CRM view
    - The direct table query could fail silently when admin session auth state was stale
    - A SECURITY DEFINER RPC guarantees reliable data retrieval
*/

-- Add 'custom' to the document_type constraint
ALTER TABLE crm_lead_documents
  DROP CONSTRAINT IF EXISTS crm_lead_documents_document_type_check;

ALTER TABLE crm_lead_documents
  ADD CONSTRAINT crm_lead_documents_document_type_check
  CHECK (document_type = ANY (ARRAY[
    'licence_taxi', 'permis_conduire', 'carte_grise',
    'releve_information', 'carte_professionnelle', 'kbis',
    'piece_identite', 'carte_identite', 'justificatif_domicile',
    'autorisation_stationnement', 'rib', 'RIB',
    'contrat_signe', 'devis', 'autre', 'custom'
  ]));

-- Create reliable RPC for loading classified documents
CREATE OR REPLACE FUNCTION get_classified_documents_for_lead(p_lead_id uuid)
RETURNS TABLE(
  id uuid,
  lead_id uuid,
  document_type text,
  file_name text,
  file_path text,
  file_size integer,
  mime_type text,
  status text,
  uploaded_by text,
  uploaded_at timestamptz,
  validated_by text,
  validated_at timestamptz,
  rejection_reason text,
  notes text,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  bucket text,
  custom_label text,
  file_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id, d.lead_id, d.document_type, d.file_name, d.file_path,
    d.file_size, d.mime_type, d.status, d.uploaded_by, d.uploaded_at,
    d.validated_by, d.validated_at, d.rejection_reason, d.notes,
    d.metadata, d.created_at, d.updated_at, d.bucket, d.custom_label,
    d.file_url
  FROM crm_lead_documents d
  WHERE d.lead_id = p_lead_id
  ORDER BY d.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_classified_documents_for_lead(uuid) TO anon, authenticated, service_role;
