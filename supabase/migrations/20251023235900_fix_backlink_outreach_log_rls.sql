/*
  # Fix RLS Policies pour backlink_outreach_log

  1. Problème
    - Table backlink_outreach_log a RLS enabled mais pas de policies
    - Edge function ne peut pas insérer de logs
    - Provoque erreur 500 lors envoi emails

  2. Solution
    - Ajouter policy INSERT pour service_role
    - Ajouter policy SELECT pour authenticated

  3. Sécurité
    - Service role peut insérer (edge functions)
    - Authenticated peut lire les logs
*/

-- Policy pour permettre aux edge functions d'insérer
CREATE POLICY "Service role can insert outreach logs"
  ON backlink_outreach_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy pour permettre aux utilisateurs authentifiés de lire
CREATE POLICY "Authenticated can view outreach logs"
  ON backlink_outreach_log
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy pour public read (dashboard backlinks accessible)
CREATE POLICY "Public can view outreach logs"
  ON backlink_outreach_log
  FOR SELECT
  TO public
  USING (true);
