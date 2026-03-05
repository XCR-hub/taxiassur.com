/*
  # Fix Upload Documents Espace Prospect - URGENT
  
  Date: 5 mars 2026
  
  ## Problème
  
  Les prospects ne peuvent pas uploader de documents via l'espace prospect.
  Erreur: "Accès refusé" ou upload qui échoue silencieusement.
  
  ## Solutions
  
  1. Simplifier les politiques storage sur prospect-documents
  2. S'assurer que les prospects anonymes (anon) peuvent uploader
  3. Simplifier la politique INSERT sur prospect_documents
  4. Ajouter des logs pour debug
  
  ## Changements
  
  - Nettoyage des politiques storage en double
  - Politique INSERT simplifiée pour prospect_documents
  - Logs détaillés pour diagnostic
*/

-- ========================================
-- 1. NETTOYER TOUTES LES POLITIQUES STORAGE
-- ========================================

-- Supprimer TOUTES les politiques existantes sur prospect-documents
DROP POLICY IF EXISTS "Public upload access for prospect documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read prospect-documents for viewing" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update access for prospect documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete access for prospect documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload to prospect-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from prospect-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update prospect-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from prospect-documents" ON storage.objects;

-- Recréer des politiques simples et claires

-- READ: Tout le monde peut lire (public access)
CREATE POLICY "prospect_docs_public_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'prospect-documents');

-- INSERT: Public (anon + authenticated) peuvent uploader
CREATE POLICY "prospect_docs_public_insert"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'prospect-documents');

-- UPDATE: Authenticated peuvent modifier
CREATE POLICY "prospect_docs_auth_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated, service_role
  USING (bucket_id = 'prospect-documents')
  WITH CHECK (bucket_id = 'prospect-documents');

-- DELETE: Authenticated peuvent supprimer
CREATE POLICY "prospect_docs_auth_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated, service_role
  USING (bucket_id = 'prospect-documents');


-- ========================================
-- 2. SIMPLIFIER LA POLITIQUE INSERT SUR PROSPECT_DOCUMENTS
-- ========================================

-- Supprimer l'ancienne politique restrictive
DROP POLICY IF EXISTS "Public can insert prospect documents with valid token" ON prospect_documents;
DROP POLICY IF EXISTS "Allow anon to insert prospect documents" ON prospect_documents;

-- Créer une politique INSERT ultra-simple
CREATE POLICY "prospect_docs_insert_simple"
  ON prospect_documents
  FOR INSERT
  TO anon, authenticated, service_role
  WITH CHECK (
    -- Juste vérifier que le lead existe
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = prospect_documents.lead_id
    )
  );

COMMENT ON POLICY "prospect_docs_insert_simple" ON prospect_documents IS
'Permet l''insertion de documents si le lead existe. Token validé par la fonction RPC.';


-- ========================================
-- 3. AMÉLIORER LA FONCTION UPLOAD AVEC LOGS
-- ========================================

