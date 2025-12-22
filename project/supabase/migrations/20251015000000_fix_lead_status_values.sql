/*
  # Fix lead_status values

  1. Changes
    - Remove old constraint on lead_status
    - Add new constraint with correct values (nouveau, contacte, devis_envoye, client, perdu)
    - Update default value to 'nouveau'
    - Migrate existing data to new values

  2. Notes
    - This fixes the mismatch between TypeScript code and database constraints
    - Maps old values to new French values
*/

-- Supprimer l'ancienne contrainte
ALTER TABLE leads DROP CONSTRAINT IF EXISTS valid_lead_status;

-- Migrer les données existantes vers les nouvelles valeurs
UPDATE leads SET lead_status = 'nouveau' WHERE lead_status = 'new';
UPDATE leads SET lead_status = 'contacte' WHERE lead_status = 'contacted';
UPDATE leads SET lead_status = 'devis_envoye' WHERE lead_status = 'interested';
UPDATE leads SET lead_status = 'client' WHERE lead_status = 'converted';
UPDATE leads SET lead_status = 'perdu' WHERE lead_status = 'lost';

-- Changer la valeur par défaut
ALTER TABLE leads ALTER COLUMN lead_status SET DEFAULT 'nouveau';

-- Ajouter la nouvelle contrainte avec les bonnes valeurs
ALTER TABLE leads ADD CONSTRAINT valid_lead_status
  CHECK (lead_status IN ('nouveau', 'contacte', 'devis_envoye', 'client', 'perdu'));

-- Mettre à jour le commentaire
COMMENT ON COLUMN leads.lead_status IS 'Statut du lead: nouveau, contacte, devis_envoye, client, perdu';
