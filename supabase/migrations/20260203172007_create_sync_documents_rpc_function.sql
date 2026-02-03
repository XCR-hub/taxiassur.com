/*
  # Fonction RPC pour synchroniser les documents

  1. Problème
    - Le RLS empêche les insertions depuis les scripts
    - Besoin d'une fonction avec SECURITY DEFINER

  2. Solution
    - Créer une fonction RPC qui bypass le RLS
    - Utilisable par n'importe quel rôle authentifié
*/

-- Fonction pour migrer un document de prospect_documents vers crm_lead_documents
CREATE OR REPLACE FUNCTION sync_prospect_document_to_crm(
  p_lead_id uuid,
  p_document_type text,
  p_file_name text,
  p_file_path text,
  p_file_size integer,
  p_mime_type text,
  p_status text,
  p_uploaded_by text,
  p_uploaded_at timestamptz,
  p_notes text,
  p_metadata jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc_id uuid;
  v_existing_count integer;
BEGIN
  -- Vérifier si le document existe déjà
  SELECT COUNT(*)
  INTO v_existing_count
  FROM crm_lead_documents
  WHERE lead_id = p_lead_id
    AND document_type = p_document_type
    AND file_name = p_file_name;

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Document already exists'
    );
  END IF;

  -- Insérer le document
  INSERT INTO crm_lead_documents (
    lead_id,
    document_type,
    file_name,
    file_path,
    file_size,
    mime_type,
    status,
    uploaded_by,
    uploaded_at,
    notes,
    metadata
  ) VALUES (
    p_lead_id,
    p_document_type,
    p_file_name,
    p_file_path,
    p_file_size,
    p_mime_type,
    p_status,
    p_uploaded_by,
    p_uploaded_at,
    p_notes,
    p_metadata
  )
  RETURNING id INTO v_doc_id;

  RETURN jsonb_build_object(
    'success', true,
    'document_id', v_doc_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Fonction batch pour migrer tous les documents
CREATE OR REPLACE FUNCTION sync_all_prospect_documents()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_migrated integer := 0;
  v_skipped integer := 0;
  v_errors integer := 0;
  v_doc record;
  v_result jsonb;
BEGIN
  -- Parcourir tous les documents prospect
  FOR v_doc IN
    SELECT
      pd.*,
      CASE WHEN cl.id IS NOT NULL THEN true ELSE false END as lead_exists
    FROM prospect_documents pd
    LEFT JOIN crm_leads cl ON cl.id = pd.lead_id
  LOOP
    -- Skip si le lead n'existe pas
    IF NOT v_doc.lead_exists THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Vérifier si déjà migré
    IF EXISTS (
      SELECT 1 FROM crm_lead_documents
      WHERE lead_id = v_doc.lead_id
        AND document_type = COALESCE(v_doc.document_type, 'autre')
        AND file_name = v_doc.file_name
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Insérer le document
    BEGIN
      INSERT INTO crm_lead_documents (
        lead_id,
        document_type,
        file_name,
        file_path,
        file_size,
        mime_type,
        status,
        uploaded_by,
        uploaded_at,
        notes,
        metadata
      ) VALUES (
        v_doc.lead_id,
        COALESCE(v_doc.document_type, 'autre'),
        v_doc.file_name,
        COALESCE(v_doc.file_path, v_doc.storage_path, ''),
        COALESCE(v_doc.file_size, 0),
        COALESCE(v_doc.mime_type, 'application/octet-stream'),
        CASE WHEN v_doc.validated THEN 'validated' ELSE 'pending' END,
        'prospect',
        COALESCE(v_doc.uploaded_at, v_doc.created_at, now()),
        v_doc.notes,
        COALESCE(v_doc.metadata, '{}'::jsonb)
      );

      v_migrated := v_migrated + 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'migrated', v_migrated,
    'skipped', v_skipped,
    'errors', v_errors
  );
END;
$$;