/*
  # Fix Pinterest Cron Jobs - URL Correcte

  ## Problème
  Les crons Pinterest utilisent l'ancienne URL Supabase (mvuccsplodgesyayzfzk)
  au lieu de l'URL actuelle (drohhxrkoequjphvabvq)

  ## Solution
  Supprimer et recréer les crons avec la bonne URL et la bonne clé
*/

-- Supprimer les anciens crons Pinterest
SELECT cron.unschedule('pinterest_morning_pin');
SELECT cron.unschedule('pinterest_afternoon_pin');
SELECT cron.unschedule('pinterest_evening_pin');

-- Recréer avec l'URL correcte

-- Pinterest Morning Pin (10 AM daily)
SELECT cron.schedule(
  'pinterest_morning_pin',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg"}'::jsonb,
    body := '{"platform": "pinterest", "action": "auto_post"}'::jsonb
  );
  $$
);

-- Pinterest Afternoon Pin (2 PM daily)
SELECT cron.schedule(
  'pinterest_afternoon_pin',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg"}'::jsonb,
    body := '{"platform": "pinterest", "action": "auto_post"}'::jsonb
  );
  $$
);

-- Pinterest Evening Pin (7 PM daily)
SELECT cron.schedule(
  'pinterest_evening_pin',
  '0 19 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg"}'::jsonb,
    body := '{"platform": "pinterest", "action": "auto_post"}'::jsonb
  );
  $$
);

-- Vérifier que les crons sont actifs
COMMENT ON EXTENSION pg_cron IS 'Pinterest crons updated with correct URL on 2026-02-20';
