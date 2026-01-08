/*
  # Correction de la politique RLS pour crm_leads
  
  ## Problème
  La politique actuelle vérifie les rôles 'ADMIN' et 'MANAGER' mais les utilisateurs 
  ont les rôles 'master' et 'collaborator'.
  
  ## Solution
  Mettre à jour la politique pour inclure tous les rôles admin valides.
*/

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Admins managers acces leads" ON crm_leads;

-- Créer une nouvelle politique qui inclut tous les rôles admin
CREATE POLICY "Authenticated admins can access all leads"
  ON crm_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );
