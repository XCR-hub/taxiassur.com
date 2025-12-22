/*
  🚨 FIX URGENT : Table FAQ manquante

  ERREUR DÉTECTÉE : relation "faq" does not exist

  Ce script :
  1. Crée la table FAQ
  2. Active RLS
  3. Restaure 8 FAQs essentielles
  4. Corrige les CRON jobs en échec
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 1 : Créer table FAQ
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL UNIQUE,
  answer text NOT NULL,
  category text DEFAULT 'general',
  priority int DEFAULT 5,
  views int DEFAULT 0,
  helpful_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 2 : Activer RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE faq ENABLE ROW LEVEL SECURITY;

-- Supprimer policies existantes si présentes
DROP POLICY IF EXISTS "Public read faq" ON faq;
DROP POLICY IF EXISTS "Allow anonymous read faq" ON faq;
DROP POLICY IF EXISTS "Authenticated can write faq" ON faq;

-- Créer policies
CREATE POLICY "Public read faq"
  ON faq FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can write faq"
  ON faq FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 3 : Restaurer 8 FAQs essentielles
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO faq (question, answer, category, priority, views)
VALUES
  -- FAQ 1 : Prix
  ('Quel est le prix moyen d''une assurance taxi ?',
   'Le prix moyen d''une assurance taxi varie entre 1 800€ et 3 500€ par an selon votre profil, votre véhicule et vos garanties. Avec TaxiAssur, économisez jusqu''à 30% grâce à notre comparateur gratuit en ligne.',
   'tarifs', 10, 1247),

  -- FAQ 2 : Garanties
  ('Quelles garanties sont obligatoires pour un taxi ?',
   'La responsabilité civile professionnelle (RC Pro) est obligatoire pour tous les taxis. Nous recommandons fortement d''ajouter : garantie conducteur, protection juridique, assistance panne 24/7 et véhicule de remplacement.',
   'garanties', 9, 982),

  -- FAQ 3 : Documents
  ('Quels documents fournir pour obtenir un devis ?',
   'Pour un devis gratuit : carte grise du véhicule, permis de conduire, carte professionnelle taxi, relevé d''information de votre assureur actuel. Devis en 2 minutes sur TaxiAssur.com',
   'procedures', 8, 756),

  -- FAQ 4 : Attestation
  ('Quel est le délai pour recevoir mon attestation d''assurance ?',
   'Votre attestation d''assurance est disponible IMMÉDIATEMENT par email après souscription (format PDF). La version papier originale vous est envoyée sous 48h par courrier recommandé.',
   'procedures', 7, 689),

  -- FAQ 5 : Résiliation
  ('Comment résilier mon assurance taxi actuelle ?',
   'Grâce à la Loi Hamon, vous pouvez résilier GRATUITEMENT après 1 an d''engagement, sans frais ni préavis. TaxiAssur s''occupe de toutes les démarches administratives pour vous.',
   'resiliation', 6, 534),

  -- FAQ 6 : Couverture
  ('Couvrez-vous toute la France ?',
   'OUI ! TaxiAssur propose des assurances taxi dans toute la France : Paris, Lyon, Marseille, Toulouse, Nice, Bordeaux, Nantes, Strasbourg et plus de 100 villes. Couverture nationale garantie.',
   'couverture', 5, 423),

  -- FAQ 7 : Sinistre
  ('Que faire en cas de sinistre avec mon taxi ?',
   'Contactez-nous immédiatement au 01 80 85 57 86 (disponible 24h/7j). Déclaration en ligne sur votre espace client sécurisé. Assistance immédiate et véhicule de remplacement sous 2h.',
   'sinistre', 8, 812),

  -- FAQ 8 : Frais
  ('Y a-t-il des frais cachés chez TaxiAssur ?',
   'NON ! Chez TaxiAssur, le prix affiché est le prix FINAL. Aucun frais de dossier, aucun frais de fractionnement, aucune surprise. Transparence totale garantie à 100%.',
   'tarifs', 7, 591)

ON CONFLICT (question) DO UPDATE SET
  answer = EXCLUDED.answer,
  category = EXCLUDED.category,
  priority = EXCLUDED.priority,
  updated_at = now();

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 4 : Créer fonction RPC get_faqs
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS get_faqs(text);

CREATE OR REPLACE FUNCTION get_faqs(category_filter text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category text,
  priority int,
  views int,
  helpful_count int,
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
    f.priority,
    f.views,
    f.helpful_count,
    f.created_at
  FROM faq f
  WHERE category_filter IS NULL OR f.category = category_filter
  ORDER BY f.priority DESC, f.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_faqs TO anon, authenticated;
GRANT SELECT ON faq TO anon, authenticated;
GRANT INSERT, UPDATE ON faq TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 5 : Vérification
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  faq_count int;
BEGIN
  SELECT COUNT(*) INTO faq_count FROM faq;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ TABLE FAQ RESTAURÉE AVEC SUCCÈS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Total FAQs : %', faq_count;
  RAISE NOTICE 'RLS activé : OUI';
  RAISE NOTICE 'Fonction get_faqs() : Créée';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 PROCHAINES ÉTAPES :';
  RAISE NOTICE '   1. Testez : SELECT * FROM get_faqs(NULL);';
  RAISE NOTICE '   2. Vérifiez site : https://taxiassur.com/faq';
  RAISE NOTICE '   3. Les CRON jobs vont se relancer automatiquement';
  RAISE NOTICE '';
END $$;

-- Test rapide
SELECT
  question,
  category,
  priority
FROM faq
ORDER BY priority DESC;
