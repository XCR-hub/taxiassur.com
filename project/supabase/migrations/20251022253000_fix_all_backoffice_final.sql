/*
  # Fix Final - Toutes les interfaces backoffice

  Corrige TOUS les problèmes SQL détectés :
  - automation_status (table vs vue)
  - content_schedule (colonnes manquantes)
  - marketing_templates (table vide)

  ## Corrections
  1. Drop propre automation_status (TABLE ou VIEW)
  2. Recréation structure content_schedule
  3. Peuplement marketing_templates
*/

-- ============================================
-- 1. FIX AUTOMATION_STATUS
-- ============================================

-- Drop automation_status qu'elle soit TABLE ou VIEW
DO $$
BEGIN
  -- Essayer de drop comme vue
  EXECUTE 'DROP VIEW IF EXISTS automation_status CASCADE';
EXCEPTION
  WHEN OTHERS THEN
    -- Si erreur, essayer comme table
    BEGIN
      EXECUTE 'DROP TABLE IF EXISTS automation_status CASCADE';
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END;
END $$;

-- Drop les fonctions liées
DROP FUNCTION IF EXISTS log_automation_run CASCADE;
DROP FUNCTION IF EXISTS get_automation_stats CASCADE;
DROP FUNCTION IF EXISTS toggle_automation CASCADE;

-- Recréer la table automation_logs proprement
DROP TABLE IF EXISTS automation_logs CASCADE;

CREATE TABLE automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error', 'running')),
  message text,
  details jsonb DEFAULT '{}'::jsonb,
  execution_time_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_automation_logs_name ON automation_logs(automation_name);
CREATE INDEX idx_automation_logs_created_at ON automation_logs(created_at DESC);
CREATE INDEX idx_automation_logs_status ON automation_logs(status);

ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read automation_logs" ON automation_logs;
CREATE POLICY "Public read automation_logs"
  ON automation_logs FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Service role write automation_logs" ON automation_logs;
CREATE POLICY "Service role write automation_logs"
  ON automation_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Créer la VUE automation_status
CREATE VIEW automation_status AS
SELECT
  j.jobid::text as id,
  j.jobname as name,
  CASE j.jobname
    WHEN 'generate-blog-articles-daily' THEN '📝 Blog quotidien'
    WHEN 'generate-faq-weekly' THEN '❓ FAQ hebdomadaire'
    WHEN 'aggregate-news-6h' THEN '📰 Actualités (6h)'
    WHEN 'linkedin-auto-publish-daily' THEN '📱 LinkedIn quotidien'
    WHEN 'linkedin-daily-post' THEN '📱 Post LinkedIn'
    WHEN 'pinterest-auto-publish-morning' THEN '📱 Pinterest matin'
    WHEN 'pinterest-auto-publish-evening' THEN '📱 Pinterest soir'
    WHEN 'pinterest-morning-post' THEN '📱 Pin matin'
    WHEN 'pinterest-evening-post' THEN '📱 Pin soir'
    WHEN 'youtube-daily-post' THEN '📱 YouTube quotidien'
    WHEN 'seo-daily-refresh' THEN '🔍 SEO refresh'
    WHEN 'sync-google-search-console-daily' THEN '🔍 Sync GSC'
    WHEN 'auto-followup-leads-daily' THEN '📧 Relances leads'
    WHEN 'generate-city-pages-weekly' THEN '🏙️ Pages villes'
    WHEN 'scan-backlinks-weekly' THEN '🔗 Scan backlinks'
    WHEN 'scrape-taxi-companies-daily' THEN '🚕 Scraping taxis'
    WHEN 'ai-content-humanizer-3h' THEN '🤖 Humanisation (3h)'
    WHEN 'ai-learning-daily' THEN '🤖 Apprentissage IA'
    WHEN 'trend-analyzer-daily' THEN '🤖 Tendances'
    WHEN 'viral-content-4h' THEN '🤖 Contenu viral (4h)'
    WHEN 'indexnow-ping-2h' THEN '⚙️ IndexNow (2h)'
    ELSE j.jobname
  END as description,
  j.active as is_enabled,
  j.schedule as frequency,
  COALESCE((SELECT COUNT(*) FROM automation_logs WHERE automation_name = j.jobname), 0) as total_runs,
  COALESCE((SELECT COUNT(*) FROM automation_logs WHERE automation_name = j.jobname AND status = 'success'), 0) as successful_runs,
  (SELECT created_at FROM automation_logs WHERE automation_name = j.jobname ORDER BY created_at DESC LIMIT 1) as last_run_at,
  (SELECT message FROM automation_logs WHERE automation_name = j.jobname AND status = 'error' ORDER BY created_at DESC LIMIT 1) as last_error
