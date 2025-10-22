/*
  # Corriger les tables FAQ et fonction get_faq_entries

  Unifie les tables FAQ et assure que la fonction renvoie les bonnes données.
*/

-- ============================================
-- 1. VÉRIFIER ET CRÉER LA TABLE FAQ UNIFIÉE
-- ============================================

-- Créer ou mettre à jour table faq (unifiée)
CREATE TABLE IF NOT EXISTS faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text DEFAULT 'assurance-taxi',
  city text,
  tags text[] DEFAULT ARRAY[]::text[],
  display_order integer DEFAULT 0,
  published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE faq ENABLE ROW LEVEL SECURITY;

-- Policy lecture publique
DROP POLICY IF EXISTS "Public can read published FAQ" ON faq;
CREATE POLICY "Public can read published FAQ"
  ON faq FOR SELECT
  TO public
  USING (published = true);

-- Policy insertion pour authenticated et anon (pour générateur IA)
DROP POLICY IF EXISTS "Authenticated can insert FAQ" ON faq;
CREATE POLICY "Authenticated can insert FAQ"
  ON faq FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Policy mise à jour
DROP POLICY IF EXISTS "Authenticated can update FAQ" ON faq;
CREATE POLICY "Authenticated can update FAQ"
  ON faq FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. MIGRER DONNÉES DE faq_entries VERS faq
-- ============================================

DO $$
DECLARE
  has_status_column BOOLEAN;
  has_published_column BOOLEAN;
BEGIN
  -- Vérifier si faq_entries existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'faq_entries') THEN

    -- Vérifier les colonnes disponibles
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'faq_entries' AND column_name = 'status'
    ) INTO has_status_column;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'faq_entries' AND column_name = 'published'
    ) INTO has_published_column;

    -- Migration selon les colonnes disponibles
    IF has_status_column THEN
      INSERT INTO faq (id, question, answer, category, tags, display_order, published, created_at, updated_at)
      SELECT
        fe.id,
        fe.question,
        fe.answer,
        COALESCE(fe.category, 'assurance-taxi') as category,
        COALESCE(fe.tags, ARRAY[]::text[]) as tags,
        COALESCE(fe.display_order, 0) as display_order,
        CASE
          WHEN fe.status = 'published' THEN true
          ELSE false
        END as published,
        fe.created_at,
        COALESCE(fe.updated_at, fe.created_at) as updated_at
      FROM faq_entries fe
      WHERE NOT EXISTS (SELECT 1 FROM faq WHERE faq.id = fe.id)
      ON CONFLICT (id) DO NOTHING;
    ELSIF has_published_column THEN
      INSERT INTO faq (id, question, answer, category, tags, display_order, published, created_at, updated_at)
      SELECT
        fe.id,
        fe.question,
        fe.answer,
        COALESCE(fe.category, 'assurance-taxi') as category,
        COALESCE(fe.tags, ARRAY[]::text[]) as tags,
        COALESCE(fe.display_order, 0) as display_order,
        COALESCE(fe.published, true) as published,
        fe.created_at,
        COALESCE(fe.updated_at, fe.created_at) as updated_at
      FROM faq_entries fe
      WHERE NOT EXISTS (SELECT 1 FROM faq WHERE faq.id = fe.id)
      ON CONFLICT (id) DO NOTHING;
    ELSE
      -- Aucune colonne status ou published, considérer tout publié
      INSERT INTO faq (id, question, answer, category, tags, display_order, published, created_at, updated_at)
      SELECT
        fe.id,
        fe.question,
        fe.answer,
        COALESCE(fe.category, 'assurance-taxi') as category,
        COALESCE(fe.tags, ARRAY[]::text[]) as tags,
        COALESCE(fe.display_order, 0) as display_order,
        true as published,
        fe.created_at,
        COALESCE(fe.updated_at, fe.created_at) as updated_at
      FROM faq_entries fe
      WHERE NOT EXISTS (SELECT 1 FROM faq WHERE faq.id = fe.id)
      ON CONFLICT (id) DO NOTHING;
    END IF;

    RAISE NOTICE '✅ Données migrées de faq_entries vers faq';
  ELSE
    RAISE NOTICE '⚠️ Table faq_entries n''existe pas';
  END IF;
