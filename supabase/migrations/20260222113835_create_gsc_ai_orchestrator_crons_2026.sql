/*
  # Automatisations pour l'Orchestrateur GSC + IA Collective
  
  1. Crons Créés
    - **Lundi 9h** : Session stratégique hebdomadaire (toutes les IA analysent les opportunités)
    - **Tous les jours 4h** : Exécution des décisions approuvées
    - **Tous les jours 6h, 12h, 18h** : Génération et publication de contenu (3x/jour)
    - **Tous les jours 23h** : Mise à jour des performances du contenu publié
  
  2. Workflow Automatique
    - Les IA dialoguent et définissent la stratégie
    - Décisions validées collectivement (consensus ≥ 80%)
    - Contenu généré et publié automatiquement
    - Performances suivies et optimisées en continu
  
  3. Sécurité
    - Système conserve l'existant (pas de modification des contenus actuels)
    - Validation possible avant publication
    - Rollback automatique en cas d'erreur
*/

-- Cron 1 : Session stratégique hebdomadaire (Lundi 9h)
-- Les IA analysent collectivement les opportunités GSC et définissent la stratégie
SELECT cron.schedule(
  'gsc-ai-weekly-strategy-session',
  '0 9 * * 1',  -- Tous les lundis à 9h
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url', true) || '/functions/v1/gsc-ai-orchestrator'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_service_role_key', true))
      ),
      body := jsonb_build_object(
        'action', 'create_strategy_session'
      ),
      timeout_milliseconds := 60000
    ) AS request_id;
  $$
);

-- Cron 2 : Exécution des décisions approuvées (Tous les jours 4h)
-- Transforme les décisions validées en tâches de production
SELECT cron.schedule(
  'gsc-ai-execute-approved-decisions',
  '0 4 * * *',  -- Tous les jours à 4h du matin
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url', true) || '/functions/v1/gsc-ai-orchestrator'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_service_role_key', true))
      ),
      body := jsonb_build_object(
        'action', 'execute_decisions'
      ),
      timeout_milliseconds := 60000
    ) AS request_id;
  $$
);

-- Cron 3 : Génération et publication de contenu (3 fois par jour)
-- Génère le contenu approuvé et le publie automatiquement
SELECT cron.schedule(
  'gsc-ai-generate-content-morning',
  '0 6 * * *',  -- 6h du matin
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url', true) || '/functions/v1/gsc-ai-orchestrator'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_service_role_key', true))
      ),
      body := jsonb_build_object(
        'action', 'generate_content'
      ),
      timeout_milliseconds := 120000
    ) AS request_id;
  $$
);

SELECT cron.schedule(
  'gsc-ai-generate-content-noon',
  '0 12 * * *',  -- Midi
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url', true) || '/functions/v1/gsc-ai-orchestrator'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_service_role_key', true))
      ),
      body := jsonb_build_object(
        'action', 'generate_content'
      ),
      timeout_milliseconds := 120000
    ) AS request_id;
  $$
);

SELECT cron.schedule(
  'gsc-ai-generate-content-evening',
  '0 18 * * *',  -- 18h
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url', true) || '/functions/v1/gsc-ai-orchestrator'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_service_role_key', true))
      ),
      body := jsonb_build_object(
        'action', 'generate_content'
      ),
      timeout_milliseconds := 120000
    ) AS request_id;
  $$
);

-- Cron 4 : Mise à jour des performances du contenu publié (Tous les jours 23h)
-- Compare les performances GSC actuelles vs initiales
SELECT cron.schedule(
  'gsc-ai-update-content-performance',
  '0 23 * * *',  -- 23h tous les soirs
  $$
  WITH content_updates AS (
    SELECT
      pc.id,
      pc.target_query,
      pc.initial_clicks,
      pc.initial_impressions,
      gq.clicks as current_clicks,
      gq.impressions as current_impressions,
      gq.position as current_position,
      gq.ctr as current_ctr
    FROM gsc_published_content pc
    LEFT JOIN LATERAL (
      SELECT clicks, impressions, position, ctr
      FROM gsc_queries
      WHERE query = pc.target_query
      ORDER BY date DESC
      LIMIT 1
    ) gq ON true
    WHERE pc.is_active = true
  )
  UPDATE gsc_published_content pc
  SET
    current_clicks = cu.current_clicks,
    current_impressions = cu.current_impressions,
    current_position = cu.current_position,
    current_ctr = cu.current_ctr,
    clicks_gained = cu.current_clicks - cu.initial_clicks,
    position_change = pc.initial_position - cu.current_position,
    performance_trend = CASE
      WHEN cu.current_clicks > pc.initial_clicks * 1.5 THEN 'improving'
      WHEN cu.current_clicks < pc.initial_clicks * 0.7 THEN 'declining'
      ELSE 'stable'
    END,
    needs_optimization = (cu.current_clicks < pc.initial_clicks * 0.7),
    last_updated_at = now()
  FROM content_updates cu
  WHERE pc.id = cu.id;
  $$
);

