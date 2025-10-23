-- ══════════════════════════════════════════════════════════════════
--  TEST SIMPLE: INSÉRER 10 SITES PREMIUM (VERSION CORRIGÉE)
-- ══════════════════════════════════════════════════════════════════

-- Vérifier d'abord la structure
SELECT '🔍 STRUCTURE TABLE' as info;
SELECT column_name FROM information_schema.columns
WHERE table_name = 'backlink_opportunities'
ORDER BY ordinal_position;

-- Insérer 10 sites premium avec colonnes réelles
INSERT INTO backlink_opportunities (
  domain,
  url,
  page_title,
  page_authority,
  domain_authority,
  category,
  estimated_traffic,
  relevance_score,
  quality_score,
  contact_email,
  status,
  metadata
) VALUES
(
  'fnaim.fr',
  'https://www.fnaim.fr/partenaires-professionnels',
  'Partenaires professionnels - FNAIM',
  45, 52,
  'Association Professionnelle',
  2500, 85, 88,
  'contact@fnaim.fr',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "immobilier-pro", "linking_to": "mfa.fr"}'::jsonb
),
(
  'uncp-taxi.org',
  'https://www.uncp-taxi.org/assurance-taxi',
  'Assurance taxi - Union Nationale Chauffeurs Pro',
  38, 45,
  'Syndicat Professionnel',
  1800, 92, 90,
  'contact@uncp-taxi.org',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "taxi-pro", "linking_to": "april-moto.com"}'::jsonb
),
(
  'federation-auto-entrepreneur.fr',
  'https://www.federation-auto-entrepreneur.fr/guides/assurances',
  'Guide des assurances pour auto-entrepreneurs',
  42, 48,
  'Magazine Professionnel',
  3200, 78, 82,
  'redaction@federation-auto-entrepreneur.fr',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "auto-entrepreneur", "linking_to": "axa.fr"}'::jsonb
),
(
  'lentreprise.com',
  'https://lentreprise.lexpress.fr/gestion-fiscalite/assurance',
  'Assurance professionnelle - L''Enterprise',
  52, 65,
  'Magazine Économique',
  15000, 75, 85,
  'redaction@lentreprise.com',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "business", "linking_to": "allianz.fr"}'::jsonb
),
(
  'artisans-mag.com',
  'https://www.artisans-mag.com/assurance-professionnelle',
  'Assurance professionnelle pour artisans',
  35, 42,
  'Magazine Métiers',
  1200, 80, 79,
  'contact@artisans-mag.com',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "artisans", "linking_to": "mfa.fr"}'::jsonb
),
(
  'captaincontrat.com',
  'https://www.captaincontrat.com/articles-droit-entreprise/assurance-professionnelle',
  'Assurance professionnelle obligatoire ou non',
  48, 55,
  'Plateforme Juridique',
  5500, 82, 87,
  'partenariats@captaincontrat.com',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "juridique", "linking_to": "april-moto.com"}'::jsonb
),
(
  'pole-autoentrepreneur.com',
  'https://www.pole-autoentrepreneur.com/guides/assurance',
  'Guide assurance auto-entrepreneur 2025',
  32, 38,
  'Portail Information',
  2100, 77, 76,
  'contact@pole-autoentrepreneur.com',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "auto-entrepreneur", "linking_to": "axa.fr"}'::jsonb
),
(
  'lesechos-entrepreneurs.fr',
  'https://business.lesechos.fr/entrepreneurs/gestion-finance/assurance',
  'Assurance pro: comment choisir - Les Echos',
  58, 72,
  'Média Économique',
  25000, 88, 92,
  'redaction.entrepreneurs@lesechos.fr',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "business-premium", "linking_to": "allianz.fr"}'::jsonb
),
(
  'bpifrance-creation.fr',
  'https://bpifrance-creation.fr/encyclopedie/proteger-lentreprise/assurances',
  'Les assurances professionnelles - BPI France',
  62, 68,
  'Institution Publique',
  18000, 90, 91,
  'contact@bpifrance-creation.fr',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "creation-entreprise", "linking_to": "mfa.fr"}'::jsonb
),
(
  'service-public.fr',
  'https://www.service-public.fr/professionnels-entreprises/vosdroits/F23645',
  'Assurance responsabilité civile professionnelle',
  75, 85,
  'Service Public',
  50000, 95, 96,
  'contact@service-public.fr',
  'new',
  '{"source": "test_manual", "scan_date": "2025-10-23", "niche": "service-public", "linking_to": "april-moto.com"}'::jsonb
)
ON CONFLICT (url) DO NOTHING;

-- Compter résultat
SELECT 
  '✅ RÉSULTAT' as section,
  COUNT(*) as total_opportunites,
  COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '1 minute') as nouvelles_1min
FROM backlink_opportunities;

-- Afficher les nouveaux
SELECT 
  '📊 NOUVEAUX SITES (dernière minute)' as section,
  domain,
  page_title,
  quality_score,
  contact_email
FROM backlink_opportunities
WHERE created_at > now() - INTERVAL '1 minute'
ORDER BY quality_score DESC;

-- Créer historique scan
INSERT INTO backlink_scan_history (
  competitors_scanned,
  opportunities_found,
  scan_duration_ms,
  status
) VALUES (
  ARRAY['mfa.fr', 'april-moto.com', 'axa.fr', 'allianz.fr'],
  (SELECT COUNT(*) FROM backlink_opportunities WHERE created_at > now() - INTERVAL '1 minute'),
  1500,
  'success'
);

SELECT '✅ Historique scan créé' as info;

-- Résumé
SELECT '═══════════════════════════════════════════════' as separateur;

SELECT 
  '🎉 SUCCÈS!' as titre,
  COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '1 minute') || ' nouveaux sites premium ajoutés' as message
FROM backlink_opportunities;

SELECT 
  '📊 TOTAL MAINTENANT' as info,
  COUNT(*) as total_sites,
  COUNT(DISTINCT domain) as domaines_uniques,
  ROUND(AVG(quality_score), 1) as score_moyen
FROM backlink_opportunities;

-- Top 5 meilleurs scores
SELECT 
  '🏆 TOP 5 SITES QUALITÉ' as section,
  domain,
  quality_score,
  domain_authority as DA,
  estimated_traffic as trafic
FROM backlink_opportunities
ORDER BY quality_score DESC
LIMIT 5;
