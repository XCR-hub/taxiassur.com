/*
  # Ajout contrainte UNIQUE sur email

  1. Nettoyage des doublons d'email dans crm_leads_enhanced
  2. Ajout de la contrainte UNIQUE
  3. Préparation pour la consolidation
*/

-- Nettoyer les doublons d'abord (garder le plus récent par email)
DELETE FROM crm_leads_enhanced
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
    FROM crm_leads_enhanced
  ) t
  WHERE rn > 1
);

-- Ajouter la contrainte UNIQUE sur email
ALTER TABLE crm_leads_enhanced
ADD CONSTRAINT crm_leads_enhanced_email_unique UNIQUE (email);

-- Log
DO $$
DECLARE
  total_leads integer;
BEGIN
  SELECT COUNT(*) INTO total_leads FROM crm_leads_enhanced;
  RAISE NOTICE 'Contrainte UNIQUE ajoutée. Total leads: %', total_leads;
END $$;