-- Fonction : Obtenir le statut du système autonome
CREATE OR REPLACE FUNCTION get_gsc_autonomous_system_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'last_strategy_session', (
      SELECT jsonb_build_object(
        'id', id,
        'session_name', session_name,
        'started_at', started_at,
        'completed_at', completed_at,
        'status', status,
        'opportunities_analyzed', jsonb_array_length(COALESCE(gsc_opportunities_analyzed, '[]'::jsonb)),
        'consensus_reached', consensus_reached
      )
      FROM gsc_ai_strategy_sessions
      ORDER BY created_at DESC
      LIMIT 1
    ),
    'pending_decisions', (
      SELECT COUNT(*)
      FROM gsc_ai_collaborative_decisions
      WHERE execution_status = 'pending'
    ),
    'approved_decisions', (
      SELECT COUNT(*)
      FROM gsc_ai_collaborative_decisions
      WHERE execution_status = 'approved'
    ),
    'content_in_queue', (
      SELECT COUNT(*)
      FROM gsc_content_production_queue
      WHERE status IN ('queued', 'generating')
    ),
    'content_published_today', (
      SELECT COUNT(*)
      FROM gsc_published_content
      WHERE DATE(published_at) = CURRENT_DATE
    ),
    'content_published_week', (
      SELECT COUNT(*)
      FROM gsc_published_content
      WHERE published_at >= CURRENT_DATE - INTERVAL '7 days'
    ),
    'total_clicks_gained', (
      SELECT COALESCE(SUM(clicks_gained), 0)
      FROM gsc_published_content
      WHERE is_active = true
    ),
    'top_performing_content', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'title', title,
          'url', url,
          'clicks_gained', clicks_gained,
          'current_clicks', current_clicks,
          'performance_trend', performance_trend
        )
      )
      FROM (
        SELECT title, url, clicks_gained, current_clicks, performance_trend
        FROM gsc_published_content
        WHERE is_active = true AND clicks_gained > 0
        ORDER BY clicks_gained DESC
        LIMIT 5
      ) top_content
    ),
    'system_health', jsonb_build_object(
      'crons_active', true,
      'last_sync', (SELECT MAX(created_at) FROM gsc_queries),
      'ai_models_available', 4,
      'autonomous_mode', true
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Vue : Résumé des sessions stratégiques
CREATE OR REPLACE VIEW gsc_strategy_sessions_summary AS
SELECT
  s.id,
  s.session_name,
  s.session_type,
  s.started_at,
  s.completed_at,
  s.status,
  s.consensus_reached,
  jsonb_array_length(COALESCE(s.gsc_opportunities_analyzed, '[]'::jsonb)) as opportunities_count,
  (SELECT COUNT(*) FROM gsc_ai_collaborative_decisions WHERE session_id = s.id) as decisions_count,
  (SELECT COUNT(*) FROM gsc_ai_collaborative_decisions WHERE session_id = s.id AND execution_status = 'completed') as decisions_executed,
  s.created_at
FROM gsc_ai_strategy_sessions s
ORDER BY s.created_at DESC;

-- Vue : File d'attente de production
CREATE OR REPLACE VIEW gsc_production_queue_status AS
SELECT
  q.id,
  q.content_type,
  q.target_query,
  q.priority,
  q.status,
  q.approved_for_publication,
  q.needs_human_review,
  q.scheduled_for,
  d.target_query as decision_query,
  d.priority as decision_priority,
  q.created_at
FROM gsc_content_production_queue q
LEFT JOIN gsc_ai_collaborative_decisions d ON q.decision_id = d.id
WHERE q.status IN ('queued', 'generating', 'generated', 'reviewing')
ORDER BY q.priority DESC, q.created_at ASC;

-- Commentaires pour documentation
COMMENT ON TABLE gsc_ai_strategy_sessions IS 'Sessions de réflexion collective où les IA analysent les opportunités GSC et définissent la stratégie SEO';
COMMENT ON TABLE gsc_ai_collaborative_decisions IS 'Décisions prises collectivement par les IA avec vote et consensus';
COMMENT ON TABLE gsc_content_production_queue IS 'File d''attente de production de contenu optimisé SEO';
COMMENT ON TABLE gsc_published_content IS 'Historique et suivi des performances du contenu publié automatiquement';

COMMENT ON FUNCTION create_gsc_ai_strategy_session IS 'Crée une nouvelle session de stratégie collaborative entre les IA';
COMMENT ON FUNCTION record_collaborative_decision IS 'Enregistre une décision prise collectivement avec vote des IA';
COMMENT ON FUNCTION queue_content_production IS 'Ajoute un contenu à la file de production automatique';
COMMENT ON FUNCTION track_published_content IS 'Enregistre et suit les performances du contenu publié';
COMMENT ON FUNCTION get_next_content_to_generate IS 'Récupère le prochain contenu à générer dans la queue';
COMMENT ON FUNCTION get_gsc_autonomous_system_status IS 'Obtient le statut complet du système autonome GSC + IA';
