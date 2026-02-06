/*
  # Création de la fonction corrigée pour traiter les notifications

  Version sans format() pour éviter les erreurs de guillemets
*/

CREATE OR REPLACE FUNCTION process_document_notification_queue()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification record;
  v_lead record;
  v_email_body text;
  v_document_label text;
  v_prospect_url text;
  v_prospect_name text;
  v_processed int := 0;
  v_errors int := 0;
BEGIN
  -- Récupérer les notifications en attente (limite 10 par exécution)
  FOR v_notification IN
    SELECT *
    FROM crm_document_notifications
    WHERE status = 'pending'
      AND sent_to IS NOT NULL
      AND notification_type = 'commercial_uploaded_document'
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    BEGIN
      -- Récupérer les infos du lead
      SELECT * INTO v_lead
      FROM crm_leads
      WHERE id = v_notification.lead_id;

      IF NOT FOUND OR v_lead.email IS NULL THEN
        UPDATE crm_document_notifications
        SET status = 'error',
            error_message = 'Lead non trouvé ou email manquant'
        WHERE id = v_notification.id;
        v_errors := v_errors + 1;
        CONTINUE;
      END IF;

      v_document_label := COALESCE(v_notification.metadata->>'document_label', 'Document');
      v_prospect_name := COALESCE(v_lead.first_name, 'Cher client');
      v_prospect_url := 'https://taxiassur.com/espace-prospect?token=' || v_lead.access_token;

      -- Générer le HTML (construction par concaténation simple)
      v_email_body := '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' ||
        'body{font-family:Arial,sans-serif;line-height:1.6;background:#f3f4f6;padding:20px}' ||
        '.container{max-width:650px;margin:0 auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1)}' ||
        '.header{background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:white;padding:30px;text-align:center}' ||
        '.content{padding:30px}' ||
        '.success-box{background:#dbeafe;border-left:4px solid #3b82f6;padding:20px;margin:20px 0;border-radius:8px}' ||
        '.document-badge{background:#3b82f6;color:white;padding:12px 24px;border-radius:25px;display:inline-block;margin:15px 0;font-size:16px;font-weight:bold}' ||
        '.info-box{background:#eff6ff;padding:20px;border-radius:8px;margin:20px 0;border:2px solid #93c5fd}' ||
        '.cta-button{background:#10b981;color:white;padding:15px 30px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:bold;margin-top:20px}' ||
        '.footer{background:#1f2937;color:white;padding:20px;text-align:center;font-size:12px}' ||
        '.icon{font-size:48px}' ||
        '</style></head><body><div class="container">' ||
        '<div class="header"><div class="icon">📄</div>' ||
        '<h1 style="margin:10px 0 0 0;font-size:28px">NOUVEAU DOCUMENT</h1>' ||
        '<p style="margin:10px 0 0 0;opacity:0.9">TaxiAssur - Mise à disposition de document</p></div>' ||
        '<div class="content"><p style="font-size:16px;color:#1f2937">Bonjour ' || v_prospect_name || ',</p>' ||
        '<div class="success-box"><p style="margin:0;color:#1e40af;font-size:16px">' ||
        '<strong>📥 Nouveau document disponible !</strong><br>' ||
        'Votre conseiller TaxiAssur vient de mettre à votre disposition un nouveau document.</p></div>' ||
        '<h2 style="color:#1f2937;margin-top:25px">Document disponible</h2>' ||
        '<div class="document-badge">📄 ' || v_document_label || '</div>' ||
        '<div class="info-box"><h3 style="color:#2563eb;margin-top:0">📋 Ce document contient :</h3>' ||
        '<ul style="color:#4b5563;line-height:1.8;margin:10px 0">' ||
        '<li>📝 Toutes les informations importantes pour votre dossier</li>' ||
        '<li>🔍 Les détails de votre contrat ou devis</li>' ||
        '<li>✍️ Les éventuelles actions à effectuer de votre côté</li></ul></div>' ||
        '<h3 style="color:#1f2937">💡 Accédez à votre document</h3>' ||
        '<p style="color:#4b5563">Consultez et téléchargez votre document dès maintenant depuis votre espace personnel sécurisé.</p>' ||
        '<div style="text-align:center;margin:30px 0">' ||
        '<a href="' || v_prospect_url || '" class="cta-button">📊 VOIR LE DOCUMENT</a></div>' ||
        '<p style="color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb">' ||
        '💬 <strong>Une question ?</strong> Répondez simplement à cet email ou appelez-nous au <strong>01 80 85 57 86</strong></p></div>' ||
        '<div class="footer"><strong>TaxiAssur</strong><br>L''assurance taxi en toute simplicité<br>' ||
        '<a href="https://taxiassur.com" style="color:#10b981;text-decoration:none">taxiassur.com</a></div>' ||
        '</div></body></html>';

      -- Envoyer l'email
      PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/send-email-ionos',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'to', v_lead.email,
          'toName', COALESCE(v_lead.first_name || ' ' || v_lead.last_name, v_lead.email),
          'subject', '📄 Nouveau document disponible - TaxiAssur',
          'htmlBody', v_email_body,
          'fromEmail', 'team@taxiassur.com',
          'fromName', 'TaxiAssur'
        ),
        timeout_milliseconds := 5000
      );

      UPDATE crm_document_notifications
      SET status = 'sent',
          sent_at = now()
      WHERE id = v_notification.id;

      v_processed := v_processed + 1;

    EXCEPTION WHEN OTHERS THEN
      UPDATE crm_document_notifications
      SET status = 'error',
          error_message = SQLERRM
      WHERE id = v_notification.id;
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed', v_processed,
    'errors', v_errors
  );
END;
$$;

COMMENT ON FUNCTION process_document_notification_queue() IS 'Traite la file d''attente des notifications (commercial_uploaded_document uniquement)';
