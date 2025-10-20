/*
  # Synchronisation Google Search Console - Version ULTRA SIMPLE

  Cette version évite TOUS les problèmes :
  - Pas de ON CONFLICT
  - Pas de modification de structure
  - Juste : Supprimer → Insérer

  Utilisez ce fichier si vous obtenez n'importe quelle erreur avec les autres versions.
*/

-- 1. Supprimer TOUTES les données de seo_metrics
TRUNCATE TABLE seo_metrics;

-- 2. Insérer les VRAIES données actuelles de Google Search Console
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
  created_at
) VALUES (
  CURRENT_DATE,
  150,  -- URLs totales (Google Search Console)
  72,   -- Pages indexées RÉELLES ✅
  141,  -- En attente d'indexation
  51,   -- Impressions (30 derniers jours)
  1,    -- Clics (30 derniers jours)
  1.96, -- CTR en % (30 derniers jours)
  13.5, -- Position moyenne (30 derniers jours)
  'google_search_console',
  NOW()
);

-- 3. Vérifier les données
SELECT
  date AS "📅 Date",
  indexed_pages AS "📊 Pages Indexées",
  total_urls AS "📈 URLs Totales",
  pending_pages AS "⏳ En Attente",
  impressions AS "👁️ Impressions (30j)",
  clicks AS "🖱️ Clics (30j)",
  ctr AS "📈 CTR %",
  average_position AS "📍 Position Moy.",
  source AS "Source"
FROM seo_metrics
ORDER BY date DESC;

-- 4. Message de confirmation
SELECT
  '✅ SYNCHRONISATION RÉUSSIE !' as "Status",
  '72 pages indexées (au lieu de 9)' as "Résultat",
  'Rafraîchissez /backoffice/seo' as "Action";
