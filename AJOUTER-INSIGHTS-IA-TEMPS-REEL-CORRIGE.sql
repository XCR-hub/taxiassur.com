-- ============================================================================
-- AJOUTER INSIGHTS IA ET OPTIMISATIONS EN TEMPS RÉEL - VERSION CORRIGÉE
-- ============================================================================

-- 1. Supprimer les anciennes données (optionnel, pour repartir sur une base propre)
DELETE FROM ai_insights WHERE type IN ('seo', 'content', 'leads', 'automation', 'social');
DELETE FROM ai_optimizations WHERE title LIKE '%Scraping taxis%' OR title LIKE '%Base prospects%' OR title LIKE '%Améliorer génération%' OR title LIKE '%Génération contenu%' OR title LIKE '%Optimiser meta%';

-- 2. Insérer des insights IA réalistes (SANS updated_at, SANS ON CONFLICT)
INSERT INTO ai_insights (
  type, title, description, priority,
  auto_execute, executed, created_at
) VALUES
  (
    'seo',
    '5 pages avec meta descriptions trop courtes',
    'Meta descriptions < 150 caractères détectées. Impact négatif sur le CTR Google. Optimisation automatique en cours.',
    8,
    true,
    false,
    NOW()
  ),
  (
    'content',
    'Augmenter base FAQ',
    'Seulement 8 FAQ. Objectif: 50+ pour meilleur SEO. Génération de 10 nouvelles FAQ programmée.',
    7,
    true,
    false,
    NOW()
  ),
  (
    'leads',
    'Améliorer génération leads',
    '1 leads cette semaine. Optimiser CTAs et landing pages pour augmenter conversions.',
    9,
    true,
    false,
    NOW()
  ),
  (
    'automation',
    'Base prospects 75K/6 mois',
    '400 prospects/jour × 180 jours = 75 000 compagnies taxis prospectées automatiquement.',
    6,
    true,
    false,
    NOW()
  ),
  (
    'social',
    'Génération contenu active',
    '5 articles publiés. Système IA fonctionnel. Publication automatique de 2 articles/semaine activée.',
    7,
    true,
    false,
    NOW()
  );

-- 3. Insérer des optimisations en cours (SANS updated_at, SANS ON CONFLICT)
INSERT INTO ai_optimizations (
  title, description, priority, status,
  auto_execute, progress, created_at
) VALUES
  (
    'Scraping taxis automatique',
    'Google Places API + cron quotidien 03h00. 8 villes françaises ciblées pour scraping.',
    'haute',
    'en_cours',
    true,
    75,
    NOW()
  ),
  (
    'Base prospects 75K/6 mois',
    '400 prospects/jour × 180 jours = 75 000 compagnies taxis. Système de prospection automatique.',
    'haute',
    'en_cours',
    true,
    12,
    NOW()
  ),
  (
    'Améliorer génération leads',
    '1 leads cette semaine. Optimiser CTAs et landing pages pour augmenter le taux de conversion.',
    'haute',
    'planifié',
    false,
    0,
    NOW()
  ),
  (
    'Génération contenu active',
    '5 articles publiés. Système IA fonctionnel. Publication automatique programmée.',
    'haute',
    'en_cours',
    true,
    85,
    NOW()
  ),
  (
    'Optimiser meta descriptions',
    '5 pages avec meta descriptions < 150 caractères. Réécriture automatique en cours.',
    'moyenne',
    'en_cours',
    true,
    60,
    NOW()
  );

-- 4. Vérifier les résultats
SELECT '=== INSIGHTS IA CRÉÉS ===' as section;
SELECT COUNT(*) as total_insights FROM ai_insights;
SELECT type, title, priority FROM ai_insights ORDER BY priority DESC LIMIT 5;

SELECT '=== OPTIMISATIONS CRÉÉES ===' as section;
SELECT COUNT(*) as total_optimizations FROM ai_optimizations;
SELECT title, status, progress FROM ai_optimizations ORDER BY created_at DESC LIMIT 5;

SELECT '✅ Insights IA et optimisations ajoutés avec succès' as status;
