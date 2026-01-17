/*
  # Fix automatic email to lead matching - Version simple

  1. Désactiver les triggers problématiques
  2. Créer un trigger simple qui lie uniquement les emails aux leads
  3. Exécuter le matching sur les emails existants
*/

-- Désactiver le trigger problématique s'il existe
DROP TRIGGER IF EXISTS trigger_create_interaction_from_email ON email_messages;
DROP TRIGGER IF EXISTS trigger_auto_match_email_to_lead ON email_messages;

-- Fonction simple de matching automatique
CREATE OR REPLACE FUNCTION auto_match_email_to_lead_simple()
RETURNS TRIGGER AS $$
DECLARE
  matched_lead_id uuid;
BEGIN
  -- Si l'email est déjà lié, ne rien faire
  IF NEW.lead_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Chercher un lead avec le même email (correspondance exacte)
  SELECT id INTO matched_lead_id
  FROM crm_leads
  WHERE LOWER(email) = LOWER(NEW.from_email)
  LIMIT 1;

  -- Si un lead est trouvé, le lier
  IF matched_lead_id IS NOT NULL THEN
    NEW.lead_id := matched_lead_id;
    NEW.auto_matched := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger simple
CREATE TRIGGER trigger_auto_match_email_to_lead_simple
  BEFORE INSERT ON email_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_match_email_to_lead_simple();

-- Matcher tous les emails existants non liés
UPDATE email_messages em
SET 
  lead_id = cl.id,
  auto_matched = true
FROM crm_leads cl
WHERE em.lead_id IS NULL
  AND LOWER(cl.email) = LOWER(em.from_email);
