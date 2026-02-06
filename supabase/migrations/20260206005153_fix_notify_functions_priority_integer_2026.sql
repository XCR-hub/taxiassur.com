/*
  # Fix notify functions - priority text to integer

  Corrige les fonctions notify_new_lead et notify_lead_status_change
  pour utiliser des valeurs INTEGER au lieu de TEXT pour priority.
  
  Mapping:
  - 'high' → 10
  - 'medium' → 5
  - 'low' → 1
*/

-- ================================================================
-- 1. Fix notify_new_lead function
-- ================================================================
CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER AS $$
BEGIN
  -- Insérer une notification importante pour tous les commerciaux
  INSERT INTO crm_event_notifications (
    lead_id,
    event_type,
    title,
    message,
    priority,
    action_url,
    metadata
  )
  VALUES (
    NEW.id,
    'new_lead',
    'Nouveau Lead!',
    'Nouveau lead: ' || COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, NEW.email),
    10, -- high = 10
    '/backoffice/crm/lead/' || NEW.id,
    jsonb_build_object(
      'lead_id', NEW.id,
      'email', NEW.email,
      'phone', NEW.phone,
      'status', NEW.status,
      'created_at', NEW.created_at
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ================================================================
-- 2. Fix notify_lead_status_change function
-- ================================================================
CREATE OR REPLACE FUNCTION notify_lead_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_priority integer := 5; -- medium par défaut
  v_title text;
  v_message text;
BEGIN
  -- Ignorer si le statut n'a pas changé
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Déterminer la priorité et le message selon le nouveau statut
  CASE NEW.status
    WHEN 'DOCUMENTS_VALIDES' THEN
      v_priority := 10; -- high
      v_title := 'Documents Validés';
      v_message := 'Tous les documents de ' || COALESCE(NEW.first_name, NEW.email) || ' ont été validés';
    WHEN 'ATTENTE_SIGNATURE' THEN
      v_priority := 10; -- high
      v_title := 'En Attente de Signature';
      v_message := COALESCE(NEW.first_name, NEW.email) || ' doit signer le contrat';
    WHEN 'CLIENT_ACTIF' THEN
      v_priority := 10; -- high
      v_title := 'Nouveau Client!';
      v_message := COALESCE(NEW.first_name, NEW.email) || ' est maintenant client actif';
    WHEN 'CLIENT_LOST', 'PERDU' THEN
      v_priority := 5; -- medium
      v_title := 'Lead Perdu';
      v_message := 'Lead ' || COALESCE(NEW.first_name, NEW.email) || ' marqué comme perdu';
    ELSE
      -- Ne pas notifier pour les autres changements de statut
      RETURN NEW;
  END CASE;

  -- Insérer la notification avec priority INTEGER
  INSERT INTO crm_event_notifications (
    lead_id,
    event_type,
    title,
    message,
    priority,
    action_url,
    metadata
  )
  VALUES (
    NEW.id,
    'status_change',
    v_title,
    v_message,
    v_priority,
    '/backoffice/crm/lead/' || NEW.id,
    jsonb_build_object(
      'lead_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'changed_at', NOW()
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Recréer les triggers pour être sûr
DROP TRIGGER IF EXISTS trigger_notify_new_lead ON crm_leads;
CREATE TRIGGER trigger_notify_new_lead
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();

DROP TRIGGER IF EXISTS trigger_notify_lead_status_change ON crm_leads;
CREATE TRIGGER trigger_notify_lead_status_change
  AFTER UPDATE OF status ON crm_leads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_lead_status_change();

COMMENT ON FUNCTION notify_new_lead() IS 'Notifie la création d''un nouveau lead (FIXED: priority INTEGER)';
COMMENT ON FUNCTION notify_lead_status_change() IS 'Notifie les changements de statut importants (FIXED: priority INTEGER)';
