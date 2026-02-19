/*
  # Fix Documents Panier : URLs 404 & Classification

  ## Problèmes identifiés
  1. Documents retournent 404 car le bucket n'est pas détecté correctement
     - Les documents prospect sont dans `prospect-documents`
     - Mais l'URL générée pointe vers `crm-documents`
  
  2. Documents classés restent dans "Non classés"
     - La fonction classify_attachment met status='classified' 
     - Mais get_document_basket filtre seulement status='pending'
     - Les documents 'classified' disparaissent mais créent des doublons

  ## Solutions
  1. Ajouter une colonne 'source' dans get_document_basket pour détecter le bucket
  2. Marquer les documents comme 'processed'/'classified' pour les retirer du panier
*/

-- =============================================
-- 1. FIX: Ajouter la source dans get_document_basket
-- =============================================

DROP FUNCTION IF EXISTS get_document_basket(uuid);

CREATE OR REPLACE FUNCTION get_document_basket(p_case_id uuid)
RETURNS TABLE(
  attachment_id text,
  filename text,
  content_type text,
  file_size bigint,
  storage_path text,
  preview_path text,
  proposed_doc_type text,
  confidence numeric,
  status text,
  received_at timestamp with time zone,
  email_subject text,
  from_email text,
  source text  -- NOUVEAU: pour détecter le bucket
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Email attachments non classées
  SELECT
    ea.id::text as attachment_id,
    ea.filename,
    ea.content_type,
    ea.file_size,
    ea.storage_path,
    ea.preview_path,
    ea.proposed_doc_type,
    ea.classification_confidence as confidence,
    ea.status,
    COALESCE(em.received_at, ea.created_at) as received_at,
    em.subject as email_subject,
    em.from_email,
    'email_attachments'::text as source  -- NOUVEAU
  FROM email_attachments ea
  LEFT JOIN email_messages em ON em.id = ea.email_message_id
  WHERE (em.lead_id = p_case_id OR em.case_id = p_case_id)
    AND ea.status = 'pending'

  UNION ALL

  -- Documents prospect non validés ET non classés
  SELECT
    pd.id::text as attachment_id,
    pd.file_name as filename,
    COALESCE(pd.mime_type, 'application/pdf') as content_type,
    pd.file_size::bigint,
    pd.file_path as storage_path,
    NULL::text as preview_path,
    pd.document_type as proposed_doc_type,
    CASE 
      WHEN pd.document_type IS NOT NULL AND pd.document_type != 'autre' THEN 0.9::numeric
      ELSE 0.3::numeric
    END as confidence,
    COALESCE(pd.status, 'pending') as status,
    pd.uploaded_at as received_at,
    'Document uploadé par prospect' as email_subject,
    'Prospect' as from_email,
    'prospect_documents'::text as source  -- NOUVEAU
  FROM prospect_documents pd
  WHERE pd.lead_id = p_case_id
    AND pd.validated = false
    -- CORRECTION: Exclure aussi les documents 'classified'
    AND (pd.status IS NULL OR pd.status IN ('pending', 'uploaded'))
    AND COALESCE(pd.status, '') != 'classified'

  ORDER BY received_at DESC;
END;
$$;

-- =============================================
-- 2. FIX: classify_attachment - marquer comme traité
-- =============================================

CREATE OR REPLACE FUNCTION classify_attachment(
  p_attachment_id text,
  p_doc_type text,
  p_create_document boolean DEFAULT true,
  p_custom_label text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attachment record;
  v_lead_id uuid;
  v_new_doc_id uuid;
  v_user_id uuid;
  v_source text;
BEGIN
  -- Récupérer l'utilisateur
  v_user_id := auth.uid();

  -- Chercher dans email_attachments
  BEGIN
    SELECT * INTO v_attachment
    FROM email_attachments
    WHERE id::text = p_attachment_id OR id = p_attachment_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_attachment := NULL;
  END;

  IF v_attachment.id IS NOT NULL THEN
    v_source := 'email';

    -- Récupérer le lead_id depuis email_messages
    SELECT COALESCE(lead_id, case_id) INTO v_lead_id
    FROM email_messages
    WHERE id = v_attachment.email_message_id;

    -- CORRECTION: Mettre à jour le statut à 'processed' au lieu de 'classified'
    -- pour le retirer du panier
    UPDATE email_attachments
    SET
      status = 'processed',  -- CHANGE: était 'classified'
      proposed_doc_type = p_doc_type,
      updated_at = now()
    WHERE id = v_attachment.id;

    -- Créer le document dans crm_lead_documents
    IF p_create_document THEN
      INSERT INTO crm_lead_documents (
        lead_id,
        document_type,
        file_name,
        file_path,
        file_size,
        mime_type,
        uploaded_by,
        status,
        custom_label,
        metadata
      )
      VALUES (
        v_lead_id,
        p_doc_type,
        v_attachment.filename,
        v_attachment.storage_path,
        v_attachment.file_size,
        v_attachment.content_type,
        v_user_id::text,
        'pending',
        p_custom_label,
        jsonb_build_object('source', 'email', 'attachment_id', v_attachment.id)
      )
      RETURNING id INTO v_new_doc_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Document classé avec succès',
      'document_id', v_new_doc_id,
      'source', 'email',
      'status', 'pending'
    );
  END IF;

  -- Chercher dans prospect_documents
  BEGIN
    SELECT * INTO v_attachment
    FROM prospect_documents
    WHERE id::text = p_attachment_id OR id = p_attachment_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_attachment := NULL;
  END;

  IF v_attachment.id IS NOT NULL THEN
    v_source := 'prospect';
    v_lead_id := v_attachment.lead_id;

    -- CORRECTION: Mettre à jour le statut à 'classified' pour le retirer du panier
    UPDATE prospect_documents
    SET
      document_type = p_doc_type,
      status = 'classified',  -- CHANGE: marque le document comme traité
      validated = false,
      validated_by = null,
      validated_at = null,
      updated_at = now()
    WHERE id = v_attachment.id;

    -- Créer dans crm_lead_documents
    IF p_create_document THEN
      INSERT INTO crm_lead_documents (
        lead_id,
        document_type,
        file_name,
        file_path,
        file_size,
        mime_type,
        uploaded_by,
        status,
        custom_label,
        metadata
      )
      VALUES (
        v_lead_id,
        p_doc_type,
        v_attachment.file_name,
        v_attachment.file_path,
        v_attachment.file_size,
        v_attachment.mime_type,
        v_user_id::text,
        'pending',
        p_custom_label,
        jsonb_build_object('source', 'prospect', 'prospect_document_id', v_attachment.id)
      )
      RETURNING id INTO v_new_doc_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Document classé avec succès',
      'document_id', v_new_doc_id,
      'source', 'prospect',
      'status', 'pending'
    );
  END IF;

  -- Document non trouvé
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Document non trouvé'
  );
END;
$$;

COMMENT ON FUNCTION get_document_basket IS 
'Retourne tous les documents non classés du lead. FIXED: Ajoute la colonne source pour détecter le bon bucket storage';

COMMENT ON FUNCTION classify_attachment IS 
'Classe un document dans une catégorie et le retire du panier. FIXED: prospect_documents passe à status=classified, email_attachments passe à status=processed';
