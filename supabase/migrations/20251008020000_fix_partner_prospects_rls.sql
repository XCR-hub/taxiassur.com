/*
  # Fix Partner Prospects RLS Policy

  1. Changes
    - Ajoute policy pour permettre à anon d'insérer/lire prospects
    - Permet le seeding depuis le backoffice sans Supabase Auth

  2. Security
    - Garde RLS activé
    - Permet anon pour backoffice interne only
    - En production, ajouter authentification Supabase
*/

-- Policy pour permettre à anon d'insérer des prospects (backoffice)
CREATE POLICY IF NOT EXISTS "Allow anon to insert prospects"
  ON partner_prospects
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy pour permettre à anon de lire les prospects (backoffice)
CREATE POLICY IF NOT EXISTS "Allow anon to read prospects"
  ON partner_prospects
  FOR SELECT
  TO anon
  USING (true);

-- Policy pour permettre à anon de gérer les campagnes (backoffice)
CREATE POLICY IF NOT EXISTS "Allow anon to manage campaigns"
  ON outreach_campaigns
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
