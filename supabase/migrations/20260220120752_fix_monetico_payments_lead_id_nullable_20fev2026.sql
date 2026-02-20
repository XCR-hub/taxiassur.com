/*
  # Correction Monético : lead_id nullable
  
  1. Modifications
    - Rendre `lead_id` nullable dans `monetico_payments`
    - Permet les paiements comptant sans lead (facturation libre)
  
  2. Raison
    - Le code Edge Function essaie d'insérer `lead_id: null` pour les facturations libres
    - La contrainte NOT NULL empêchait l'insertion
    - Résultat : aucun paiement créé dans la DB → webhook retourne cdr=1
*/

-- Rendre lead_id nullable
ALTER TABLE monetico_payments 
ALTER COLUMN lead_id DROP NOT NULL;

-- Ajouter un index pour les recherches par lead_id (même si nullable)
CREATE INDEX IF NOT EXISTS idx_monetico_payments_lead_id 
ON monetico_payments(lead_id) 
WHERE lead_id IS NOT NULL;

-- Ajouter colonne customer_phone si manquante
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'monetico_payments' 
    AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE monetico_payments ADD COLUMN customer_phone text;
  END IF;
END $$;
