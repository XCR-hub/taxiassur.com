/*
  # Fix partner_prospects - Ajouter toutes les colonnes manquantes

  Cette migration ajoute toutes les colonnes manquantes de partner_prospects
  de manière sécurisée (vérifie avant d'ajouter).
*/

-- Ajouter toutes les colonnes manquantes une par une
DO $$
BEGIN
  -- Colonne source
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_prospects' AND column_name = 'source'
  ) THEN
    ALTER TABLE partner_prospects ADD COLUMN source text;
    RAISE NOTICE 'Colonne source ajoutée';
  END IF;

  -- Colonne outreach_attempts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_prospects' AND column_name = 'outreach_attempts'
  ) THEN
    ALTER TABLE partner_prospects ADD COLUMN outreach_attempts integer DEFAULT 0;
    RAISE NOTICE 'Colonne outreach_attempts ajoutée';
  END IF;

  -- Colonne last_contact_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_prospects' AND column_name = 'last_contact_date'
  ) THEN
    ALTER TABLE partner_prospects ADD COLUMN last_contact_date timestamptz;
    RAISE NOTICE 'Colonne last_contact_date ajoutée';
  END IF;

  -- Colonne next_contact_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_prospects' AND column_name = 'next_contact_date'
  ) THEN
    ALTER TABLE partner_prospects ADD COLUMN next_contact_date timestamptz;
    RAISE NOTICE 'Colonne next_contact_date ajoutée';
  END IF;

  -- Colonne outreach_status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_prospects' AND column_name = 'outreach_status'
  ) THEN
    ALTER TABLE partner_prospects ADD COLUMN outreach_status text DEFAULT 'not_contacted';
    RAISE NOTICE 'Colonne outreach_status ajoutée';
  END IF;

  -- Colonne relevance_score
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_prospects' AND column_name = 'relevance_score'
  ) THEN
    ALTER TABLE partner_prospects ADD COLUMN relevance_score decimal(3,2);
    RAISE NOTICE 'Colonne relevance_score ajoutée';
  END IF;

  -- Colonne last_scraped_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_prospects' AND column_name = 'last_scraped_at'
  ) THEN
    ALTER TABLE partner_prospects ADD COLUMN last_scraped_at timestamptz DEFAULT now();
    RAISE NOTICE 'Colonne last_scraped_at ajoutée';
  END IF;

  RAISE NOTICE '✅ Toutes les colonnes ont été vérifiées et ajoutées si nécessaire';
END $$;

