-- Démonstration : Pré-chargement des Opportunités GSC Réelles
-- Basé sur les données Google Search Console 20 nov 2025 - 19 fév 2026
-- À exécuter manuellement pour voir le système en action avant la première sync

-- Insérer les requêtes réelles avec calcul des scores
INSERT INTO gsc_queries (query, impressions, clicks, ctr, position, country, device, date, opportunity_score, is_tracked, page_url) VALUES
-- Top opportunités (score ≥ 70)
('taxis sinistrés', 96, 0, 0.0000, 12.5, 'fra', 'ALL', '2026-02-19', 80, true, '/taxis-sinistres'),
('devis assurance taxi', 96, 0, 0.0000, 11.8, 'fra', 'ALL', '2026-02-19', 80, true, NULL),
('courtier professionnel taxi', 86, 0, 0.0000, 13.2, 'fra', 'ALL', '2026-02-19', 75, true, NULL),
('assurance taxi pas cher', 81, 1, 0.0123, 9.7, 'fra', 'ALL', '2026-02-19', 70, true, '/assurance-taxi'),
('assurance taxi parisien', 78, 3, 0.0385, 8.5, 'fra', 'ALL', '2026-02-19', 65, true, '/assurance-taxi-paris'),

-- Opportunités moyennes (score 50-70)
('assurance vaux le penil', 69, 0, 0.0000, 14.1, 'fra', 'ALL', '2026-02-19', 60, false, NULL),
('taxi assurance', 63, 0, 0.0000, 15.3, 'fra', 'ALL', '2026-02-19', 55, false, '/assurance-taxi'),
('assurance taxi', 51, 0, 0.0000, 16.2, 'fra', 'ALL', '2026-02-19', 50, false, '/assurance-taxi'),
('assurance des taxis', 45, 0, 0.0000, 17.8, 'fra', 'ALL', '2026-02-19', 45, false, NULL),

-- Autres requêtes intéressantes (score 30-50)
('rc pro taxi', 37, 0, 0.0000, 18.5, 'fra', 'ALL', '2026-02-19', 40, false, '/rc-professionnelle'),
('responsabilité civile professionnelle taxi', 30, 0, 0.0000, 19.2, 'fra', 'ALL', '2026-02-19', 35, false, '/rc-professionnelle'),
('comparateur assurance taxi', 20, 0, 0.0000, 21.5, 'fra', 'ALL', '2026-02-19', 30, false, NULL),
('blog taxi', 19, 0, 0.0000, 25.3, 'fra', 'ALL', '2026-02-19', 25, false, '/blog'),
('courtier assurance taxi', 16, 0, 0.0000, 22.7, 'fra', 'ALL', '2026-02-19', 28, false, NULL),
('taxi toulon base navale', 16, 0, 0.0000, 28.4, 'fra', 'ALL', '2026-02-19', 22, false, '/assurance-taxi-toulon'),
('assurance vtc bordeaux', 14, 0, 0.0000, 26.1, 'fra', 'ALL', '2026-02-19', 24, false, '/assurance-taxi-bordeaux'),
('taxi villeurbanne', 14, 0, 0.0000, 24.8, 'fra', 'ALL', '2026-02-19', 24, false, '/assurance-taxi-villeurbanne'),
('courtier taxi', 12, 0, 0.0000, 27.3, 'fra', 'ALL', '2026-02-19', 20, false, NULL),
('assurance taxi moins cher', 10, 0, 0.0000, 29.1, 'fra', 'ALL', '2026-02-19', 18, false, NULL),
('assurance pro taxi', 9, 0, 0.0000, 31.5, 'fra', 'ALL', '2026-02-19', 15, false, NULL),
('taxi devis gratuit', 9, 0, 0.0000, 30.2, 'fra', 'ALL', '2026-02-19', 15, false, NULL)
ON CONFLICT (query, date, device, country) DO UPDATE SET
  impressions = EXCLUDED.impressions,
  clicks = EXCLUDED.clicks,
  ctr = EXCLUDED.ctr,
  position = EXCLUDED.position,
  opportunity_score = EXCLUDED.opportunity_score,
  page_url = EXCLUDED.page_url,
  updated_at = now();

