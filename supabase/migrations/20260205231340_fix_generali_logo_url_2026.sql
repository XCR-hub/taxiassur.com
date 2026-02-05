/*
  # Fix Generali Logo URL - 2026

  1. Problème
    - L'URL dans la DB est `/logo-generali.png` (tiret)
    - Le fichier s'appelle `/logo_generali.png` (underscore)
    - Le logo ne s'affiche pas

  2. Solution
    - Corriger l'URL pour pointer vers le bon fichier
    - Nettoyer les doublons Generali
*/

-- Corriger l'URL du logo Generali actif
UPDATE insurance_companies
SET logo_url = '/logo_generali.png'
WHERE code = 'GENERALI' 
  AND is_active = true;

-- Désactiver l'ancien doublon
UPDATE insurance_companies
SET is_active = false
WHERE code = 'generali' 
  AND is_active = false;

-- Vérification
-- SELECT id, code, name, logo_url, is_active FROM insurance_companies WHERE name ILIKE '%generali%';
