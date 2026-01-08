/*
  # Ajout du statut LOST_RECONTACT_SCHEDULED à l'enum

  1. Modifications
    - Ajoute LOST_RECONTACT_SCHEDULED à l'enum lead_status
    - Permet de marquer les clients perdus avec date de recontact
*/

-- Ajouter la nouvelle valeur à l'enum lead_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'LOST_RECONTACT_SCHEDULED' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lead_status')
  ) THEN
    ALTER TYPE lead_status ADD VALUE 'LOST_RECONTACT_SCHEDULED';
  END IF;
END $$;
