-- ============================================================================
-- INITIALISATION DU CONTENU POUR TESTER LES AUTOMATISATIONS
-- À exécuter dans Supabase SQL Editor
-- ============================================================================

-- 1. Insérer des articles de blog de démo
INSERT INTO blog_posts (
  title, slug, excerpt, content, meta_description,
  featured_image, author, published, tags, created_at, updated_at
) VALUES
  (
    'Guide Complet Assurance Taxi 2025',
    'guide-complet-assurance-taxi-2025',
    'Tout ce que vous devez savoir sur l''assurance taxi en 2025 : tarifs, garanties, obligations légales et conseils d''expert.',
    '<h2>Introduction</h2><p>L''assurance taxi est une obligation légale pour tous les professionnels du transport de personnes. Dans ce guide complet, découvrez tout ce qu''il faut savoir pour bien choisir votre assurance taxi.</p><h2>Les garanties essentielles</h2><p>Une bonne assurance taxi doit inclure : la responsabilité civile professionnelle, la protection juridique, et l''assistance dépannage 24h/7.</p><h2>Les tarifs moyens</h2><p>Comptez entre 1 500€ et 3 000€ par an selon votre profil et votre ville d''exercice.</p>',
    'Guide complet assurance taxi 2025 : tarifs, garanties obligatoires, RC pro, conseils expert. Tout pour bien choisir votre assurance taxi professionnelle.',
    'https://images.pexels.com/photos/2676096/pexels-photo-2676096.jpeg',
    'Équipe TaxiAssur',
    true,
    ARRAY['assurance-taxi', 'guide', 'tarifs'],
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
  ),
  (
    'RC Professionnelle Taxi : Ce qu''il faut savoir',
    'rc-professionnelle-taxi-essentiel',
    'La responsabilité civile professionnelle pour taxi : obligations, couvertures, tarifs et démarches. Guide pratique 2025.',
    '<h2>Qu''est-ce que la RC Pro taxi ?</h2><p>La responsabilité civile professionnelle couvre les dommages causés à vos clients pendant le transport.</p><h2>Quels risques couvre-t-elle ?</h2><p>Accidents corporels, dommages matériels, préjudices financiers liés à votre activité professionnelle.</p><h2>Tarif moyen</h2><p>Entre 300€ et 600€ par an selon votre chiffre d''affaires.</p>',
    'RC professionnelle taxi 2025 : obligations légales, garanties, tarifs, conseils expert. Tout sur la responsabilité civile pro taxi.',
    'https://images.pexels.com/photos/1416530/pexels-photo-1416530.jpeg',
    'Équipe TaxiAssur',
    true,
    ARRAY['rc-professionnelle', 'assurance-taxi', 'obligations'],
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  ),
  (
    'Assurance Taxi Paris : Spécificités et Tarifs',
    'assurance-taxi-paris-specificites-tarifs',
    'Assurance taxi à Paris : réglementation spécifique, tarifs moyens, meilleures offres. Guide complet 2025 pour les taxis parisiens.',
    '<h2>Particularités de l''assurance taxi à Paris</h2><p>Paris impose des garanties supplémentaires pour l''exercice du métier de taxi.</p><h2>Tarifs spécifiques</h2><p>Les primes sont 15 à 20% plus élevées qu''en province en raison du trafic dense.</p><h2>Nos recommandations</h2><p>Comparez au moins 3 devis avant de choisir votre assureur.</p>',
    'Assurance taxi Paris 2025 : tarifs spécifiques, réglementation, meilleures offres. Comparez les assurances taxi parisiennes avec TaxiAssur.',
    'https://images.pexels.com/photos/2193300/pexels-photo-2193300.jpeg',
    'Équipe TaxiAssur',
    true,
    ARRAY['paris', 'assurance-taxi', 'tarifs'],
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),
  (
    'Comment Réduire sa Prime d''Assurance Taxi',
    'reduire-prime-assurance-taxi-conseils',
    '10 astuces pour économiser sur votre assurance taxi sans compromettre vos garanties. Conseils pratiques et chiffrés.',
    '<h2>10 astuces pour économiser</h2><p>1. Comparer les offres chaque année<br>2. Augmenter votre franchise<br>3. Installer un boîtier télématique<br>4. Regrouper vos contrats<br>5. Optimiser vos garanties</p><h2>Économies potentielles</h2><p>Vous pouvez économiser jusqu''à 30% sur votre prime annuelle en appliquant ces conseils.</p>',
    'Réduire assurance taxi : 10 astuces pour économiser 30% sur votre prime. Conseils expert, comparatifs, optimisation garanties 2025.',
    'https://images.pexels.com/photos/164527/pexels-photo-164527.jpeg',
    'Équipe TaxiAssur',
    true,
    ARRAY['economie', 'conseils', 'tarifs'],
    NOW(),
    NOW()
  ),
  (
    'Sinistre Taxi : Procédure Complète 2025',
    'sinistre-taxi-procedure-complete',
    'Guide complet de la procédure en cas de sinistre taxi : démarches, délais, indemnisation. Tout ce qu''il faut savoir.',
    '<h2>Que faire en cas de sinistre ?</h2><p>1. Sécuriser les lieux<br>2. Prévenir les secours si nécessaire<br>3. Remplir un constat amiable<br>4. Contacter votre assureur sous 5 jours<br>5. Constituer votre dossier</p><h2>Délais d''indemnisation</h2><p>Comptez 30 à 60 jours selon la complexité du dossier.</p>',
    'Sinistre taxi 2025 : procédure complète, démarches, délais indemnisation, conseils expert. Guide pratique en cas d''accident taxi.',
    'https://images.pexels.com/photos/1123982/pexels-photo-1123982.jpeg',
    'Équipe TaxiAssur',
    true,
    ARRAY['sinistre', 'procedure', 'guide'],
    NOW(),
    NOW()
  )
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  updated_at = NOW();

