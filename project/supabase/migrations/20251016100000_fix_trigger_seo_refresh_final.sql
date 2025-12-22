/*
  # Fix trigger_seo_refresh - Version finale

  Supprime la fonction RPC trigger_seo_refresh() car elle cause des erreurs
  Le frontend appellera directement l'Edge Function seo-daily-refresh
*/

-- Supprimer l'ancienne fonction qui cause des erreurs
DROP FUNCTION IF EXISTS trigger_seo_refresh();

-- Pas besoin de recréer, le frontend appellera directement l'Edge Function

SELECT '✅ trigger_seo_refresh removed - frontend will call Edge Function directly' as status;
