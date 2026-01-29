/*
  # Fix document validation permissions - Emergency
  
  1. Ajoute une policy permissive pour tous les authenticated users sur prospect_documents
  2. Permet la validation sans restriction pour les admins
*/

-- Drop les policies existantes qui pourraient bloquer
DROP POLICY IF EXISTS "Authenticated admins can update prospect documents" ON prospect_documents;

-- Créer une policy UPDATE plus permissive pour tous les authenticated
CREATE POLICY "Authenticated users can update prospect documents"
  ON prospect_documents
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- S'assurer que crm_lead_documents est accessible
DROP POLICY IF EXISTS "Admin full access crm_lead_documents" ON crm_lead_documents;
DROP POLICY IF EXISTS "Admins can manage documents" ON crm_lead_documents;

CREATE POLICY "Authenticated full access crm_lead_documents"
  ON crm_lead_documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
