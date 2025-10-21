/*
  # Fix: Peupler la table social_networks

  La génération IA retourne "0 publication(s)" car la table social_networks est vide.
  Cette migration ajoute les réseaux sociaux principaux.
*/

-- Supprimer tous les doublons si la table a des données
DELETE FROM social_networks
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, platform,
           ROW_NUMBER() OVER (PARTITION BY platform ORDER BY created_at) as rn
    FROM social_networks
  ) t
  WHERE rn > 1
);

-- Insérer les réseaux sociaux par défaut (sans ON CONFLICT)
INSERT INTO social_networks (platform, account_name, is_active, is_connected, auto_publish, total_posts, total_engagement)
SELECT 'facebook', 'TaxiAssur', true, false, false, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM social_networks WHERE platform = 'facebook')
UNION ALL
SELECT 'linkedin', 'TaxiAssur', true, false, false, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM social_networks WHERE platform = 'linkedin')
UNION ALL
SELECT 'instagram', '@taxiassur', true, false, false, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM social_networks WHERE platform = 'instagram')
UNION ALL
SELECT 'twitter', '@taxiassur', true, false, false, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM social_networks WHERE platform = 'twitter')
UNION ALL
SELECT 'youtube', 'TaxiAssur', false, false, false, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM social_networks WHERE platform = 'youtube')
UNION ALL
SELECT 'tiktok', '@taxiassur', false, false, false, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM social_networks WHERE platform = 'tiktok');

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
