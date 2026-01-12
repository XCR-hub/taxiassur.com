/*
  # Create LinkedIn and Pinterest Publishing Cron Jobs
  
  1. Problem
    - LinkedIn and Pinterest cron jobs were missing
    - Tokens exist and edge functions are deployed but nothing triggers them
  
  2. New Cron Jobs
    - linkedin_morning_post: 9 AM weekdays
    - linkedin_afternoon_post: 3 PM weekdays
    - pinterest_morning_pin: 10 AM daily
    - pinterest_afternoon_pin: 2 PM daily
    - pinterest_evening_pin: 7 PM daily
*/

-- LinkedIn Morning Post (9 AM weekdays Mon-Fri)
SELECT cron.schedule(
  'linkedin_morning_post',
  '0 9 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://mvuccsplodgesyayzfzk.supabase.co/functions/v1/social-media-publisher',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dWNjc3Bsb2RnZXN5YXl6ZnprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1MzczODUsImV4cCI6MjA0NTExMzM4NX0.lBap9FJVvyDNvdo69xNrFrVv2I4hHlbqRiCDqIu74nw"}'::jsonb,
    body := '{"platform": "linkedin", "action": "auto_post"}'::jsonb
  );
  $$
) WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'linkedin_morning_post');

-- LinkedIn Afternoon Post (3 PM weekdays Mon-Fri)
SELECT cron.schedule(
  'linkedin_afternoon_post',
  '0 15 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://mvuccsplodgesyayzfzk.supabase.co/functions/v1/social-media-publisher',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dWNjc3Bsb2RnZXN5YXl6ZnprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1MzczODUsImV4cCI6MjA0NTExMzM4NX0.lBap9FJVvyDNvdo69xNrFrVv2I4hHlbqRiCDqIu74nw"}'::jsonb,
    body := '{"platform": "linkedin", "action": "auto_post"}'::jsonb
  );
  $$
) WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'linkedin_afternoon_post');

-- Pinterest Morning Pin (10 AM daily)
SELECT cron.schedule(
  'pinterest_morning_pin',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mvuccsplodgesyayzfzk.supabase.co/functions/v1/social-media-publisher',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dWNjc3Bsb2RnZXN5YXl6ZnprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1MzczODUsImV4cCI6MjA0NTExMzM4NX0.lBap9FJVvyDNvdo69xNrFrVv2I4hHlbqRiCDqIu74nw"}'::jsonb,
    body := '{"platform": "pinterest", "action": "auto_post"}'::jsonb
  );
  $$
) WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pinterest_morning_pin');

-- Pinterest Afternoon Pin (2 PM daily)
SELECT cron.schedule(
  'pinterest_afternoon_pin',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mvuccsplodgesyayzfzk.supabase.co/functions/v1/social-media-publisher',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dWNjc3Bsb2RnZXN5YXl6ZnprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1MzczODUsImV4cCI6MjA0NTExMzM4NX0.lBap9FJVvyDNvdo69xNrFrVv2I4hHlbqRiCDqIu74nw"}'::jsonb,
    body := '{"platform": "pinterest", "action": "auto_post"}'::jsonb
  );
  $$
) WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pinterest_afternoon_pin');

-- Pinterest Evening Pin (7 PM daily)
SELECT cron.schedule(
  'pinterest_evening_pin',
  '0 19 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mvuccsplodgesyayzfzk.supabase.co/functions/v1/social-media-publisher',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dWNjc3Bsb2RnZXN5YXl6ZnprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1MzczODUsImV4cCI6MjA0NTExMzM4NX0.lBap9FJVvyDNvdo69xNrFrVv2I4hHlbqRiCDqIu74nw"}'::jsonb,
    body := '{"platform": "pinterest", "action": "auto_post"}'::jsonb
  );
  $$
) WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pinterest_evening_pin');