-- Créer automatiquement les opportunités SEO pour les requêtes à fort score
INSERT INTO seo_opportunities (
  query,
  opportunity_type,
  current_position,
  impressions,
  clicks,
  ctr,
  potential_clicks,
  priority_score,
  status,
  suggested_actions,
  metadata
)
SELECT
  q.query,
  CASE
    WHEN q.impressions > 80 AND q.clicks = 0 THEN 'zero_clicks'
    WHEN q.impressions > 50 AND q.ctr < 0.02 THEN 'high_impression_low_ctr'
    WHEN q.position >= 5 AND q.position <= 15 THEN 'position_5_15'
    ELSE 'general'
  END as opportunity_type,
  q.position,
  q.impressions,
  q.clicks,
  q.ctr,
  ROUND(q.impressions * 0.10)::integer as potential_clicks,
  q.opportunity_score,
  'pending',
  CASE
    WHEN q.query = 'taxis sinistrés' THEN jsonb_build_array(
      'Optimiser page /taxis-sinistres existante',
      'Ajouter guide étape par étape avec FAQ',
      'Améliorer titre : "Taxi Sinistré : Procédure Complète [2026]"',
      'Ajouter schema.org HowTo',
      'Potentiel : 15-25 clics/mois'
    )
    WHEN q.query = 'devis assurance taxi' THEN jsonb_build_array(
      'Créer landing page dédiée /devis-assurance-taxi',
      'Formulaire visible immédiatement',
      'Titre : "Devis Assurance Taxi Gratuit et Immédiat"',
      'CTA fort : "Obtenez votre devis en 2 minutes"',
      'Potentiel : 20-30 clics/mois'
    )
    WHEN q.query = 'courtier professionnel taxi' THEN jsonb_build_array(
      'Créer page "Notre Expertise Courtier"',
      'Mettre en avant 15 ans d''expérience',
      'Certifications ORIAS visibles',
      'Témoignages clients',
      'Potentiel : 10-18 clics/mois'
    )
    WHEN q.query = 'assurance taxi pas cher' THEN jsonb_build_array(
      'Optimiser titre/meta page existante',
      'Nouveau titre : "Assurance Taxi Pas Chère : Comparateur [2026]"',
      'Mettre en avant économies possibles (30-35%)',
      'Ajouter comparateur visible',
      'Potentiel : +4-6 clics/mois'
    )
    WHEN q.query = 'assurance taxi parisien' THEN jsonb_build_array(
      'Enrichir page Paris avec données locales',
      'Prix moyens spécifiques Paris',
      'Réglementations locales',
      'Assureurs recommandés Paris',
      'Potentiel : +6-9 clics/mois'
    )
    ELSE jsonb_build_array(
      'Créer contenu optimisé pour cette requête',
      'Analyser intention de recherche',
      'Enrichir avec requêtes connexes',
      'Optimiser titre et meta description'
    )
  END as suggested_actions,
  jsonb_build_object(
    'source', 'demo_data_gsc_real',
    'date_range', '2025-11-20 to 2026-02-19',
    'detected_at', now(),
    'ctr_benchmark', CASE
      WHEN q.position <= 3 THEN '15-25%'
      WHEN q.position <= 5 THEN '10-15%'
      WHEN q.position <= 10 THEN '5-10%'
      ELSE '2-5%'
    END
  )
FROM gsc_queries q
WHERE q.opportunity_score >= 60  -- Seulement les meilleures opportunités
  AND q.date = '2026-02-19'
ON CONFLICT DO NOTHING;

-- Insérer un historique de sync pour la démo
INSERT INTO gsc_sync_history (
  sync_date,
  start_date,
  end_date,
  queries_imported,
  pages_imported,
  opportunities_detected,
  status,
  duration_ms,
  metadata
) VALUES (
  now(),
  '2025-11-20',
  '2026-02-19',
  20,
  5,
  5,
  'success',
  2450,
  jsonb_build_object(
    'source', 'demo_manual_import',
    'note', 'Données réelles GSC pré-chargées pour démonstration',
    'top_query', 'taxis sinistrés (96 impressions)',
    'total_impressions', 820,
    'total_clicks', 4,
    'average_ctr', '0.49%'
  )
);

-- Afficher un résumé des opportunités créées
SELECT
  'OPPORTUNITÉS GSC RÉELLES CHARGÉES' as titre,
  COUNT(*) as total_opportunites,
  SUM(impressions) as total_impressions,
  SUM(clicks) as total_clics,
  ROUND(AVG(priority_score)::numeric, 1) as score_moyen,
  SUM(potential_clicks) as clics_potentiels
FROM seo_opportunities
WHERE created_at > now() - INTERVAL '5 minutes';

-- Afficher le top 5 des opportunités
SELECT
  query as "Requête",
  impressions as "Impressions",
  clicks as "Clics",
  ROUND(ctr::numeric * 100, 2) || '%' as "CTR",
  ROUND(current_position::numeric, 1) as "Position",
  priority_score as "Score",
  potential_clicks as "Potentiel",
  opportunity_type as "Type"
FROM seo_opportunities
WHERE created_at > now() - INTERVAL '5 minutes'
ORDER BY priority_score DESC
LIMIT 5;