END $$;

-- ============================================
-- 3. CRÉER/METTRE À JOUR FONCTION get_faq_entries
-- ============================================

CREATE OR REPLACE FUNCTION get_faq_entries()
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category text,
  city text,
  tags text[],
  display_order integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.question,
    f.answer,
    f.category,
    f.city,
    f.tags,
    f.display_order,
    f.created_at
  FROM faq f
  WHERE f.published = true
  ORDER BY f.display_order ASC, f.created_at DESC;
END;
$$;

-- ============================================
-- 4. AJOUTER DES FAQ DEMO SI LA TABLE EST VIDE
-- ============================================

DO $$
DECLARE
  faq_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO faq_count FROM faq WHERE published = true;

  IF faq_count = 0 THEN
    INSERT INTO faq (question, answer, category, tags, display_order, published) VALUES
    ('Quelle est la couverture minimale obligatoire pour un taxi ?', 'La Responsabilité Civile Professionnelle (RC Pro) est obligatoire pour tous les taxis. Elle couvre les dommages causés aux tiers (passagers, piétons, autres véhicules). Le montant minimum est de 100 millions d''euros par sinistre.', 'couverture', ARRAY['rc-pro', 'obligatoire'], 1, true),

    ('Quel est le prix moyen d''une assurance taxi ?', 'Le tarif varie entre 1 500€ et 4 500€/an selon plusieurs facteurs : localisation, ancienneté, bonus-malus, type de véhicule, et garanties choisies. Paris et grandes métropoles sont plus chères.', 'tarifs', ARRAY['prix', 'tarifs'], 2, true),

    ('Puis-je assurer mon taxi avec mon assurance personnelle ?', 'Non, absolument pas. L''usage taxi nécessite une assurance professionnelle spécifique. Utiliser votre véhicule en taxi avec une assurance standard entraîne la nullité du contrat en cas de sinistre.', 'garanties', ARRAY['assurance', 'professionnel'], 3, true),

    ('Combien de temps pour obtenir une attestation d''assurance ?', 'Avec TaxiAssur, vous recevez votre attestation provisoire par email en 2 minutes après validation de votre dossier. L''attestation définitive arrive sous 24-48h par courrier.', 'procedures', ARRAY['attestation', 'delai'], 4, true),

    ('Que faire en cas de sinistre avec un passager ?', 'Déclarez immédiatement le sinistre à votre assureur (sous 5 jours ouvrés). Remplissez un constat amiable si possible, prenez des photos, et notez les coordonnées des témoins. Votre RC Pro prend en charge les dommages.', 'sinistre', ARRAY['accident', 'procedure'], 5, true),

    ('Les frais de remorquage sont-ils couverts ?', 'Oui, si vous avez souscrit la garantie Assistance. Elle couvre le remorquage jusqu''au garage le plus proche (généralement jusqu''à 100 km), et souvent un véhicule de remplacement.', 'garanties', ARRAY['assistance', 'remorquage'], 6, true),

    ('Puis-je résilier mon contrat avant l''échéance ?', 'Oui, grâce à la loi Hamon, vous pouvez résilier après 1 an de contrat à tout moment, sans frais ni pénalités. Avant 1 an, c''est possible uniquement dans certains cas (changement de situation, vente véhicule).', 'resiliation', ARRAY['resiliation', 'loi-hamon'], 7, true),

    ('Mon bonus-malus personnel s''applique-t-il ?', 'Oui, votre coefficient de bonus-malus auto peut être transféré vers votre assurance taxi. Un bon historique de conduite permet d''obtenir de meilleurs tarifs.', 'tarifs', ARRAY['bonus-malus', 'historique'], 8, true),

    ('Dois-je assurer ma licence de taxi séparément ?', 'Non, la licence n''est pas assurable car c''est un titre administratif, pas un bien matériel. En revanche, vous pouvez assurer la perte d''exploitation liée à la suspension de licence.', 'garanties', ARRAY['licence', 'exploitation'], 9, true),

    ('Quelle différence entre assurance taxi et VTC ?', 'L''assurance taxi couvre l''usage maraude (prise de client dans la rue), contrairement au VTC (uniquement réservations préalables). Les tarifs taxi sont souvent plus élevés car les risques sont différents.', 'assurance-taxi', ARRAY['vtc', 'difference'], 10, true),

    ('Puis-je assurer plusieurs véhicules ?', 'Oui, avec une assurance flotte qui permet de couvrir 2 véhicules ou plus avec des tarifs dégressifs. C''est avantageux à partir de 3 taxis.', 'flotte', ARRAY['flotte', 'multi-vehicules'], 11, true),

    ('Les dommages au compteur sont-ils couverts ?', 'Oui, si vous avez la garantie vol/incendie ou tous risques. Le compteur est considéré comme un équipement professionnel indispensable.', 'garanties', ARRAY['equipement', 'compteur'], 12, true),

    ('Que couvre la protection juridique ?', 'Elle prend en charge vos frais de défense en cas de litige (avocat, expertise, procédure), notamment en cas de litige avec un client, un autre conducteur, ou l''administration.', 'garanties', ARRAY['protection-juridique', 'litige'], 13, true),

    ('Mon assurance couvre-t-elle les courses à l''étranger ?', 'Cela dépend de votre contrat. L''UE est généralement couverte (carte verte), mais vérifiez les exclusions territoriales dans vos conditions générales.', 'garanties', ARRAY['etranger', 'europe'], 14, true),

    ('Dois-je déclarer mon taxi électrique ?', 'Oui, le type de véhicule doit être déclaré. Les taxis électriques bénéficient souvent de tarifs réduits (bonus écologique) chez certains assureurs.', 'documents', ARRAY['electrique', 'declaration'], 15, true),

    ('Que se passe-t-il si je roule sans assurance ?', 'Vous risquez 3 750€ d''amende, suspension du permis, confiscation du véhicule, et retrait de la licence taxi. De plus, vous êtes personnellement responsable de tous les dommages.', 'obligations', ARRAY['sans-assurance', 'sanctions'], 16, true);

    RAISE NOTICE '✅ 16 FAQ demo ajoutées';
  ELSE
    RAISE NOTICE '⚠️ FAQ déjà présentes (% entrées)', faq_count;
  END IF;
