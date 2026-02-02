/*
  # Correction du trigger pipeline_automations pour gérer NULL status

  1. Problème
    - Quand OLD.status est NULL (création de lead), le cast échoue
    - "non défini" n'est pas une valeur valide de l'enum lead_status

  2. Solution
    - Vérifier que from_state et to_state ne sont pas NULL avant insertion
    - Ne pas enregistrer de transition si l'ancien statut est NULL
*/

-- Recréer la fonction trigger_pipeline_automations avec gestion du NULL
CREATE OR REPLACE FUNCTION trigger_pipeline_automations()
RETURNS TRIGGER AS $$
DECLARE
  v_old_status text;
  v_new_status text;
BEGIN
  v_old_status := OLD.status::text;
  v_new_status := NEW.status::text;

  -- Si le statut a changé ET que l'ancien statut n'est pas NULL
  IF v_old_status IS DISTINCT FROM v_new_status AND v_old_status IS NOT NULL THEN
    -- Enregistrer la transition uniquement si les deux statuts sont valides
    INSERT INTO crm_state_transitions (
      lead_id,
      from_state,
      to_state,
      triggered_by,
      transitioned_at
    ) VALUES (
      NEW.id,
      v_old_status::lead_status,
      v_new_status::lead_status,
      'SYSTEM',
      NOW()
    );

    -- Mettre à jour last_contact_at
    NEW.last_contact_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer la fonction log_lead_status_change pour être plus robuste
CREATE OR REPLACE FUNCTION log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Seulement si le statut a changé et que les deux statuts sont non NULL
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND OLD.status IS NOT NULL) THEN
    PERFORM record_timeline_interaction(
      NEW.id,
      'system',
      'outbound',
      'Changement de statut',
      'Statut modifié : ' || OLD.status::text || ' → ' || NEW.status::text,
      'Changement automatique dans le CRM'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour capture_lead_ai_event pour gérer NULL
CREATE OR REPLACE FUNCTION capture_lead_ai_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO crm_ai_events (
    event_type,
    action,
    lead_id,
    event_data,
    before_state,
    after_state,
    day_of_week,
    hour_of_day,
    led_to_conversion,
    next_stage
  ) VALUES (
    'pipeline',
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN 'status_changed'
      ELSE 'updated'
    END,
    NEW.id,
    jsonb_build_object(
      'old_status', CASE WHEN TG_OP = 'UPDATE' AND OLD.status IS NOT NULL THEN OLD.status::text ELSE NULL END,
      'new_status', NEW.status::text
    ),
    CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
    row_to_json(NEW)::jsonb,
    EXTRACT(ISODOW FROM now())::integer,
    EXTRACT(HOUR FROM now())::integer,
    NEW.status IN ('CLIENT_ACTIF', 'CONTRAT_SIGNATURE', 'ACTIVE_CLIENT', 'SIGNED'),
    NEW.status::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
