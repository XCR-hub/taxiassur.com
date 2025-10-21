/*
═══════════════════════════════════════════════════════════════════
⚡ ACTIVATION FINALE: Afficher les villes IA sur /villes
═══════════════════════════════════════════════════════════════════

Ce fichier corrige TOUS les problèmes possibles:
1. Ajoute colonnes manquantes
2. Synchronise les données
3. Publie les villes
4. Configure RLS
5. Génère quelques villes de démonstration si besoin

COPIER/COLLER DANS: Supabase Dashboard → SQL Editor → RUN
═══════════════════════════════════════════════════════════════════
*/

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 1: Ajouter colonne 'city' si elle manque
-- ═════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'city'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN city text;
    RAISE NOTICE '✅ Colonne city ajoutée';
  END IF;
END $$;

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 2: Ajouter colonne 'title' si elle manque
-- ═════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'title'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN title text;
    RAISE NOTICE '✅ Colonne title ajoutée';
  END IF;
END $$;

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 3: Ajouter colonne 'meta_description' si elle manque
-- ═════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'meta_description'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN meta_description text;
    RAISE NOTICE '✅ Colonne meta_description ajoutée';
  END IF;
END $$;

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 4: Ajouter colonne 'content' si elle manque
-- ═════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'city_pages' AND column_name = 'content'
  ) THEN
    ALTER TABLE city_pages ADD COLUMN content text DEFAULT '';
    RAISE NOTICE '✅ Colonne content ajoutée';
  END IF;
END $$;

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 5: Synchroniser city_name → city
-- ═════════════════════════════════════════════════════════════

UPDATE city_pages
SET city = COALESCE(city, city_name)
WHERE city IS NULL OR city = '';

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 6: Générer title si manquant
-- ═════════════════════════════════════════════════════════════

UPDATE city_pages
SET title = 'Assurance Taxi ' || COALESCE(city, city_name, slug)
WHERE title IS NULL OR title = '';

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 7: Générer meta_description si manquant
-- ═════════════════════════════════════════════════════════════

UPDATE city_pages
SET meta_description = 'Trouvez votre assurance taxi à ' || COALESCE(city, city_name) ||
  '. Devis gratuit, couverture complète. Expert local en assurance professionnelle taxi.'
WHERE meta_description IS NULL OR meta_description = '';

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 8: Publier TOUTES les villes qui ont un statut draft ou NULL
-- ═════════════════════════════════════════════════════════════

UPDATE city_pages
SET status = 'published'
WHERE status IS NULL OR status = 'draft';

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 9: Configurer RLS (permissions lecture publique)
-- ═════════════════════════════════════════════════════════════

-- Activer RLS si pas déjà fait
ALTER TABLE city_pages ENABLE ROW LEVEL SECURITY;

-- Supprimer anciennes policies
DROP POLICY IF EXISTS "Allow public read published cities" ON city_pages;
DROP POLICY IF EXISTS "Allow anon read published cities" ON city_pages;
DROP POLICY IF EXISTS "Public can read published city pages" ON city_pages;

-- Créer nouvelle policy pour lecture publique
CREATE POLICY "Public can read published city pages"
  ON city_pages
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 10: Si aucune ville, insérer quelques villes de démonstration
-- ═════════════════════════════════════════════════════════════

DO $$
DECLARE
  ville_count integer;
