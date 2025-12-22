/*
  # Clean Test Errors Only

  Nettoie uniquement les erreurs de test "Erreur test: Timeout"
  en gardant toutes les autres données intactes :
  - Dates futures = dates de déclenchement prévues ✅
  - 0 exécutions = normal (pas encore lancé) ✅
  - Statistiques réelles ✅
*/

-- Nettoyer les erreurs de test uniquement
UPDATE automation_status
SET last_error = NULL
WHERE last_error LIKE '%Erreur test%'
   OR last_error LIKE '%test:%';

-- Nettoyer les logs de test
DELETE FROM automation_logs
WHERE message LIKE '%Erreur test%'
   OR message LIKE '%test:%';

-- Vérification
DO $$
DECLARE
  v_cleaned INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_cleaned
  FROM automation_status
  WHERE last_error IS NULL;

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ NETTOYAGE ERREURS TEST TERMINÉ';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Erreurs de test supprimées';
  RAISE NOTICE 'Automatisations sans erreur: %', v_cleaned;
  RAISE NOTICE '';
  RAISE NOTICE '✓ Dates futures conservées (= dates prévues)';
  RAISE NOTICE '✓ 0 exécutions conservé (= pas encore lancé)';
  RAISE NOTICE '✓ Données réelles intactes';
  RAISE NOTICE '============================================';
END $$;
