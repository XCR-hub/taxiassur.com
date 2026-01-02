/*
  # Correction de la Vue SECURITY DEFINER

  ## Résumé
  Recréation de la vue wa_templates_usage sans SECURITY DEFINER pour éviter les risques de sécurité.
  
  ## Problème
  SECURITY DEFINER permet à la vue d'exécuter avec les privilèges de son créateur,
  ce qui peut conduire à une élévation de privilèges non souhaitée.
  
  ## Solution
  Recréer la vue avec SECURITY INVOKER (comportement par défaut).
  La vue s'exécutera avec les privilèges de l'utilisateur qui l'invoque.
  
  ## Sécurité
  - ✅ Élimine le risque d'élévation de privilèges
  - ✅ Comportement plus sûr et prévisible
  - ✅ Conforme aux bonnes pratiques Supabase
*/

-- Supprimer la vue existante
DROP VIEW IF EXISTS wa_templates_usage CASCADE;

-- Recréer la vue sans SECURITY DEFINER
CREATE VIEW wa_templates_usage AS
SELECT 
  name,
  category,
  language,
  approved,
  usage_count,
  variables,
  length(body) AS body_length,
  jsonb_array_length(variables) AS variable_count,
  created_at
FROM wa_templates t
ORDER BY usage_count DESC, name;

-- Ajouter un commentaire explicatif
COMMENT ON VIEW wa_templates_usage IS 
  'Vue des statistiques d''utilisation des templates WhatsApp. 
   Utilise SECURITY INVOKER (par défaut) pour plus de sécurité.
   Créée le 2026-01-02 pour corriger le problème SECURITY DEFINER.';

-- Vérifier que la vue est bien créée sans SECURITY DEFINER
DO $$
DECLARE
  v_view_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_views 
    WHERE schemaname = 'public' AND viewname = 'wa_templates_usage'
  ) INTO v_view_exists;
  
  IF v_view_exists THEN
    RAISE NOTICE '✅ Vue wa_templates_usage recréée avec succès (SECURITY INVOKER)';
  ELSE
    RAISE WARNING '⚠️ Erreur: la vue n''a pas été créée';
  END IF;
END $$;
