-- ══════════════════════════════════════════════════════════════════
--  INSERT MINIMAL: 10 SITES AVEC COLONNES DE BASE SEULEMENT
-- ══════════════════════════════════════════════════════════════════

-- Essayer avec colonnes minimales obligatoires
INSERT INTO backlink_opportunities (
  domain,
  url,
  status
) VALUES
  ('service-public.fr', 'https://www.service-public.fr/professionnels-entreprises/vosdroits/F23645', 'new'),
  ('lesechos-entrepreneurs.fr', 'https://business.lesechos.fr/entrepreneurs/gestion-finance/assurance', 'new'),
  ('bpifrance-creation.fr', 'https://bpifrance-creation.fr/encyclopedie/proteger-lentreprise/assurances', 'new'),
  ('uncp-taxi.org', 'https://www.uncp-taxi.org/assurance-taxi', 'new'),
  ('fnaim.fr', 'https://www.fnaim.fr/partenaires-professionnels', 'new'),
  ('captaincontrat.com', 'https://www.captaincontrat.com/articles-droit-entreprise/assurance-professionnelle', 'new'),
  ('lentreprise.com', 'https://lentreprise.lexpress.fr/gestion-fiscalite/assurance', 'new'),
  ('federation-auto-entrepreneur.fr', 'https://www.federation-auto-entrepreneur.fr/guides/assurances', 'new'),
  ('artisans-mag.com', 'https://www.artisans-mag.com/assurance-professionnelle', 'new'),
  ('pole-autoentrepreneur.com', 'https://www.pole-autoentrepreneur.com/guides/assurance', 'new')
ON CONFLICT (url) DO NOTHING;

-- Vérifier
SELECT 
  '✅ RÉSULTAT' as info,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '1 minute') as nouveaux
FROM backlink_opportunities;

-- Afficher tous les sites
SELECT domain, url, status, created_at 
FROM backlink_opportunities 
ORDER BY created_at DESC 
LIMIT 15;