END $$;

-- ============================================
-- 5. CRÉER INDEX POUR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS faq_published_idx ON faq(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS faq_category_idx ON faq(category);
CREATE INDEX IF NOT EXISTS faq_city_idx ON faq(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS faq_tags_idx ON faq USING gin(tags);
CREATE INDEX IF NOT EXISTS faq_display_order_idx ON faq(display_order);

-- ============================================
-- RÉSUMÉ
-- ============================================

DO $$
DECLARE
  total_faq INTEGER;
  published_faq INTEGER;
  categories_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_faq FROM faq;
  SELECT COUNT(*) INTO published_faq FROM faq WHERE published = true;
  SELECT COUNT(DISTINCT category) INTO categories_count FROM faq WHERE category IS NOT NULL;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ FAQ CONFIGURÉE ET OPÉRATIONNELLE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FAQ totales: %', total_faq;
  RAISE NOTICE 'FAQ publiées: %', published_faq;
  RAISE NOTICE 'Catégories: %', categories_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Table faq unifiée créée';
  RAISE NOTICE '✅ Fonction get_faq_entries mise à jour';
  RAISE NOTICE '✅ Index créés pour performance';
  RAISE NOTICE '✅ RLS configuré correctement';
  RAISE NOTICE '';
  RAISE NOTICE 'La page FAQ devrait maintenant afficher les entrées !';
  RAISE NOTICE '============================================';
END $$;
