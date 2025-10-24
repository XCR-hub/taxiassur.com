-- ═══════════════════════════════════════════════════════════════
--  FIX: DOUBLON CAMPAGNES + OPPORTUNITÉS MANQUANTES
-- ═══════════════════════════════════════════════════════════════

-- 1. Nettoyer les doublons de campagnes
DELETE FROM backlink_campaigns 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM backlink_campaigns 
  GROUP BY name
);

-- 2. Vérifier qu'on a bien 1 seule campagne
SELECT 
  '✅ CAMPAGNE UNIQUE' as check_1,
  COUNT(*) as nombre_campagnes,
  name
FROM backlink_campaigns
GROUP BY name;

-- 3. Vérifier les opportunités existantes
SELECT 
  '📊 OPPORTUNITÉS ACTUELLES' as check_2,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'new' THEN 1 END) as nouvelles,
  COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contactées
FROM backlink_opportunities;

-- 4. Si pas d'opportunités, en créer (AVEC CONFLICT HANDLING)
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
)
ON CONFLICT (url) DO UPDATE SET
  domain_authority = EXCLUDED.domain_authority,
  relevance_score = EXCLUDED.relevance_score,
  quality_score = EXCLUDED.quality_score,
  status = 'new';

-- 5. Mettre à jour les compteurs de la campagne
UPDATE backlink_campaigns
SET 
  target_count = (SELECT COUNT(*) FROM backlink_opportunities WHERE status = 'new'),
  sent_count = (SELECT COUNT(*) FROM backlink_opportunities WHERE status IN ('contacted', 'responded', 'acquired')),
  replied_count = (SELECT COUNT(*) FROM backlink_opportunities WHERE status IN ('responded', 'acquired')),
  backlinks_acquired = (SELECT COUNT(*) FROM backlink_opportunities WHERE status = 'acquired')
WHERE name = 'Campagne Backlinks Assurance Taxi - Automatisée';

-- 6. Vérification finale
SELECT 
  '✅ RÉSULTAT FINAL' as resultat,
  (SELECT COUNT(*) FROM backlink_campaigns) as campagnes,
  (SELECT COUNT(*) FROM backlink_opportunities) as opportunites,
  (SELECT COUNT(*) FROM backlink_opportunities WHERE status = 'new') as nouvelles_opps,
  (SELECT target_count FROM backlink_campaigns LIMIT 1) as target_campagne;

-- 7. Afficher les opportunités disponibles
SELECT 
  '📋 OPPORTUNITÉS DISPONIBLES' as section,
  domain,
  status,
  ROUND(quality_score::numeric, 0) as score,
  contact_email
FROM backlink_opportunities
ORDER BY quality_score DESC;

-- 8. Test final
SELECT 
  '🎯 SYSTÈME PRÊT!' as message,
  'Rechargez la page maintenant (Ctrl+Shift+R)' as action,
  'Sélectionnez la campagne et cliquez Lancer Automation' as step_2;
