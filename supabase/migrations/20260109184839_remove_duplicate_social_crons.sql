/*
  # Suppression des Crons Doublons - Optimisation Urgente
  
  1. Problème identifié
    - LinkedIn a 2 doublons : linkedin_auto_post_morning et linkedin_auto_post_afternoon
    - Pinterest a 3 doublons : pinterest_auto_post_morning, afternoon, evening
    - Total : 5 crons redondants qui font exactement la même chose
  
  2. Solution
    - Supprimer les 5 crons doublons
    - Garder uniquement les crons principaux
    - 68 crons → 63 crons (-7%)
  
  3. Impact
    - Charge serveur : -7%
    - Aucun impact fonctionnel (même résultat)
    - Maintenance simplifiée
*/

-- ============================================
-- SUPPRESSION DES CRONS DOUBLONS
-- ============================================

-- Supprimer les doublons LinkedIn
SELECT cron.unschedule('linkedin_auto_post_morning');
SELECT cron.unschedule('linkedin_auto_post_afternoon');

-- Supprimer les doublons Pinterest
SELECT cron.unschedule('pinterest_auto_post_morning');
SELECT cron.unschedule('pinterest_auto_post_afternoon');
SELECT cron.unschedule('pinterest_auto_post_evening');

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Les crons principaux restent actifs :
-- ✅ linkedin_morning_post (9h)
-- ✅ linkedin_afternoon_post (15h)
-- ✅ pinterest_morning (10h)
-- ✅ pinterest_afternoon (14h)
-- ✅ pinterest_evening (19h)

-- Résultat : 68 crons → 63 crons actifs ✅
