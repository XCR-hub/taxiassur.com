/*
  # Automatisations SEO Ultra-Optimisées pour 10-100 demandes/jour
  
  1. SEO & Indexation instantanée
    - IndexNow après chaque publication
    - Sitemap temps réel
    - Ping moteurs de recherche
  
  2. Contenu SEO massif
    - 10 articles unifiés/jour (au lieu de 5)
    - Pages ville automatiques
    - FAQ enrichies
  
  3. Réseaux sociaux constants
    - LinkedIn matin & après-midi
    - Pinterest 3x/jour
    - Auto-partage du contenu
  
  4. Lead nurturing agressif
    - Follow-ups 3x/jour
    - Email responder IA
    - Relances automatiques
  
  5. Analytics & Reporting
    - Tracking SEO quotidien
    - Rapports automatiques
    - Optimisation continue
*/

-- ============================================
-- 1. SEO & INDEXATION INSTANTANÉE
-- ============================================

-- IndexNow - Notifier les moteurs après chaque nouveau contenu
SELECT cron.schedule(
  'indexnow_instant_notification',
  '*/30 * * * *', -- Toutes les 30 minutes
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-seo-notifier',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'action', 'notify_new_content',
      'engines', ARRAY['google', 'bing', 'yandex']
    )
  );
  $$
);

-- Sitemap temps réel - Régénération fréquente
SELECT cron.schedule(
  'sitemap_realtime_update',
  '0 */2 * * *', -- Toutes les 2 heures
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('action', 'sitemap')
  );
  $$
);

-- ============================================
-- 2. CONTENU SEO MASSIF (10 articles/jour)
-- ============================================

-- Contenu unifié - Session matin (5 articles)
SELECT cron.schedule(
  'unified_content_morning',
  '0 6 * * *', -- 6h du matin
  $$
  WITH content_plan AS (
    SELECT
      unnest(ARRAY[
        'assurance taxi pas cher',
        'comparateur assurance taxi',
        'meilleure assurance taxi',
        'devis assurance taxi gratuit',
        'changer assurance taxi'
      ]) AS keyword,
      unnest(ARRAY[
        'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'
      ]) AS city
  )
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'keyword', keyword,
      'city', city,
      'mode', 'unified',
      'type', 'unified'
    )
  )
  FROM content_plan;
  $$
);

-- Contenu unifié - Session après-midi (5 articles)
SELECT cron.schedule(
  'unified_content_afternoon',
  '0 14 * * *', -- 14h
  $$
  WITH content_plan AS (
    SELECT
      unnest(ARRAY[
        'assurance taxi jeune conducteur',
        'assurance taxi professionnel',
        'RC pro taxi obligatoire',
        'assurance flotte taxi',
        'résiliation assurance taxi'
      ]) AS keyword,
      unnest(ARRAY[
        'Bordeaux', 'Lille', 'Nantes', 'Strasbourg', 'Montpellier'
      ]) AS city
  )
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'keyword', keyword,
      'city', city,
      'mode', 'unified',
      'type', 'unified'
    )
  )
  FROM content_plan;
  $$
);

-- ============================================
-- 3. RÉSEAUX SOCIAUX CONSTANTS
-- ============================================

-- LinkedIn - Publication matin
SELECT cron.schedule(
  'linkedin_morning_post',
  '0 9 * * *', -- 9h
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'platform', 'linkedin',
      'content_type', 'educational'
    )
  );
  $$
);

-- LinkedIn - Publication après-midi
SELECT cron.schedule(
  'linkedin_afternoon_post',
  '0 15 * * *', -- 15h
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'platform', 'linkedin',
      'content_type', 'promotional'
    )
  );
  $$
);

-- Pinterest - 3 posts par jour
SELECT cron.schedule(
  'pinterest_morning',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('platform', 'pinterest')
  );
  $$
);

SELECT cron.schedule(
  'pinterest_afternoon',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('platform', 'pinterest')
  );
  $$
);

SELECT cron.schedule(
  'pinterest_evening',
  '0 19 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('platform', 'pinterest')
  );
  $$
);

-- ============================================
-- 4. LEAD NURTURING AGRESSIF
-- ============================================

-- Follow-ups automatiques - Matin
SELECT cron.schedule(
  'lead_followup_morning',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-followup',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('max_followups', 20)
  );
  $$
);

-- Follow-ups automatiques - Midi
SELECT cron.schedule(
  'lead_followup_noon',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-followup',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('max_followups', 20)
  );
  $$
);

-- Follow-ups automatiques - Après-midi
SELECT cron.schedule(
  'lead_followup_afternoon',
  '0 16 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/auto-followup',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('max_followups', 20)
  );
  $$
);

-- Email Responder IA - Toutes les heures
SELECT cron.schedule(
  'ai_email_responder_hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-email-responder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('check_unread', true)
  );
  $$
);

-- ============================================
-- 5. ANALYTICS & REPORTING
-- ============================================

-- Rapport quotidien - Performance & KPIs
SELECT cron.schedule(
  'daily_analytics_report',
  '0 8 * * *', -- 8h chaque matin
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/automation-dashboard-api',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'action', 'daily_report',
      'include', ARRAY['seo', 'leads', 'backlinks', 'social']
    )
  );
  $$
);

-- Optimisation IA hebdomadaire
SELECT cron.schedule(
  'weekly_ai_optimization',
  '0 2 * * 1', -- Lundi 2h
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/ai-auto-improver',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'analyze_week', true,
      'auto_apply', true
    )
  );
  $$
);
