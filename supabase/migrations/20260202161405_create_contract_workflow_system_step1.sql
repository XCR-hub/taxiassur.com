/*
  # Système de workflow de contrats - Étape 1

  1. Nouvelles Tables
    - `contract_workflow_types` : Types de workflow (grossiste vs délégation)

  2. Modifications
    - Ajout du champ workflow_type dans insurance_companies
*/

-- Types de workflow de contrat
CREATE TABLE IF NOT EXISTS contract_workflow_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL CHECK (code IN ('grossiste', 'delegation_totale')),
  label text NOT NULL,
  description text,
  requires_quote_signature boolean DEFAULT false,
  requires_contract_signature boolean DEFAULT false,
  requires_payment_via_taxiassur boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Insertion des types de workflow
INSERT INTO contract_workflow_types (code, label, description, requires_quote_signature, requires_contract_signature, requires_payment_via_taxiassur)
VALUES
  ('grossiste', 'Courtier Grossiste', 'Tout est géré par la plateforme du courtier (2MA, Zephyr, Soliazar, +Simple)', false, false, false),
  ('delegation_totale', 'Délégation Totale', 'TaxiAssur gère tout le processus (Generali)', true, true, true)
ON CONFLICT (code) DO NOTHING;

-- Ajouter le type de workflow aux compagnies d'assurance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insurance_companies' AND column_name = 'workflow_type'
  ) THEN
    ALTER TABLE insurance_companies
    ADD COLUMN workflow_type text DEFAULT 'grossiste' CHECK (workflow_type IN ('grossiste', 'delegation_totale'));
  END IF;
END $$;

-- Mettre à jour Generali en délégation totale
UPDATE insurance_companies
SET workflow_type = 'delegation_totale'
WHERE code = 'GENERALI';

-- RLS
ALTER TABLE contract_workflow_types ENABLE ROW LEVEL SECURITY;

-- Policies pour contract_workflow_types (lecture publique)
CREATE POLICY "Workflow types are publicly readable"
  ON contract_workflow_types FOR SELECT
  TO anon, authenticated
  USING (true);
