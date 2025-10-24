/*
  # Fix partner_prospects - Ajouter colonne source manquante

  Cette migration ajoute la colonne 'source' à partner_prospects si elle n'existe pas déjà.
*/

-- Ajouter la colonne source si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'partner_prospects'
    AND column_name = 'source'
  ) THEN
    ALTER TABLE partner_prospects ADD COLUMN source text;
    RAISE NOTICE 'Colonne source ajoutée avec succès';
  ELSE
    RAISE NOTICE 'Colonne source existe déjà';
  END IF;
END $$;

-- Maintenant on peut peupler les prospects
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
  ('Blog Taxi', 'https://www.blogtaxi.fr', 'contact@blogtaxi.fr', 'Média Transport', 0.92, 'Blog très actif sur l''actualité taxi. Parfait pour articles invités.', 'Google Search', 'not_contacted', 0, NOW(), NOW() + INTERVAL '3 days'),
  ('Chauffeur Magazine', 'https://www.chauffeurmag.com', 'redaction@chauffeurmag.com', 'Presse Professionnelle', 0.95, 'Magazine de référence. Forte audience chauffeurs VTC/Taxi.', 'Google Search', 'not_contacted', 0, NOW(), NOW() + INTERVAL '2 days'),
  ('Taxi Actu', 'https://www.taxi-actu.fr', 'info@taxi-actu.fr', 'Actualités Transport', 0.88, 'Site d''actualités spécialisé. Bonne visibilité SEO.', 'Google Search', 'contacted', 1, NOW(), NOW() + INTERVAL '7 days'),
  ('YouTube Taxi Vlog', 'https://www.youtube.com/@TaxiVlogFR', 'taxivlogfr@gmail.com', 'Média YouTube', 0.87, 'Chaîne YouTube 45k abonnés. Sponsoring vidéos.', 'Recherche YouTube', 'not_contacted', 0, NOW(), NOW() + INTERVAL '4 days'),
  ('Association des Taxis Parisiens', 'https://www.atparisien.com', 'secretariat@atparisien.com', 'Association Professionnelle', 0.93, '1200 adhérents. Partenariat institutionnel stratégique.', 'Recherche association', 'interested', 0, NOW(), NOW() + INTERVAL '1 day'),
  ('Fédération Nationale Taxi', 'https://www.fntaxi.fr', 'contact@fntaxi.fr', 'Fédération', 0.94, 'Fédération nationale. Partenariat prestigieux.', 'Recherche fédération', 'interested', 0, NOW(), NOW() + INTERVAL '1 day'),
  ('Forum Taxi', 'https://www.forumtaxi.com', 'admin@forumtaxi.com', 'Communauté', 0.85, 'Forum actif 12k membres. Bannière publicitaire possible.', 'Recherche communauté', 'not_contacted', 0, NOW(), NOW() + INTERVAL '6 days'),
  ('École Taxi Formation', 'https://www.ecole-taxi.fr', 'contact@ecole-taxi.fr', 'Formation', 0.90, 'École de formation taxi. Partenariat sur assurance nouveaux diplômés.', 'Google Search', 'interested', 0, NOW(), NOW() + INTERVAL '2 days'),
  ('Centrale VTC', 'https://www.centrale-vtc.fr', 'partenariats@centrale-vtc.fr', 'Plateforme VTC', 0.87, 'Centrale de réservation VTC. 3000+ chauffeurs inscrits.', 'Recherche VTC', 'contacted', 2, NOW(), NOW() + INTERVAL '14 days'),
  ('Radio Taxi France', 'https://www.radiotaxifrance.fr', 'direction@radiotaxifrance.fr', 'Centrale Radio', 0.91, 'Plus grande centrale France. 12k chauffeurs affiliés.', 'Recherche centrale', 'interested', 0, NOW(), NOW() + INTERVAL '1 day'),
  ('Garage Pro Taxi', 'https://www.garagepro-taxi.fr', 'contact@garagepro-taxi.fr', 'Garage Spécialisé', 0.82, 'Réseau de garages spécialisés taxi. Cross-selling possible.', 'Google Search', 'not_contacted', 0, NOW(), NOW() + INTERVAL '9 days'),
  ('Comptable Taxi Services', 'https://www.comptabletaxi.fr', 'contact@comptabletaxi.fr', 'Services Comptables', 0.84, 'Cabinet comptable spécialisé taxi. Recommandations clients.', 'Google Search', 'contacted', 1, NOW(), NOW() + INTERVAL '12 days'),
  ('Avocat Droit Transport', 'https://www.avocat-transport.fr', 'cabinet@avocat-transport.fr', 'Services Juridiques', 0.80, 'Cabinet avocat spécialisé. Recommandations mutuelles.', 'Google Search', 'not_contacted', 0, NOW(), NOW() + INTERVAL '11 days'),
  ('Comparateur Auto Pro', 'https://www.comparateur-autopro.fr', 'commercial@comparateur-autopro.fr', 'Comparateur', 0.78, 'Comparateur véhicules pro. Intégration module assurance.', 'Recherche comparateur', 'not_contacted', 0, NOW(), NOW() + INTERVAL '13 days'),
  ('Achat Véhicule Pro', 'https://www.achatvehiculepro.fr', 'commercial@achatvehiculepro.fr', 'Vente Véhicules', 0.79, 'Concessionnaire multi-marques taxi. Pack assurance+véhicule.', 'Recherche concessionnaire', 'not_contacted', 0, NOW(), NOW() + INTERVAL '15 days'),
  ('Plateforme Résa Taxi', 'https://www.resataxi.com', 'business@resataxi.com', 'Technologie', 0.86, 'Logiciel de réservation taxi. 500+ compagnies clientes.', 'Recherche logiciel', 'not_contacted', 0, NOW(), NOW() + INTERVAL '5 days'),
  ('Appli Chauffeur', 'https://www.applichauffeur.com', 'support@applichauffeur.com', 'Application Mobile', 0.85, 'App gestion courses. 7k utilisateurs actifs. Intégration API.', 'Recherche application', 'not_contacted', 0, NOW(), NOW() + INTERVAL '7 days'),
  ('Taxi Tesla Club France', 'https://www.taxitesla.fr', 'admin@taxitesla.fr', 'Communauté', 0.89, 'Communauté taxis électriques. Niche haute valeur.', 'Recherche Tesla', 'contacted', 1, NOW(), NOW() + INTERVAL '10 days'),
  ('Forum VTC Pro', 'https://www.forumvtcpro.com', 'contact@forumvtcpro.com', 'Communauté VTC', 0.83, 'Forum VTC 8k membres. Bannière sponsorisée.', 'Recherche forum', 'not_contacted', 0, NOW(), NOW() + INTERVAL '8 days'),
  ('Blog Auto Entrepreneur', 'https://www.autoentrepreneur-taxi.fr', 'redac@autoentrepreneur-taxi.fr', 'Média Entrepreneuriat', 0.81, 'Blog guides création entreprise taxi. Articles invités.', 'Google Search', 'not_contacted', 0, NOW(), NOW() + INTERVAL '5 days')
ON CONFLICT (website) DO NOTHING;

-- Afficher le résultat
DO $$
DECLARE
  prospect_count INT;
BEGIN
  SELECT COUNT(*) INTO prospect_count FROM partner_prospects;
  RAISE NOTICE '✅ Migration terminée !';
  RAISE NOTICE '📊 Total prospects: %', prospect_count;
END $$;
