/*
  # Créer une fonction pour désactiver les crons de création automatique
  
  ## Problème
  - Le système crée des leads pour TOUS les emails reçus
  - Besoin de désactiver certains crons automatiques
  
  ## Solution
  - Fonction pour désactiver les crons problématiques
  - Documentation claire des crons à garder actifs
*/

-- Fonction pour gérer l'activation/désactivation des crons
CREATE OR REPLACE FUNCTION manage_email_to_lead_crons(enable_auto_creation BOOLEAN DEFAULT false)
RETURNS TABLE(jobname TEXT, active BOOLEAN, description TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Désactiver le cron qui crée des leads depuis TOUS les emails
  PERFORM cron.unschedule('auto-create-leads-from-emails');
  
  RETURN QUERY
  SELECT 
    j.jobname::TEXT,
    j.active,
    CASE 
      WHEN j.jobname LIKE '%parse-form%' THEN 'Actif - Formulaires uniquement'
      WHEN j.jobname = 'auto-create-leads-from-emails' THEN 'Désactivé - Trop permissif'
      ELSE 'Autre'
    END::TEXT as description
  FROM cron.job j
  WHERE j.jobname IN (
    'auto-create-leads-from-emails',
    'parse-form-emails-auto',
    'parse-form-emails-create-leads-auto'
  )
  ORDER BY j.jobname;
END;
$$;

-- Exécuter la fonction pour désactiver le cron problématique
SELECT * FROM manage_email_to_lead_crons(false);
