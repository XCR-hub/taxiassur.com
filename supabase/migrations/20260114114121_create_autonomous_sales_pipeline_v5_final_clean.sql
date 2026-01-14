/*
  # Système de Pipeline de Vente Autonome Complet - Version Finale Clean

  Ce système gère automatiquement le parcours complet du lead.
*/

-- 1. Fonction check_documents_complete
CREATE OR REPLACE FUNCTION check_documents_complete(lead_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  checklist JSONB;
  required_count INTEGER := 0;
  received_count INTEGER := 0;
  item JSONB;
BEGIN
  SELECT document_checklist INTO checklist
  FROM crm_leads
  WHERE id = lead_id_param;

  IF checklist IS NULL OR jsonb_array_length(checklist) = 0 THEN
    RETURN FALSE;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(checklist)
  LOOP
    IF (item->>'required')::boolean = true THEN
      required_count := required_count + 1;
      IF (item->>'received')::boolean = true THEN
        received_count := received_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN required_count > 0 AND required_count = received_count;
END;
$$;

-- 2. Fonction populate_quote_queue
CREATE OR REPLACE FUNCTION populate_quote_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lead_record RECORD;
  priority INTEGER;
BEGIN
  FOR lead_record IN
    SELECT 
      l.id,
      l.email,
      l.ai_qualification_score,
      l.created_at,
      l.status
    FROM crm_leads l
    WHERE l.documents_complete = true
      AND l.ready_for_quote = true
      AND l.status = 'READY_FOR_QUOTE'
      AND NOT EXISTS (
        SELECT 1 FROM ready_for_quote_queue q 
        WHERE q.lead_id = l.id
      )
  LOOP
    priority := GREATEST(0, LEAST(100,
      COALESCE(lead_record.ai_qualification_score, 50) + 
      LEAST(20, EXTRACT(days FROM NOW() - lead_record.created_at)::integer * 2)
    ));

    INSERT INTO ready_for_quote_queue (
      lead_id,
      priority_score,
      estimated_value,
      dossier_summary,
      recommended_companies,
      documents_verified,
      status,
      added_at
    ) VALUES (
      lead_record.id,
      priority,
      800.00,
      jsonb_build_object(
        'lead_email', lead_record.email,
        'status', lead_record.status::text,
        'qualification_score', lead_record.ai_qualification_score
      ),
      ARRAY[]::text[],
      true,
      'waiting',
      NOW()
    );
  END LOOP;
END;
$$;

-- 3. Trigger pour peupler automatiquement la queue
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
    )
    ON CONFLICT (lead_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_populate_quote_queue ON crm_leads;

CREATE TRIGGER auto_populate_quote_queue
AFTER UPDATE ON crm_leads
FOR EACH ROW
EXECUTE FUNCTION trigger_populate_quote_queue();

-- 4. Fonction auto_advance_lead_stage
CREATE OR REPLACE FUNCTION auto_advance_lead_stage(lead_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_status lead_status;
  docs_complete BOOLEAN;
BEGIN
  SELECT status, documents_complete INTO current_status, docs_complete
  FROM crm_leads
  WHERE id = lead_id_param;

  CASE current_status
    WHEN 'NEW_LEAD' THEN
      UPDATE crm_leads
      SET 
        status = 'DOCUMENTS_REQUIRED',
        current_stage_key = 'documents_collecting',
        workflow_stage = 'documents_collecting',
        stage_entered_at = NOW(),
        updated_at = NOW()
      WHERE id = lead_id_param;

    WHEN 'DOCUMENTS_REQUIRED', 'DOCUMENTS_PARTIAL' THEN
      docs_complete := check_documents_complete(lead_id_param);
      
      IF docs_complete THEN
        UPDATE crm_leads
        SET 
          status = 'READY_FOR_QUOTE',
          current_stage_key = 'ready_for_quote',
          workflow_stage = 'ready_for_quote',
          documents_complete = true,
          ready_for_quote = true,
          documents_received_at = NOW(),
          stage_entered_at = NOW(),
          updated_at = NOW()
        WHERE id = lead_id_param;
      END IF;

    ELSE
      NULL;
  END CASE;
END;
$$;

-- 5. Fonction get_pipeline_stats
CREATE FUNCTION get_pipeline_stats()
RETURNS TABLE (
  total_leads INTEGER,
  ready_for_quote INTEGER,
  quote_pending INTEGER,
  documents_collecting INTEGER,
  avg_time_to_quote_hours NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_leads,
    COUNT(*) FILTER (WHERE status = 'READY_FOR_QUOTE')::INTEGER as ready_for_quote,
    COUNT(*) FILTER (WHERE status IN ('QUOTE_SENT', 'SIGNATURE_PENDING'))::INTEGER as quote_pending,
    COUNT(*) FILTER (WHERE status IN ('DOCUMENTS_REQUIRED', 'DOCUMENTS_PARTIAL'))::INTEGER as documents_collecting,
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (documents_received_at - created_at)) / 3600)
      FILTER (WHERE documents_received_at IS NOT NULL),
      0
    )::NUMERIC(10,1) as avg_time_to_quote_hours
  FROM crm_leads
  WHERE status NOT IN ('ACTIVE_CLIENT', 'CLIENT_LOST');
END;
$$;

-- 6. Fonction update_document_checklist
CREATE OR REPLACE FUNCTION update_document_checklist(
  lead_id_param UUID,
  document_type TEXT,
  received BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  checklist JSONB;
  item JSONB;
  new_items JSONB := '[]'::jsonb;
BEGIN
  SELECT document_checklist INTO checklist
  FROM crm_leads
  WHERE id = lead_id_param;

  IF checklist IS NULL THEN
    checklist := '[]'::jsonb;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(checklist)
  LOOP
    IF item->>'type' = document_type THEN
      new_items := new_items || jsonb_build_object(
        'type', document_type,
        'label', item->>'label',
        'required', (item->>'required')::boolean,
        'received', received,
        'received_at', CASE WHEN received THEN to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') ELSE NULL END
      );
    ELSE
      new_items := new_items || item;
    END IF;
  END LOOP;

  UPDATE crm_leads
  SET 
    document_checklist = new_items,
    documents_complete = check_documents_complete(lead_id_param),
    updated_at = NOW()
  WHERE id = lead_id_param;

  PERFORM auto_advance_lead_stage(lead_id_param);
END;
$$;

-- 7. Peupler la queue
SELECT populate_quote_queue();
