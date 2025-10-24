/*
  ACTIVATION DE TOUTES LES AUTOMATISATIONS

  Exécuter cette requête dans Supabase SQL Editor pour activer
  toutes les automatisations en un seul clic.
*/

-- 1. Activer TOUTES les automatisations
UPDATE automation_status
SET
  is_enabled = true,
  updated_at = NOW()
WHERE is_enabled = false;

-- 2. Vérifier l'activation
SELECT
  name as "Automatisation",
  is_enabled as "Activée",
  frequency as "Fréquence",
  total_runs as "Total exécutions"
FROM automation_status
ORDER BY name;

-- 3. Résumé
SELECT
  COUNT(*) FILTER (WHERE is_enabled = true) as "Automatisations actives",
  COUNT(*) FILTER (WHERE is_enabled = false) as "Automatisations désactivées",
  COUNT(*) as "Total"
FROM automation_status;
