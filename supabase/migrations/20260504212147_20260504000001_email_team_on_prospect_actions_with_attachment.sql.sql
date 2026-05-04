/*
  # Notifications email team@taxiassur.com avec pièce jointe sur actions prospect

  ## Contexte
  Lorsqu'un prospect (1) uploade un document, (2) valide un devis ou
  (3) refuse un devis depuis l'espace prospect, l'équipe recevait des
  notifications dans l'interface CRM mais aucun email n'arrivait à
  team@taxiassur.com avec la pièce jointe correspondante.

  ## Changements
  1. Nouveau trigger AFTER INSERT sur prospect_documents qui envoie un
     email à team@taxiassur.com avec l'URL du fichier en pièce jointe
     (l'edge function send-email-ionos récupère l'URL et l'attache).
  2. Recréation de validate_quote_by_token(text, uuid) avec envoi email
     à team@taxiassur.com + pièce jointe du devis (quote_pdf_url ou quote_file_url).
  3. Recréation de refuse_quote_by_token(uuid, text, text) avec envoi email
     à team@taxiassur.com (sans pièce jointe, juste la raison).

  ## Sécurité
  - Toutes les fonctions restent SECURITY DEFINER avec search_path fixé.
  - Les appels HTTP utilisent net.http_post (fire-and-forget, non bloquant).
  - Aucune modification des politiques RLS.
*/

-- ============================================================
-- 1. Trigger email team@ sur upload document prospect
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_team_prospect_document_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_name text;
  v_lead_email text;
  v_doc_label text;
  v_bucket text;
  v_download_url text;
  v_mime text;
  v_crm_url text;
  v_email_html text;
BEGIN
  SELECT
    COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), email, 'Prospect'),
    email
  INTO v_lead_name, v_lead_email
  FROM crm_leads
  WHERE id = NEW.lead_id;

  v_doc_label := CASE NEW.document_type
    WHEN 'licence_taxi' THEN 'Licence taxi'
    WHEN 'permis_conduire' THEN 'Permis de conduire'
    WHEN 'piece_identite' THEN 'Pièce d''identité'
    WHEN 'carte_grise' THEN 'Carte grise'
    WHEN 'releve_information' THEN 'Relevé d''information'
    WHEN 'autorisation_stationnement' THEN 'Autorisation de stationnement'
    WHEN 'rib' THEN 'RIB'
    WHEN 'kbis' THEN 'Extrait Kbis'
    WHEN 'devis_signe' THEN 'Devis signé'
    WHEN 'contrat' THEN 'Contrat signé'
    ELSE NEW.document_type
  END;

  IF NEW.file_path LIKE '00000000-0000-0000-0000-000000000001/%' THEN
    v_bucket := 'email-attachments';
  ELSE
    v_bucket := 'prospect-documents';
  END IF;

  v_download_url := COALESCE(
    NEW.metadata->>'download_url',
    'https://drohhxrkoequjphvabvq.supabase.co/storage/v1/object/public/' || v_bucket || '/' || NEW.file_path
  );

  v_mime := COALESCE(NEW.mime_type, 'application/octet-stream');
  v_crm_url := 'https://taxiassur.com/backoffice/crm-killer/lead/' || NEW.lead_id::text;

  v_email_html :=
    '<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">' ||
    '<div style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:24px;border-radius:10px 10px 0 0">' ||
    '<h1 style="margin:0">Nouveau document prospect</h1>' ||
    '</div>' ||
    '<div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">' ||
    '<p><strong>Prospect :</strong> ' || COALESCE(v_lead_name, '—') || '</p>' ||
    '<p><strong>Email :</strong> ' || COALESCE(v_lead_email, '—') || '</p>' ||
    '<p><strong>Document :</strong> ' || v_doc_label || '</p>' ||
    '<p><strong>Fichier :</strong> ' || COALESCE(NEW.file_name, '—') || '</p>' ||
    '<p style="margin-top:24px"><a href="' || v_crm_url || '" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Voir dans le CRM</a></p>' ||
    '<p style="color:#6b7280;font-size:12px;margin-top:24px">La pièce jointe est incluse dans cet email.</p>' ||
    '</div></div>';

  BEGIN
    PERFORM net.http_post(
      url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-email-ionos',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg'
      ),
      body := jsonb_build_object(
        'to', 'team@taxiassur.com',
        'toName', 'Équipe TaxiAssur',
        'subject', '[Prospect] Document reçu : ' || v_doc_label || ' – ' || v_lead_name,
        'html', v_email_html,
        'fromEmail', 'team@taxiassur.com',
        'fromName', 'TaxiAssur Notifications',
        'attachments', jsonb_build_array(
          jsonb_build_object(
            'filename', COALESCE(NEW.file_name, 'document'),
            'url', v_download_url,
            'contentType', v_mime
          )
        )
      ),
      timeout_milliseconds := 15000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[NOTIFY_TEAM_DOC] Erreur envoi email team: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_team_on_prospect_upload ON public.prospect_documents;
