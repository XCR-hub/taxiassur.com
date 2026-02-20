/*
  # Fix LinkedIn Cron Jobs - URL Correcte

  ## Problème
  Les crons LinkedIn utilisent aussi l'ancienne URL Supabase

  ## Solution
  Supprimer et recréer les crons avec la bonne URL
*/

-- Supprimer les anciens crons LinkedIn
SELECT cron.unschedule('linkedin_morning_post');
SELECT cron.unschedule('linkedin_afternoon_post');

-- LinkedIn Morning Post (9 AM weekdays Mon-Fri)
SELECT cron.schedule(
  'linkedin_morning_post',
  '0 9 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg"}'::jsonb,
    body := '{"platform": "linkedin", "action": "auto_post"}'::jsonb
  );
  $$
);

-- LinkedIn Afternoon Post (3 PM weekdays Mon-Fri)
SELECT cron.schedule(
  'linkedin_afternoon_post',
  '0 15 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg"}'::jsonb,
    body := '{"platform": "linkedin", "action": "auto_post"}'::jsonb
  );
  $$
);

-- Commentaire de vérification
COMMENT ON EXTENSION pg_cron IS 'LinkedIn crons updated with correct URL on 2026-02-20';
