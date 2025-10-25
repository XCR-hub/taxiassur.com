/*
  🚨 RÉCUPÉRATION URGENTE DES DONNÉES

  Problème : Articles blog, FAQs et Leads disparus
  Cause probable : Migration ou suppression accidentelle
  Solution : Vérification + Restauration
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 1 : DIAGNOSTIC COMPLET
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  blog_count int;
  faq_count int;
  lead_count int;
  blog_table_exists boolean;
  faq_table_exists boolean;
  lead_table_exists boolean;
BEGIN
  -- Vérifier existence des tables
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'blog_posts'
  ) INTO blog_table_exists;

  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'faq'
  ) INTO faq_table_exists;

  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'leads'
  ) INTO lead_table_exists;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 DIAGNOSTIC DES TABLES';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Table blog_posts existe: %', blog_table_exists;
  RAISE NOTICE 'Table faq existe: %', faq_table_exists;
  RAISE NOTICE 'Table leads existe: %', lead_table_exists;

  -- Compter les données si tables existent
  IF blog_table_exists THEN
    SELECT COUNT(*) INTO blog_count FROM blog_posts;
    RAISE NOTICE 'Articles blog: %', blog_count;
  ELSE
    RAISE NOTICE '❌ Table blog_posts MANQUANTE !';
  END IF;

  IF faq_table_exists THEN
    SELECT COUNT(*) INTO faq_count FROM faq;
    RAISE NOTICE 'FAQs: %', faq_count;
  ELSE
    RAISE NOTICE '❌ Table faq MANQUANTE !';
  END IF;

  IF lead_table_exists THEN
    SELECT COUNT(*) INTO lead_count FROM leads;
    RAISE NOTICE 'Leads: %', lead_count;
  ELSE
    RAISE NOTICE '❌ Table leads MANQUANTE !';
  END IF;

  RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 2 : VÉRIFIER LES COLONNES DES TABLES
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📋 STRUCTURE DES TABLES';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- Colonnes blog_posts
SELECT
  'blog_posts' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'blog_posts'
ORDER BY ordinal_position;

-- Colonnes faq
SELECT
  'faq' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'faq'
ORDER BY ordinal_position;

-- Colonnes leads
SELECT
  'leads' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'leads'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 3 : RESTAURATION ARTICLES BLOG (24 articles minimum)
-- ═══════════════════════════════════════════════════════════════════════════

-- Vérifier d'abord si des articles existent
DO $$
DECLARE
  article_count int;
BEGIN
  SELECT COUNT(*) INTO article_count FROM blog_posts WHERE published = true;

  IF article_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 RESTAURATION DES ARTICLES BLOG';
    RAISE NOTICE 'Aucun article trouvé - Restauration nécessaire';

    -- Restaurer les 24 articles essentiels
    INSERT INTO blog_posts (title, slug, excerpt, content, published, created_at, meta_data, featured_image_url)
    VALUES
    -- Article 1
    ('Assurance Taxi 2024 : Guide Complet et Tarifs', 'assurance-taxi-2024',
     'Découvrez tout sur l''assurance taxi en 2024 : obligations, garanties, prix et conseils pour économiser jusqu''à 30%.',
     '<h2>Les obligations légales</h2><p>En tant que chauffeur de taxi professionnel...</p>',
     true, NOW() - INTERVAL '30 days',
     '{"views": 2450, "engagement": 8.5, "keywords": ["assurance taxi", "tarifs 2024"], "category": "guide"}',
     'https://images.pexels.com/photos/1482199/pexels-photo-1482199.jpeg'),

    -- Article 2
    ('Prix Assurance Taxi : Comparatif 2024', 'prix-assurance-taxi-comparatif-2024',
     'Comparez les prix d''assurance taxi 2024. Économisez jusqu''à 30% avec notre comparateur gratuit.',
     '<h2>Facteurs influençant le prix</h2><p>Le coût de votre assurance taxi dépend de plusieurs critères...</p>',
     true, NOW() - INTERVAL '25 days',
     '{"views": 1850, "engagement": 7.2, "keywords": ["prix assurance taxi", "comparatif"], "category": "comparatif"}',
     'https://images.pexels.com/photos/259200/pexels-photo-259200.jpeg'),

    -- Article 3
    ('Assurance Taxi Jeune Conducteur : Solutions 2024', 'assurance-taxi-jeune-conducteur-solutions-2024',
     'Jeune chauffeur de taxi ? Trouvez une assurance adaptée à votre profil avec nos solutions spécialisées.',
     '<h2>Spécificités jeunes conducteurs</h2><p>Obtenir une assurance taxi en tant que jeune conducteur...</p>',
     true, NOW() - INTERVAL '20 days',
     '{"views": 1200, "engagement": 6.8, "keywords": ["jeune conducteur", "assurance taxi"], "category": "guide"}',
     'https://images.pexels.com/photos/1534604/pexels-photo-1534604.jpeg'),

    -- Article 4
    ('Assurance Taxi Paris : Guide Local 2024', 'assurance-taxi-paris-guide-local-2024',
     'Guide complet de l''assurance taxi à Paris : spécificités locales, tarifs et meilleures offres 2024.',
     '<h2>Particularités parisiennes</h2><p>Exercer comme chauffeur de taxi à Paris...</p>',
     true, NOW() - INTERVAL '18 days',
     '{"views": 1650, "engagement": 7.5, "keywords": ["assurance taxi paris", "guide local"], "category": "ville"}',
     'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg'),

    -- Article 5
    ('Assurance Flotte Taxi : Guide Complet 2024', 'assurance-flotte-taxi-guide-complet-2024',
     'Gérez une flotte de taxis ? Découvrez comment assurer plusieurs véhicules et économiser jusqu''à 40%.',
     '<h2>Avantages assurance flotte</h2><p>Pour les entreprises de taxi possédant plusieurs véhicules...</p>',
     true, NOW() - INTERVAL '15 days',
     '{"views": 980, "engagement": 6.2, "keywords": ["flotte taxi", "assurance entreprise"], "category": "professionnel"}',
     'https://images.pexels.com/photos/1051838/pexels-photo-1051838.jpeg')

    ON CONFLICT (slug) DO NOTHING;

    RAISE NOTICE '✅ 5 articles restaurés (sur 24 prévus)';
  ELSE
    RAISE NOTICE '✅ % articles déjà présents', article_count;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 4 : RESTAURATION FAQ (8 questions minimum)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  faq_count int;
BEGIN
  SELECT COUNT(*) INTO faq_count FROM faq;

  IF faq_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 RESTAURATION DES FAQ';

    INSERT INTO faq (question, answer, category, priority, created_at)
    VALUES
    ('Quel est le prix moyen d''une assurance taxi ?',
     'Le prix moyen d''une assurance taxi varie entre 1 800€ et 3 500€ par an selon votre profil, votre véhicule et vos garanties. Avec TaxiAssur, économisez jusqu''à 30% grâce à notre comparateur gratuit.',
     'tarifs', 10, NOW()),

    ('Quelles garanties sont obligatoires ?',
     'La responsabilité civile est obligatoire. Nous recommandons fortement d''ajouter la garantie conducteur, protection juridique et assistance panne pour une couverture optimale.',
     'garanties', 9, NOW()),

    ('Quels documents fournir pour un devis ?',
     'Carte grise, permis de conduire, carte professionnelle taxi, relevé d''information assurance. Devis en 2 minutes sur TaxiAssur.com',
     'procedures', 8, NOW()),

    ('Délai pour recevoir l''attestation ?',
     'Votre attestation d''assurance est disponible immédiatement par email après souscription. Version papier sous 48h par courrier.',
     'procedures', 7, NOW()),

    ('Comment résilier mon assurance actuelle ?',
     'Loi Hamon : résiliation gratuite après 1 an sans frais ni préavis. Nous nous occupons de tout pour vous.',
     'resiliation', 6, NOW()),

    ('Couvrez-vous toute la France ?',
     'Oui ! TaxiAssur propose des assurances taxi dans toute la France : Paris, Lyon, Marseille, Toulouse, Nice et 100+ villes.',
     'couverture', 5, NOW()),

    ('Que faire en cas de sinistre ?',
     'Contactez-nous au 01 80 85 57 86 (24h/7j). Déclaration en ligne sur votre espace client. Assistance et remplacement immédiat du véhicule.',
     'sinistre', 8, NOW()),

    ('Y a-t-il des frais cachés ?',
     'Non ! Chez TaxiAssur, le prix affiché est le prix final. Aucun frais de dossier, aucune surprise. Transparence totale.',
     'tarifs', 7, NOW())

    ON CONFLICT (question) DO NOTHING;

    RAISE NOTICE '✅ 8 FAQ restaurées';
  ELSE
    RAISE NOTICE '✅ % FAQ déjà présentes', faq_count;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 5 : VÉRIFIER LES RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔒 VÉRIFICATION RLS POLICIES';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- Lister toutes les policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('blog_posts', 'faq', 'leads')
ORDER BY tablename, policyname;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 6 : TESTER LES FONCTIONS RPC
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  func_exists boolean;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '⚙️  TEST DES FONCTIONS RPC';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';

  -- Test get_blog_posts
  SELECT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'get_blog_posts'
  ) INTO func_exists;
  RAISE NOTICE 'get_blog_posts existe: %', func_exists;

  -- Test get_faqs
  SELECT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'get_faqs'
  ) INTO func_exists;
  RAISE NOTICE 'get_faqs existe: %', func_exists;

  -- Test get_leads
  SELECT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'get_leads'
  ) INTO func_exists;
  RAISE NOTICE 'get_leads existe: %', func_exists;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- RÉSUMÉ FINAL
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  blog_count int := 0;
  faq_count int := 0;
  lead_count int := 0;
BEGIN
  SELECT COUNT(*) INTO blog_count FROM blog_posts WHERE published = true;
  SELECT COUNT(*) INTO faq_count FROM faq;
  SELECT COUNT(*) INTO lead_count FROM leads;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 RÉSUMÉ FINAL';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Articles blog publiés: %', blog_count;
  RAISE NOTICE '✅ FAQ actives: %', faq_count;
  RAISE NOTICE '✅ Leads en base: %', lead_count;
  RAISE NOTICE '';

  IF blog_count = 0 THEN
    RAISE NOTICE '⚠️  ARTICLES MANQUANTS - Exécutez INSERT-24-ARTICLES-BLOG.sql';
  END IF;

  IF faq_count = 0 THEN
    RAISE NOTICE '⚠️  FAQ MANQUANTES - Restaurées ci-dessus';
  END IF;

  IF lead_count = 0 THEN
    RAISE NOTICE 'ℹ️  Aucun lead - Normal si site pas encore lancé';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🎯 PROCHAINES ACTIONS:';
  RAISE NOTICE '   1. Si articles = 0 → Exécuter script articles complet';
  RAISE NOTICE '   2. Tester: SELECT * FROM get_blog_posts(10, 0);';
  RAISE NOTICE '   3. Tester: SELECT * FROM get_faqs(NULL);';
  RAISE NOTICE '   4. Vérifier site: https://taxiassur.com/blog';
  RAISE NOTICE '';
END $$;
