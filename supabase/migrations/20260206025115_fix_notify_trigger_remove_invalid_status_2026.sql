/*
  # Fix notify_lead_status_change - Supprimer les statuts invalides

  Correction du trigger notify_lead_status_change pour supprimer les références
  aux statuts qui n'existent plus dans l'enum lead_status.
  
  Statuts invalides supprimés:
  - DOCUMENTS_VALIDES (remplacé par COLLECTE_DOCUMENTS ou DEVIS)
  - ATTENTE_SIGNATURE (remplacé par CONTRAT_SIGNATURE)
  - CLIENT_LOST (remplacé par PERDU)
*/

CREATE OR REPLACE FUNCTION notify_lead_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_priority integer := 5;
  v_title text;
  v_message text;
BEGIN
  -- Ignorer si le statut n'a pas changé
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Déterminer la priorité et le message selon le nouveau statut
  CASE NEW.status
    WHEN 'COLLECTE_DOCUMENTS' THEN
      v_priority := 8;
      v_title := 'Documents en Collecte';
      v_message := 'Documents en cours de collecte pour ' || COALESCE(NEW.first_name, NEW.email);
    WHEN 'DEVIS' THEN
      v_priority := 10;
      v_title := 'Devis Prêt';
      v_message := 'Devis généré pour ' || COALESCE(NEW.first_name, NEW.email);
    WHEN 'CONTRAT_SIGNATURE' THEN
      v_priority := 10;
      v_title := 'En Attente de Signature';
      v_message := COALESCE(NEW.first_name, NEW.email) || ' doit signer le contrat';
    WHEN 'CLIENT_ACTIF' THEN
      v_priority := 10;
      v_title := 'Nouveau Client!';
      v_message := COALESCE(NEW.first_name, NEW.email) || ' est maintenant client actif';
    WHEN 'PERDU' THEN
      v_priority := 5;
      v_title := 'Lead Perdu';
      v_message := 'Lead ' || COALESCE(NEW.first_name, NEW.email) || ' marqué comme perdu';
    WHEN 'PAIEMENT' THEN
      v_priority := 9;
      v_title := 'Paiement en Cours';
      v_message := 'Paiement en attente pour ' || COALESCE(NEW.first_name, NEW.email);
    ELSE
      -- Ne pas notifier pour les autres changements de statut
      RETURN NEW;
  END CASE;

  -- Insérer la notification
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

COMMENT ON FUNCTION notify_lead_status_change() IS 'Notifie les changements de statut importants (CORRIGÉ: statuts valides uniquement)';