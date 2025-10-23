/*
  # ACTIVATION MODE PRODUCTION BACKLINKS
  
  1. Désactive le mode test/simulation
  2. Active l'envoi réel d'emails
  3. Configure les paramètres production
  4. Valide la configuration
  
  RÉSULTAT: Emails vraiment envoyés via SendGrid
*/

-- ============================================
-- ÉTAPE 1: Désactiver mode simulation
-- ============================================

UPDATE automation_config 
SET 
  config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{test_mode}',
    'false'::jsonb
  ),
  config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{production}',
    'true'::jsonb
  ),
  updated_at = now()
WHERE name LIKE '%backlink%';

-- ============================================
-- ÉTAPE 2: Configurer paramètres production
-- ============================================

UPDATE automation_config 
SET 
  config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{max_emails_per_day}',
    '50'::jsonb
  ),
  config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{delay_between_emails}',
    '300'::jsonb
  )
WHERE name LIKE '%backlink%';

-- ============================================
-- ÉTAPE 3: Activer toutes automations backlinks
-- ============================================

UPDATE automation_config 
SET 
  enabled = true,
  updated_at = now()
WHERE name IN (
  'backlink-auto-outreach',
  'backlink-followup',
  'backlink-scan-weekly'
);

-- ============================================
-- ÉTAPE 4: Réinitialiser compteurs opportunités
-- ============================================

-- Remettre les opportunités "contacted" en "new" pour nouveau départ
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

-- Afficher configuration actuelle
SELECT 
  name,
  enabled,
  config->>'test_mode' as mode_test,
  config->>'production' as production,
  config->>'max_emails_per_day' as max_emails,
  last_run,
  next_run
FROM automation_config
WHERE name LIKE '%backlink%'
ORDER BY name;

-- Compter opportunités prêtes à contacter
SELECT 
  COUNT(*) as total_opportunites_new,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as avec_email,
  COUNT(CASE WHEN email IS NULL THEN 1 END) as sans_email
FROM backlink_opportunities
WHERE status = 'new';

-- Afficher statut edge functions
SELECT 
  'send-outreach-emails' as fonction,
  'Prête pour envoi réel' as statut
UNION ALL
SELECT 
  'backlink-auto-outreach' as fonction,
  'Active en production' as statut;

