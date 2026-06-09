
-- Fix: rewrite notify_team_prospect_document_upload to use the reliable email_queue system
-- instead of direct net.http_post with anon key (which was silently failing)
-- The email_queue pipeline uses service_role_key and has retry logic.

-- Step 1: Add attachments column to email_queue if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_queue' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE email_queue ADD COLUMN attachments jsonb DEFAULT NULL;
  END IF;
END $$;

-- Step 2: Rewrite the queue processor to include attachments when present
CREATE OR REPLACE FUNCTION process_email_queue_simple(
  p_batch_size int DEFAULT 20,
  p_max_retries int DEFAULT 3
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  processed_count int := 0;
  failed_count int := 0;
  email_rec record;
  response_id bigint;
  v_supabase_url text;
  v_service_key text;
  v_body jsonb;
BEGIN
  v_supabase_url := get_system_setting('supabase_url');
  v_service_key  := get_system_setting('supabase_service_role_key');

  RAISE LOG '[PROCESSOR] Traitement queue (batch_size: %)', p_batch_size;

  FOR email_rec IN
    SELECT * FROM email_queue
    WHERE status = 'pending'
    AND retry_count < p_max_retries
    AND scheduled_for <= now()
    ORDER BY priority DESC, created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      RAISE LOG '[PROCESSOR] Traitement email % pour %', email_rec.email_type, email_rec.to_email;

      UPDATE email_queue
      SET status = 'sending', retry_count = retry_count + 1
      WHERE id = email_rec.id;

      v_body := jsonb_build_object(
        'to', email_rec.to_email,
        'toName', email_rec.to_name,
        'subject', email_rec.subject,
        'html', email_rec.body,
        'from', email_rec.from_email,
        'fromName', email_rec.from_name
      );

      -- Include attachments if present
      IF email_rec.attachments IS NOT NULL AND email_rec.attachments != '[]'::jsonb THEN
        v_body := v_body || jsonb_build_object('attachments', email_rec.attachments);
      END IF;

      SELECT net.http_post(
        url := v_supabase_url || '/functions/v1/send-email-ionos',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := v_body,
        timeout_milliseconds := 30000
      ) INTO response_id;

      UPDATE email_queue
      SET
        status = 'sent',
        sent_at = now(),
        error_message = NULL
      WHERE id = email_rec.id;

      processed_count := processed_count + 1;
      RAISE LOG '[PROCESSOR] Email envoye: % a % (response_id: %)', email_rec.email_type, email_rec.to_email, response_id;

    EXCEPTION WHEN OTHERS THEN
      UPDATE email_queue
      SET
        status = CASE WHEN retry_count >= p_max_retries THEN 'failed' ELSE 'pending' END,
        error_message = SQLERRM,
        scheduled_for = CASE
          WHEN retry_count < p_max_retries THEN now() + interval '5 minutes'
          ELSE scheduled_for
        END
      WHERE id = email_rec.id;

      failed_count := failed_count + 1;
      RAISE LOG '[PROCESSOR] Erreur envoi email % a %: %', email_rec.email_type, email_rec.to_email, SQLERRM;
    END;
  END LOOP;

  RAISE LOG '[PROCESSOR] Termine: % envoyes, % echoues', processed_count, failed_count;

  RETURN jsonb_build_object(
    'processed', processed_count,
    'failed', failed_count,
    'timestamp', now()
  );
END;
$$;

-- Step 3: Rewrite the team notification trigger to use email_queue
CREATE OR REPLACE FUNCTION notify_team_prospect_document_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_name text;
  v_lead_email text;
  v_lead_phone text;
  v_doc_label text;
  v_bucket text;
  v_download_url text;
  v_crm_url text;
  v_email_html text;
  v_assigned_name text;
  v_assigned_email text;
  v_doc_count int;
BEGIN
  -- Get lead info
  SELECT
    COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), email, 'Prospect'),
    email,
    COALESCE(phone, ''),
    (SELECT COALESCE(au.full_name, au.email, 'Non assigné')
     FROM admin_users au WHERE au.id = cl.assigned_to),
    (SELECT au.email FROM admin_users au WHERE au.id = cl.assigned_to)
  INTO v_lead_name, v_lead_email, v_lead_phone, v_assigned_name, v_assigned_email
  FROM crm_leads cl
  WHERE cl.id = NEW.lead_id;

  -- Count total documents for this lead
  SELECT COUNT(*) INTO v_doc_count
  FROM prospect_documents
  WHERE lead_id = NEW.lead_id;

  -- Document label
  v_doc_label := CASE NEW.document_type
    WHEN 'licence_taxi' THEN 'Licence taxi'
    WHEN 'permis_conduire' THEN 'Permis de conduire'
    WHEN 'piece_identite' THEN 'Piece d''identite'
    WHEN 'carte_grise' THEN 'Carte grise'
    WHEN 'releve_information' THEN 'Releve d''information'
    WHEN 'autorisation_stationnement' THEN 'Autorisation de stationnement'
    WHEN 'rib' THEN 'RIB'
    WHEN 'kbis' THEN 'Extrait Kbis'
    WHEN 'devis_signe' THEN 'Devis signe'
    WHEN 'contrat' THEN 'Contrat signe'
    WHEN 'attestation_assurance' THEN 'Attestation assurance'
    WHEN 'questionnaire_agira' THEN 'Questionnaire AGIRA'
    ELSE REPLACE(NEW.document_type, '_', ' ')
  END;

  -- Build download URL
  IF NEW.file_path LIKE '00000000-0000-0000-0000-000000000001/%' THEN
    v_bucket := 'email-attachments';
  ELSE
    v_bucket := 'prospect-documents';
  END IF;

  v_download_url := COALESCE(
    NEW.metadata->>'download_url',
    (SELECT get_system_setting('supabase_url')) || '/storage/v1/object/public/' || v_bucket || '/' || NEW.file_path
  );

  v_crm_url := 'https://taxiassur.com/backoffice/crm-killer/lead/' || NEW.lead_id::text;

  -- Build professional HTML email
  v_email_html :=
    '<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#f9fafb;padding:0">' ||
    -- Header
    '<div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:24px 32px;border-radius:10px 10px 0 0">' ||
      '<h1 style="margin:0;font-size:20px">Nouveau document prospect</h1>' ||
      '<p style="margin:8px 0 0;opacity:0.9;font-size:14px">Un prospect vient de deposer une piece dans son espace</p>' ||
    '</div>' ||
    -- Body
    '<div style="padding:28px 32px;background:#fff;border:1px solid #e5e7eb;border-top:none">' ||
      -- Prospect info
      '<table style="width:100%;border-collapse:collapse;margin-bottom:20px">' ||
        '<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:140px">Prospect</td>' ||
          '<td style="padding:8px 0;font-weight:bold;font-size:14px">' || COALESCE(v_lead_name, '—') || '</td></tr>' ||
        '<tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Email</td>' ||
          '<td style="padding:8px 0;font-size:14px"><a href="mailto:' || COALESCE(v_lead_email, '') || '" style="color:#2563eb;text-decoration:none">' || COALESCE(v_lead_email, '—') || '</a></td></tr>' ||
        CASE WHEN v_lead_phone != '' THEN
          '<tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Telephone</td>' ||
            '<td style="padding:8px 0;font-size:14px"><a href="tel:' || v_lead_phone || '" style="color:#2563eb;text-decoration:none">' || v_lead_phone || '</a></td></tr>'
        ELSE '' END ||
        '<tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Commercial</td>' ||
          '<td style="padding:8px 0;font-size:14px">' || COALESCE(v_assigned_name, 'Non assigne') || '</td></tr>' ||
      '</table>' ||
      -- Document info
      '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin-bottom:20px">' ||
        '<div style="font-weight:bold;color:#92400e;font-size:15px;margin-bottom:4px">' || v_doc_label || '</div>' ||
        '<div style="color:#78350f;font-size:13px">Fichier : ' || COALESCE(NEW.file_name, '—') || '</div>' ||
        '<div style="color:#78350f;font-size:13px;margin-top:4px">Total documents deposés : ' || v_doc_count || '</div>' ||
      '</div>' ||
      -- Action buttons
      '<div style="margin-top:24px">' ||
        '<a href="' || v_crm_url || '" style="display:inline-block;background:#f59e0b;color:#000;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;margin-right:12px">Voir dans le CRM</a>' ||
        '<a href="' || v_download_url || '" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">Telecharger le document</a>' ||
      '</div>' ||
    '</div>' ||
    -- Footer
    '<div style="padding:16px 32px;background:#f3f4f6;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">' ||
      '<p style="margin:0;font-size:12px;color:#6b7280;text-align:center">TaxiAssur — Notification automatique</p>' ||
    '</div>' ||
    '</div>';

  -- Queue email to team
  INSERT INTO email_queue (
    lead_id, email_type, to_email, to_name, subject, body,
    from_email, from_name, priority, status, scheduled_for,
    retry_count, max_retries,
    attachments
  ) VALUES (
    NEW.lead_id,
    'team_prospect_document_upload',
    'team@taxiassur.com',
    'Equipe TaxiAssur',
    '[DOCUMENT] ' || v_doc_label || ' — ' || v_lead_name,
    v_email_html,
    'team@taxiassur.com',
    'TaxiAssur Notifications',
    9,
    'pending',
    now(),
    0,
    3,
    jsonb_build_array(
      jsonb_build_object(
        'filename', COALESCE(NEW.file_name, 'document'),
        'url', v_download_url,
        'contentType', COALESCE(NEW.mime_type, 'application/octet-stream')
      )
    )
  );

  -- Also send to assigned commercial if different from team
  IF v_assigned_email IS NOT NULL AND v_assigned_email != 'team@taxiassur.com' THEN
    INSERT INTO email_queue (
      lead_id, email_type, to_email, to_name, subject, body,
      from_email, from_name, priority, status, scheduled_for,
      retry_count, max_retries,
      attachments
    ) VALUES (
      NEW.lead_id,
      'commercial_prospect_document_upload',
      v_assigned_email,
      v_assigned_name,
      '[DOCUMENT] ' || v_doc_label || ' — ' || v_lead_name,
      v_email_html,
      'team@taxiassur.com',
      'TaxiAssur Notifications',
      9,
      'pending',
      now(),
      0,
      3,
      jsonb_build_array(
        jsonb_build_object(
          'filename', COALESCE(NEW.file_name, 'document'),
          'url', v_download_url,
          'contentType', COALESCE(NEW.mime_type, 'application/octet-stream')
        )
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[NOTIFY_TEAM_DOC] Erreur: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Step 4: Ensure the trigger exists (recreate to be safe)
DROP TRIGGER IF EXISTS trg_notify_team_on_prospect_upload ON prospect_documents;
CREATE TRIGGER trg_notify_team_on_prospect_upload
  AFTER INSERT ON prospect_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_team_prospect_document_upload();
