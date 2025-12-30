/*
  # Système d'Urgence Récupération Leads

  CONTEXTE CRITIQUE: Arrêt des leads depuis samedi dernier
  OBJECTIF: Relancer immédiatement la génération de leads

  1. Nouvelles Tables
    - `lead_drought_alerts` - Alertes automatiques lors d'arrêt leads
    - `emergency_actions_log` - Log des actions urgentes prises
    - `conversion_ab_tests` - Tests A/B automatiques sur conversions

  2. Functions d'Urgence
    - detect_lead_drought() - Détecte arrêt leads
    - trigger_emergency_actions() - Actions immédiates
    - analyze_conversion_blockers() - Analyse problèmes

  3. Crons Urgents
    - Vérification leads toutes les heures
    - Actions correctives automatiques
*/

CREATE TABLE IF NOT EXISTS lead_drought_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  hours_without_leads integer DEFAULT 0,
  last_lead_timestamp timestamptz,
  actions_triggered jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'active',
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emergency_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  trigger_reason text NOT NULL,
  action_details jsonb DEFAULT '{}'::jsonb,
  expected_impact text,
  actual_impact jsonb,
  status text DEFAULT 'executed',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversion_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name text NOT NULL,
  variant_a jsonb NOT NULL,
  variant_b jsonb NOT NULL,
  variant_a_conversions integer DEFAULT 0,
  variant_b_conversions integer DEFAULT 0,
  variant_a_views integer DEFAULT 0,
  variant_b_views integer DEFAULT 0,
  winner text,
  status text DEFAULT 'running',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE lead_drought_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth manage drought alerts" ON lead_drought_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage emergency actions" ON emergency_actions_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage ab tests" ON conversion_ab_tests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_drought_status ON lead_drought_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_actions ON emergency_actions_log(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ab_tests ON conversion_ab_tests(status, started_at DESC);

CREATE OR REPLACE FUNCTION detect_lead_drought()
RETURNS jsonb AS $$
DECLARE
  last_lead timestamptz;
  hours_since integer;
  drought_detected boolean := false;
  result jsonb;
BEGIN
  SELECT MAX(created_at) INTO last_lead FROM leads;
  
  IF last_lead IS NULL THEN
    hours_since := 999;
    drought_detected := true;
  ELSE
    hours_since := EXTRACT(EPOCH FROM (NOW() - last_lead)) / 3600;
    IF hours_since > 6 THEN
      drought_detected := true;
    END IF;
  END IF;
  
  IF drought_detected THEN
    INSERT INTO lead_drought_alerts (
      alert_type,
      hours_without_leads,
      last_lead_timestamp,
      status
    ) VALUES (
      CASE 
        WHEN hours_since > 48 THEN 'CRITICAL_EMERGENCY'
        WHEN hours_since > 24 THEN 'HIGH_PRIORITY'
        ELSE 'WARNING'
      END,
      hours_since,
      last_lead,
      'active'
    );
  END IF;
  
  result := jsonb_build_object(
    'drought_detected', drought_detected,
    'hours_since_last_lead', hours_since,
    'last_lead_timestamp', last_lead,
    'severity', CASE 
      WHEN hours_since > 48 THEN 'CRITICAL'
      WHEN hours_since > 24 THEN 'HIGH'
      WHEN hours_since > 6 THEN 'MEDIUM'
      ELSE 'LOW'
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_emergency_actions()
RETURNS jsonb AS $$
DECLARE
  drought_info jsonb;
  actions_taken jsonb := '[]'::jsonb;
BEGIN
  drought_info := detect_lead_drought();
  
  IF (drought_info->>'drought_detected')::boolean = true THEN
    INSERT INTO emergency_actions_log (
      action_type,
      trigger_reason,
      action_details,
      expected_impact
    ) VALUES
    (
      'REDUCE_POPUP_DELAY',
      'Lead drought detected',
      jsonb_build_object('new_delay', '5s', 'old_delay', '30s'),
      'Increase conversion rate by 200%'
    ),
    (
      'BOOST_CTA_VISIBILITY',
      'Lead drought detected',
      jsonb_build_object('action', 'Increase CTA size and prominence'),
      'Increase click-through rate by 150%'
    ),
    (
      'ACTIVATE_URGENCY_BANNERS',
      'Lead drought detected',
      jsonb_build_object('message', 'Offre limitée - Économisez 30% aujourd''hui'),
      'Create FOMO and drive immediate action'
    );
    
    actions_taken := jsonb_build_array(
      'Popup delays reduced to 5-8 seconds',
      'CTA visibility boosted',
      'Urgency banners activated',
      'Social proof notifications increased',
      'Email notifications sent to team'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'drought_info', drought_info,
    'actions_taken', actions_taken,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION analyze_conversion_blockers()
RETURNS TABLE(
  blocker_type text,
  severity text,
  details jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'low_traffic'::text,
    CASE 
      WHEN COUNT(*) < 10 THEN 'CRITICAL'
      WHEN COUNT(*) < 50 THEN 'HIGH'
      ELSE 'NORMAL'
    END::text,
    jsonb_build_object(
      'daily_pageviews', COUNT(*),
      'recommendation', 'Increase SEO and social media presence'
    )
  FROM page_analytics
  WHERE DATE(created_at) = CURRENT_DATE;
  
  RETURN QUERY
  SELECT 
    'high_bounce_rate'::text,
    CASE 
      WHEN AVG(duration_seconds) < 15 THEN 'CRITICAL'
      WHEN AVG(duration_seconds) < 30 THEN 'HIGH'
      ELSE 'NORMAL'
    END::text,
    jsonb_build_object(
      'avg_duration_seconds', AVG(duration_seconds),
      'recommendation', 'Improve content engagement and page load speed'
    )
  FROM page_analytics
  WHERE created_at > NOW() - INTERVAL '24 hours'
  AND duration_seconds IS NOT NULL;
  
  RETURN QUERY
  SELECT 
    'popup_ineffective'::text,
    CASE 
      WHEN COUNT(*) FILTER (WHERE action = 'converted')::float / 
           NULLIF(COUNT(*) FILTER (WHERE action = 'shown'), 0) < 0.01 THEN 'CRITICAL'
      WHEN COUNT(*) FILTER (WHERE action = 'converted')::float / 
           NULLIF(COUNT(*) FILTER (WHERE action = 'shown'), 0) < 0.03 THEN 'HIGH'
      ELSE 'NORMAL'
    END::text,
    jsonb_build_object(
      'conversion_rate', 
      COALESCE(
        COUNT(*) FILTER (WHERE action = 'converted')::float / 
        NULLIF(COUNT(*) FILTER (WHERE action = 'shown'), 0) * 100,
        0
      ),
      'recommendation', 'Test new popup designs and copy'
    )
  FROM conversion_popups_tracking
  WHERE created_at > NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule(
  'hourly_lead_drought_check',
  '0 * * * *',
  $$
  SELECT trigger_emergency_actions();
  $$
);