-- ============================================
-- NETTOYAGE COMPLET - SUPPRIMER CONCURRENTS
-- ============================================

-- 1. SUPPRIMER tous les sites d'assurance (concurrents)
DELETE FROM backlink_opportunities
WHERE domain ILIKE '%assurance%'
   OR domain ILIKE '%insurance%'
   OR domain ILIKE '%assureur%'
   OR domain ILIKE '%mutuelle%'
   OR domain ILIKE '%axa%'
   OR domain ILIKE '%generali%'
   OR domain ILIKE '%allianz%'
   OR domain ILIKE '%maif%'
   OR domain ILIKE '%macif%'
   OR domain ILIKE '%matmut%';

-- 2. Voir ce qui reste
SELECT
  COUNT(*) as total_restant,
  string_agg(DISTINCT domain, ', ') as exemples_domaines
FROM backlink_opportunities;

-- 3. LISTE DES TYPES DE SITES ACCEPTABLES UNIQUEMENT :
-- ✅ Médias généralistes (Le Figaro, Le Monde, etc.)
-- ✅ Sites de taxis / VTC (annuaires, forums)
-- ✅ Sites juridiques / administratifs
-- ✅ Blogs automobiles
-- ✅ Annuaires professionnels
-- ✅ Sites municipaux / gouvernementaux
-- ❌ Sites d'assurance (concurrents)
-- ❌ Sites de courtage assurance

-- 4. Ajouter une règle de filtrage dans la table
ALTER TABLE backlink_opportunities
ADD COLUMN IF NOT EXISTS is_competitor BOOLEAN DEFAULT false;

-- 5. Marquer les concurrents restants
UPDATE backlink_opportunities
SET is_competitor = true
WHERE domain ILIKE '%assurance%'
   OR domain ILIKE '%insurance%'
   OR domain ILIKE '%courtier%'
   OR domain ILIKE '%broker%';

-- 6. Supprimer les concurrents marqués
DELETE FROM backlink_opportunities
WHERE is_competitor = true;

-- 7. RÉSULTAT FINAL
SELECT
  COUNT(*) as opportunites_valides,
  COUNT(CASE WHEN contact_email IS NOT NULL THEN 1 END) as avec_email,
  string_agg(DISTINCT
    CASE WHEN contact_email IS NOT NULL
    THEN domain
    END, ', ') as domaines_contactables
FROM backlink_opportunities
WHERE status = 'pending'
LIMIT 10;
