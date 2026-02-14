/*
  # FIX URGENT - Synchroniser les fichiers du bucket vers prospect_documents
  
  ## Problème Identifié
  
  - 5 fichiers uploadés dans le bucket `prospect-documents` ✅
  - 0 lignes dans la table `prospect_documents` ❌
  - Le trigger de sync ne se déclenche donc jamais ❌
  - Le pipeline CRM ne voit pas les documents ❌
  
  ## Solution
  
  1. Lire tous les fichiers du bucket prospect-documents
  2. Pour chaque fichier, créer une entrée dans prospect_documents
  3. Le trigger se déclenchera automatiquement et synchronisera vers crm_lead_documents
  4. Le commercial verra enfin les documents dans le CRM
  
  ## Impact
  
  - Tous les documents uploadés par les prospects seront visibles dans le CRM
  - Les notifications email seront envoyées aux commerciaux
  - Le pipeline affichera la progression correcte
*/

-- Fonction pour synchroniser les fichiers du bucket vers la table prospect_documents
CREATE OR REPLACE FUNCTION sync_bucket_to_prospect_documents()
RETURNS TABLE(
  synced_count integer,
  skipped_count integer,
  error_count integer,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_file record;
  v_lead_id uuid;
  v_document_type text;
  v_synced integer := 0;
  v_skipped integer := 0;
  v_errors integer := 0;
  v_details jsonb := '[]'::jsonb;
  v_file_name text;
BEGIN
  -- Parcourir tous les fichiers du bucket
  FOR v_file IN 
    SELECT 
      name as file_path,
      created_at,
      metadata
    FROM storage.objects
    WHERE bucket_id = 'prospect-documents'
    ORDER BY created_at DESC
  LOOP
    BEGIN
      -- Extraire le token (premier segment du path)
      v_lead_id := NULL;
      
      -- Le path est du format: {token}/{document_type}_{timestamp}.{ext}
      -- Ex: 7ba8aa998cf3223e02ffba5ea4877bc7e0564f97078886a2bda95222320216a3/licence_taxi_1771032052418.pdf
      
      -- Extraire le token et trouver le lead_id correspondant
      SELECT id INTO v_lead_id
      FROM crm_leads
      WHERE access_token = split_part(v_file.file_path, '/', 1)
      AND deleted_at IS NULL
      LIMIT 1;
      
      IF v_lead_id IS NULL THEN
        v_skipped := v_skipped + 1;
        v_details := v_details || jsonb_build_object(
          'file', v_file.file_path,
          'status', 'skipped',
          'reason', 'lead_not_found'
        );
        CONTINUE;
      END IF;
      
      -- Extraire le document_type depuis le nom du fichier
      -- Format: {type}_{timestamp}.{ext}
      v_document_type := split_part(split_part(v_file.file_path, '/', 2), '_', 1);
      
      -- Extraire le nom de fichier original depuis le chemin
      v_file_name := split_part(v_file.file_path, '/', 2);
      
      -- Vérifier si le document n'existe pas déjà
      IF EXISTS (
        SELECT 1 FROM prospect_documents
        WHERE file_path = v_file.file_path
      ) THEN
        v_skipped := v_skipped + 1;
        v_details := v_details || jsonb_build_object(
          'file', v_file.file_path,
          'status', 'skipped',
          'reason', 'already_exists'
        );
        CONTINUE;
      END IF;
      
      -- Insérer dans prospect_documents
      -- Le trigger sync_prospect_document_to_crm() se déclenchera automatiquement
      INSERT INTO prospect_documents (
        lead_id,
        document_type,
        document_name,
        file_path,
        file_size,
        mime_type,
        status,
        uploaded_at,
        metadata
      ) VALUES (
        v_lead_id,
        v_document_type,
        v_file_name,
        v_file.file_path,
        COALESCE((v_file.metadata->>'size')::bigint, 0),
        COALESCE(v_file.metadata->>'mimetype', 'application/octet-stream'),
        'pending',
        v_file.created_at,
        jsonb_build_object('synced_from_bucket', true, 'sync_date', now())
      );
      
      v_synced := v_synced + 1;
      v_details := v_details || jsonb_build_object(
        'file', v_file.file_path,
        'status', 'synced',
        'lead_id', v_lead_id,
        'document_type', v_document_type
      );
      
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_details := v_details || jsonb_build_object(
        'file', v_file.file_path,
        'status', 'error',
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  -- Retourner le résumé
  RETURN QUERY
  SELECT 
    v_synced,
    v_skipped,
    v_errors,
    v_details;
END;
$$;

COMMENT ON FUNCTION sync_bucket_to_prospect_documents() IS 'Synchronise tous les fichiers du bucket prospect-documents vers la table prospect_documents';

-- Exécuter la synchronisation immédiatement
DO $$
DECLARE
  v_result record;
BEGIN
  SELECT * INTO v_result FROM sync_bucket_to_prospect_documents();
  
  RAISE NOTICE '✅ Synchronisation terminée:';
  RAISE NOTICE '   - Documents synchronisés: %', v_result.synced_count;
  RAISE NOTICE '   - Documents ignorés: %', v_result.skipped_count;
  RAISE NOTICE '   - Erreurs: %', v_result.error_count;
  RAISE NOTICE '   - Détails: %', v_result.details;
END $$;
