/*
  # Fix get_final_documents_by_token - Corriger archived - 20 février 2026

  ## Problème identifié

  La fonction utilise `archived = false` mais la colonne s'appelle `is_archived` (boolean)
  De plus, il y a une ambiguïté avec la colonne `id`

  ## Solution

  - Utiliser `is_archived` au lieu de `archived`
  - Qualifier les colonnes avec les alias de table
*/

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.get_final_documents_by_token(text);

-- Créer la fonction corrigée
CREATE OR REPLACE FUNCTION public.get_final_documents_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  document_type text,
  file_name text,
  file_path text,
  file_url text,
  file_size bigint,
  uploaded_at timestamptz,
  uploaded_by text,
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
  SELECT l.id INTO v_lead_id
  FROM crm_leads l
  WHERE l.access_token = p_token
    AND l.deleted_at IS NULL
    AND (l.is_archived IS NULL OR l.is_archived = false);

  -- Si le lead n'existe pas, retourner vide
  IF v_lead_id IS NULL THEN
    RETURN;
  END IF;

  -- Récupérer uniquement les documents finaux uploadés par le commercial
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
    d.file_size::bigint,
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
GRANT EXECUTE ON FUNCTION public.get_final_documents_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_final_documents_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_final_documents_by_token(text) TO service_role;

COMMENT ON FUNCTION public.get_final_documents_by_token IS 
'Récupère les documents finaux accessibles au prospect via son token';
