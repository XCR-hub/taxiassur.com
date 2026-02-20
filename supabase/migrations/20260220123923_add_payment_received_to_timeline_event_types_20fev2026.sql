/*
  # Ajout event_type payment_received à crm_lead_timeline
  
  1. Modifications
    - Ajouter 'payment_received' aux event_type valides
    - Corriger le trigger pour utiliser ce nouveau type
  
  2. Raison
    - Le trigger tentait d'insérer 'payment' qui n'existe pas
    - Empêchait l'enregistrement des paiements dans la timeline
*/

-- Ajouter payment_received aux event_type valides
ALTER TABLE crm_lead_timeline 
DROP CONSTRAINT IF EXISTS crm_lead_timeline_event_type_check;

ALTER TABLE crm_lead_timeline
ADD CONSTRAINT crm_lead_timeline_event_type_check
CHECK (event_type = ANY (ARRAY[
  'created',
  'stage_changed',
  'score_updated',
  'communication_sent',
  'communication_received',
  'document_uploaded',
  'note_added',
  'task_created',
  'task_completed',
  'automation_triggered',
  'payment_received'  -- ✅ Ajouté
]));

-- Corriger le trigger
CREATE OR REPLACE FUNCTION handle_monetico_payment_success()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Seulement si le statut passe à 'success' et qu'il y a un lead
  IF NEW.status = 'success' AND (OLD.status IS NULL OR OLD.status != 'success') AND NEW.lead_id IS NOT NULL THEN
    
    -- Ajouter une entrée dans la timeline
    INSERT INTO crm_lead_timeline (
      lead_id,
      event_type,
      event_data,
      actor_type
    ) VALUES (
      NEW.lead_id,
      'payment_received',  -- ✅ Corrigé
      jsonb_build_object(
        'title', 'Paiement comptant reçu',
        'description', format('Paiement de %s € effectué avec succès via Monetico (Réf: %s)', NEW.amount, NEW.reference),
        'payment_id', NEW.id,
        'amount', NEW.amount,
        'reference', NEW.reference,
        'transaction_id', NEW.transaction_id
      ),
      'system'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;
