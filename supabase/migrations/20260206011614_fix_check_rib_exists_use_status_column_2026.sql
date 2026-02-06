/*
  # Fix check_rib_exists function - use correct column name

  Corrige la fonction check_rib_exists qui utilise la colonne is_validated
  qui n'existe pas dans crm_lead_documents.
  
  La table utilise la colonne "status" avec les valeurs:
  - 'pending'
  - 'validated' 
  - 'rejected'
*/

CREATE OR REPLACE FUNCTION check_rib_exists(p_lead_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rib_count integer;
BEGIN
  -- Compter les documents RIB validés pour ce lead
  SELECT COUNT(*)
  INTO v_rib_count
  FROM crm_lead_documents
  WHERE lead_id = p_lead_id
    AND document_type = 'rib'
    AND status = 'validated'  -- Utiliser status au lieu de is_validated
    AND (metadata->>'deleted_at' IS NULL OR metadata->>'deleted_at' = '');

  RETURN v_rib_count > 0;
END;
$$;

COMMENT ON FUNCTION check_rib_exists(uuid) IS 'Vérifie si un RIB validé existe pour un lead (FIXED: uses status column instead of is_validated)';
