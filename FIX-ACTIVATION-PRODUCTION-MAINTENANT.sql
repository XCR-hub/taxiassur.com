/*
  # FIX + ACTIVATION MODE PRODUCTION
  
  1. Crée la table automation_config si manquante
  2. Ajoute les automations backlinks
  3. Active le mode production
  4. Désactive le mode test
  
  RÉSULTAT: Mode production actif, emails vraiment envoyés
*/

-- ============================================
-- ÉTAPE 1: Créer table automation_config si manquante
-- ============================================

CREATE TABLE IF NOT EXISTS automation_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  enabled boolean DEFAULT true,
  schedule text,
  config jsonb DEFAULT '{}'::jsonb,
  last_run timestamptz,
  next_run timestamptz,
  run_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_automation_config_name ON automation_config(name);
CREATE INDEX IF NOT EXISTS idx_automation_config_enabled ON automation_config(enabled);
CREATE INDEX IF NOT EXISTS idx_automation_config_next_run ON automation_config(next_run);

-- RLS
ALTER TABLE automation_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read automation config" ON automation_config;
CREATE POLICY "Public read automation config" 
  ON automation_config FOR SELECT 
  TO public 
  USING (true);

DROP POLICY IF EXISTS "Authenticated manage automation config" ON automation_config;
CREATE POLICY "Authenticated manage automation config" 
  ON automation_config FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- ============================================
-- ÉTAPE 2: Ajouter automations backlinks si manquantes
-- ============================================

INSERT INTO automation_config (name, description, enabled, schedule, config)
VALUES 
  (
    'backlink-auto-outreach',
    'Envoi automatique emails prospection backlinks',
    true,
    '0 9 * * 1,3,5',
    jsonb_build_object(
      'test_mode', false,
      'production', true,
      'max_emails_per_day', 50,
      'delay_between_emails', 300
    )
  ),
  (
    'backlink-followup',
    'Relances automatiques opportunités backlinks',
    true,
    '0 10 * * 2,4',
    jsonb_build_object(
      'test_mode', false,
      'production', true,
      'followup_delay_days', 7,
      'max_followups', 3
    )
  ),
  (
    'backlink-scan-weekly',
    'Scan hebdomadaire nouvelles opportunités',
    true,
    '0 8 * * 1',
    jsonb_build_object(
      'test_mode', false,
      'production', true,
      'max_sites_per_scan', 50
    )
  )
ON CONFLICT (name) 
DO UPDATE SET
  enabled = true,
  config = jsonb_set(
    jsonb_set(
      EXCLUDED.config,
      '{test_mode}',
      'false'::jsonb
    ),
    '{production}',
    'true'::jsonb
  ),
  updated_at = now();

-- ============================================
-- ÉTAPE 3: Réinitialiser opportunités pour nouveau départ
-- ============================================

UPDATE backlink_opportunities 
SET 
  status = 'new',
  contacted_at = NULL,
  last_contact_date = NULL
WHERE status = 'contacted' 
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND email IS NOT NULL;

-- ============================================
-- VÉRIFICATION FINALE
-- ============================================

SELECT 
  '✅ Configuration automation_config' as etape,
  COUNT(*) as total_automations,
  COUNT(*) FILTER (WHERE enabled = true) as actives,
  COUNT(*) FILTER (WHERE config->>'test_mode' = 'false') as production_mode,
  COUNT(*) FILTER (WHERE config->>'production' = 'true') as production_flag
FROM automation_config
WHERE name LIKE '%backlink%';

-- Détail des automations
SELECT 
  name,
  enabled,
  config->>'test_mode' as mode_test,
  config->>'production' as production,
  config->>'max_emails_per_day' as max_emails,
  schedule,
  last_run,
  next_run
FROM automation_config
WHERE name LIKE '%backlink%'
ORDER BY name;

-- Opportunités prêtes
SELECT 
  '✅ Opportunités disponibles' as etape,
  COUNT(*) as total_new,
  COUNT(*) FILTER (WHERE email IS NOT NULL) as avec_email,
  COUNT(*) FILTER (WHERE email IS NULL) as sans_email
FROM backlink_opportunities
WHERE status = 'new';

-- Vérifier SendGrid
SELECT 
  '⚠️ Vérification SendGrid' as etape,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'vault' 
      AND tablename = 'decrypted_secrets'
    )
    THEN 'Vault existe - Vérifier manuellement dans Dashboard'
    ELSE 'Impossible de vérifier - Voir Dashboard Supabase'
  END as info;

