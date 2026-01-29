/*
  # Add validated column to prospect_documents
  
  1. Ajoute la colonne validated (boolean)
  2. Défaut à false
*/

-- Ajouter la colonne validated si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prospect_documents' 
    AND column_name = 'validated'
  ) THEN
    ALTER TABLE prospect_documents 
    ADD COLUMN validated boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Mettre à jour les documents existants
UPDATE prospect_documents 
SET validated = false 
WHERE validated IS NULL;

-- Vérifier crm_lead_documents aussi
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_lead_documents' 
    AND column_name = 'validated_at'
  ) THEN
    ALTER TABLE crm_lead_documents 
    ADD COLUMN validated_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_lead_documents' 
    AND column_name = 'validated_by'
  ) THEN
    ALTER TABLE crm_lead_documents 
    ADD COLUMN validated_by uuid REFERENCES auth.users(id);
  END IF;
END $$;
