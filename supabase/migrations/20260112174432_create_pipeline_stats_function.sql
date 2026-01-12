/*
  # Fonction Stats Pipeline

  1. Fonction
    - get_pipeline_stats: Retourne les statistiques du pipeline
*/

CREATE OR REPLACE FUNCTION get_pipeline_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_leads', (SELECT COUNT(*) FROM crm_leads WHERE status NOT IN ('lost', 'won')),
    'ready_for_quote', (SELECT COUNT(*) FROM crm_leads WHERE ready_for_quote = true AND current_stage_key = 'dossier_complete'),
    'quote_pending', (SELECT COUNT(*) FROM crm_leads WHERE current_stage_key = 'quote_pending'),
    'documents_collecting', (SELECT COUNT(*) FROM crm_leads WHERE current_stage_key = 'document_collection'),
    'avg_time_to_quote_hours', COALESCE(
      (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (quote_sent_at - created_at)) / 3600)::numeric, 1)
       FROM crm_leads WHERE quote_sent_at IS NOT NULL AND created_at > now() - interval '30 days'),
      24
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;