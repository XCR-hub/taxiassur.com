/*
  # Correction de la Policy RLS pour ready_for_quote_queue

  1. Problème
    - La table ready_for_quote_queue est vide dans le backoffice alors que des leads existent
    - La policy RLS actuelle vérifie l'existence dans admin_users qui peut ne pas être synchronisé

  2. Solution
    - Ajouter une policy SELECT plus permissive pour les utilisateurs authentifiés
    - Garder la restriction pour INSERT/UPDATE/DELETE
*/

-- Supprimer l'ancienne policy trop restrictive
DROP POLICY IF EXISTS "Admin full access ready_for_quote_queue" ON ready_for_quote_queue;

-- Policy pour SELECT - Tous les utilisateurs authentifiés peuvent lire
CREATE POLICY "Authenticated users can view quote queue"
  ON ready_for_quote_queue
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy pour INSERT - Seulement les admins
CREATE POLICY "Admins can insert into quote queue"
  ON ready_for_quote_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Policy pour UPDATE - Seulement les admins
CREATE POLICY "Admins can update quote queue"
  ON ready_for_quote_queue
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

-- Policy pour DELETE - Seulement les admins
CREATE POLICY "Admins can delete from quote queue"
  ON ready_for_quote_queue
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );
