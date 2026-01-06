/*
  # Création de la table des contacts des compagnies d'assurance

  1. Nouvelle Table
    - `insurance_company_contacts`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key vers insurance_companies)
      - `first_name` (text)
      - `last_name` (text)
      - `full_name` (text)
      - `position` (text) - Poste/fonction
      - `email` (text)
      - `phone` (text)
      - `mobile` (text)
      - `notes` (text)
      - `is_primary` (boolean) - Contact principal
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Sécurité
    - Enable RLS
    - Policy pour lecture par authenticated
    - Policy pour écriture par authenticated
*/

CREATE TABLE IF NOT EXISTS insurance_company_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES insurance_companies(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  full_name text NOT NULL,
  position text,
  email text,
  phone text,
  mobile text,
  notes text,
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_insurance_company_contacts_company_id 
  ON insurance_company_contacts(company_id);

CREATE INDEX IF NOT EXISTS idx_insurance_company_contacts_email 
  ON insurance_company_contacts(email);

-- RLS
ALTER TABLE insurance_company_contacts ENABLE ROW LEVEL SECURITY;

-- Politique de lecture pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can read insurance company contacts"
  ON insurance_company_contacts
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique d'insertion pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can insert insurance company contacts"
  ON insurance_company_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Politique de mise à jour pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can update insurance company contacts"
  ON insurance_company_contacts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Politique de suppression pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can delete insurance company contacts"
  ON insurance_company_contacts
  FOR DELETE
  TO authenticated
  USING (true);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_insurance_company_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_insurance_company_contacts_updated_at
  BEFORE UPDATE ON insurance_company_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_insurance_company_contacts_updated_at();
