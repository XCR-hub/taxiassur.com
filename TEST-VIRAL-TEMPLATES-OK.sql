/*
  ══════════════════════════════════════════════════════════════════
  TEST : Vérifier viral_templates est OK
  ══════════════════════════════════════════════════════════════════
*/

-- Compter templates
SELECT COUNT(*) as "Total templates" FROM viral_templates;

-- Voir tous les templates
SELECT
  name,
  category,
  performance_score,
  (avg_views / 1000000.0)::NUMERIC(10,1) as "Vues (millions)",
  array_length(platforms, 1) as "Nb platforms",
  array_length(hashtags, 1) as "Nb hashtags"
FROM viral_templates
ORDER BY performance_score DESC;

-- Vérifier structure
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'viral_templates'
ORDER BY ordinal_position;

-- Test fonction get_viral_template existe ?
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'get_viral_template';
