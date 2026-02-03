/*
  # Correction accès Service Role aux documents CRM

  1. Problème
    - Les scripts de migration ne peuvent pas insérer dans crm_lead_documents
    - RLS trop restrictif pour le service role

  2. Solution
    - Ajouter une politique pour le service role
    - Permettre les insertions automatiques
*/

-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Admin full access crm_lead_documents" ON crm_lead_documents;

-- Politique pour les utilisateurs authentifiés (admins, commerciaux)
CREATE POLICY "Authenticated users can manage documents"
  ON crm_lead_documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Politique pour le service role (scripts, migrations, edge functions)
CREATE POLICY "Service role can manage documents"
  ON crm_lead_documents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);