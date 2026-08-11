-- Return storage paths instead of requiring public attachment URLs.
DROP FUNCTION IF EXISTS public.get_pending_attachments(uuid);

CREATE FUNCTION public.get_pending_attachments(p_lead_id uuid)
RETURNS TABLE (
  id uuid,
  file_name text,
  file_type text,
  file_size bigint,
  download_url text,
  storage_path text,
  auto_detected_type text,
  confidence_score numeric,
  created_at timestamptz,
  email_subject text,
  email_from text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    ea.id,
    ea.filename AS file_name,
    ea.content_type AS file_type,
    ea.file_size,
    NULL::text AS download_url,
    ea.storage_path,
    ea.proposed_doc_type AS auto_detected_type,
    ea.classification_confidence AS confidence_score,
    ea.created_at,
    em.subject,
    em.from_email
  FROM public.email_attachments ea
  LEFT JOIN public.email_messages em ON em.id = ea.email_message_id
  WHERE em.lead_id = p_lead_id
    AND ea.status IN ('pending', 'pending_validation', 'unclassified')
  ORDER BY ea.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_pending_attachments(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pending_attachments(uuid) TO authenticated, service_role;