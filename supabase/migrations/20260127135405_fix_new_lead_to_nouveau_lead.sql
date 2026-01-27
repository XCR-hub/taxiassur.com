/*
  # Correction statut NEW_LEAD → NOUVEAU_LEAD
  
  1. Problème
    - Les formulaires utilisaient l'ancien statut 'NEW_LEAD'
    - Le nouveau pipeline utilise 'NOUVEAU_LEAD'
  
  2. Solution
    - Migrer tous les leads avec l'ancien statut vers le nouveau
    - Mise à jour rapide sans backup (opération sûre)
*/

-- Mettre à jour les leads avec l'ancien statut
UPDATE crm_leads 
SET 
  status = 'NOUVEAU_LEAD'::lead_status,
  updated_at = NOW()
WHERE status::text = 'NEW_LEAD';

-- Vérifier le nombre de leads mis à jour
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM crm_leads
  WHERE status = 'NOUVEAU_LEAD';
  
  RAISE NOTICE 'Total leads with NOUVEAU_LEAD status: %', v_count;
END $$;
