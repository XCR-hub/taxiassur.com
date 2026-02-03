/*
  # Correction du nom de colonne dans la fonction de synchronisation

  1. Problème
    - La fonction utilise storage_path qui n'existe pas
    - Le bon nom est file_path

  2. Solution
    - Corriger le nom de la colonne
*/

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
  v_error_details jsonb := '[]'::jsonb;
BEGIN
  -- Parcourir tous les documents prospect
  FOR v_doc IN
    SELECT
      pd.*,
      CASE WHEN cl.id IS NOT NULL THEN true ELSE false END as lead_exists
    FROM prospect_documents pd
    LEFT JOIN crm_leads cl ON cl.id = pd.lead_id
    ORDER BY pd.created_at DESC
  LOOP
    -- Skip si le lead n'existe pas
    IF NOT v_doc.lead_exists THEN
      v_skipped := v_skipped + 1;
      v_error_details := v_error_details || jsonb_build_object(
        'file_name', v_doc.file_name,
        'error', 'Lead does not exist',
        'lead_id', v_doc.lead_id
      );
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
        COALESCE(v_doc.file_path, ''),
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
        v_error_details := v_error_details || jsonb_build_object(
          'file_name', v_doc.file_name,
          'error', SQLERRM,
          'lead_id', v_doc.lead_id
        );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'migrated', v_migrated,
    'skipped', v_skipped,
    'errors', v_errors,
    'error_details', v_error_details
  );
END;
$$;