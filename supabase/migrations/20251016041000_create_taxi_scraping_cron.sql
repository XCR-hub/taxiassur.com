/*
  # Création cron job scraping taxis automatique

  1. Cron jobs créés
    - `scrape-taxis-daily` : Scraping quotidien à 03h00
      - 8 villes françaises
      - 50 taxis par ville
      - Total : 400 prospects/jour

  2. Fonction helper
    - `schedule_taxi_scraping()` : Fonction pour déclencher le scraping
*/

-- Fonction pour déclencher le scraping via HTTP
CREATE OR REPLACE FUNCTION schedule_taxi_scraping()
RETURNS void AS $$
DECLARE
  function_url text;
  service_role_key text;
BEGIN
  -- URL de l'edge function
  function_url := current_setting('app.settings.api_url', true) || '/functions/v1/scrape-taxi-companies';
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Appel HTTP POST vers l'edge function
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'cities', ARRAY['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Bordeaux', 'Lille'],
      'max_per_city', 50
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer ancien cron si existe
SELECT cron.unschedule('scrape-taxis-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'scrape-taxis-daily'
);

-- Créer cron job scraping quotidien à 03h00
SELECT cron.schedule(
  'scrape-taxis-daily',
  '0 3 * * *',  -- Tous les jours à 3h du matin
  $$SELECT schedule_taxi_scraping();$$
);

-- Commentaire
COMMENT ON FUNCTION schedule_taxi_scraping IS 'Déclenche le scraping automatique des taxis via Google Places API';
