/*
  # Automatisation Complète Génération Contenu

  1. Suppression des anciens CRON
  2. Création de 2 nouveaux CRON optimisés :
     - **daily-blog-generation** : 5 articles/jour à 04h00
     - **daily-city-generation** : 1 page ville/jour à 05h00

  3. Anti-détection IA :
     - Structures variées
     - Prix aléatoires
     - Tons différents
     - Température élevée (0.9-0.95)
     - Chiffres précis non ronds
     - Exemples concrets

  4. Résultat attendu :
     - 5 articles blog/jour = 150/mois
     - 1 page ville/jour = 30/mois
     - Total : 180 contenus/mois
     - Budget : ~8€/mois (OpenAI)
*/

-- Supprimer les anciens CRON s'ils existent
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-content-generation') THEN
    PERFORM cron.unschedule('daily-content-generation');
  END IF;
  
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-faq-generation') THEN
    PERFORM cron.unschedule('daily-faq-generation');
  END IF;
END $$;

-- CRON 1 : Génération 5 articles blog/jour à 04h00
SELECT cron.schedule(
  'daily-blog-generation',
  '0 4 * * *', -- Tous les jours à 04h00
  $$
  WITH blog_keywords AS (
    SELECT unnest(ARRAY[
      'assurance taxi économique',
      'meilleure assurance taxi 2025',
      'assurance taxi jeune conducteur',
      'comparer assurance taxi',
      'résilier assurance taxi',
      'assurance taxi électrique',
      'RC professionnelle taxi',
      'malus assurance taxi',
      'sinistre assurance taxi',
      'franchise assurance taxi',
      'garanties assurance taxi',
      'assurance taxi flotte',
      'taxi assurance pas cher',
      'devis assurance taxi gratuit',
      'changement assurance taxi'
    ]) AS keyword
    ORDER BY random()
    LIMIT 5
  )
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('keyword', keyword, 'type', 'blog')
  ) AS request_id
  FROM blog_keywords;
  $$
);

-- CRON 2 : Génération 1 page ville/jour à 05h00
SELECT cron.schedule(
  'daily-city-generation',
  '0 5 * * *', -- Tous les jours à 05h00
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-city-page',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Vérifier que les CRON sont bien créés
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN jobname = 'daily-blog-generation' THEN '5 articles blog/jour à 04h00'
    WHEN jobname = 'daily-city-generation' THEN '1 page ville/jour à 05h00'
  END as description
FROM cron.job
WHERE jobname IN ('daily-blog-generation', 'daily-city-generation')
ORDER BY schedule;
