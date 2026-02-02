/*
  # Fonction RPC: get_lead_documents (recréation)

  ## Description
  Récupère TOUS les documents associés à un lead :
  - Documents de compagnie (auto-attachés)
  - Documents prospect (uploadés)
  - Documents contractuels (devis, contrat)

  ## Retour
  Liste unifiée de documents avec métadonnées complètes
*/

-- Drop de l'ancienne version
DROP FUNCTION IF EXISTS get_lead_documents(uuid);

-- Nouvelle version complète
CREATE OR REPLACE FUNCTION get_lead_documents(p_lead_id uuid)
RETURNS TABLE (
  document_id uuid,
  document_name text,
  document_type text,
  document_category text,
  file_url text,
  file_size_bytes bigint,
  source text,
  is_company_document boolean,
  company_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  
  -- 1. Documents de compagnie (auto-attachés depuis la bibliothèque)
  SELECT
    cda.id AS document_id,
    cdl.document_name,
    cdl.document_type,
    cdl.document_category,
    cdl.file_url,
    cdl.file_size_bytes,
    'company_library'::text AS source,
    true AS is_company_document,
    ic.name AS company_name,
    cda.attached_at AS created_at
  FROM contract_document_associations cda
  JOIN company_document_library cdl ON cdl.id = cda.document_id
  JOIN insurance_companies ic ON ic.id = cdl.company_id
  WHERE cda.lead_id = p_lead_id
    AND cda.source = 'company_library'
  
  UNION ALL
  
  -- 2. Documents prospect (uploadés par le prospect)
  SELECT
    pd.id AS document_id,
    pd.document_name,
    pd.document_type,
    'identity'::text AS document_category,
    pd.download_url AS file_url,
    pd.file_size,
    'prospect_upload'::text AS source,
    false AS is_company_document,
    NULL AS company_name,
    pd.created_at
  FROM prospect_documents pd
  WHERE pd.lead_id = p_lead_id
    AND pd.download_url IS NOT NULL
  
  UNION ALL
  
  -- 3. Documents lead (uploadés par les commerciaux - devis, autres)
  SELECT
    cld.id AS document_id,
    cld.document_name,
    cld.document_type,
    cld.document_category,
    cld.file_url,
    cld.file_size_bytes,
    'contract'::text AS source,
    false AS is_company_document,
    NULL AS company_name,
    cld.created_at
  FROM crm_lead_documents cld
  WHERE cld.lead_id = p_lead_id
    AND cld.file_url IS NOT NULL
  
  ORDER BY created_at DESC;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION get_lead_documents(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_lead_documents(uuid) TO anon;

-- Commentaire
COMMENT ON FUNCTION get_lead_documents IS 'Récupère tous les documents associés à un lead (compagnie + prospect + contractuels)';
