/*
  # Correction de la fonction get_lead_current_workflow_step

  1. Corrections
    - Suppression de l'ambiguïté sur step_key en qualifiant toutes les colonnes
    - Ajout d'alias explicites pour clarifier les colonnes

  2. Fonctionnement
    - Retourne toutes les étapes du workflow avec leur statut de complétion
    - Une étape est complétée si une action existe dans crm_workflow_step_actions
*/

-- Recréer la fonction sans ambiguïté
CREATE OR REPLACE FUNCTION get_lead_current_workflow_step(p_lead_id uuid)
RETURNS TABLE (
  step_number integer,
  step_key text,
  step_title text,
  step_description text,
  is_completed boolean,
  last_action_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH completed_steps AS (
    SELECT DISTINCT 
      wsla.step_key as action_step_key, 
      MAX(wsla.completed_at) as last_action
    FROM crm_workflow_step_actions wsla
    WHERE wsla.lead_id = p_lead_id
    GROUP BY wsla.step_key
  )
  SELECT 
    ws.step_number,
    ws.step_key,
    ws.step_title,
    ws.step_description,
    (cs.action_step_key IS NOT NULL) as is_completed,
    cs.last_action as last_action_at
  FROM crm_workflow_steps ws
  LEFT JOIN completed_steps cs ON cs.action_step_key = ws.step_key
  WHERE ws.is_active = true
  ORDER BY ws.step_number;
END;
$$;