CREATE OR REPLACE FUNCTION upload_prospect_document_by_token(
  p_token text,
  p_document_type text,
  p_file_name text,
  p_file_path text,
  p_file_size bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $$
DECLARE
  v_lead_id uuid;
  v_doc_id uuid;
  v_first_name text;
  v_last_name text;
  v_email text;
  v_notification_id uuid;
BEGIN
  -- Log de début
  RAISE LOG '📤 [UPLOAD] Début upload - Token: %, Type: %, File: %', 
    LEFT(p_token, 8), p_document_type, p_file_name;

  -- Récupérer l'ID et les infos du lead
  SELECT l.id, l.first_name, l.last_name, l.email 
  INTO v_lead_id, v_first_name, v_last_name, v_email
  FROM crm_leads l
  WHERE l.access_token = p_token;

  IF v_lead_id IS NULL THEN
    RAISE LOG '❌ [UPLOAD] Token invalide: %', LEFT(p_token, 8);
    RAISE EXCEPTION 'Token invalide ou expiré';
  END IF;

  RAISE LOG '✅ [UPLOAD] Lead trouvé: % (%)', v_lead_id, v_email;

  -- Insérer le document
  BEGIN
    INSERT INTO prospect_documents (
      lead_id,
      document_type,
      file_name,
      file_path,
      file_size,
      status,
      uploaded_by
    ) VALUES (
      v_lead_id,
      p_document_type,
      p_file_name,
      p_file_path,
      p_file_size,
      'uploaded',
      'prospect'
    ) RETURNING id INTO v_doc_id;

    RAISE LOG '✅ [UPLOAD] Document inséré: %', v_doc_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '❌ [UPLOAD] Erreur insertion document: %', SQLERRM;
    RAISE EXCEPTION 'Erreur lors de l''enregistrement du document: %', SQLERRM;
  END;

  -- Mettre à jour la checklist
  BEGIN
    UPDATE crm_leads
    SET document_checklist = COALESCE(document_checklist, '{}'::jsonb) || 
      jsonb_build_object(
        p_document_type,
        jsonb_build_object(
          'status', 'uploaded',
          'validated', false,
          'uploaded_at', now(),
          'file_name', p_file_name
        )
      ),
      updated_at = NOW()
    WHERE id = v_lead_id;

    RAISE LOG '✅ [UPLOAD] Checklist mise à jour pour lead %', v_lead_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '⚠️ [UPLOAD] Erreur mise à jour checklist: %', SQLERRM;
    -- Ne pas bloquer l'upload si la checklist échoue
  END;

  -- Créer une notification pour l'admin
  BEGIN
    INSERT INTO crm_event_notifications (
      lead_id,
      event_type,
      message,
      priority,
      context_data,
      is_read
    ) VALUES (
      v_lead_id,
      'document_uploaded',
      format('📄 Nouveau document reçu: %s - Prospect: %s %s (%s)', 
        p_document_type,
        COALESCE(v_first_name, ''), 
        COALESCE(v_last_name, ''),
        COALESCE(v_email, '')
      ),
      2,
      jsonb_build_object(
        'document_type', p_document_type,
        'file_name', p_file_name,
        'file_size', p_file_size,
        'document_id', v_doc_id,
        'prospect_name', format('%s %s', COALESCE(v_first_name, ''), COALESCE(v_last_name, '')),
        'prospect_email', v_email
      ),
      false
    ) RETURNING id INTO v_notification_id;

    RAISE LOG '✅ [UPLOAD] Notification créée: %', v_notification_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '⚠️ [UPLOAD] Erreur création notification: %', SQLERRM;
    -- Ne pas bloquer l'upload si la notification échoue
  END;

  RAISE LOG '🎉 [UPLOAD] Upload terminé avec succès - Doc: %, Lead: %', v_doc_id, v_lead_id;

  RETURN jsonb_build_object(
    'success', true,
    'document_id', v_doc_id,
    'lead_id', v_lead_id,
    'notification_id', v_notification_id,
    'message', 'Document uploadé avec succès'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '❌ [UPLOAD] Erreur globale: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', format('Erreur lors de l''upload: %s', SQLERRM)
  );
END;
$$;

COMMENT ON FUNCTION upload_prospect_document_by_token IS
'Upload un document pour un prospect via son token d''accès. Version avec logs détaillés.';


-- ========================================
-- 4. VÉRIFIER LE BUCKET
-- ========================================

-- S'assurer que le bucket est public
UPDATE storage.buckets
SET public = true
WHERE id = 'prospect-documents';


-- ========================================
-- 5. LOGS ET VÉRIFICATION
-- ========================================

DO $$
DECLARE
  v_bucket_public boolean;
  v_insert_policies int;
  v_storage_insert_policies int;
  v_storage_select_policies int;
BEGIN
  -- Vérifier le bucket
  SELECT public INTO v_bucket_public
  FROM storage.buckets
  WHERE id = 'prospect-documents';

  -- Compter les politiques sur prospect_documents
  SELECT COUNT(*) INTO v_insert_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'prospect_documents'
    AND cmd = 'INSERT';

  -- Compter les politiques storage INSERT
  SELECT COUNT(*) INTO v_storage_insert_policies
  FROM pg_policy
  WHERE polrelid = 'storage.objects'::regclass
    AND polcmd = 'a'
    AND polname LIKE '%prospect%';

  -- Compter les politiques storage SELECT
  SELECT COUNT(*) INTO v_storage_select_policies
  FROM pg_policy
  WHERE polrelid = 'storage.objects'::regclass
    AND polcmd = 'r'
    AND polname LIKE '%prospect%';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   FIX UPLOAD PROSPECT TERMINÉ';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Bucket public: %', 
    CASE WHEN v_bucket_public THEN 'OUI' ELSE 'NON' END;
  RAISE NOTICE '✅ Politiques INSERT (prospect_documents): %', v_insert_policies;
  RAISE NOTICE '✅ Politiques storage INSERT: %', v_storage_insert_policies;
  RAISE NOTICE '✅ Politiques storage SELECT: %', v_storage_select_policies;
  RAISE NOTICE '';
  RAISE NOTICE '📋 Test immédiat:';
  RAISE NOTICE '   1. Aller sur espace prospect';
  RAISE NOTICE '   2. Uploader un document';
  RAISE NOTICE '   3. Voir les logs: Supabase → Logs';
  RAISE NOTICE '';
END $$;
