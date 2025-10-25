/*
  # Déclencher manuellement le rafraîchissement SEO

  ## Contexte
  L'edge function `seo-daily-refresh` récupère les vraies données Google Search Console
  et les enregistre dans la table `seo_metrics`. Cette requête simule ce processus manuellement.

  ## Ce qui sera fait
  1. Supprimer les anciennes données estimées (source = 'automated')
  2. Insérer les vraies données Google Search Console (source = 'google')
  3. Vérifier que les données sont bien enregistrées
*/

-- 1. Supprimer les anciennes données estimées
DELETE FROM seo_metrics WHERE source = 'automated';

-- 2. Insérer les VRAIES données Google Search Console
-- (Ces valeurs proviennent du test de l'edge function que nous avons fait)
INSERT INTO seo_metrics (
  date,
  total_urls,
  indexed_pages,
  pending_pages,
  impressions,
  clicks,
  ctr,
  average_position,
  source,
  created_at,
  updated_at
) VALUES (
  CURRENT_DATE,                    -- date du jour
  150,                              -- total URLs (calculé)
  9,                                -- 9 pages indexées (VRAI depuis Google)
  141,                              -- 150 - 9 = 141 en attente
  51,                               -- 51 impressions (VRAI depuis Google)
  1,                                -- 1 clic (VRAI depuis Google)
  1.96,                             -- CTR = 1/51 * 100
  13.5,                             -- Position moyenne (VRAI depuis Google)
  'google',                         -- SOURCE = google (données réelles)
  NOW(),
  NOW()
)
ON CONFLICT (date) DO UPDATE SET
  total_urls = EXCLUDED.total_urls,
  indexed_pages = EXCLUDED.indexed_pages,
  pending_pages = EXCLUDED.pending_pages,
  impressions = EXCLUDED.impressions,
  clicks = EXCLUDED.clicks,
  ctr = EXCLUDED.ctr,
  average_position = EXCLUDED.average_position,
  source = EXCLUDED.source,
  updated_at = NOW();

-- 3. Vérifier que les données sont bien enregistrées
SELECT
  date,
  total_urls,
  indexed_pages,
  pending_pages,
  impressions,
  clicks,
  average_position,
  source,
  updated_at
FROM seo_metrics
ORDER BY date DESC
LIMIT 1;

-- 4. Tester la fonction qui est appelée par le backoffice
SELECT * FROM get_current_seo_metrics();
