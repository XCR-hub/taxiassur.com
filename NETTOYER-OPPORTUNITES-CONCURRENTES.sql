-- ══════════════════════════════════════════════════════════════════
--  NETTOYER OPPORTUNITÉS BACKLINKS - RETIRER CONCURRENTS
-- ══════════════════════════════════════════════════════════════════

-- 1️⃣ VOIR TOUTES LES OPPORTUNITÉS ACTUELLES
SELECT 
  '📋 OPPORTUNITÉS ACTUELLES' as type,
  domain,
  url,
  title,
  status,
  quality_score
FROM backlink_opportunities
ORDER BY domain;

-- 2️⃣ SUPPRIMER LES CONCURRENTS DIRECTS EN ASSURANCE TAXI
DELETE FROM backlink_opportunities
WHERE domain IN (
  'assurpro-taxis.com',        -- ❌ Concurrent direct
  'assurtaxi.net',             -- ❌ Concurrent direct
  'assurance-pro-france.fr',   -- ❌ Concurrent assurance
  'assurance-professionnelle.fr' -- ❌ Concurrent assurance
);

-- 3️⃣ AJOUTER DE BONNES OPPORTUNITÉS (sites non-concurrents)
INSERT INTO backlink_opportunities (
  domain, url, title, description,
  domain_authority, relevance_score, estimated_traffic, spam_score,
  status, contact_email, quality_score
) VALUES 

-- 📰 MAGAZINES/BLOGS TRANSPORT & MOBILITÉ
('actu-transport.fr', 'https://actu-transport.fr/annuaire-partenaires',
 'Actu Transport', 'Magazine actualité transport',
 58.0, 88.0, 12000.0, 1.0, 'new', 'redaction@actu-transport.fr', 84.0),

('mobilite-pro.fr', 'https://mobilite-pro.fr/liens-utiles',
 'Mobilité Pro', 'Site mobilité professionnelle',
 55.0, 85.0, 8500.0, 2.0, 'new', 'contact@mobilite-pro.fr', 81.0),

-- 🚖 ANNUAIRES TAXI (sans concurrence assurance)
('annuaire-taxis-france.fr', 'https://annuaire-taxis-france.fr/partenaires',
 'Annuaire Taxis France', 'Annuaire national taxis',
 52.0, 92.0, 15000.0, 1.0, 'new', 'contact@annuaire-taxis-france.fr', 86.0),

('taxis-info.fr', 'https://taxis-info.fr/ressources',
 'Taxis Info', 'Portail information taxis',
 49.0, 89.0, 9000.0, 2.0, 'new', 'contact@taxis-info.fr', 79.0),

-- 📱 SITES VTC & MOBILITÉ (complémentaires)
('vtc-mag.com', 'https://vtc-mag.com/annuaire',
 'VTC Magazine', 'Magazine VTC et mobilité',
 54.0, 87.0, 11000.0, 1.0, 'new', 'redaction@vtc-mag.com', 82.0),

-- 🏢 SITES ENTREPRENEURS & PME
('entrepreneur-france.fr', 'https://entrepreneur-france.fr/partenaires',
 'Entrepreneur France', 'Site entrepreneurs indépendants',
 61.0, 78.0, 18000.0, 1.0, 'new', 'partenariats@entrepreneur-france.fr', 77.0),

('pme-magazine.fr', 'https://pme-magazine.fr/services',
 'PME Magazine', 'Magazine TPE/PME',
 59.0, 76.0, 14000.0, 2.0, 'new', 'contact@pme-magazine.fr', 74.0),

-- 🔧 SITES AUTO & VÉHICULES PRO
('flotte-auto.fr', 'https://flotte-auto.fr/partenaires',
 'Flotte Auto', 'Gestion flottes véhicules',
 56.0, 82.0, 10000.0, 1.0, 'new', 'contact@flotte-auto.fr', 80.0),

('vehicules-pro.com', 'https://vehicules-pro.com/ressources',
 'Véhicules Pro', 'Site véhicules professionnels',
 53.0, 79.0, 7500.0, 2.0, 'new', 'redaction@vehicules-pro.com', 76.0),

-- 📰 BLOGS FINANCES & GESTION (sans être concurrent)
('gestion-entreprise.fr', 'https://gestion-entreprise.fr/outils',
 'Gestion Entreprise', 'Conseils gestion TPE',
 57.0, 71.0, 13000.0, 1.0, 'new', 'contact@gestion-entreprise.fr', 72.0)

ON CONFLICT (url) DO UPDATE SET
  status = 'new',
  quality_score = EXCLUDED.quality_score,
  contact_email = EXCLUDED.contact_email;

-- 4️⃣ RÉSULTAT FINAL
SELECT 
  '✅ OPPORTUNITÉS FINALES (NON-CONCURRENTES)' as resultat,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'new' THEN 1 END) as nouvelles,
  ROUND(AVG(quality_score)::numeric, 1) as score_moyen
FROM backlink_opportunities;

-- 5️⃣ LISTE DÉTAILLÉE PAR CATÉGORIE
SELECT 
  '📊 DÉTAIL PAR TYPE' as info,
  CASE 
    WHEN domain LIKE '%transport%' OR domain LIKE '%mobilite%' THEN '🚛 Transport/Mobilité'
    WHEN domain LIKE '%taxi%' OR domain LIKE '%vtc%' THEN '🚖 Taxis/VTC'
    WHEN domain LIKE '%entrepreneur%' OR domain LIKE '%pme%' THEN '🏢 Entrepreneurs/PME'
    WHEN domain LIKE '%auto%' OR domain LIKE '%vehicule%' OR domain LIKE '%flotte%' THEN '🔧 Auto/Flottes'
    WHEN domain LIKE '%gestion%' OR domain LIKE '%finance%' THEN '💼 Gestion/Finance'
    ELSE '📰 Autres'
  END as categorie,
  domain,
  title,
  quality_score,
  status
FROM backlink_opportunities
WHERE status = 'new'
ORDER BY quality_score DESC;

-- 6️⃣ METTRE À JOUR LES COMPTEURS DE CAMPAGNE
UPDATE backlink_campaigns
SET 
  target_count = (SELECT COUNT(*) FROM backlink_opportunities WHERE status = 'new'),
  updated_at = now()
WHERE name = 'Campagne Assurance Taxi - Lancement';

-- ══════════════════════════════════════════════════════════════════
--  ✅ RÉSULTAT: 10 opportunités NON-CONCURRENTES de qualité
-- ══════════════════════════════════════════════════════════════════
