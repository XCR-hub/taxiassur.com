/*
  # Restauration Workflow Prospect ↔ CRM - Étape 1: Fonctions
  
  Crée toutes les fonctions nécessaires AVANT les triggers
*/

-- =============================================
-- 1. FONCTION: Notification upload document
-- =============================================

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

  IF v_lead_email IS NULL OR v_lead_token IS NULL THEN
    RETURN NEW;
  END IF;

  -- Détecter si c'est le commercial qui a uploadé
  v_is_from_commercial := (NEW.metadata->>'uploaded_by' = 'commercial');

  -- Si c'est le PROSPECT qui a uploadé → Notification CRM
  IF NOT v_is_from_commercial THEN
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
      v_lead_name || ' a uploadé : ' || NEW.document_type,
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

  -- Le COMMERCIAL a uploadé → Email au PROSPECT

  v_document_label := COALESCE(
    NEW.custom_label,
    CASE NEW.document_type
      WHEN 'contrat' THEN 'Contrat d''assurance'
      WHEN 'devis' THEN 'Devis d''assurance'
      WHEN 'attestation' THEN 'Attestation'
      WHEN 'conditions_generales' THEN 'Conditions générales'
      ELSE NEW.document_type
    END
  );

  v_prospect_url := 'https://taxiassur.com/espace-prospect/' || v_lead_token;

  v_email_html := '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial;background:#f3f4f6;padding:20px">' ||
    '<div style="max-width:650px;margin:0 auto;background:white;border-radius:10px;overflow:hidden">' ||
    '<div style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;padding:30px;text-align:center">' ||
    '<h1 style="margin:0;font-size:28px">📄 NOUVEAU DOCUMENT</h1></div>' ||
    '<div style="padding:30px"><p style="font-size:16px">Bonjour ' || COALESCE(v_lead_first_name, '') || ',</p>' ||
    '<p style="background:#dbeafe;border-left:4px solid #3b82f6;padding:20px;margin:20px 0">' ||
    '<strong>📥 ' || v_document_label || '</strong> est maintenant disponible dans votre espace !</p>' ||
    '<div style="text-align:center;margin:30px 0">' ||
    '<a href="' || v_prospect_url || '" style="background:#10b981;color:white;padding:15px 30px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:bold">📊 VOIR LE DOCUMENT</a></div>' ||
    '<p style="color:#6b7280;font-size:14px">Questions ? Appelez-nous au 01 80 85 57 86</p></div></div></body></html>';

  BEGIN
    PERFORM net.http_post(
      url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-email-ionos',
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
    RAISE WARNING 'Erreur email: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- =============================================
-- 2. FONCTION: Notification validation document
-- =============================================

CREATE OR REPLACE FUNCTION notify_document_validation()
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
  v_document_label text;
  v_prospect_url text;
  v_email_html text;
BEGIN
  -- Seulement si passage à "validated"
  IF NEW.status = 'validated' AND (OLD.status IS NULL OR OLD.status != 'validated') THEN
    
    SELECT email, COALESCE(first_name || ' ' || last_name, email), access_token, first_name
    INTO v_lead_email, v_lead_name, v_lead_token, v_lead_first_name
    FROM crm_leads
    WHERE id = NEW.lead_id;

    IF v_lead_email IS NULL OR v_lead_token IS NULL THEN
      RETURN NEW;
    END IF;

    v_document_label := COALESCE(
      NEW.custom_label,
      CASE NEW.document_type
        WHEN 'licence_taxi' THEN 'Licence de taxi'
        WHEN 'permis_conduire' THEN 'Permis de conduire'
        WHEN 'carte_grise' THEN 'Carte grise'
        WHEN 'piece_identite' THEN 'Pièce d''identité'
        ELSE NEW.document_type
      END
    );

    v_prospect_url := 'https://taxiassur.com/espace-prospect/' || v_lead_token;

    v_email_html := '<!DOCTYPE html><html><body style="font-family:Arial;background:#f3f4f6;padding:20px">' ||
      '<div style="max-width:650px;margin:0 auto;background:white;border-radius:10px;overflow:hidden">' ||
      '<div style="background:linear-gradient(135deg,#10b981,#059669);color:white;padding:30px;text-align:center">' ||
      '<div style="font-size:48px">✅</div><h1>DOCUMENT VALIDÉ</h1></div>' ||
      '<div style="padding:30px"><p>Bonjour ' || COALESCE(v_lead_first_name, '') || ',</p>' ||
      '<div style="background:#d1fae5;border-left:4px solid #10b981;padding:20px;margin:20px 0">' ||
      '<strong>✅ ' || v_document_label || '</strong> a été validé !</div>' ||
      '<p>Votre dossier avance bien. Nous préparons vos devis personnalisés.</p>' ||
      '<div style="text-align:center;margin:30px 0">' ||
      '<a href="' || v_prospect_url || '" style="background:#f59e0b;color:white;padding:15px 30px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:bold">📊 VOIR MON DOSSIER</a></div>' ||
      '</div></div></body></html>';

    BEGIN
      PERFORM net.http_post(
        url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-email-ionos',
        body := jsonb_build_object(
          'to', v_lead_email,
          'toName', v_lead_name,
          'subject', '✅ Document validé - TaxiAssur',
          'htmlBody', v_email_html,
          'fromEmail', 'team@taxiassur.com',
          'fromName', 'TaxiAssur'
        ),
        timeout_milliseconds := 3000
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erreur email validation: %', SQLERRM;
    END;

  END IF;

  RETURN NEW;
END;
$$;

-- =============================================
-- 3. FONCTION: Notification changement statut devis
-- =============================================

CREATE OR REPLACE FUNCTION notify_quote_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_name text;
  v_company_name text;
BEGIN
  -- Accepté ou refusé par le prospect
  IF NEW.status IN ('accepted', 'refused') AND (OLD.status IS NULL OR OLD.status NOT IN ('accepted', 'refused')) THEN
    
    SELECT COALESCE(first_name || ' ' || last_name, email)
    INTO v_lead_name
    FROM crm_leads
    WHERE id = NEW.lead_id;

    SELECT name
    INTO v_company_name
    FROM insurance_companies
    WHERE id = NEW.company_id;

    -- Notification CRM
    INSERT INTO crm_event_notifications (
      lead_id,
      event_type,
      title,
      message,
      priority,
      context_data
    ) VALUES (
      NEW.lead_id,
      CASE WHEN NEW.status = 'accepted' THEN 'quote_accepted' ELSE 'quote_refused' END,
      CASE WHEN NEW.status = 'accepted' THEN '✅ Devis accepté !' ELSE '❌ Devis refusé' END,
      v_lead_name || 
      CASE 
        WHEN NEW.status = 'accepted' THEN ' a accepté le devis ' || COALESCE(v_company_name, '')
        ELSE ' a refusé le devis ' || COALESCE(v_company_name, '') || COALESCE(' : ' || NEW.refusal_reason, '')
      END,
      CASE WHEN NEW.status = 'accepted' THEN 9 ELSE 7 END,
      jsonb_build_object(
        'action_url', '/backoffice/crm-killer/lead/' || NEW.lead_id::text,
        'lead_id', NEW.lead_id::text,
        'quote_id', NEW.id::text,
        'company_id', NEW.company_id::text,
        'company_name', COALESCE(v_company_name, ''),
        'status', NEW.status,
        'refusal_reason', COALESCE(NEW.refusal_reason, '')
      )
    );

  END IF;

  RETURN NEW;
END;
$$;

-- Commentaires
COMMENT ON FUNCTION notify_document_upload() IS 'Prospect upload → notif CRM | Commercial upload → email prospect';
COMMENT ON FUNCTION notify_document_validation() IS 'Commercial valide document → email prospect';
COMMENT ON FUNCTION notify_quote_status_change() IS 'Prospect accepte/refuse devis → notif CRM';