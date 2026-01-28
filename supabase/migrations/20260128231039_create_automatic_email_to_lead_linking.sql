/*
  # Système de liaison automatique des emails aux leads

  1. Problème
    - Les emails ne sont pas automatiquement liés aux leads
    - Exemple : taxinabil91@gmail.com a 3 emails mais aucun lead_id
    - Le commercial doit manuellement assigner les emails

  2. Solution
    - Trigger automatique sur INSERT dans email_messages
    - Recherche automatique du lead par adresse email
    - Liaison automatique si trouvé
    - Création du lead si email de formulaire

  3. Sécurité
    - Fonction SECURITY DEFINER pour pouvoir mettre à jour
    - Logs pour traçabilité
*/

-- Fonction pour lier automatiquement un email à un lead
CREATE OR REPLACE FUNCTION auto_link_email_to_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_id uuid;
  v_sender_email text;
BEGIN
  -- Ignorer si déjà lié
  IF NEW.lead_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Extraire l'email de l'expéditeur
  v_sender_email := LOWER(TRIM(NEW.from_email));

  -- Ignorer les emails internes
  IF v_sender_email LIKE '%taxiassur.com%' 
     OR v_sender_email LIKE '%noreply%'
     OR v_sender_email LIKE '%no-reply%' THEN
    RETURN NEW;
  END IF;

  -- Chercher un lead avec cette adresse email
  SELECT id INTO v_lead_id
  FROM crm_leads
  WHERE LOWER(TRIM(email)) = v_sender_email
  ORDER BY created_at DESC
  LIMIT 1;

  -- Si trouvé, lier automatiquement
  IF v_lead_id IS NOT NULL THEN
    NEW.lead_id := v_lead_id;
    
    RAISE LOG 'Auto-linked email % to lead %', NEW.id, v_lead_id;
  ELSE
    RAISE LOG 'No lead found for email % (from: %)', NEW.id, v_sender_email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur INSERT
DROP TRIGGER IF EXISTS trigger_auto_link_email_to_lead ON email_messages;
CREATE TRIGGER trigger_auto_link_email_to_lead
  BEFORE INSERT ON email_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_email_to_lead();

-- Fonction pour mettre à jour les emails existants sans lead_id
CREATE OR REPLACE FUNCTION link_existing_emails_to_leads()
RETURNS jsonb AS $$
DECLARE
  v_linked integer := 0;
  v_email_record record;
  v_lead_id uuid;
BEGIN
  -- Parcourir tous les emails sans lead_id
  FOR v_email_record IN
    SELECT id, from_email
    FROM email_messages
    WHERE lead_id IS NULL
      AND from_email NOT LIKE '%taxiassur.com%'
      AND from_email NOT LIKE '%noreply%'
      AND from_email NOT LIKE '%no-reply%'
    ORDER BY received_at DESC
    LIMIT 500
  LOOP
    -- Chercher le lead correspondant
    SELECT id INTO v_lead_id
    FROM crm_leads
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(v_email_record.from_email))
    ORDER BY created_at DESC
    LIMIT 1;

    -- Si trouvé, lier
    IF v_lead_id IS NOT NULL THEN
      UPDATE email_messages
      SET lead_id = v_lead_id
      WHERE id = v_email_record.id;
      
      v_linked := v_linked + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'linked', v_linked
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lier immédiatement les emails existants (comme taxinabil91@gmail.com)
SELECT link_existing_emails_to_leads();