CREATE TRIGGER trg_notify_team_on_prospect_upload
AFTER INSERT ON public.prospect_documents
FOR EACH ROW
EXECUTE FUNCTION public.notify_team_prospect_document_upload();

COMMENT ON FUNCTION public.notify_team_prospect_document_upload() IS
  'Envoie un email à team@taxiassur.com avec la pièce jointe lors de l''upload d''un document prospect.';

-- ============================================================
-- 2. validate_quote_by_token avec email team@ + PJ devis
-- ============================================================

DROP FUNCTION IF EXISTS public.validate_quote_by_token(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.validate_quote_by_token(uuid, text) CASCADE;

CREATE OR REPLACE FUNCTION public.validate_quote_by_token(
  p_token text,
  p_quote_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_company_id uuid;
  v_company_name text;
  v_lead_name text;
  v_lead_email text;
  v_quote_amount numeric;
  v_pdf_url text;
  v_action_url text;
  v_email_html text;
  v_attachments jsonb;
  v_count integer;
BEGIN
  SELECT id,
         COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), email, 'Prospect'),
         email
  INTO v_lead_id, v_lead_name, v_lead_email
  FROM crm_leads
  WHERE access_token = p_token
    AND deleted_at IS NULL
    AND archived_at IS NULL;

  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide');
  END IF;

  SELECT lcq.insurance_company_id, ic.name, lcq.quote_amount,
         COALESCE(lcq.quote_pdf_url, lcq.quote_file_url)
  INTO v_company_id, v_company_name, v_quote_amount, v_pdf_url
  FROM lead_company_quotes lcq
  LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
  WHERE lcq.id = p_quote_id
    AND lcq.lead_id = v_lead_id
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Devis non trouvé');
  END IF;

  UPDATE lead_company_quotes
  SET quote_status = 'validated',
      quote_accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = p_quote_id
    AND lead_id = v_lead_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Erreur mise à jour');
  END IF;

  UPDATE crm_leads
  SET status = 'signature_devis',
      pipeline_stage = 'signature_devis',
      quote_accepted_at = NOW(),
      selected_company_id = v_company_id,
      updated_at = NOW()
  WHERE id = v_lead_id;

  INSERT INTO crm_event_notifications (lead_id, event_type, title, message, priority, context_data)
  VALUES (
    v_lead_id,
    'quote_validated',
    'Devis accepté par le prospect',
    format('%s a accepté le devis de %s (%s €).', v_lead_name, v_company_name, COALESCE(v_quote_amount::text, '—')),
    10,
    jsonb_build_object('quote_id', p_quote_id, 'company_id', v_company_id)
  );

  v_action_url := 'https://taxiassur.com/backoffice/crm-killer/lead/' || v_lead_id::text;

  v_email_html :=
    '<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">' ||
    '<div style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:24px;border-radius:10px 10px 0 0">' ||
    '<h1 style="margin:0">Devis accepté par le prospect</h1>' ||
    '</div>' ||
    '<div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">' ||
    '<p><strong>Prospect :</strong> ' || v_lead_name || '</p>' ||
    '<p><strong>Email :</strong> ' || COALESCE(v_lead_email, '—') || '</p>' ||
    '<p><strong>Compagnie :</strong> ' || v_company_name || '</p>' ||
    '<p><strong>Montant :</strong> ' || COALESCE(v_quote_amount::text, '—') || ' €</p>' ||
    '<p style="margin-top:24px"><a href="' || v_action_url || '" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Voir le lead</a></p>' ||
    CASE WHEN v_pdf_url IS NOT NULL
         THEN '<p style="color:#6b7280;font-size:12px;margin-top:24px">Le devis accepté est en pièce jointe.</p>'
         ELSE ''
    END ||
    '</div></div>';

  IF v_pdf_url IS NOT NULL AND v_pdf_url <> '' THEN
    v_attachments := jsonb_build_array(
      jsonb_build_object(
        'filename', 'devis_' || COALESCE(v_company_name, 'compagnie') || '.pdf',
        'url', v_pdf_url,
        'contentType', 'application/pdf'
      )
    );
  ELSE
    v_attachments := '[]'::jsonb;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-email-ionos',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg'
      ),
      body := jsonb_build_object(
        'to', 'team@taxiassur.com',
        'toName', 'Équipe TaxiAssur',
        'subject', '[Devis accepté] ' || v_lead_name || ' - ' || v_company_name,
        'html', v_email_html,
        'fromEmail', 'team@taxiassur.com',
        'fromName', 'TaxiAssur Notifications',
        'attachments', v_attachments
      ),
      timeout_milliseconds := 15000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[VALIDATE_QUOTE] Erreur envoi email team: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'company_name', v_company_name,
    'lead_id', v_lead_id,
    'company_id', v_company_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_quote_by_token(text, uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.validate_quote_by_token(text, uuid) IS
  'Valide un devis depuis l''espace prospect, met à jour le lead et envoie un email à team@taxiassur.com avec le PDF du devis.';

-- ============================================================
-- 3. refuse_quote_by_token avec email team@
-- ============================================================

DROP FUNCTION IF EXISTS public.refuse_quote_by_token(uuid, text, text) CASCADE;

CREATE OR REPLACE FUNCTION public.refuse_quote_by_token(
  p_quote_id uuid,
  p_token text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_company_name text;
  v_lead_name text;
  v_lead_email text;
  v_quote_amount numeric;
  v_pdf_url text;
  v_action_url text;
  v_email_html text;
  v_attachments jsonb;
BEGIN
  SELECT lcq.lead_id,
         ic.name,
         COALESCE(NULLIF(TRIM(cl.first_name || ' ' || cl.last_name), ''), cl.email, 'Prospect'),
         cl.email,
         lcq.quote_amount,
         COALESCE(lcq.quote_pdf_url, lcq.quote_file_url)
  INTO v_lead_id, v_company_name, v_lead_name, v_lead_email, v_quote_amount, v_pdf_url
  FROM lead_company_quotes lcq
  INNER JOIN crm_leads cl ON cl.id = lcq.lead_id
  LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
  WHERE lcq.id = p_quote_id
    AND cl.access_token = p_token
    AND cl.access_token IS NOT NULL
    AND cl.deleted_at IS NULL;

  IF v_lead_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token invalide ou devis non trouvé');
  END IF;

  UPDATE lead_company_quotes
  SET quote_status = 'refused',
      refusal_reason = p_reason,
      refused_at = NOW(),
      updated_at = NOW()
  WHERE id = p_quote_id
    AND lead_id = v_lead_id;

  v_action_url := 'https://taxiassur.com/backoffice/crm-killer/lead/' || v_lead_id::text;

  INSERT INTO crm_event_notifications (lead_id, event_type, title, message, priority, context_data)
  VALUES (
    v_lead_id,
    'quote_refused',
    'Devis refusé par le prospect',
    format('%s a refusé le devis de %s%s',
      v_lead_name,
      v_company_name,
      CASE WHEN p_reason IS NOT NULL AND p_reason <> '' THEN ' – ' || p_reason ELSE '' END
    ),
    8,
    jsonb_build_object('quote_id', p_quote_id, 'reason', p_reason)
  );

  v_email_html :=
    '<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">' ||
    '<div style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:24px;border-radius:10px 10px 0 0">' ||
    '<h1 style="margin:0">Devis refusé par le prospect</h1>' ||
    '</div>' ||
    '<div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">' ||
    '<p><strong>Prospect :</strong> ' || v_lead_name || '</p>' ||
    '<p><strong>Email :</strong> ' || COALESCE(v_lead_email, '—') || '</p>' ||
    '<p><strong>Compagnie :</strong> ' || COALESCE(v_company_name, '—') || '</p>' ||
    '<p><strong>Montant :</strong> ' || COALESCE(v_quote_amount::text, '—') || ' €</p>' ||
    CASE WHEN p_reason IS NOT NULL AND p_reason <> ''
         THEN '<p><strong>Raison :</strong> ' || p_reason || '</p>'
         ELSE ''
    END ||
    '<p style="margin-top:24px"><a href="' || v_action_url || '" style="background:#ef4444;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Voir le lead</a></p>' ||
    '</div></div>';

  IF v_pdf_url IS NOT NULL AND v_pdf_url <> '' THEN
    v_attachments := jsonb_build_array(
      jsonb_build_object(
        'filename', 'devis_refuse_' || COALESCE(v_company_name, 'compagnie') || '.pdf',
        'url', v_pdf_url,
        'contentType', 'application/pdf'
      )
    );
  ELSE
    v_attachments := '[]'::jsonb;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-email-ionos',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg'
      ),
      body := jsonb_build_object(
        'to', 'team@taxiassur.com',
        'toName', 'Équipe TaxiAssur',
        'subject', '[Devis refusé] ' || v_lead_name || ' - ' || COALESCE(v_company_name, 'compagnie'),
        'html', v_email_html,
        'fromEmail', 'team@taxiassur.com',
        'fromName', 'TaxiAssur Notifications',
        'attachments', v_attachments
      ),
      timeout_milliseconds := 15000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[REFUSE_QUOTE] Erreur envoi email team: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Devis refusé',
    'company_name', v_company_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.refuse_quote_by_token(uuid, text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.refuse_quote_by_token(uuid, text, text) IS
  'Refuse un devis depuis l''espace prospect et envoie un email à team@taxiassur.com avec le PDF du devis.';
