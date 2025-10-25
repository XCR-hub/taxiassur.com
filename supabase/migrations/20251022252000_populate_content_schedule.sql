/*
  # Peupler la table content_schedule

  Ajoute des configurations par défaut pour les 3 types de contenu
  afin que l'interface AutomationScheduler affiche des données.

  ## Données ajoutées
  - Blog : 3x/semaine, auto-publish activé
  - FAQ : 2x/semaine, auto-publish activé
  - Reviews : 1x/semaine, brouillon
*/

-- Nettoyer les anciennes données si elles existent
DELETE FROM content_schedule;

-- Insérer les configurations par défaut
INSERT INTO content_schedule (
  content_type,
  frequency_per_week,
  auto_publish,
  keywords,
  is_active
) VALUES
  (
    'blog',
    3,
    true,
    ARRAY[
      'assurance taxi',
      'assurance vtc',
      'rc professionnelle taxi',
      'devis assurance taxi',
      'comparateur assurance taxi',
      'assurance taxi pas cher'
    ],
    true
  ),
  (
    'faq',
    2,
    true,
    ARRAY[
      'assurance taxi obligatoire',
      'garanties assurance taxi',
      'prix assurance taxi',
      'comment choisir assurance taxi',
      'résiliation assurance taxi'
    ],
    true
  ),
  (
    'review',
    1,
    false,
    ARRAY[
      'avis assurance taxi',
      'témoignage chauffeur taxi',
      'retour expérience assurance'
    ],
    false
  )
ON CONFLICT (content_type)
DO UPDATE SET
  frequency_per_week = EXCLUDED.frequency_per_week,
  auto_publish = EXCLUDED.auto_publish,
  keywords = EXCLUDED.keywords,
  is_active = EXCLUDED.is_active;

-- Vérification
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM content_schedule;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ CONTENT SCHEDULE CONFIGURÉ';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Configurations créées: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Blog: 3x/semaine (auto-publish: oui)';
  RAISE NOTICE '❓ FAQ: 2x/semaine (auto-publish: oui)';
  RAISE NOTICE '⭐ Reviews: 1x/semaine (auto-publish: non)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Interface AutomationScheduler prête !';
  RAISE NOTICE '============================================';
END $$;
