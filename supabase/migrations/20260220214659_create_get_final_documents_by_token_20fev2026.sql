/*
  # Récupération des documents finaux par token

  1. Nouvelle fonction RPC
    - `get_final_documents_by_token` - Récupère les documents finaux (contrat, attestation, mémo) uploadés par le commercial

  2. Sécurité
    - Accessible uniquement via token valide
    - Retourne uniquement les documents de type final (contrat_signe, attestation_assurance, memo_vehicule)
*/

-- Fonction pour récupérer les documents finaux par token
CREATE OR REPLACE FUNCTION get_final_documents_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  document_type text,
  file_name text,
  file_path text,
  file_url text,
  file_size bigint,
  uploaded_at timestamptz,
  uploaded_by uuid,
  custom_label text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead_id uuid;
  v_supabase_url text := 'https://drohhxrkoequjphvabvq.supabase.co';
BEGIN
  -- Récupérer le lead_id depuis le token
  SELECT id INTO v_lead_id
  FROM crm_leads
  WHERE access_token = p_token
    AND archived = false;

  -- Si le lead n'existe pas, retourner vide
  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  -- Récupérer uniquement les documents finaux uploadés par le commercial
  -- Types: contrat_signe, attestation_assurance, memo_vehicule
  RETURN QUERY
  SELECT
    d.id,
    d.document_type,
    d.file_name,
    d.file_path,
    CASE
      WHEN d.file_path IS NOT NULL THEN
        v_supabase_url || '/storage/v1/object/public/crm-documents/' || d.file_path
      ELSE NULL
    END as file_url,
    d.file_size,
    d.uploaded_at,
    d.uploaded_by,
    d.custom_label
  FROM crm_lead_documents d
  WHERE d.lead_id = v_lead_id
    AND d.document_type IN ('contrat_signe', 'attestation_assurance', 'memo_vehicule')
    AND d.status = 'validated'
  ORDER BY d.uploaded_at DESC;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION get_final_documents_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION get_final_documents_by_token(text) TO authenticated;

-- Commentaire
COMMENT ON FUNCTION get_final_documents_by_token IS 'Récupère les documents finaux (contrat, attestation, mémo) accessibles au prospect via son token';