BEGIN
  SELECT COUNT(*) INTO ville_count FROM city_pages;

  IF ville_count = 0 THEN
    RAISE NOTICE '⚠️ Aucune ville trouvée, insertion de villes de démonstration...';

    INSERT INTO city_pages (city, slug, dept, region, taxi_count, status, title, meta_description, content)
    VALUES
      ('Paris', 'paris', '75', 'Île-de-France', 18500, 'published',
       'Assurance Taxi Paris - Devis Gratuit 24h',
       'Assurance taxi Paris : devis gratuit en 24h. Couverture complète, tarifs compétitifs. Expert assurance professionnelle taxi Paris.',
       'Paris capitale compte plus de 18 500 taxis. Notre expertise locale vous garantit une assurance adaptée.'),

      ('Lyon', 'lyon', '69', 'Auvergne-Rhône-Alpes', 3200, 'published',
       'Assurance Taxi Lyon - Expert Local',
       'Assurance taxi Lyon : devis rapide, couverture complète. Spécialiste assurance professionnelle taxi Lyon.',
       'Lyon et sa métropole comptent environ 3 200 taxis. Expertise locale depuis 2010.'),

      ('Marseille', 'marseille', '13', 'Provence-Alpes-Côte d''Azur', 2800, 'published',
       'Assurance Taxi Marseille - Devis Express',
       'Assurance taxi Marseille : protection optimale, tarifs négociés. Expert assurance taxi Marseille.',
       'Marseille dispose d''une flotte de 2 800 taxis environ. Solutions adaptées au marché local.'),

      ('Toulouse', 'toulouse', '31', 'Occitanie', 1850, 'published',
       'Assurance Taxi Toulouse - Tarifs Compétitifs',
       'Assurance taxi Toulouse : devis gratuit, garanties complètes. Spécialiste assurance professionnelle taxi Toulouse.',
       'Toulouse compte environ 1 850 taxis. Expertise régionale reconnue.'),

      ('Nice', 'nice', '06', 'Provence-Alpes-Côte d''Azur', 1200, 'published',
       'Assurance Taxi Nice - Protection Complète',
       'Assurance taxi Nice : devis rapide, couverture optimale. Expert assurance taxi Nice et Côte d''Azur.',
       'Nice et la Côte d''Azur comptent environ 1 200 taxis. Solutions adaptées au tourisme.'),

      ('Nantes', 'nantes', '44', 'Pays de la Loire', 950, 'published',
       'Assurance Taxi Nantes - Expert Local',
       'Assurance taxi Nantes : devis gratuit, garanties complètes. Spécialiste assurance professionnelle taxi Nantes.',
       'Nantes métropole compte environ 950 taxis. Expertise locale depuis plus de 10 ans.'),

      ('Strasbourg', 'strasbourg', '67', 'Grand Est', 780, 'published',
       'Assurance Taxi Strasbourg - Devis Rapide',
       'Assurance taxi Strasbourg : protection complète, tarifs compétitifs. Expert assurance taxi Strasbourg.',
       'Strasbourg dispose d''environ 780 taxis. Solutions adaptées au marché frontalier.'),

      ('Montpellier', 'montpellier', '34', 'Occitanie', 650, 'published',
       'Assurance Taxi Montpellier - Protection Optimale',
       'Assurance taxi Montpellier : devis express, couverture complète. Spécialiste assurance taxi Montpellier.',
       'Montpellier compte environ 650 taxis. Expertise régionale reconnue.')
    ON CONFLICT (slug) DO NOTHING;

    RAISE NOTICE '✅ Villes de démonstration insérées';
  ELSE
    RAISE NOTICE '✅ % villes déjà présentes dans la base', ville_count;
  END IF;
END $$;

-- ═════════════════════════════════════════════════════════════
-- ÉTAPE 11: VÉRIFICATION FINALE
-- ═════════════════════════════════════════════════════════════

SELECT
  COUNT(*) as total_villes,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as publiees,
  COUNT(CASE WHEN city IS NOT NULL THEN 1 END) as avec_city,
  COUNT(CASE WHEN title IS NOT NULL THEN 1 END) as avec_title,
  COUNT(CASE WHEN region IS NOT NULL THEN 1 END) as avec_region
FROM city_pages;

-- Afficher les villes publiées groupées par région
SELECT
  COALESCE(region, 'Sans région') as region,
  COUNT(*) as nombre_villes,
  string_agg(city, ', ' ORDER BY taxi_count DESC NULLS LAST) as villes
FROM city_pages
WHERE status = 'published'
GROUP BY region
ORDER BY nombre_villes DESC;

/*
═══════════════════════════════════════════════════════════════════
✅ RÉSULTATS ATTENDUS
═══════════════════════════════════════════════════════════════════

La requête finale devrait afficher:
- total_villes: Au moins 8 villes
- publiees: Toutes les villes
- avec_city, avec_title, avec_region: Même nombre que publiees

La liste des villes groupées par région devrait apparaître.

ENSUITE:
1. Actualiser https://taxiassur.com/villes dans le navigateur
2. Faire Ctrl+Shift+R (vider le cache)
3. Les villes devraient maintenant s'afficher !

Si ça ne fonctionne toujours pas:
- Ouvrir la console navigateur (F12)
- Aller dans l'onglet Console
- Voir s'il y a des erreurs
- Partager les erreurs

═══════════════════════════════════════════════════════════════════
*/
