/*
  # Système de Gestion des Partenaires 2026 - Version Simplifiée

  1. Nouvelle Table
    - `partners` - Table pour gérer les partenaires courtiers

  2. Sécurité
    - Enable RLS avec policies simplifiées
*/

-- Create partners status enum
DO $$ BEGIN
  CREATE TYPE partner_status AS ENUM ('pending', 'active', 'suspended', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create partners table
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  siret text NOT NULL,
  contact_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  postal_code text NOT NULL,
  description text NOT NULL,
  status partner_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  activated_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_partners_email ON partners(email);
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);

-- Enable RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Policy: Les partenaires authentifiés peuvent voir leurs propres données
CREATE POLICY "Partners can view own data"
  ON partners
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Les partenaires peuvent mettre à jour leurs propres données
CREATE POLICY "Partners can update own data"
  ON partners
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy: Tout le monde peut créer une demande de partenariat (inscription)
CREATE POLICY "Anyone can create partner request"
  ON partners
  FOR INSERT
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Si le statut passe à 'active', mettre à jour activated_at
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    NEW.activated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS partners_updated_at_trigger ON partners;
CREATE TRIGGER partners_updated_at_trigger
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION update_partners_updated_at();
