/*
  ═══════════════════════════════════════════════════════════════════════════
  🔧 CORRECTION FAQ - VERSION ULTRA SIMPLE
  ═══════════════════════════════════════════════════════════════════════════

  Cette version ne fait QUE corriger la FAQ (pas de CRON job)
  → Plus simple, 0 risque d'erreur
  → Temps d'exécution : 5 secondes

  ═══════════════════════════════════════════════════════════════════════════
*/

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📋 CORRECTION PAGE FAQ - VERSION SIMPLE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 1 : Créer fonction RPC get_faq_entries()
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '🔧 ÉTAPE 1/3 : Création fonction get_faq_entries()';
END $$;

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS get_faq_entries();

-- Créer la fonction RPC pour récupérer les FAQ
CREATE OR REPLACE FUNCTION get_faq_entries()
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category text,
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
    f.created_at
  FROM faq f
  ORDER BY f.priority DESC, f.created_at DESC;
END;
$$;

-- Donner les permissions publiques
GRANT EXECUTE ON FUNCTION get_faq_entries() TO anon, authenticated;

DO $$
BEGIN
  RAISE NOTICE '   ✅ Fonction get_faq_entries() créée avec succès !';
  RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 2 : Insérer 8 FAQ de test (si table vide)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  faq_count int;
