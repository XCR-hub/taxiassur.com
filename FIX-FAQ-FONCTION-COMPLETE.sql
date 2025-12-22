/*
  # Fix FAQ - Fonction get_faq_entries() Complète

  Problème: Erreur de syntaxe "..." dans la fonction
  Solution: Fonction SQL complète avec toutes les colonnes
*/

-- ============================================
-- ÉTAPE 1 : Vérifier la structure de faq_entries
-- ============================================

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'faq_entries'
ORDER BY ordinal_position;

-- ============================================
-- ÉTAPE 2 : Supprimer l'ancienne fonction
-- ============================================

DROP FUNCTION IF EXISTS get_faq_entries();
DROP FUNCTION IF EXISTS get_faq_entries(text);

-- ============================================
-- ÉTAPE 3 : Créer la fonction complète
-- ============================================

CREATE OR REPLACE FUNCTION get_faq_entries()
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category text,
  status text,
  order_index integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $function$
  SELECT
    id,
    question,
    answer,
    category,
    status,
    COALESCE(order_index, 0) as order_index,
    created_at,
    updated_at
  FROM faq_entries
  WHERE status = 'published'
  ORDER BY order_index ASC, created_at DESC;
$function$;

-- ============================================
-- ÉTAPE 4 : Vérifier les politiques RLS
-- ============================================

-- Activer RLS si pas déjà fait
ALTER TABLE faq_entries ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Public can read published FAQ" ON faq_entries;
DROP POLICY IF EXISTS "Allow public read access" ON faq_entries;
DROP POLICY IF EXISTS "Enable read access for all users" ON faq_entries;

-- Créer la politique de lecture publique
CREATE POLICY "Public can read published FAQ"
  ON faq_entries FOR SELECT
  USING (status = 'published');

-- Créer les politiques d'écriture pour authenticated
DROP POLICY IF EXISTS "Authenticated can insert FAQ" ON faq_entries;
CREATE POLICY "Authenticated can insert FAQ"
  ON faq_entries FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update FAQ" ON faq_entries;
CREATE POLICY "Authenticated can update FAQ"
  ON faq_entries FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================
-- ÉTAPE 5 : Tester la fonction
-- ============================================

-- Compter les FAQ
SELECT COUNT(*) as total_faq FROM get_faq_entries();

-- Voir les 5 premières
SELECT question, category FROM get_faq_entries() LIMIT 5;

-- Compter par catégorie
SELECT category, COUNT(*) as count
FROM get_faq_entries()
GROUP BY category
ORDER BY count DESC;

-- ============================================
-- ÉTAPE 6 : Insérer FAQ de base si vide
-- ============================================

-- Seulement si COUNT < 5
INSERT INTO faq_entries (question, answer, category, status, order_index)
SELECT * FROM (VALUES
  (
    'Quel est le prix moyen d''une assurance taxi ?',
    'Le prix moyen d''une assurance taxi se situe entre 1 500€ et 3 000€ par an selon plusieurs critères : votre ville d''exercice (Paris et région parisienne sont 15-20% plus chers), votre expérience (bonus-malus), votre historique de sinistres, et les garanties choisies. Avec TaxiAssur, nos clients économisent en moyenne 35% par rapport aux tarifs standards.',
    'tarifs',
    'published',
    1
  ),
  (
    'Quelles garanties sont obligatoires pour un taxi ?',
    'Les garanties obligatoires pour un taxi incluent : la Responsabilité Civile (RC) qui couvre les dommages causés aux tiers (passagers et autres), la RC Professionnelle pour les dommages liés à votre activité professionnelle, et l''assurance du véhicule au minimum en formule tiers. La protection juridique et l''assistance dépannage 24h/24 sont fortement recommandées pour exercer sereinement.',
    'garanties',
    'published',
    2
  ),
  (
    'Que faire en cas de sinistre avec mon taxi ?',
    'En cas de sinistre : 1) Sécurisez la zone et les personnes, 2) Contactez-nous immédiatement au 01 80 85 57 86 (24h/24), 3) Remplissez le constat amiable, 4) Prenez des photos, 5) Ne signez aucun document sans nous consulter. Notre équipe vous guide dans toutes les démarches : déclaration du sinistre, constitution du dossier, suivi de l''indemnisation, et mise à disposition d''un véhicule de remplacement si nécessaire.',
    'sinistre',
    'published',
    3
  ),
  (
    'Quels documents fournir pour obtenir un devis ?',
    'Pour un devis gratuit et personnalisé, vous aurez besoin de : carte grise du véhicule, permis de conduire, carte professionnelle de taxi en cours de validité, relevé d''information de votre assureur actuel (si vous en avez un), justificatif de domicile de moins de 3 mois. Notre système de devis en ligne sécurisé vous permet d''obtenir une estimation en 2 minutes, puis un conseiller expert vous contacte sous 24h pour affiner votre offre.',
    'procedures',
    'published',
    4
  ),
  (
    'Y a-t-il des frais cachés chez TaxiAssur ?',
    'NON ! Chez TaxiAssur, le prix affiché est le prix final. Transparence totale garantie : pas de frais de dossier, pas de frais de mise en service, pas de frais de fractionnement, pas de surprise à la signature. Nous nous engageons sur une tarification claire et honnête. Le montant de votre devis = le montant de votre contrat.',
    'tarifs',
    'published',
    5
  ),
  (
    'Puis-je résilier mon assurance taxi actuelle ?',
    'OUI, depuis la loi Hamon (2015), vous pouvez résilier votre assurance taxi à tout moment après 1 an de contrat, sans frais ni pénalités. Avant 1 an, vous pouvez résilier uniquement lors de l''échéance annuelle (2 mois de préavis). TaxiAssur s''occupe de toutes les démarches de résiliation gratuitement : nous contactons votre ancien assureur, gérons les préavis, et assurons une transition sans interruption de couverture.',
    'resiliation',
    'published',
    6
  ),
  (
    'Comment sont calculés les tarifs d''assurance taxi ?',
    'Les tarifs sont calculés selon plusieurs critères : votre profil (âge, expérience, bonus-malus, historique de sinistres), votre véhicule (marque, modèle, année, valeur, équipements), votre activité (ville d''exercice, kilométrage annuel, nombre de courses), et vos garanties (formule tiers/intermédiaire/tous risques, franchises, options). Notre algorithme optimise ces paramètres pour vous proposer le meilleur rapport qualité-prix.',
    'tarifs',
    'published',
    7
  ),
  (
    'La couverture inclut-elle les passagers ?',
    'OUI, absolument ! La Responsabilité Civile obligatoire couvre automatiquement vos passagers en cas d''accident responsable. En formule tous risques, vos passagers sont couverts même si vous n''êtes pas responsable. Nous recommandons aussi la garantie Individuelle Accident Conducteur qui vous protège personnellement (frais médicaux, indemnités journalières, invalidité). La protection de vos passagers est notre priorité n°1.',
    'couverture',
    'published',
    8
  )
) AS v(question, answer, category, status, order_index)
WHERE NOT EXISTS (
  SELECT 1 FROM faq_entries WHERE faq_entries.question = v.question
);

-- ============================================
-- ÉTAPE 7 : Vérification finale
-- ============================================

-- Compter à nouveau
SELECT COUNT(*) as total_faq FROM get_faq_entries();

-- Grouper par catégorie
SELECT
  category,
  COUNT(*) as count
FROM get_faq_entries()
GROUP BY category
ORDER BY count DESC;

-- ✅ RÉSULTAT ATTENDU :
-- total_faq → 8+ (minimum)
-- Page /faq devrait afficher le bon nombre
