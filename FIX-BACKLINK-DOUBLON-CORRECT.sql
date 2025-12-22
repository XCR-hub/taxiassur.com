-- ═══════════════════════════════════════════════════════════════
--  FIX IMMÉDIAT - BACKLINKS (CORRIGÉ POUR UUID)
-- ═══════════════════════════════════════════════════════════════

-- 1. Supprimer le doublon (VERSION UUID)
DELETE FROM backlink_campaigns 
WHERE ctid NOT IN (
  SELECT MIN(ctid) 
  FROM backlink_campaigns 
  GROUP BY name
);

-- 2. Ajouter 5 opportunités de qualité
INSERT INTO backlink_opportunities (
  domain,
  url,
  title,
  description,
  domain_authority,
  relevance_score,
  estimated_traffic,
  spam_score,
  status,
  contact_email,
  quality_score
) VALUES 
(
  'assurpro-taxis.com',
  'https://assurpro-taxis.com/partenaires',
  'Assurances Professionnelles Taxis',
  'Comparateur assurances professionnelles pour taxis',
  55.0,
  94.0,
  4200.0,
  1.0,
  'new',
  'partenariats@assurpro-taxis.com',
  82.0
),
(
  'transport-magazine.fr',
  'https://transport-magazine.fr/annuaire',
  'Annuaire Transport & Mobilité',
  'Magazine professionnel du transport et de la mobilité',
  62.0,
  85.0,
  4000.0,
  1.0,
  'new',
  'contact@transport-magazine.fr',
  79.0
),
(
  'assurance-pro-france.fr',
  'https://assurance-pro-france.fr/partenaires',
  'Annuaire Assurances Professionnelles France',
  'Premier annuaire des assurances professionnelles en France',
  58.0,
  92.0,
  3500.0,
  2.0,
  'new',
  'partenariats@assurance-pro-france.fr',
  75.0
),
(
  'flotte-taxi-france.fr',
  'https://flotte-taxi-france.fr/annuaire',
  'Annuaire National Flottes de Taxis',
  'Annuaire des professionnels de la flotte taxi',
  48.0,
  90.0,
  2800.0,
  2.0,
  'new',
  'contact@flotte-taxi-france.fr',
  72.0
),
(
  'taxiinfos-pro.com',
  'https://taxiinfos-pro.com/ressources',
  'Ressources Professionnelles Taxis',
  'Site d''information et ressources pour taxis professionnels',
  45.0,
  88.0,
  2200.0,
  3.0,
  'new',
  'redaction@taxiinfos-pro.com',
  68.0
)
ON CONFLICT (url) DO UPDATE SET
  domain_authority = EXCLUDED.domain_authority,
  relevance_score = EXCLUDED.relevance_score,
  quality_score = EXCLUDED.quality_score,
  status = 'new';

-- 3. Mettre à jour les compteurs
UPDATE backlink_campaigns
SET 
  target_count = (SELECT COUNT(*) FROM backlink_opportunities WHERE status = 'new'),
  sent_count = 0,
  opened_count = 0,
  replied_count = 0,
  positive_count = 0,
  negative_count = 0,
  backlinks_acquired = 0;

-- 4. Vérification finale
SELECT 
  '✅ SYSTÈME RÉPARÉ!' as message,
  (SELECT COUNT(*) FROM backlink_campaigns) as campagnes,
  (SELECT COUNT(*) FROM backlink_opportunities WHERE status = 'new') as opportunites_disponibles;

-- 5. Liste des opportunités
SELECT 
  '📋 OPPORTUNITÉS CRÉÉES' as section,
  domain,
  ROUND(quality_score::numeric, 0) as score,
  contact_email
FROM backlink_opportunities
WHERE status = 'new'
ORDER BY quality_score DESC;
