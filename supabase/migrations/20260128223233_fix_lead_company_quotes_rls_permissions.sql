/*
  # Fix lead_company_quotes RLS permissions

  1. Changes
    - Drop existing restrictive policies
    - Create permissive policies for authenticated users
    - Allow all authenticated users to insert/update quotes (backoffice users)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Les admins peuvent tout voir sur lead_company_quotes" ON lead_company_quotes;
DROP POLICY IF EXISTS "Les commerciaux peuvent créer des devis/refus" ON lead_company_quotes;
DROP POLICY IF EXISTS "Les commerciaux peuvent mettre à jour leurs devis" ON lead_company_quotes;

-- Create new permissive policies for backoffice users
CREATE POLICY "Authenticated users can view lead_company_quotes"
  ON lead_company_quotes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert lead_company_quotes"
  ON lead_company_quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update lead_company_quotes"
  ON lead_company_quotes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete lead_company_quotes"
  ON lead_company_quotes
  FOR DELETE
  TO authenticated
  USING (true);
