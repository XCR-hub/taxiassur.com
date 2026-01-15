/*
  # Ajout colonne immatriculation pour les taxis

  1. Modifications
    - Ajoute une colonne `immatriculation` (TEXT) à `crm_leads`
    - Migre les données depuis `metadata->>'immatriculation'`
    - Ajoute un index pour les recherches rapides

  2. Sécurité
    - Pas de changement RLS
*/

-- Ajouter la colonne immatriculation
ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS immatriculation TEXT;

-- Migrer les données existantes depuis metadata
UPDATE crm_leads 
SET immatriculation = metadata->>'immatriculation'
WHERE metadata->>'immatriculation' IS NOT NULL 
  AND (immatriculation IS NULL OR immatriculation = '');

-- Ajouter un index pour les recherches
CREATE INDEX IF NOT EXISTS idx_crm_leads_immatriculation 
ON crm_leads(immatriculation) 
WHERE immatriculation IS NOT NULL;