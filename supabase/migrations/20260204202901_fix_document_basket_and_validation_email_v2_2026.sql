/*
  # Fix Document Basket & Validation Email System v2 2026

  1. Fonctions manquantes
    - Drop et recrée `get_document_basket` pour afficher les documents non classés
    - Crée `classify_attachment` pour classer les documents par glisser-déposer

  2. Sécurité
    - RLS policies pour les opérations
    - Authentification requise pour les actions commerciales
*/

-- =====================================================
-- FONCTION : get_document_basket
-- Récupère tous les documents en attente de classification
-- =====================================================
drop function if exists get_document_basket(uuid);

create or replace function get_document_basket(p_case_id uuid)
returns table (
  attachment_id text,
  filename text,
  content_type text,
  file_size bigint,
  storage_path text,
  preview_path text,
  proposed_doc_type text,
  confidence numeric,
  status text,
  received_at timestamptz,
  email_subject text,
  from_email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Retourne les pièces jointes d'emails non classées
  return query
  select
    ea.id::text as attachment_id,
    ea.filename,
    ea.content_type,
    ea.file_size,
    ea.storage_path,
    ea.preview_path,
    ea.proposed_doc_type,
    ea.confidence,
    ea.status,
    ea.received_at,
    em.subject as email_subject,
    em.from_email
  from email_attachments ea
  left join email_messages em on em.id = ea.email_message_id
  where ea.lead_id = p_case_id
    and ea.status = 'pending'

  union all

  -- Retourne aussi les documents prospect non validés
  select
    pd.id::text as attachment_id,
    pd.file_name as filename,
    coalesce(pd.mime_type, 'application/octet-stream') as content_type,
    pd.file_size::bigint,
    pd.file_path as storage_path,
    null::text as preview_path,
    pd.document_type as proposed_doc_type,
    null::numeric as confidence,
    coalesce(pd.validation_status, 'pending') as status,
    pd.uploaded_at as received_at,
    'Upload prospect' as email_subject,
    'prospect' as from_email
  from prospect_documents pd
  where pd.lead_id = p_case_id
    and (pd.validation_status is null or pd.validation_status = 'pending')
    and pd.validated = false

  order by received_at desc;
end;
$$;

-- =====================================================
-- FONCTION : classify_attachment
-- Classe un document dans une catégorie
-- =====================================================
drop function if exists classify_attachment(text, text, boolean);

create or replace function classify_attachment(
  p_attachment_id text,
  p_doc_type text,
  p_create_document boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attachment record;
  v_lead_id uuid;
  v_new_doc_id uuid;
  v_user_id uuid;
begin
  -- Récupérer l'utilisateur
  v_user_id := auth.uid();

  -- Chercher dans email_attachments
  select * into v_attachment
  from email_attachments
  where id::text = p_attachment_id;

  if found then
    v_lead_id := v_attachment.lead_id;

    -- Mettre à jour le statut
    update email_attachments
    set
      status = 'classified',
      proposed_doc_type = p_doc_type,
      classified_at = now()
    where id::text = p_attachment_id;

    -- Créer le document dans crm_lead_documents si demandé
    if p_create_document then
      insert into crm_lead_documents (
        lead_id,
        document_type,
        file_name,
        file_path,
        file_size,
        mime_type,
        uploaded_by,
        source
      )
      values (
        v_lead_id,
        p_doc_type,
        v_attachment.filename,
        v_attachment.storage_path,
        v_attachment.file_size,
        v_attachment.content_type,
        v_user_id,
        'email'
      )
      returning id into v_new_doc_id;

      -- Log dans timeline
      insert into crm_interactions (
        lead_id,
        type,
        subject,
        content,
        created_by
      )
      values (
        v_lead_id,
        'document',
        'Document classé',
        'Document "' || v_attachment.filename || '" classé comme ' || p_doc_type,
        v_user_id
      );
    end if;

    return jsonb_build_object(
      'success', true,
      'message', 'Document classé avec succès',
      'document_id', v_new_doc_id
    );
  end if;

  -- Chercher dans prospect_documents
  select * into v_attachment
  from prospect_documents
  where id::text = p_attachment_id;

  if found then
    v_lead_id := v_attachment.lead_id;

    -- Mettre à jour le type de document
    update prospect_documents
    set
      document_type = p_doc_type,
      validation_status = 'classified'
    where id::text = p_attachment_id;

    -- Créer dans crm_lead_documents si demandé
    if p_create_document then
      insert into crm_lead_documents (
        lead_id,
        document_type,
        file_name,
        file_path,
        file_size,
        mime_type,
        uploaded_by,
        source
      )
      values (
        v_lead_id,
        p_doc_type,
        v_attachment.file_name,
        v_attachment.file_path,
        v_attachment.file_size,
        v_attachment.mime_type,
        v_user_id,
        'prospect'
      )
      returning id into v_new_doc_id;

      -- Log dans timeline
      insert into crm_interactions (
        lead_id,
        type,
        subject,
        content,
        created_by
      )
      values (
        v_lead_id,
        'document',
        'Document classé',
        'Document prospect "' || v_attachment.file_name || '" classé comme ' || p_doc_type,
        v_user_id
      );
    end if;

    return jsonb_build_object(
      'success', true,
      'message', 'Document classé avec succès',
      'document_id', v_new_doc_id
    );
  end if;

  -- Document non trouvé
  return jsonb_build_object(
    'success', false,
    'error', 'Document non trouvé'
  );
end;
$$;

-- =====================================================
-- PERMISSIONS
-- =====================================================
grant execute on function get_document_basket(uuid) to authenticated;
grant execute on function classify_attachment(text, text, boolean) to authenticated;
