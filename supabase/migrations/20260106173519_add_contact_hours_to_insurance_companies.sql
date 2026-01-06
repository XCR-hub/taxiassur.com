/*
  # Ajout du champ horaires de contact

  1. Modifications
    - Ajout de la colonne `contact_hours` à la table `insurance_companies`
      pour stocker les horaires d'ouverture du service souscription/gestion
  
  2. Notes
    - Colonne nullable pour permettre l'ajout progressif des horaires
    - Type TEXT pour flexibilité des formats d'horaires
*/

-- Ajouter la colonne contact_hours si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insurance_companies' AND column_name = 'contact_hours'
  ) THEN
    ALTER TABLE insurance_companies ADD COLUMN contact_hours text;
  END IF;
END $$;
