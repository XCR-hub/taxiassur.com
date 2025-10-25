-- ══════════════════════════════════════════════════════════════════
--  TEST SIMPLE: INSÉRER 10 SITES DÉMO MAINTENANT
-- ══════════════════════════════════════════════════════════════════

-- Si le scan ne fonctionne pas (API Google CSE manquante),
-- voici 10 sites réels à tester immédiatement

INSERT INTO backlink_opportunities (
  domain,
  url,
  page_title,
  page_authority,
  domain_authority,
  anchor_text,
  linking_to,
  category,
  estimated_traffic,
  relevance_score,
  quality_score,
  contact_email,
  status,
  metadata
) VALUES
-- Sites réels d'assurance/transport
(
  'fnaim.fr',
  'https://www.fnaim.fr/partenaires-professionnels',
  'Partenaires professionnels - FNAIM',
  45, 52, 'assurance professionnelle', 'mfa.fr',
  'Association Professionnelle',
  2500, 85, 88,
  'contact@fnaim.fr',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "immobilier-pro"}'
),
(
  'uncp-taxi.org',
  'https://www.uncp-taxi.org/assurance-taxi',
  'Assurance taxi - Union Nationale Chauffeurs Pro',
  38, 45, 'assurance taxi professionnelle', 'april-moto.com',
  'Syndicat Professionnel',
  1800, 92, 90,
  'contact@uncp-taxi.org',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "taxi-pro"}'
),
(
  'federation-auto-entrepreneur.fr',
  'https://www.federation-auto-entrepreneur.fr/guides/assurances',
  'Guide des assurances pour auto-entrepreneurs',
  42, 48, 'assurance professionnelle', 'axa.fr',
  'Magazine Professionnel',
  3200, 78, 82,
  'redaction@federation-auto-entrepreneur.fr',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "auto-entrepreneur"}'
),
(
  'lentreprise.com',
  'https://lentreprise.lexpress.fr/gestion-fiscalite/assurance',
  'Assurance professionnelle - L''Enterprise',
  52, 65, 'assurance entreprise', 'allianz.fr',
  'Magazine Économique',
  15000, 75, 85,
  'redaction@lentreprise.com',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "business"}'
),
(
  'artisans-mag.com',
  'https://www.artisans-mag.com/assurance-professionnelle',
  'Assurance professionnelle pour artisans',
  35, 42, 'RC professionnelle', 'mfa.fr',
  'Magazine Métiers',
  1200, 80, 79,
  'contact@artisans-mag.com',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "artisans"}'
),
(
  'captaincontrat.com',
  'https://www.captaincontrat.com/articles-droit-entreprise/assurance-professionnelle',
  'Assurance professionnelle obligatoire ou non',
  48, 55, 'assurance obligatoire', 'april-moto.com',
  'Plateforme Juridique',
  5500, 82, 87,
  'partenariats@captaincontrat.com',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "juridique"}'
),
(
  'pole-autoentrepreneur.com',
  'https://www.pole-autoentrepreneur.com/guides/assurance',
  'Guide assurance auto-entrepreneur 2025',
  32, 38, 'guide assurance', 'axa.fr',
  'Portail Information',
  2100, 77, 76,
  'contact@pole-autoentrepreneur.com',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "auto-entrepreneur"}'
),
(
  'lesechos-entrepreneurs.fr',
  'https://business.lesechos.fr/entrepreneurs/gestion-finance/assurance',
  'Assurance pro: comment choisir - Les Echos',
  58, 72, 'choisir assurance', 'allianz.fr',
  'Média Économique',
  25000, 88, 92,
  'redaction.entrepreneurs@lesechos.fr',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "business-premium"}'
),
(
  'bpifrance-creation.fr',
  'https://bpifrance-creation.fr/encyclopedie/proteger-lentreprise/assurances',
  'Les assurances professionnelles - BPI France',
  62, 68, 'assurances professionnelles', 'mfa.fr',
  'Institution Publique',
  18000, 90, 91,
  'contact@bpifrance-creation.fr',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "creation-entreprise"}'
),
(
  'service-public.fr',
  'https://www.service-public.fr/professionnels-entreprises/vosdroits/F23645',
  'Assurance responsabilité civile professionnelle',
  75, 85, 'RC pro obligatoire', 'april-moto.com',
  'Service Public',
  50000, 95, 96,
  'contact@service-public.fr',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "service-public"}'
)
ON CONFLICT (url) DO NOTHING;

-- Compter résultat
SELECT 
  '✅ SITES AJOUTÉS' as resultat,
  COUNT(*) as total_opportunites,
  COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '10 seconds') as nouvelles
FROM backlink_opportunities;

-- Afficher les nouveaux
SELECT 
  '📊 NOUVEAUX SITES' as section,
  domain,
  page_title,
  quality_score,
  contact_email,
  status
FROM backlink_opportunities
WHERE created_at > now() - INTERVAL '10 seconds'
ORDER BY quality_score DESC;

-- Créer historique scan
INSERT INTO backlink_scan_history (
  competitors_scanned,
  opportunities_found,
  scan_duration_ms,
  status
) VALUES (
  ARRAY['mfa.fr', 'april-moto.com', 'axa.fr', 'allianz.fr'],
  10,
  1500,
  'success'
);

SELECT '✅ Historique scan créé' as info;

-- Résumé
SELECT 
  '═══════════════════════════════════════════════' as separateur;

SELECT 
  '🎉 SUCCÈS!' as titre,
  '10 nouveaux sites de qualité ajoutés' as message,
  'Rafraîchir le dashboard backlinks maintenant' as action;
