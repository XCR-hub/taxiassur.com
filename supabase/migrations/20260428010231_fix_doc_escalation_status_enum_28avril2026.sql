/*
  # Correction valeurs enum lead_status (uppercase)
*/

CREATE OR REPLACE FUNCTION public.cron_escalate_stuck_documents_to_commercial()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer := 0;
  v_lead record;
BEGIN
  FOR v_lead IN
    SELECT l.id, l.first_name, l.last_name, l.email, l.created_at, l.assigned_to
    FROM crm_leads l
    WHERE l.status::text IN ('NOUVEAU_LEAD', 'COLLECTE_DOCUMENTS', 'DOCUMENTS_REQUIRED', 'DOCUMENTS_PARTIAL', 'CONTACT_CONFIRMED')
      AND l.created_at < now() - interval '5 days'
      AND COALESCE(l.is_archived, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM crm_event_notifications n
        WHERE n.lead_id = l.id
          AND n.event_type = 'documents_stalled'
          AND n.created_at > now() - interval '3 days'
      )
  LOOP
    INSERT INTO crm_event_notifications (
      lead_id, event_type, type, title, message, priority, context_data, action_url, created_at
    ) VALUES (
      v_lead.id,
      'documents_stalled',
      'warning',
      'Documents bloqués depuis +5 jours',
      format('Le prospect %s %s n''a toujours pas fourni tous les documents nécessaires pour générer un devis.',
             COALESCE(v_lead.first_name, ''), COALESCE(v_lead.last_name, '')),
      2,
      jsonb_build_object('lead_id', v_lead.id, 'days_since_creation',
                         EXTRACT(DAY FROM now() - v_lead.created_at)),
      '/admin/crm/leads/' || v_lead.id,
      now()
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('escalades_documents', v_count, 'executed_at', now());
END;
$$;
