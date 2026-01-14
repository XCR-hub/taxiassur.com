/*
  # Ajouter contrainte unique sur lead_id dans ready_for_quote_queue

  Cette contrainte est nécessaire pour le ON CONFLICT du trigger
*/

-- Supprimer d'abord les doublons potentiels
DELETE FROM ready_for_quote_queue a
USING ready_for_quote_queue b
WHERE a.id > b.id AND a.lead_id = b.lead_id;

-- Ajouter la contrainte unique
ALTER TABLE ready_for_quote_queue
ADD CONSTRAINT ready_for_quote_queue_lead_id_unique UNIQUE (lead_id);

-- Mettre à jour le trigger pour ne plus avoir ON CONFLICT
CREATE OR REPLACE FUNCTION trigger_populate_quote_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.documents_complete = true 
     AND NEW.ready_for_quote = true 
     AND NEW.status = 'READY_FOR_QUOTE'
     AND (OLD.documents_complete IS DISTINCT FROM true OR OLD.ready_for_quote IS DISTINCT FROM true OR OLD.status IS DISTINCT FROM 'READY_FOR_QUOTE')
  THEN
    -- Insérer seulement si pas déjà présent
    IF NOT EXISTS (SELECT 1 FROM ready_for_quote_queue WHERE lead_id = NEW.id) THEN
      INSERT INTO ready_for_quote_queue (
        lead_id,
        priority_score,
        estimated_value,
        dossier_summary,
        documents_verified,
        status,
        added_at
      ) VALUES (
        NEW.id,
        COALESCE(NEW.ai_qualification_score, 50) + 
          LEAST(20, EXTRACT(days FROM NOW() - NEW.created_at)::integer * 2),
        800.00,
        jsonb_build_object(
          'lead_email', NEW.email,
          'status', NEW.status::text,
          'qualification_score', NEW.ai_qualification_score
        ),
        true,
        'waiting',
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
