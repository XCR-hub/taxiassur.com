/*
  # Fix: Peupler la table social_networks

  La génération IA retourne "0 publication(s)" car la table social_networks est vide.
  Cette migration ajoute les réseaux sociaux principaux.
*/

-- Insérer les réseaux sociaux par défaut
INSERT INTO social_networks (platform, account_name, is_active, is_connected, auto_publish, total_posts, total_engagement)
VALUES
  ('facebook', 'TaxiAssur', true, false, false, 0, 0),
  ('linkedin', 'TaxiAssur', true, false, false, 0, 0),
  ('instagram', '@taxiassur', true, false, false, 0, 0),
  ('twitter', '@taxiassur', true, false, false, 0, 0),
  ('youtube', 'TaxiAssur', false, false, false, 0, 0),
  ('tiktok', '@taxiassur', false, false, false, 0, 0)
ON CONFLICT (platform) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  account_name = EXCLUDED.account_name;

-- Vérifier l'insertion
SELECT
  platform,
  account_name,
  is_active,
  is_connected,
  auto_publish,
  created_at
FROM social_networks
ORDER BY platform;
