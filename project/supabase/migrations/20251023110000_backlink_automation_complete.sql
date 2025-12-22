/*
  # Automatisation Backlinks - Système Complet
  
  1. Fonctions
    - calculate_opportunity_score() - Calcule score qualité opportunité
    - trigger_calculate_score() - Trigger function pour auto-scoring
  
  2. Cron Jobs (3)
    - daily_backlink_scan (6h) - Scan quotidien opportunités
    - daily_backlink_outreach (10h, lun-ven) - Envoi emails automatique
    - weekly_backlink_followup (mardi 14h) - Relance J+7
  
  3. Secrets
    - GOOGLE_CSE_API_KEY
    - GOOGLE_CSE_CX_ID
    - HUNTER_IO_API_KEY (optionnel, 25/mois gratuit)
*/

-- ========================================
-- 1. FONCTION: CALCUL SCORE OPPORTUNITÉ
-- ========================================

CREATE OR REPLACE FUNCTION calculate_opportunity_score(opp_id uuid)
RETURNS integer AS $$
DECLARE
  score integer := 0;
  da integer;
  relevance integer;
  traffic integer;
  spam integer;
BEGIN
  -- Récupérer les valeurs
  SELECT 
    COALESCE(domain_authority, 0),
    COALESCE(relevance_score, 0),
    COALESCE(estimated_traffic, 0),
    COALESCE(spam_score, 0)
  INTO da, relevance, traffic, spam
  FROM backlink_opportunities
  WHERE id = opp_id;
  
  -- Domain Authority (max 40 points)
  score := score + LEAST(da, 40);
  
  -- Relevance Score (max 30 points)
  score := score + ((relevance * 0.3)::integer);
  
  -- Traffic estimé (max 20 points)
  score := score + LEAST(traffic / 50, 20);
  
  -- Spam Score (malus, -10 points max)
  score := score - spam;
  
  -- Garantir score positif
  RETURN GREATEST(score, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 2. TRIGGER FUNCTION: AUTO-SCORING
-- ========================================

CREATE OR REPLACE FUNCTION trigger_calculate_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculer le score automatiquement
  NEW.quality_score := calculate_opportunity_score(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS update_opportunity_score ON backlink_opportunities;

-- Créer le trigger
CREATE TRIGGER update_opportunity_score
BEFORE INSERT OR UPDATE ON backlink_opportunities
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_score();

-- Ajouter colonne quality_score si manquante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'backlink_opportunities' AND column_name = 'quality_score'
  ) THEN
    ALTER TABLE backlink_opportunities ADD COLUMN quality_score integer DEFAULT 0;
  END IF;
END $$;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_quality_score 
ON backlink_opportunities(quality_score DESC);

CREATE INDEX IF NOT EXISTS idx_backlink_opportunities_status_score 
ON backlink_opportunities(status, quality_score DESC);

-- ========================================
-- 3. CRON JOB 1: SCAN QUOTIDIEN (6H)
-- ========================================

-- Supprimer ancien cron s'il existe
SELECT cron.unschedule('daily_backlink_scan') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily_backlink_scan'
);

-- Créer nouveau cron
SELECT cron.schedule(
  'daily_backlink_scan',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scan-backlinks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'competitors', jsonb_build_array('mfa.fr', 'april-moto.com', 'axa.fr', 'allianz.fr')
    )
  );
  $$
);

-- ========================================
-- 4. CRON JOB 2: ENVOI EMAILS (10H LUN-VEN)
-- ========================================

-- Supprimer ancien cron s'il existe
SELECT cron.unschedule('daily_backlink_outreach') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily_backlink_outreach'
);

-- Créer nouveau cron (Lundi à Vendredi uniquement)
SELECT cron.schedule(
  'daily_backlink_outreach',
  '0 10 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/backlink-auto-outreach',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'campaignId', (SELECT id FROM backlink_campaigns WHERE status = 'active' ORDER BY created_at DESC LIMIT 1),
      'maxEmailsPerRun', 10
    )
  );
  $$
);

-- ========================================
-- 5. CRON JOB 3: FOLLOW-UP J+7 (MARDI 14H)
-- ========================================

-- Supprimer ancien cron s'il existe
SELECT cron.unschedule('weekly_backlink_followup') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'weekly_backlink_followup'
);

-- Créer nouveau cron
SELECT cron.schedule(
  'weekly_backlink_followup',
  '0 14 * * 2',
  $$
  -- Marquer opportunités nécessitant follow-up
  UPDATE backlink_opportunities
  SET 
    status = 'follow_up_needed',
    updated_at = now()
  WHERE 
    status = 'contacted'
    AND last_contacted_at < (now() - interval '7 days')
    AND (
      SELECT COUNT(*) 
      FROM backlink_outreach_log 
      WHERE opportunity_id = backlink_opportunities.id 
      AND action_type = 'follow_up_sent'
    ) = 0;
  
  -- Logger l'action
  INSERT INTO automation_logs (automation_name, status, message)
  VALUES (
    'weekly_backlink_followup',
    'success',
    'Marked ' || (SELECT COUNT(*) FROM backlink_opportunities WHERE status = 'follow_up_needed') || ' opportunities for follow-up'
  );
  $$
);

-- ========================================
-- 6. VÉRIFICATION
-- ========================================

-- Log de confirmation
INSERT INTO automation_logs (automation_name, status, message, created_at)
VALUES (
  'backlink_automation_setup',
  'success',
  'Backlink automation complete: scoring function + 3 cron jobs activated',
  now()
);

-- Afficher les crons actifs
DO $$
DECLARE
  cron_count integer;
BEGIN
  SELECT COUNT(*) INTO cron_count
  FROM cron.job
  WHERE jobname LIKE '%backlink%' AND active = true;
  
  RAISE NOTICE 'Backlink cron jobs actifs: %', cron_count;
END $$;