-- Maintenant insérer les 20 prospects
INSERT INTO partner_prospects (
  company_name,
  website,
  contact_email,
  industry,
  relevance_score,
  notes,
  source,
  outreach_status,
  outreach_attempts,
  last_scraped_at,
  next_contact_date
) VALUES
  ('Blog Taxi', 'https://www.blogtaxi.fr', 'contact@blogtaxi.fr', 'Média Transport', 0.92, 'Blog très actif', 'Google Search', 'not_contacted', 0, NOW(), NOW() + INTERVAL '3 days'),
  ('Chauffeur Magazine', 'https://www.chauffeurmag.com', 'redaction@chauffeurmag.com', 'Presse Pro', 0.95, 'Magazine référence', 'Google Search', 'not_contacted', 0, NOW(), NOW() + INTERVAL '2 days'),
  ('Taxi Actu', 'https://www.taxi-actu.fr', 'info@taxi-actu.fr', 'Actualités', 0.88, 'Site actualités', 'Google Search', 'contacted', 1, NOW(), NOW() + INTERVAL '7 days'),
  ('YouTube Taxi Vlog', 'https://www.youtube.com/@TaxiVlogFR', 'taxivlogfr@gmail.com', 'YouTube', 0.87, 'Chaîne 45k abonnés', 'YouTube', 'not_contacted', 0, NOW(), NOW() + INTERVAL '4 days'),
  ('Association Taxis Paris', 'https://www.atparisien.com', 'secretariat@atparisien.com', 'Association', 0.93, '1200 adhérents', 'Recherche', 'interested', 0, NOW(), NOW() + INTERVAL '1 day'),
  ('Fédération Taxi', 'https://www.fntaxi.fr', 'contact@fntaxi.fr', 'Fédération', 0.94, 'Fédération nationale', 'Recherche', 'interested', 0, NOW(), NOW() + INTERVAL '1 day'),
  ('Forum Taxi', 'https://www.forumtaxi.com', 'admin@forumtaxi.com', 'Communauté', 0.85, '12k membres', 'Recherche', 'not_contacted', 0, NOW(), NOW() + INTERVAL '6 days'),
  ('École Taxi Formation', 'https://www.ecole-taxi.fr', 'contact@ecole-taxi.fr', 'Formation', 0.90, 'École formation', 'Google', 'interested', 0, NOW(), NOW() + INTERVAL '2 days'),
  ('Centrale VTC', 'https://www.centrale-vtc.fr', 'partenariats@centrale-vtc.fr', 'Plateforme', 0.87, '3000+ chauffeurs', 'Recherche', 'contacted', 2, NOW(), NOW() + INTERVAL '14 days'),
  ('Radio Taxi France', 'https://www.radiotaxifrance.fr', 'direction@radiotaxifrance.fr', 'Centrale', 0.91, '12k affiliés', 'Recherche', 'interested', 0, NOW(), NOW() + INTERVAL '1 day'),
  ('Garage Pro Taxi', 'https://www.garagepro-taxi.fr', 'contact@garagepro-taxi.fr', 'Garage', 0.82, 'Réseau garages', 'Google', 'not_contacted', 0, NOW(), NOW() + INTERVAL '9 days'),
  ('Comptable Taxi', 'https://www.comptabletaxi.fr', 'contact@comptabletaxi.fr', 'Comptabilité', 0.84, 'Cabinet comptable', 'Google', 'contacted', 1, NOW(), NOW() + INTERVAL '12 days'),
  ('Avocat Transport', 'https://www.avocat-transport.fr', 'cabinet@avocat-transport.fr', 'Juridique', 0.80, 'Cabinet avocat', 'Google', 'not_contacted', 0, NOW(), NOW() + INTERVAL '11 days'),
  ('Comparateur Auto Pro', 'https://www.comparateur-autopro.fr', 'commercial@comparateur-autopro.fr', 'Comparateur', 0.78, 'Comparateur véhicules', 'Recherche', 'not_contacted', 0, NOW(), NOW() + INTERVAL '13 days'),
  ('Achat Véhicule Pro', 'https://www.achatvehiculepro.fr', 'commercial@achatvehiculepro.fr', 'Vente', 0.79, 'Concessionnaire', 'Recherche', 'not_contacted', 0, NOW(), NOW() + INTERVAL '15 days'),
  ('Plateforme Résa', 'https://www.resataxi.com', 'business@resataxi.com', 'Tech', 0.86, 'Logiciel réservation', 'Recherche', 'not_contacted', 0, NOW(), NOW() + INTERVAL '5 days'),
  ('Appli Chauffeur', 'https://www.applichauffeur.com', 'support@applichauffeur.com', 'Mobile', 0.85, 'App gestion courses', 'Recherche', 'not_contacted', 0, NOW(), NOW() + INTERVAL '7 days'),
  ('Taxi Tesla Club', 'https://www.taxitesla.fr', 'admin@taxitesla.fr', 'Communauté', 0.89, 'Taxis électriques', 'Recherche', 'contacted', 1, NOW(), NOW() + INTERVAL '10 days'),
  ('Forum VTC Pro', 'https://www.forumvtcpro.com', 'contact@forumvtcpro.com', 'Communauté', 0.83, '8k membres', 'Recherche', 'not_contacted', 0, NOW(), NOW() + INTERVAL '8 days'),
  ('Blog Auto Entrepreneur', 'https://www.autoentrepreneur-taxi.fr', 'redac@autoentrepreneur-taxi.fr', 'Média', 0.81, 'Blog guides', 'Google', 'not_contacted', 0, NOW(), NOW() + INTERVAL '5 days')
ON CONFLICT (website) DO NOTHING;

-- Afficher résultat
DO $$
DECLARE
  prospect_count INT;
BEGIN
  SELECT COUNT(*) INTO prospect_count FROM partner_prospects;
  RAISE NOTICE '✅ Migration terminée !';
  RAISE NOTICE '📊 Total prospects: %', prospect_count;
END $$;
