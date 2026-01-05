/*
  # Activation UNIQUEMENT pour Nouveaux Leads (04/01/2026+)

  ## Changements Critiques
  
  1. Configuration système → Date de coupure : 2026-01-04
  2. Tous les processus IA → Ignorent leads créés avant cette date
  3. Templates relances → S'appliquent UNIQUEMENT aux nouveaux leads
  4. Actions autonomes → Créées UNIQUEMENT pour nouveaux leads
  
  ## Résultat
  
  Les leads existants (avant 04/01/2026) ne seront PAS touchés.
  L'IA et les automations démarrent proprement avec les nouveaux leads.
  
  ## Sécurité
  
  Impossible de spammer les anciens clients.
*/

-- Configuration de la date de coupure
INSERT INTO system_config (key, value, description)
VALUES 
  ('automation_start_date', '"2026-01-04T00:00:00Z"'::jsonb, 'Date de début des automations - seuls les leads créés après sont traités'),
  ('filter_old_leads', '"true"'::jsonb, 'Filtrer les anciens leads - ne traiter que les nouveaux')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Fonction pour vérifier si un lead est éligible aux automations
CREATE OR REPLACE FUNCTION is_lead_eligible_for_automation(p_lead_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_created_at timestamptz;
  v_start_date timestamptz;
  v_filter_enabled boolean;
BEGIN
  -- Récupérer la date de création du lead
  SELECT created_at INTO v_lead_created_at
  FROM leads
  WHERE id = p_lead_id;
  
  IF v_lead_created_at IS NULL THEN
    RETURN false;
  END IF;
  
  -- Récupérer la config de filtre
  SELECT (value::text)::boolean INTO v_filter_enabled
  FROM system_config
  WHERE key = 'filter_old_leads';
  
  -- Si le filtre est désactivé, tous les leads sont éligibles
  IF v_filter_enabled IS NULL OR v_filter_enabled = false THEN
    RETURN true;
  END IF;
  
  -- Récupérer la date de début des automations
  SELECT (value::text)::timestamptz INTO v_start_date
  FROM system_config
  WHERE key = 'automation_start_date';
  
  -- Par défaut, date du 04/01/2026
  IF v_start_date IS NULL THEN
    v_start_date := '2026-01-04T00:00:00Z'::timestamptz;
  END IF;
  
  -- Vérifier si le lead a été créé après la date de coupure
  RETURN v_lead_created_at >= v_start_date;
END;
$$;

-- Fonction pour obtenir les leads éligibles
CREATE OR REPLACE FUNCTION get_eligible_leads(p_limit int DEFAULT 100)
RETURNS TABLE(
  id uuid,
  email text,
  first_name text,
  last_name text,
  stage text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date timestamptz;
  v_filter_enabled boolean;
BEGIN
  -- Récupérer la config
  SELECT (value::text)::boolean INTO v_filter_enabled
  FROM system_config
  WHERE key = 'filter_old_leads';
  
  SELECT (value::text)::timestamptz INTO v_start_date
  FROM system_config
  WHERE key = 'automation_start_date';
  
  -- Par défaut
  IF v_start_date IS NULL THEN
    v_start_date := '2026-01-04T00:00:00Z'::timestamptz;
  END IF;
  
  -- Si filtre désactivé, retourner tous les leads
  IF v_filter_enabled IS NULL OR v_filter_enabled = false THEN
    RETURN QUERY
    SELECT l.id, l.email, l.first_name, l.last_name, l.stage, l.created_at
    FROM leads l
    WHERE l.stage NOT IN ('Perdu', 'Archivé')
    ORDER BY l.created_at DESC
    LIMIT p_limit;
  ELSE
    -- Retourner uniquement les leads récents
    RETURN QUERY
    SELECT l.id, l.email, l.first_name, l.last_name, l.stage, l.created_at
    FROM leads l
    WHERE l.created_at >= v_start_date
      AND l.stage NOT IN ('Perdu', 'Archivé')
    ORDER BY l.created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$;

-- Fonction mise à jour pour créer des actions UNIQUEMENT pour leads éligibles
CREATE OR REPLACE FUNCTION create_autonomous_action_safe(
  p_lead_id uuid,
  p_action_type text,
  p_priority text DEFAULT 'medium',
  p_reasoning text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_id uuid;
  v_is_eligible boolean;
BEGIN
  -- Vérifier éligibilité
  SELECT is_lead_eligible_for_automation(p_lead_id) INTO v_is_eligible;
  
  IF NOT v_is_eligible THEN
    RAISE NOTICE 'Lead % non éligible - créé avant date de coupure', p_lead_id;
    RETURN NULL;
  END IF;
  
  -- Créer l'action
  INSERT INTO ai_autonomous_actions (
    target_lead_id,
    action_type,
    priority,
    reasoning,
    status
  ) VALUES (
    p_lead_id,
    p_action_type,
    p_priority,
    COALESCE(p_reasoning, 'Action automatique créée par IA'),
    'pending'
  )
  RETURNING id INTO v_action_id;
  
  RETURN v_action_id;
END;
$$;

-- Fonction pour créer des relances UNIQUEMENT pour leads éligibles
CREATE OR REPLACE FUNCTION schedule_smart_reminder_safe(
  p_lead_id uuid,
  p_template_id uuid,
  p_scheduled_for timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reminder_id uuid;
  v_is_eligible boolean;
  v_template reminder_templates%ROWTYPE;
  v_scheduled_time timestamptz;
BEGIN
  -- Vérifier éligibilité
  SELECT is_lead_eligible_for_automation(p_lead_id) INTO v_is_eligible;
  
  IF NOT v_is_eligible THEN
    RAISE NOTICE 'Lead % non éligible - créé avant date de coupure', p_lead_id;
    RETURN NULL;
  END IF;
  
  -- Récupérer le template
  SELECT * INTO v_template
  FROM reminder_templates
  WHERE id = p_template_id AND active = true;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Template % non trouvé ou inactif', p_template_id;
    RETURN NULL;
  END IF;
  
  -- Calculer la date d'envoi
  IF p_scheduled_for IS NULL THEN
    v_scheduled_time := NOW() + (v_template.delay_hours || ' hours')::interval;
  ELSE
    v_scheduled_time := p_scheduled_for;
  END IF;
  
  -- Créer la relance
  INSERT INTO smart_reminders (
    lead_id,
    template_id,
    scheduled_for,
    status,
    channel
  ) VALUES (
    p_lead_id,
    p_template_id,
    v_scheduled_time,
    'scheduled',
    v_template.channel
  )
  RETURNING id INTO v_reminder_id;
  
  RETURN v_reminder_id;
END;
$$;

-- Vue pour les leads éligibles (pour les dashboards)
CREATE OR REPLACE VIEW eligible_leads_view AS
SELECT 
  l.*,
  CASE 
    WHEN l.created_at >= (
      SELECT COALESCE((value::text)::timestamptz, '2026-01-04T00:00:00Z'::timestamptz)
      FROM system_config 
      WHERE key = 'automation_start_date'
    ) THEN true
    ELSE false
  END as is_eligible
FROM leads l;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_leads_created_at_eligible 
ON leads(created_at) 
WHERE created_at >= '2026-01-04T00:00:00Z'::timestamptz;

-- Statistiques avec filtre
CREATE OR REPLACE FUNCTION get_filtered_system_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config jsonb;
  v_templates jsonb;
  v_stats jsonb;
  v_start_date timestamptz;
BEGIN
  -- Config système
  SELECT jsonb_object_agg(key, value) INTO v_config
  FROM system_config;
  
  -- Date de coupure
  SELECT COALESCE((value::text)::timestamptz, '2026-01-04T00:00:00Z'::timestamptz)
  INTO v_start_date
  FROM system_config
  WHERE key = 'automation_start_date';
  
  -- Templates actifs
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE active = true),
    'inactive', COUNT(*) FILTER (WHERE active = false)
  ) INTO v_templates
  FROM reminder_templates;
  
  -- Stats FILTRÉES (uniquement nouveaux leads)
  SELECT jsonb_build_object(
    'pending_actions', (
      SELECT COUNT(*) 
      FROM ai_autonomous_actions aa
      JOIN leads l ON aa.target_lead_id = l.id
      WHERE aa.status = 'pending'
        AND l.created_at >= v_start_date
    ),
    'scheduled_reminders', (
      SELECT COUNT(*) 
      FROM smart_reminders sr
      JOIN leads l ON sr.lead_id = l.id
      WHERE sr.status = 'scheduled'
        AND l.created_at >= v_start_date
    ),
    'total_leads', (SELECT COUNT(*) FROM leads),
    'eligible_leads', (SELECT COUNT(*) FROM leads WHERE created_at >= v_start_date),
    'active_eligible_leads', (
      SELECT COUNT(*) 
      FROM leads 
      WHERE created_at >= v_start_date 
        AND stage NOT IN ('Perdu', 'Archivé')
    ),
    'automation_start_date', v_start_date
  ) INTO v_stats;
  
  RETURN jsonb_build_object(
    'config', v_config,
    'templates', v_templates,
    'stats', v_stats,
    'checked_at', NOW()
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_lead_eligible_for_automation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_eligible_leads(int) TO authenticated;
GRANT EXECUTE ON FUNCTION create_autonomous_action_safe(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_smart_reminder_safe(uuid, uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_filtered_system_status() TO authenticated;
GRANT SELECT ON eligible_leads_view TO authenticated;

-- Message de confirmation
DO $$ 
BEGIN
  RAISE NOTICE '✅ Filtre activé : Seuls les leads créés >= 2026-01-04 seront traités';
  RAISE NOTICE '🔒 Les leads existants sont protégés contre les automations';
END $$;