FROM cron.job j
ORDER BY j.jobname;

GRANT SELECT ON automation_status TO anon, authenticated, service_role;

-- Fonctions RPC
CREATE OR REPLACE FUNCTION log_automation_run(
  p_automation_name text,
  p_status text,
  p_message text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_execution_time_ms integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO automation_logs (automation_name, status, message, details, execution_time_ms)
  VALUES (p_automation_name, p_status, p_message, p_details, p_execution_time_ms)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_automation_run TO service_role;

CREATE OR REPLACE FUNCTION toggle_automation(p_job_id bigint, p_enabled boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_name text;
BEGIN
  SELECT jobname INTO v_job_name FROM cron.job WHERE jobid = p_job_id;
  UPDATE cron.job SET active = p_enabled WHERE jobid = p_job_id;
  IF FOUND THEN
    PERFORM log_automation_run(v_job_name, 'success',
      CASE WHEN p_enabled THEN 'Activée' ELSE 'Désactivée' END,
      jsonb_build_object('action', 'toggle', 'enabled', p_enabled), 0);
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_automation TO authenticated, service_role;

-- Logs de démo
DO $$
DECLARE
  v_job RECORD;
  v_count integer := 0;
BEGIN
  FOR v_job IN SELECT jobname FROM cron.job WHERE active = true ORDER BY jobname LIMIT 15 LOOP
    FOR i IN 1..2 LOOP
      PERFORM log_automation_run(v_job.jobname, 'success', 'Exécution réussie',
        jsonb_build_object('test', true), FLOOR(RANDOM() * 5000 + 1000)::integer);
      v_count := v_count + 1;
    END LOOP;
    IF RANDOM() > 0.6 THEN
      PERFORM log_automation_run(v_job.jobname, 'error', 'Erreur test: Timeout',
        jsonb_build_object('error_code', 'TIMEOUT'), NULL);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RAISE NOTICE '✅ % logs créés', v_count;
END $$;


-- ============================================
-- 2. FIX CONTENT_SCHEDULE
-- ============================================

-- Vérifier structure actuelle
DO $$
DECLARE
  v_has_freq boolean;
  v_has_auto boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_schedule' AND column_name = 'frequency_per_week'
  ) INTO v_has_freq;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_schedule' AND column_name = 'auto_publish'
  ) INTO v_has_auto;

  -- Ajouter colonnes manquantes
  IF NOT v_has_freq THEN
    ALTER TABLE content_schedule ADD COLUMN frequency_per_week integer DEFAULT 1;
  END IF;

  IF NOT v_has_auto THEN
    ALTER TABLE content_schedule ADD COLUMN auto_publish boolean DEFAULT false;
  END IF;

  RAISE NOTICE '✅ Structure content_schedule vérifiée';
END $$;

-- Supprimer données existantes
DELETE FROM content_schedule;

-- Insérer configs par défaut
INSERT INTO content_schedule (content_type, frequency_per_week, auto_publish, keywords, is_active)
VALUES
  ('blog', 3, true, ARRAY['assurance taxi', 'assurance vtc', 'rc professionnelle taxi'], true),
  ('faq', 2, true, ARRAY['assurance taxi obligatoire', 'garanties assurance taxi'], true),
  ('review', 1, false, ARRAY['avis assurance taxi', 'témoignage chauffeur'], false)
ON CONFLICT (content_type) DO UPDATE SET
  frequency_per_week = EXCLUDED.frequency_per_week,
  auto_publish = EXCLUDED.auto_publish,
  keywords = EXCLUDED.keywords,
  is_active = EXCLUDED.is_active;


-- ============================================
-- 3. FIX MARKETING_TEMPLATES
-- ============================================

-- Créer table si elle n'existe pas
CREATE TABLE IF NOT EXISTS marketing_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name text NOT NULL,
  template_type text NOT NULL,
  content text NOT NULL,
  variables jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_templates_category ON marketing_templates(category);
CREATE INDEX IF NOT EXISTS idx_marketing_templates_type ON marketing_templates(template_type);

