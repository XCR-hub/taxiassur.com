/*
  # Add Missing Document Types to crm_lead_documents
  
  1. Problem
    - DocumentBasket uses types like 'RIB', 'releve_information', 'carte_professionnelle', etc.
    - But crm_lead_documents constraint only allows a limited list
    - This causes drag & drop to fail when using these types
  
  2. Solution
    - Add all missing document types to the constraint
    - Normalize 'RIB' to 'rib' in the constraint (case-insensitive)
*/

-- Drop old constraint
ALTER TABLE crm_lead_documents 
DROP CONSTRAINT IF EXISTS crm_lead_documents_document_type_check;

-- Add new constraint with all document types
ALTER TABLE crm_lead_documents 
ADD CONSTRAINT crm_lead_documents_document_type_check 
CHECK (document_type IN (
  'licence_taxi',
  'permis_conduire',
  'carte_grise',
  'releve_information',
  'carte_professionnelle',
  'kbis',
  'piece_identite',
  'carte_identite',
  'justificatif_domicile',
  'autorisation_stationnement',
  'rib',
  'RIB',  -- Allow both cases for compatibility
  'contrat_signe',
  'devis',
  'autre'
));

COMMENT ON CONSTRAINT crm_lead_documents_document_type_check ON crm_lead_documents IS 
'Types de documents acceptés - alignés avec DocumentBasket frontend';
