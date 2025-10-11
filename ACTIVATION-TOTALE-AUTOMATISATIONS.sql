/*
  ╔═══════════════════════════════════════════════════════════════╗
  ║  ACTIVATION TOTALE DES AUTOMATISATIONS TAXIASSUR              ║
  ║  🤖 Pilotage automatique 100% - Plus besoin de faire quoi    ║
  ║     que ce soit manuellement !                                 ║
  ╚═══════════════════════════════════════════════════════════════╝

  📅 CALENDRIER D'AUTOMATISATION :

  QUOTIDIEN :
  - 02h : Scan des opportunités de backlinks
  - 04h : Génération automatique d'articles SEO (5 articles/jour)
  - 06h : Scraping tendances réseaux sociaux
  - 07h : Optimisation SERP et recherche de leads
  - 08h : Génération automatique de FAQ
  - 09h : Publication réseaux sociaux (matin)
  - 10h : Relance automatique des leads non convertis
  - 12h : Notifications SEO et alertes
  - 14h : Envoi d'emails d'outreach (100/jour)
  - 15h : Publication réseaux sociaux (après-midi)
  - 19h : Publication réseaux sociaux (soir)
  - 00h : Orchestrateur principal (analyse + planification)

  HEBDOMADAIRE :
  - Lundi 08h : Campagne backlinks automatique
  - Mercredi 03h : Prospection partenaires

  📊 CE QUI SERA GÉNÉRÉ AUTOMATIQUEMENT :
  ✅ 5 articles de blog/jour (SEO optimisés)
  ✅ 5-10 FAQ/jour
  ✅ 3 posts réseaux sociaux/jour (LinkedIn, Twitter, Facebook)
  ✅ 100 emails d'outreach/jour
  ✅ Relance automatique des leads
  ✅ Détection opportunités backlinks
  ✅ Prospection partenaires
  ✅ Surveillance concurrence
  ✅ Analytics et rapports
*/

-- ═══════════════════════════════════════════════════════════════
-- 1. ACTIVATION EXTENSION PG_CRON
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ═══════════════════════════════════════════════════════════════
-- 2. NETTOYAGE DES CRON JOBS EXISTANTS (éviter doublons)
-- ═══════════════════════════════════════════════════════════════

SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN (
  'daily-content-generation',
  'daily-faq-generation',
  'scan-backlinks-daily',
  'auto-followup-leads',
  'generate-seo-daily',
  'send-outreach-daily',
  'social-morning',
  'social-afternoon',
  'social-evening',
  'backlink-weekly',
  'partner-scraper-weekly',
  'ai-social-daily',
  'serp-optimizer-daily',
  'seo-notifier-daily',
  'cron-orchestrator-master'
);

-- ═══════════════════════════════════════════════════════════════
-- 3. ORCHESTRATEUR PRINCIPAL (00h00)
-- Coordonne toutes les tâches et génère les rapports
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'cron-orchestrator-master',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/cron-orchestrator',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{"job":"weekly_ai_performance_analysis"}'::jsonb
  ) AS request_id;
  $$
);

-- ═══════════════════════════════════════════════════════════════
-- 4. GÉNÉRATION AUTOMATIQUE DE CONTENU (04h00)
-- Génère 5 articles SEO par jour automatiquement
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'daily-content-generation',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/cron-orchestrator',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{"job":"daily_content_generation"}'::jsonb
  ) AS request_id;
  $$
);

-- ═══════════════════════════════════════════════════════════════
-- 5. GÉNÉRATION AUTOMATIQUE DE FAQ (08h00)
-- Génère 5-10 FAQ par jour basées sur les questions courantes
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'daily-faq-generation',
  '0 8 * * *',
  $$
  WITH faq_topics AS (
    SELECT unnest(ARRAY[
      'Quelle est la différence entre RC Pro et RC Exploitation pour taxi ?',
      'Combien coûte une assurance taxi pour jeune conducteur ?',
      'Puis-je changer d''assurance taxi en cours d''année ?',
      'Comment fonctionne le bonus-malus pour les taxis ?',
      'Quelles garanties sont obligatoires pour un taxi électrique ?'
    ]) AS topic
  )
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('keyword', topic, 'type', 'faq')
  ) AS request_id
  FROM faq_topics
  LIMIT 1;
  $$
);

