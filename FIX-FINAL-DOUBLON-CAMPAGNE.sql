-- ══════════════════════════════════════════════════════════════════
--  FIX DÉFINITIF - SUPPRIMER TOUS DOUBLONS CAMPAGNES
-- ══════════════════════════════════════════════════════════════════

-- 1️⃣ AFFICHER LES DOUBLONS ACTUELS
SELECT 
  '🔍 DOUBLONS DÉTECTÉS' as check_type,
  name,
  COUNT(*) as nombre_doublons,
  string_agg(id::text, ', ') as ids
FROM backlink_campaigns
GROUP BY name
HAVING COUNT(*) > 1;

-- 2️⃣ SUPPRIMER TOUS LES DOUBLONS (garder le plus ancien)
DELETE FROM backlink_campaigns 
WHERE id NOT IN (
  SELECT DISTINCT ON (name) id
  FROM backlink_campaigns
  ORDER BY name, created_at ASC
);

-- 3️⃣ VÉRIFICATION: Il ne doit rester qu'1 campagne
SELECT 
  '✅ CAMPAGNES UNIQUES' as resultat,
  COUNT(*) as total_campagnes,
  string_agg(name, ' | ') as noms
FROM backlink_campaigns;

-- 4️⃣ COMPTER LES OPPORTUNITÉS DISPONIBLES
SELECT 
  '📊 OPPORTUNITÉS' as type,
  status,
  COUNT(*) as nombre,
  ROUND(AVG(quality_score)::numeric, 0) as score_moyen
FROM backlink_opportunities
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'new' THEN 1
    WHEN 'contacted' THEN 2
    WHEN 'pending' THEN 3
    WHEN 'responded' THEN 4
    WHEN 'acquired' THEN 5
    ELSE 99
  END;

-- 5️⃣ SI AUCUNE OPPORTUNITÉ "NEW", EN CRÉER
INSERT INTO backlink_opportunities (
  domain, url, title, description,
  domain_authority, relevance_score, estimated_traffic, spam_score,
  status, contact_email, quality_score
) 
SELECT * FROM (
  VALUES 
    ('assurpro-taxis.com', 'https://assurpro-taxis.com/partenaires', 
     'Assurances Pro Taxis', 'Comparateur assurances', 
     55.0, 94.0, 4200.0, 1.0, 'new', 'partenariats@assurpro-taxis.com', 82.0),
    ('transport-magazine.fr', 'https://transport-magazine.fr/annuaire',
     'Magazine Transport', 'Magazine transport pro',
     62.0, 85.0, 4000.0, 1.0, 'new', 'contact@transport-magazine.fr', 79.0),
    ('assurance-pro-france.fr', 'https://assurance-pro-france.fr/partenaires',
     'Annuaire Assurances', 'Annuaire assurances pros',
     58.0, 92.0, 3500.0, 2.0, 'new', 'partenariats@assurance-pro-france.fr', 75.0)
) AS new_opps(domain, url, title, description, da, rel, traffic, spam, status, email, score)
WHERE NOT EXISTS (
  SELECT 1 FROM backlink_opportunities WHERE status = 'new' LIMIT 1
)
ON CONFLICT (url) DO UPDATE SET
  status = 'new',
  quality_score = EXCLUDED.quality_score;

-- 6️⃣ METTRE À JOUR LES COMPTEURS DE LA CAMPAGNE
UPDATE backlink_campaigns
SET 
  target_count = (SELECT COUNT(*) FROM backlink_opportunities WHERE status = 'new'),
  sent_count = (SELECT COUNT(*) FROM backlink_opportunities WHERE status IN ('contacted', 'responded', 'acquired')),
  replied_count = (SELECT COUNT(*) FROM backlink_opportunities WHERE status IN ('responded', 'acquired')),
  backlinks_acquired = (SELECT COUNT(*) FROM backlink_opportunities WHERE status = 'acquired'),
  updated_at = now();

-- 7️⃣ RÉSULTAT FINAL
SELECT 
  '🎯 SYSTÈME PRÊT!' as message,
  (SELECT COUNT(*) FROM backlink_campaigns) as campagnes,
  (SELECT COUNT(*) FROM backlink_opportunities WHERE status = 'new') as opps_new,
  (SELECT COUNT(*) FROM backlink_opportunities) as opps_total;

-- ══════════════════════════════════════════════════════════════════
--  RÉSULTAT ATTENDU:
--  message        | campagnes | opps_new | opps_total
--  🎯 SYSTÈME PRÊT! |     1     |    3+    |    12+
-- ══════════════════════════════════════════════════════════════════