BEGIN
  SELECT COUNT(*) INTO faq_count FROM faq;

  RAISE NOTICE '🔧 ÉTAPE 2/3 : Vérification FAQ existantes';
  RAISE NOTICE '   → FAQ actuelles en base : %', faq_count;

  IF faq_count = 0 THEN
    RAISE NOTICE '   → Insertion de 8 FAQ de test...';
    RAISE NOTICE '';

    -- FAQ 1 : Tarifs
    INSERT INTO faq (question, answer, category, priority)
    VALUES (
      'Quel est le prix moyen d''une assurance taxi ?',
      'Le tarif moyen d''une assurance taxi varie entre 2 500€ et 4 500€ par an selon votre ville, votre véhicule et votre expérience. À Paris, comptez plutôt 3 800€ à 5 200€. Chez TaxiAssur, nos tarifs démarrent à 2 380€/an avec toutes les garanties obligatoires incluses.',
      'tarifs',
      10
    );

    -- FAQ 2 : Garanties
    INSERT INTO faq (question, answer, category, priority)
    VALUES (
      'Quelles sont les garanties obligatoires pour un taxi ?',
      'Pour exercer comme taxi, vous devez obligatoirement avoir : RC professionnelle (dommages causés aux passagers), garantie défense juridique, protection du conducteur, et assurance du véhicule (responsabilité civile minimum). Nous recommandons aussi la garantie bris de glace et l''assistance 24h/7.',
      'garanties',
      10
    );

    -- FAQ 3 : Documents
    INSERT INTO faq (question, answer, category, priority)
    VALUES (
      'Quels documents fournir pour souscrire ?',
      'Pour souscrire votre assurance taxi, préparez : votre carte professionnelle de taxi, carte grise du véhicule, permis de conduire (3 ans minimum), RIB, et relevé d''information de votre ancien assureur. L''attestation vous est envoyée en 24h après validation de votre dossier.',
      'documents',
      9
    );

    -- FAQ 4 : Résiliation
    INSERT INTO faq (question, answer, category, priority)
    VALUES (
      'Comment résilier mon ancienne assurance taxi ?',
      'Depuis la loi Hamon (2015), vous pouvez résilier votre assurance taxi à tout moment après 1 an de contrat, sans frais ni pénalités. Nous nous occupons de toutes les démarches de résiliation auprès de votre ancien assureur. Vous recevez une attestation immédiate pour ne jamais être sans couverture.',
      'resiliation',
      8
    );

    -- FAQ 5 : Sinistre
    INSERT INTO faq (question, answer, category, priority)
    VALUES (
      'Que faire en cas de sinistre avec un passager ?',
      'En cas d''accident avec passager : 1) Assurez-vous que tout le monde va bien et appelez les secours si nécessaire, 2) Remplissez un constat amiable détaillé, 3) Prévenez votre assurance dans les 5 jours ouvrés, 4) Conservez tous les justificatifs (photos, témoignages). Notre assistance 24h/7 : 01 80 85 57 86.',
      'sinistre',
      9
    );

    -- FAQ 6 : Couverture
    INSERT INTO faq (question, answer, category, priority)
    VALUES (
      'Mon assurance couvre-t-elle toute la France ?',
      'Oui, nos contrats taxi couvrent l''ensemble du territoire français métropolitain, 7j/7 et 24h/24. Si vous effectuez des courses transfrontalières régulières (Belgique, Suisse, Luxembourg), pensez à souscrire l''option "Europe" pour être couvert à l''étranger.',
      'couverture',
      7
    );

    -- FAQ 7 : Délai
    INSERT INTO faq (question, answer, category, priority)
    VALUES (
      'En combien de temps je reçois mon attestation ?',
      'Votre attestation d''assurance est disponible en 24h maximum après validation de votre dossier. En cas d''urgence (contrôle imminent, reprise d''activité), nous pouvons émettre une attestation provisoire sous 2h ouvrées. L''attestation définitive suit par email et courrier recommandé.',
      'attestation',
      8
    );

    -- FAQ 8 : Frais cachés
    INSERT INTO faq (question, answer, category, priority)
    VALUES (
      'Y a-t-il des frais cachés ou supplémentaires ?',
      'Non, zéro frais caché ! Le tarif annoncé inclut toutes les garanties obligatoires, l''assistance 24h/7, la défense juridique et les frais de dossier. Les seules options payantes sont clairement indiquées : bris de glace (+ 180€/an), protection juridique renforcée (+ 95€/an), et garantie du contenu (+ 120€/an).',
      'tarifs',
      7
    );

    RAISE NOTICE '   ✅ 8 FAQ de test insérées avec succès !';
  ELSE
    RAISE NOTICE '   ✅ FAQ déjà présentes en base (% questions)', faq_count;
  END IF;
  RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ÉTAPE 3 : Vérification finale
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  faq_count int;
BEGIN
  SELECT COUNT(*) INTO faq_count FROM faq;

  RAISE NOTICE '🔧 ÉTAPE 3/3 : Vérification finale';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ CORRECTION FAQ TERMINÉE AVEC SUCCÈS !';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 RÉSUMÉ :';
  RAISE NOTICE '   • Fonction get_faq_entries() : ✅ Créée';
  RAISE NOTICE '   • Permissions publiques : ✅ Accordées';
  RAISE NOTICE '   • FAQ en base de données : % questions', faq_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 PROCHAINES ÉTAPES :';
  RAISE NOTICE '';
  RAISE NOTICE '1. TESTER LA FONCTION RPC';
  RAISE NOTICE '   → Exécuter : SELECT * FROM get_faq_entries();';
  RAISE NOTICE '   → Devrait retourner : % lignes', faq_count;
  RAISE NOTICE '';
  RAISE NOTICE '2. VÉRIFIER LA PAGE FAQ';
  RAISE NOTICE '   → Ouvrir : https://taxiassur.com/faq';
  RAISE NOTICE '   → Appuyer : CTRL + SHIFT + R (vider cache)';
  RAISE NOTICE '   → Devrait afficher : % questions', faq_count;
  RAISE NOTICE '';
  RAISE NOTICE '3. SI LA PAGE EST TOUJOURS VIDE';
  RAISE NOTICE '   → Vérifier console navigateur (F12)';
  RAISE NOTICE '   → Chercher erreurs "get_faq_entries"';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 C''EST PRÊT ! Testez maintenant la page /faq';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- Afficher un aperçu des FAQ
SELECT
  '📋 APERÇU FAQ' as info,
  LEFT(question, 60) as question,
  category,
  priority
FROM faq
ORDER BY priority DESC, created_at DESC
LIMIT 8;
