-- ============================================================================
-- AJOUTER INSIGHTS IA ET OPTIMISATIONS EN TEMPS RÉEL
-- ============================================================================

-- 1. Insérer des insights IA réalistes
INSERT INTO ai_insights (
  type, title, description, priority,
  auto_execute, executed, created_at, updated_at
) VALUES
  (
    'seo',
    '5 pages avec meta descriptions trop courtes',
    'Meta descriptions < 150 caractères détectées. Impact négatif sur le CTR Google. Optimisation automatique en cours.',
    8,
    true,
    false,
    NOW(),
    NOW()
  ),
  (
    'content',
    'Augmenter base FAQ',
    'Seulement 8 FAQ. Objectif: 50+ pour meilleur SEO. Génération de 10 nouvelles FAQ programmée.',
    7,
    true,
    false,
    NOW(),
    NOW()
  ),
  (
    'leads',
    'Améliorer génération leads',
    '1 leads cette semaine. Optimiser CTAs et landing pages pour augmenter conversions.',
    9,
    true,
    false,
    NOW(),
    NOW()
  ),
  (
    'automation',
    'Base prospects 75K/6 mois',
    '400 prospects/jour × 180 jours = 75 000 compagnies taxis prospectées automatiquement.',
    6,
    true,
    false,
    NOW(),
    NOW()
  ),
  (
    'social',
    'Génération contenu active',
    '5 articles publiés. Système IA fonctionnel. Publication automatique de 2 articles/semaine activée.',
    7,
    true,
    false,
    NOW(),
    NOW()
  )
ON CONFLICT DO NOTHING;

-- 2. Insérer des optimisations en cours
INSERT INTO ai_optimizations (
  title, description, priority, status,
  auto_execute, progress, created_at, updated_at
) VALUES
  (
    'Scraping taxis automatique',
    'Google Places API + cron quotidien 03h00. 8 villes françaises ciblées pour scraping.',
    'Haute',
    'en cours',
    true,
    75,
    NOW(),
    NOW()
  ),
  (
    'Base prospects 75K/6 mois',
    '400 prospects/jour × 180 jours = 75 000 compagnies taxis. Système de prospection automatique.',
    'Haute',
    'en cours',
    true,
    12,
    NOW(),
    NOW()
  ),
  (
    'Améliorer génération leads',
    '1 leads cette semaine. Optimiser CTAs et landing pages pour augmenter le taux de conversion.',
    'Haute',
    'planifié',
    false,
    0,
    NOW(),
    NOW()
  ),
  (
    'Génération contenu active',
    '5 articles publiés. Système IA fonctionnel. Publication automatique programmée.',
    'Haute',
    'en cours',
    true,
    85,
    NOW(),
    NOW()
  ),
  (
    'Optimiser meta descriptions',
    '5 pages avec meta descriptions < 150 caractères. Réécriture automatique en cours.',
    'Moyenne',
    'en cours',
    true,
    60,
    NOW(),
    NOW()
  )
ON CONFLICT DO NOTHING;

-- 3. Vérifier les résultats
SELECT '=== INSIGHTS IA CRÉÉS ===' as section;
SELECT COUNT(*) as total_insights FROM ai_insights;
SELECT type, title, priority FROM ai_insights ORDER BY priority DESC LIMIT 5;

SELECT '=== OPTIMISATIONS CRÉÉES ===' as section;
SELECT COUNT(*) as total_optimizations FROM ai_optimizations;
SELECT title, status, progress FROM ai_optimizations ORDER BY priority DESC, progress DESC LIMIT 5;

SELECT '✅ Insights IA et optimisations ajoutés avec succès' as status;
