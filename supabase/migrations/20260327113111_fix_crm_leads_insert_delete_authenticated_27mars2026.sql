/*
  # Fix crm_leads RLS - Add INSERT and DELETE policies for authenticated users

  1. Changes
    - Add INSERT policy for authenticated users (admin/commercial can create leads)
    - Add DELETE policy for authenticated users (admin/commercial can delete leads)
  
  2. Security
    - INSERT restricted to authenticated users only
    - DELETE restricted to authenticated users only
*/

CREATE POLICY "crm_leads_insert_authenticated"
  ON crm_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "crm_leads_delete_authenticated"
  ON crm_leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );
