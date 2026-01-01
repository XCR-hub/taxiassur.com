/*
  # Crons pour Automatisation Complète du Pipeline CRM
  
  Configure les crons pour exécuter automatiquement :
  - Traitement des relances (toutes les heures)
  - Workflow devis, paiements, contrats (toutes les 2 heures)
  - Cross-selling bi-mensuel (quotidien)
*/

-- ==========================================
-- 1. PIPELINE AUTOMATION - Toutes les heures
-- ==========================================

SELECT cron.schedule(
  'pipeline_automation_hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/pipeline-automation-engine',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ==========================================
-- 2. NETTOYAGE DES ANCIENNES COMMUNICATIONS
-- ==========================================

SELECT cron.schedule(
  'cleanup_old_communications',
  '0 3 * * 0',
  $$
  -- Nettoyer les communications de plus de 6 mois
  DELETE FROM lead_communications
  WHERE created_at < NOW() - INTERVAL '6 months'
  AND status IN ('sent', 'delivered');
  
  -- Nettoyer les relances terminées de plus de 3 mois
  DELETE FROM lead_reminders
  WHERE status = 'completed'
  AND completed_at < NOW() - INTERVAL '3 months';
  
  -- Archiver les anciennes étapes du pipeline (> 1 an)
  DELETE FROM lead_pipeline_history
  WHERE exited_at < NOW() - INTERVAL '1 year';
  $$
);

-- ==========================================
-- FONCTIONS UTILITAIRES POUR LE CRM
-- ==========================================

-- Fonction pour obtenir tous les leads avec leur statut complet
CREATE OR REPLACE FUNCTION get_leads_with_pipeline_status()
RETURNS TABLE (
  lead_id uuid,
  lead_name text,
  lead_email text,
  lead_phone text,
  lead_status text,
  current_stage text,
  stage_category text,
  documents_complete boolean,
  info_complete boolean,
  missing_documents text[],
  missing_info text[],
  days_in_current_stage integer,
  total_communications integer,
  last_communication_date timestamptz,
  has_pending_reminders boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id as lead_id,
    l.name as lead_name,
    l.email as lead_email,
    l.phone as lead_phone,
    l.status as lead_status,
    lph.stage_name as current_stage,
    lps.stage_category,
    (check_lead_documents_complete(l.id)->>'all_documents_present')::boolean as documents_complete,
    (check_lead_info_complete(l.id)->>'all_info_present')::boolean as info_complete,
    ARRAY(
      SELECT document_type 
      FROM lead_documents 
      WHERE lead_id = l.id 
      AND status = 'missing'
    ) as missing_documents,
    (check_lead_info_complete(l.id)->>'missing_info')::text[] as missing_info,
    EXTRACT(DAY FROM (NOW() - lph.entered_at))::integer as days_in_current_stage,
    (
      SELECT COUNT(*) 
      FROM lead_communications 
      WHERE lead_id = l.id
    )::integer as total_communications,
    (
      SELECT MAX(created_at) 
      FROM lead_communications 
      WHERE lead_id = l.id
    ) as last_communication_date,
    EXISTS(
      SELECT 1 
      FROM lead_reminders 
      WHERE lead_id = l.id 
      AND status = 'pending'
    ) as has_pending_reminders,
    l.created_at
  FROM crm_leads_enhanced l
  LEFT JOIN lead_pipeline_history lph ON lph.lead_id = l.id AND lph.exited_at IS NULL
  LEFT JOIN lead_pipeline_stages lps ON lps.id = lph.stage_id
  ORDER BY l.created_at DESC;
END;
$$;

-- Fonction pour obtenir les statistiques du pipeline
CREATE OR REPLACE FUNCTION get_pipeline_statistics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_leads', (SELECT COUNT(*) FROM crm_leads_enhanced),
    'new_leads_today', (
      SELECT COUNT(*) 
      FROM crm_leads_enhanced 
      WHERE created_at >= CURRENT_DATE
    ),
    'active_clients', (
      SELECT COUNT(*) 
      FROM crm_leads_enhanced 
      WHERE status = 'converted'
    ),
    'leads_by_stage', (
      SELECT jsonb_object_agg(stage_name, lead_count)
      FROM (
        SELECT lph.stage_name, COUNT(*) as lead_count
        FROM lead_pipeline_history lph
        WHERE lph.exited_at IS NULL
        GROUP BY lph.stage_name
      ) stage_counts
    ),
    'documents_pending', (
      SELECT COUNT(DISTINCT lead_id)
      FROM lead_documents
      WHERE status = 'missing'
    ),
    'quotes_pending', (
      SELECT COUNT(*)
      FROM lead_quotes
      WHERE status IN ('sent', 'viewed')
    ),
    'payments_pending', (
      SELECT COUNT(*)
      FROM lead_payments
      WHERE status = 'pending'
    ),
    'contracts_pending_signature', (
      SELECT COUNT(*)
      FROM lead_contracts
      WHERE status = 'ready_for_signature'
    ),
    'reminders_scheduled_today', (
      SELECT COUNT(*)
      FROM lead_reminders
      WHERE status = 'pending'
      AND DATE(scheduled_for) = CURRENT_DATE
    ),
    'communications_sent_today', (
      SELECT COUNT(*)
      FROM lead_communications
      WHERE DATE(sent_at) = CURRENT_DATE
    ),
    'cross_sell_sent_this_month', (
      SELECT COUNT(*)
      FROM cross_sell_history
      WHERE DATE_TRUNC('month', sent_at) = DATE_TRUNC('month', CURRENT_DATE)
    ),
    'average_time_to_quote_days', (
      SELECT AVG(
        EXTRACT(DAY FROM (
          (SELECT entered_at FROM lead_pipeline_history WHERE lead_id = lq.lead_id AND stage_name = 'devis_envoye' ORDER BY entered_at DESC LIMIT 1) -
          (SELECT entered_at FROM lead_pipeline_history WHERE lead_id = lq.lead_id AND stage_name = 'nouveau_lead' ORDER BY entered_at ASC LIMIT 1)
        ))
      )::numeric(10,2)
      FROM lead_quotes lq
      WHERE lq.sent_at IS NOT NULL
    ),
    'conversion_rate_percent', (
      SELECT CASE 
        WHEN COUNT(*) > 0 
        THEN (COUNT(*) FILTER (WHERE status = 'converted')::numeric / COUNT(*)::numeric * 100)::numeric(5,2)
        ELSE 0
      END
      FROM crm_leads_enhanced
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    )
  ) INTO result;
  
  RETURN result;
END;
$$;
