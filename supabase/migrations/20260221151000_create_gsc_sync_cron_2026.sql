/*
  # Cron de Synchronisation Google Search Console - 21 Février 2026
  
  Synchronise automatiquement les données GSC:
  - Tous les jours à 3h du matin
  - Import des 7 derniers jours
  - Détection automatique des opportunités
*/

-- Cron de synchronisation GSC quotidienne
SELECT cron.schedule(
  'gsc-daily-sync',
  '0 3 * * *', -- Tous les jours à 3h du matin
  $$
  SELECT
    net.http_post(
      url:=(SELECT current_setting('app.settings.supabase_url') || '/functions/v1/gsc-sync-performance'),
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_anon_key'))
      ),
      body:=jsonb_build_object('days', 7)
    ) as request_id;
  $$
);

-- Cron de mise à jour des opportunités (après la sync)
SELECT cron.schedule(
  'gsc-update-opportunities',
  '30 3 * * *', -- Tous les jours à 3h30 (30 min après la sync)
  $$
  SELECT auto_create_opportunities();
  $$
);

-- Insérer les configurations système
INSERT INTO system_config (key, value, description) VALUES
(
  'gsc_sync_enabled',
  'true',
  'Active/désactive la synchronisation automatique GSC'
),
(
  'gsc_sync_days',
  '7',
  'Nombre de jours à synchroniser à chaque fois'
),
(
  'gsc_opportunity_threshold',
  '40',
  'Score minimum pour créer une opportunité SEO'
),
(
  'ai_content_auto_generate',
  'false',
  'Génération automatique de contenu pour les opportunités (désactivé par défaut)'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