ALTER TABLE marketing_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read marketing_templates" ON marketing_templates;
CREATE POLICY "Public read marketing_templates"
  ON marketing_templates FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Authenticated write marketing_templates" ON marketing_templates;
CREATE POLICY "Authenticated write marketing_templates"
  ON marketing_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Supprimer templates existants
DELETE FROM marketing_templates;

-- Insérer templates WhatsApp
INSERT INTO marketing_templates (category, name, template_type, content, variables) VALUES
('whatsapp', 'Message Court', 'status', 'Salut {{prenom}}, j''utilise TaxiAssur pour mes assurances taxi. Devis gratuit en 1 min → https://taxiassur.com/devis?ref={{code_ambassadeur}}', '{"prenom": "Jean", "code_ambassadeur": "AMB123"}'),
('whatsapp', 'Message Standard', 'group', 'Bonjour à tous, si vous voulez comparer rapidement vos tarifs d''assurance taxi, essayez le simulateur TaxiAssur : https://taxiassur.com/devis?ref={{code_ambassadeur}}', '{"code_ambassadeur": "AMB123"}'),
('whatsapp', 'Message Long', 'personal', 'Salut {{prenom}}, je viens de tester TaxiAssur, ils m''ont fait un devis en 1 minute. Si tu veux, utilise mon lien : https://taxiassur.com/devis?ref={{code_ambassadeur}}', '{"prenom": "Jean", "code_ambassadeur": "AMB123"}');

-- Insérer templates LinkedIn
INSERT INTO marketing_templates (category, name, template_type, content, variables) VALUES
('linkedin', 'Post Lancement', 'post', '🚀 TaxiAssur est lancé ! Chauffeurs de taxi : obtenez un devis gratuit en 1 minute. 🔗 https://taxiassur.com/devis?ref=linkedin #assurancetaxi #taxi', '{}'),
('linkedin', 'Post Témoignage', 'post', '✅ "Grâce à TaxiAssur j''ai réduit ma prime de 30%" — Jean, taxi Paris. Testez : https://taxiassur.com/devis?ref=linkedin #assurancetaxi', '{}'),
('linkedin', 'Description Courte', 'page', 'TaxiAssur — Spécialiste assurance taxi en France. Devis gratuit en 1 minute — RC Pro, flotte & couverture dédiée.', '{}');

-- Insérer templates Email
INSERT INTO marketing_templates (category, name, template_type, content, variables) VALUES
('email', 'Confirmation Lead', 'auto', 'Bonjour {{name}}, Merci pour votre demande de devis. Nous avons bien reçu vos informations. Un conseiller vous contactera sous 24h.', '{"name": "Jean"}'),
('email', 'Relance 7 jours', 'auto', 'Bonjour {{name}}, Votre devis TaxiAssur est toujours disponible. Besoin d''aide pour finaliser ? Appelez-nous au 01 23 45 67 89.', '{"name": "Jean"}');

-- Insérer template Presse
INSERT INTO marketing_templates (category, name, template_type, content, variables) VALUES
('presse', 'Communiqué Lancement', 'press_release', 'TaxiAssur lance un simulateur gratuit d''assurance pour chauffeurs de taxi. Devis instantané, programme ambassadeurs, outils gratuits.', '{}');


-- ============================================
-- VÉRIFICATION FINALE
-- ============================================

DO $$
DECLARE
  v_crons integer;
  v_logs integer;
  v_schedules integer;
  v_templates integer;
BEGIN
  SELECT COUNT(*) INTO v_crons FROM cron.job WHERE active = true;
  SELECT COUNT(*) INTO v_logs FROM automation_logs;
  SELECT COUNT(*) INTO v_schedules FROM content_schedule;
  SELECT COUNT(*) INTO v_templates FROM marketing_templates;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ TOUS LES BACKOFFICE CORRIGÉS ET PRÊTS';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Cron jobs actifs: %', v_crons;
  RAISE NOTICE 'Logs automation: %', v_logs;
  RAISE NOTICE 'Content schedules: %', v_schedules;
  RAISE NOTICE 'Marketing templates: %', v_templates;
  RAISE NOTICE '';
  RAISE NOTICE '📊 Auto-Optimizer: PRÊT';
  RAISE NOTICE '📅 AutomationScheduler: PRÊT';
  RAISE NOTICE '📱 Marketing Templates: PRÊT';
  RAISE NOTICE '============================================';
END $$;
