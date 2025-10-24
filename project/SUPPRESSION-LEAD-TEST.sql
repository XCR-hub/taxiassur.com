-- Supprimer le lead de test "Test Automatisation 2025-10-15"
-- Ce lead était créé automatiquement pour tester les automatisations

-- Méthode 1: Suppression directe si tu connais l'email exact
DELETE FROM leads
WHERE email = 'test-automation@taxiassur.fr'
OR email LIKE '%test-automation%';

-- Méthode 2: Vérifier d'abord tous les leads de test
-- Exécute d'abord cette requête pour voir ce qu'il y a:
SELECT id, name, email, lead_status, created_at
FROM leads
WHERE email LIKE '%test%'
   OR name LIKE '%Test%'
   OR name LIKE '%Automatisation%'
ORDER BY created_at DESC;

-- Puis supprime ceux que tu veux:
-- DELETE FROM leads WHERE id = 'ID_DU_LEAD_A_SUPPRIMER';

-- EXPLICATION: Ce lead "Test Automatisation" était créé par:
-- - Les tests automatiques du système
-- - Les cron jobs de test
-- - Le script verify-automations.js
-- Il n'a aucune valeur commerciale, c'est juste pour tester le système
