/*
  # Envoi direct d'email lors de l'upload de document

  Simplifie le système : le trigger envoie l'email IMMÉDIATEMENT
  au lieu de passer par une queue complexe
*/

CREATE OR REPLACE FUNCTION notify_document_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_email text;
  v_lead_name text;
  v_lead_token text;
  v_lead_first_name text;
  v_is_from_commercial boolean;
  v_document_label text;
  v_prospect_url text;
  v_email_html text;
BEGIN
  -- Récupérer les infos du lead
  SELECT 
    email,
    COALESCE(first_name || ' ' || last_name, first_name, email),
    access_token,
    first_name
  INTO 
    v_lead_email,
    v_lead_name,
    v_lead_token,
    v_lead_first_name
  FROM crm_leads
  WHERE id = NEW.lead_id;

  -- Si pas d'email, on ne peut pas notifier
  IF v_lead_email IS NULL OR v_lead_token IS NULL THEN
    RETURN NEW;
  END IF;

  -- Détecter si c'est le commercial qui a uploadé
  v_is_from_commercial := (NEW.uploaded_by IS NULL OR NEW.uploaded_by != 'prospect');

  -- Seulement traiter si c'est le COMMERCIAL qui a uploadé
  IF NOT v_is_from_commercial THEN
    -- Si c'est le prospect, créer une notification CRM pour le commercial
    INSERT INTO crm_event_notifications (
      lead_id,
      event_type,
      title,
      message,
      priority,
      context_data
    ) VALUES (
      NEW.lead_id,
      'document_uploaded',
      '📄 Nouveau document reçu',
      v_lead_name || ' a uploadé un document',
      7,
      jsonb_build_object(
        'action_url', '/backoffice/crm-killer/lead/' || NEW.lead_id::text,
        'lead_id', NEW.lead_id::text,
        'document_type', NEW.document_type,
        'document_id', NEW.id::text
      )
    );
    RETURN NEW;
  END IF;

  -- Le COMMERCIAL a uploadé → Envoyer email direct au PROSPECT

  -- Label du document
  v_document_label := COALESCE(
    NEW.custom_label,
    CASE NEW.document_type
      WHEN 'contrat' THEN 'Contrat d''assurance'
      WHEN 'devis' THEN 'Devis'
      WHEN 'devis_signe' THEN 'Devis signé'
      WHEN 'attestation' THEN 'Attestation d''assurance'
      WHEN 'conditions_generales' THEN 'Conditions générales'
      WHEN 'mandat_prelevement' THEN 'Mandat de prélèvement'
      WHEN 'rib' THEN 'RIB'
      WHEN 'carte_grise' THEN 'Carte grise'
      WHEN 'permis_conduire' THEN 'Permis de conduire'
      WHEN 'kbis' THEN 'Extrait Kbis'
      WHEN 'carte_pro' THEN 'Carte professionnelle'
      WHEN 'licence_taxi' THEN 'Licence de taxi'
      WHEN 'piece_identite' THEN 'Pièce d''identité'
      WHEN 'releve_information' THEN 'Relevé d''information'
      WHEN 'autorisation_stationnement' THEN 'Autorisation de stationnement'
      ELSE NEW.document_type
    END
  );

  v_prospect_url := 'https://taxiassur.com/espace-prospect?token=' || v_lead_token;

  -- Construire l'email HTML
  v_email_html := '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' ||
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
    '<div class="content"><p style="font-size:16px;color:#1f2937">Bonjour ' || COALESCE(v_lead_first_name, 'cher client') || ',</p>' ||
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

  -- Envoyer l'email IMMÉDIATEMENT via l'edge function
  BEGIN
    PERFORM net.http_post(
      url := 'https://xpmvtmtlscqelxhwuqcc.supabase.co/functions/v1/send-email-ionos',
      body := jsonb_build_object(
        'to', v_lead_email,
        'toName', v_lead_name,
        'subject', '📄 Nouveau document disponible - TaxiAssur',
        'htmlBody', v_email_html,
        'fromEmail', 'team@taxiassur.com',
        'fromName', 'TaxiAssur'
      ),
      timeout_milliseconds := 3000
    );
  EXCEPTION WHEN OTHERS THEN
    -- Si l'envoi échoue, on log mais on ne bloque pas l'insertion
    RAISE WARNING 'Erreur envoi email document: %', SQLERRM;
  END;

  -- Logger dans les notifications pour historique
  INSERT INTO crm_document_notifications (
    lead_id,
    document_id,
    notification_type,
    sent_to,
    sent_via,
    subject,
    body,
    status,
    sent_at,
    metadata
  ) VALUES (
    NEW.lead_id,
    NEW.id,
    'commercial_uploaded_document',
    v_lead_email,
    'email',
    '📄 Nouveau document disponible - TaxiAssur',
    'Email HTML envoyé',
    'sent',
    now(),
    jsonb_build_object(
      'document_type', NEW.document_type,
      'document_label', v_document_label,
      'file_name', NEW.file_name,
      'prospect_url', v_prospect_url
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION notify_document_upload() IS 'Envoie IMMÉDIATEMENT un email au prospect quand le commercial upload un document (sans queue)';