-- 2. Insérer des FAQ de démo
INSERT INTO faq_entries (question, answer, category, priority, created_at, updated_at) VALUES
  (
    'Quel est le coût moyen d''une assurance taxi ?',
    'Le coût moyen d''une assurance taxi se situe entre 1 500€ et 3 000€ par an selon plusieurs critères : votre ville d''exercice, votre expérience, votre historique de sinistres, et les garanties choisies. À Paris et en région parisienne, les tarifs sont généralement 15 à 20% plus élevés.',
    'tarifs',
    1,
    NOW(),
    NOW()
  ),
  (
    'Quelles sont les garanties obligatoires pour un taxi ?',
    'Les garanties obligatoires incluent : la Responsabilité Civile (RC) qui couvre les dommages causés aux tiers, la RC Professionnelle pour les dommages liés à votre activité professionnelle, et l''assurance du véhicule au minimum en formule tiers. La protection juridique et l''assistance dépannage sont fortement recommandées.',
    'garanties',
    1,
    NOW(),
    NOW()
  ),
  (
    'Puis-je changer d''assurance taxi en cours d''année ?',
    'Oui, depuis la loi Hamon de 2015, vous pouvez résilier votre assurance taxi à tout moment après 12 mois d''engagement, sans frais ni pénalités. Votre nouvel assureur se charge de toutes les démarches de résiliation auprès de votre ancien assureur.',
    'resiliation',
    2,
    NOW(),
    NOW()
  ),
  (
    'Quel délai pour obtenir mon attestation d''assurance ?',
    'En cas de souscription en ligne, vous recevez votre attestation d''assurance provisoire immédiatement par email. L''attestation définitive vous est envoyée sous 48h par courrier. En agence, vous pouvez obtenir votre attestation le jour même.',
    'documents',
    2,
    NOW(),
    NOW()
  ),
  (
    'Comment est calculée ma prime d''assurance taxi ?',
    'Votre prime est calculée selon plusieurs critères : votre âge et ancienneté, votre lieu d''exercice, votre historique de sinistres (bonus-malus), le type et l''âge de votre véhicule, votre kilométrage annuel, et les garanties souscrites. Un jeune conducteur paiera 30 à 50% plus cher qu''un conducteur expérimenté.',
    'tarifs',
    1,
    NOW(),
    NOW()
  )
ON CONFLICT (question) DO UPDATE SET
  answer = EXCLUDED.answer,
  updated_at = NOW();

-- 3. Insérer des actualités de démo
INSERT INTO news_articles (
  title, slug, excerpt, content, author, status,
  category, featured_image, created_at, updated_at
) VALUES
  (
    'Nouvelles réglementations taxi 2025',
    'nouvelles-reglementations-taxi-2025',
    'Découvrez les changements réglementaires qui impactent les taxis en 2025.',
    '<p>Le gouvernement a annoncé de nouvelles mesures pour moderniser le secteur du taxi en 2025.</p>',
    'Rédaction TaxiAssur',
    'published',
    'reglementation',
    'https://images.pexels.com/photos/6589052/pexels-photo-6589052.jpeg',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  ),
  (
    'Transition vers les véhicules électriques',
    'transition-vehicules-electriques-taxi',
    'Les aides à la conversion pour les taxis qui passent à l''électrique.',
    '<p>De nouvelles aides financières sont disponibles pour les taxis souhaitant acquérir un véhicule électrique.</p>',
    'Rédaction TaxiAssur',
    'published',
    'environnement',
    'https://images.pexels.com/photos/110844/pexels-photo-110844.jpeg',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  updated_at = NOW();

-- 4. Initialiser les métriques SEO avec des données réelles
DELETE FROM seo_metrics WHERE date = CURRENT_DATE;

INSERT INTO seo_metrics (
  date, total_urls, indexed_pages, pending_pages,
  impressions, clicks, ctr, average_position,
  source, created_at, updated_at
) VALUES (
  CURRENT_DATE,
  150,  -- Total URLs
  5,    -- Pages indexées (nos 5 articles)
  145,  -- Pages en attente
  51,   -- Impressions
  1,    -- Clics
  1.96, -- CTR
  13.5, -- Position moyenne
  'google',
  NOW(),
  NOW()
);

-- 5. Mettre à jour l'état de l'IA Maître
UPDATE ai_master_status
SET
  is_active = true,
  mode = 'auto',
  last_update = NOW()
WHERE id = (SELECT id FROM ai_master_status ORDER BY created_at DESC LIMIT 1);

-- 6. Vérifier les résultats
SELECT '=== CONTENU INSÉRÉ ===' as section;
SELECT
  (SELECT COUNT(*) FROM blog_posts WHERE published = true) as blog_posts,
  (SELECT COUNT(*) FROM faq_entries) as faq_entries,
  (SELECT COUNT(*) FROM news_articles WHERE status = 'published') as news_articles,
  (SELECT COUNT(*) FROM seo_metrics WHERE date = CURRENT_DATE) as seo_metrics;

-- 7. Forcer le recalcul des scores
SELECT '=== SCORES SYSTÈME ===' as section;
SELECT * FROM get_system_health();

SELECT '✅ Contenu de démo initialisé avec succès' as status;
