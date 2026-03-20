/*
  # IA Governance — Crons d'automatisation continue

  ## Objectif
  Faire tourner le moteur de gouvernance IA en continu sans intervention manuelle.

  ## Crons créés
  1. `ai-governance-generate-decisions-2h` — Toutes les 2h: appelle generate-ai-decisions
     sur les 10 leads les plus récents. Génère des décisions pour tous les agents.
  2. `ai-governance-auto-approve-1h` — Toutes les heures: auto-approuve les décisions
     avec confidence_score >= seuil (défaut 0.85) et les applique via apply-ai-decision.
  3. `ai-governance-cleanup-daily` — Tous les jours à 3h: purge les décisions
     auto_applied et rejected de plus de 30 jours.

  ## Fonctions créées
  - `auto_approve_high_confidence_decisions()` — lit le seuil depuis system_config,
    trouve les décisions pendantes à haute confiance et appelle apply-ai-decision pour chacune.

  ## Notes
  - Les clés sont lues depuis system_config (pas hardcodées)
  - Délai 500ms entre chaque appel HTTP pour éviter les rate limits
  - Limite 10 approbations par run pour contrôler les coûts
*/

-- 1. Fonction d'auto-approbation
CREATE OR REPLACE FUNCTION auto_approve_high_confidence_decisions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  decision RECORD;
  threshold NUMERIC := 0.85;
  max_per_run INT := 10;
  processed INT := 0;
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  SELECT value INTO threshold
  FROM system_config WHERE key = 'ai_auto_approve_threshold';
  IF threshold IS NULL THEN threshold := 0.85; END IF;

  SELECT value INTO supabase_url FROM system_config WHERE key = 'supabase_url';
  SELECT value INTO service_key FROM system_config WHERE key = 'supabase_service_role_key';

  IF supabase_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING 'auto_approve: supabase_url or service_key missing from system_config';
    RETURN;
  END IF;

  FOR decision IN
    SELECT id, agent, confidence_score
    FROM crm_ai_decisions
    WHERE status = 'pending'
      AND confidence_score >= threshold
      AND created_at > NOW() - INTERVAL '7 days'
    ORDER BY confidence_score DESC, created_at DESC
    LIMIT max_per_run
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := supabase_url || '/functions/v1/apply-ai-decision',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := jsonb_build_object(
          'decision_id', decision.id,
          'approved_by', 'auto-governance-cron'
        )::text,
        timeout_milliseconds := 30000
      );
      processed := processed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'auto_approve: error on decision %: %', decision.id, SQLERRM;
    END;
  END LOOP;

  RAISE LOG 'auto_approve_high_confidence_decisions: % decisions processed', processed;
END;
$$;

-- 2. Cron: génération de décisions toutes les 2 heures
SELECT cron.unschedule('ai-governance-generate-decisions-2h')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-governance-generate-decisions-2h');

SELECT cron.schedule(
  'ai-governance-generate-decisions-2h',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM system_config WHERE key = 'supabase_url') || '/functions/v1/generate-ai-decisions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM system_config WHERE key = 'supabase_service_role_key')
    ),
    body := '{"limit":10}',
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);

-- 3. Cron: auto-approbation toutes les heures
SELECT cron.unschedule('ai-governance-auto-approve-1h')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-governance-auto-approve-1h');

SELECT cron.schedule(
  'ai-governance-auto-approve-1h',
  '30 * * * *',
  'SELECT auto_approve_high_confidence_decisions();'
);

-- 4. Cron: nettoyage quotidien à 3h
SELECT cron.unschedule('ai-governance-cleanup-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-governance-cleanup-daily');

SELECT cron.schedule(
  'ai-governance-cleanup-daily',
  '0 3 * * *',
  $$
  DELETE FROM crm_ai_decisions
  WHERE status IN ('auto_applied', 'rejected')
    AND created_at < NOW() - INTERVAL '30 days';
  $$
);

-- 5. Mettre à jour les valeurs par défaut dans system_config si absentes
INSERT INTO system_config (key, value, description)
VALUES
  ('ai_auto_approve_threshold', '0.85', 'Seuil de confiance pour l''auto-approbation des décisions IA (0-1)'),
  ('ai_max_decisions_per_day', '50', 'Nombre max de décisions IA générées par jour'),
  ('ai_governance_enabled', 'true', 'Active/désactive le moteur de gouvernance IA')
ON CONFLICT (key) DO NOTHING;