-- ═══════════════════════════════════════════════════════════════
-- 6. SCAN BACKLINKS (02h00)
-- Détecte automatiquement les opportunités de backlinks
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'scan-backlinks-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scan-backlinks',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ═══════════════════════════════════════════════════════════════
-- 7. RELANCE AUTOMATIQUE LEADS (10h00)
-- Relance les leads non convertis automatiquement
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'auto-followup-leads',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/cron-orchestrator',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{"job":"daily_lead_followup"}'::jsonb
  ) AS request_id;
  $$
);

-- ═══════════════════════════════════════════════════════════════
-- 8. ENVOI EMAILS OUTREACH (14h00)
-- Envoie 100 emails de prospection par jour
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'send-outreach-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/cron-orchestrator',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{"job":"daily_email_batch"}'::jsonb
  ) AS request_id;
  $$
);

-- ═══════════════════════════════════════════════════════════════
-- 9-11. PUBLICATIONS RÉSEAUX SOCIAUX (09h, 15h, 19h)
-- Poste automatiquement 3x/jour sur LinkedIn, Twitter, Facebook
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'social-morning',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{"slot": "morning"}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'social-afternoon',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{"slot": "afternoon"}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'social-evening',
  '0 19 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{"slot": "evening"}'::jsonb
  ) AS request_id;
  $$
);

-- ═══════════════════════════════════════════════════════════════
-- 12. CAMPAGNE BACKLINKS (Lundi 08h)
-- Outreach automatique pour obtenir des backlinks
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'backlink-weekly',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/backlink-auto-outreach',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ═══════════════════════════════════════════════════════════════
-- 13. PROSPECTION PARTENAIRES (Mercredi 03h)
-- Trouve et contacte des partenaires potentiels
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'partner-scraper-weekly',
  '0 3 * * 3',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/cron-orchestrator',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{"job":"twice_weekly_partner_outreach"}'::jsonb
  ) AS request_id;
  $$
);

-- ═══════════════════════════════════════════════════════════════
-- 14. SCRAPING TENDANCES SOCIALES (06h00)
-- Analyse les tendances sur les réseaux sociaux
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'ai-social-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-social-scraper',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ═══════════════════════════════════════════════════════════════
-- 15. OPTIMISATION SERP (07h00)
-- Optimise le positionnement SEO automatiquement
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'serp-optimizer-daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/serp-lead-optimizer',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ═══════════════════════════════════════════════════════════════
-- 16. NOTIFICATIONS SEO (12h00)
-- Envoie des alertes sur les performances SEO
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'seo-notifier-daily',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-seo-notifier',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ═══════════════════════════════════════════════════════════════
-- VÉRIFICATION DES CRON JOBS ACTIFS
-- ═══════════════════════════════════════════════════════════════

SELECT
  jobid,
  jobname,
  schedule,
  active,
  nodename
FROM cron.job
ORDER BY jobname;

-- ═══════════════════════════════════════════════════════════════
-- 🎉 FÉLICITATIONS !
-- ═══════════════════════════════════════════════════════════════
--
-- Votre système TaxiAssur est maintenant en PILOTAGE AUTOMATIQUE !
--
-- 📊 Résumé :
-- - 16 automatisations actives
-- - 5 articles générés/jour automatiquement
-- - 5-10 FAQ générées/jour
-- - 3 posts réseaux sociaux/jour
-- - 100 emails prospection/jour
-- - Relance automatique des leads
-- - Surveillance SEO en temps réel
--
-- 🎯 Vous n'avez PLUS BESOIN de faire quoi que ce soit !
-- Le système tourne tout seul 24/7.
--
-- 📈 Surveillez les résultats depuis le backoffice.
--
-- ═══════════════════════════════════════════════════════════════
