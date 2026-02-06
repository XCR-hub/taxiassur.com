/*
  # Système d'envoi automatique d'emails au prospect lors d'upload de documents

  1. Détecte si c'est le commercial ou le prospect qui upload
  2. Envoie automatiquement un email au prospect quand le commercial upload un document
  3. Crée des notifications pour le commercial quand le prospect upload
  
  Types de documents qui déclenchent un email au prospect :
  - contrat
  - devis
  - attestation
  - conditions_generales
  - mandat_prelevement
  - etc.
*/

-- Améliorer la fonction notify_document_upload
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
  v_is_from_commercial boolean;
  v_document_label text;
  v_prospect_url text;
BEGIN
  -- Récupérer les infos du lead
  SELECT 
    email,
    COALESCE(first_name || ' ' || last_name, first_name, email),
    access_token
  INTO 
    v_lead_email,
    v_lead_name,
    v_lead_token
  FROM crm_leads
  WHERE id = NEW.lead_id;

  -- Si pas d'email, on ne peut pas notifier
  IF v_lead_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Détecter si c'est le commercial qui a uploadé
  -- Si uploaded_by est renseigné et commence par un UUID, c'est le commercial
  -- Si c'est vide ou 'prospect', c'est le prospect
  v_is_from_commercial := (
    NEW.uploaded_by IS NOT NULL 
    AND NEW.uploaded_by != 'prospect' 
    AND NEW.uploaded_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

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
      ELSE NEW.document_type
    END
  );

  -- URL de l'espace prospect
  v_prospect_url := 'https://taxiassur.com/espace-prospect?token=' || v_lead_token;

  IF v_is_from_commercial THEN
    -- Le COMMERCIAL a uploadé un document → Notifier le PROSPECT
    INSERT INTO crm_document_notifications (
      lead_id,
      document_id,
      notification_type,
      sent_to,
      sent_via,
      subject,
      body,
      status,
      metadata
    ) VALUES (
      NEW.lead_id,
      NEW.id,
      'commercial_uploaded_document',
      v_lead_email,
      'email',
      'Nouveau document disponible - TaxiAssur',
      format(
        E'Bonjour %s,\n\n' ||
        'Votre conseiller TaxiAssur vient de mettre à disposition un nouveau document : %s\n\n' ||
        'Vous pouvez le consulter et le télécharger dès maintenant sur votre espace personnel :\n%s\n\n' ||
        'Cordialement,\n' ||
        'L''équipe TaxiAssur',
        v_lead_name,
        v_document_label,
        v_prospect_url
      ),
      'pending',
      jsonb_build_object(
        'document_type', NEW.document_type,
        'document_label', v_document_label,
        'file_name', NEW.file_name,
        'prospect_url', v_prospect_url,
        'uploaded_by', 'commercial'
      )
    );
    
  ELSE
    -- Le PROSPECT a uploadé un document → Notifier le COMMERCIAL (notification CRM)
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
      format('%s a uploadé un document : %s', v_lead_name, v_document_label),
      7,
      jsonb_build_object(
        'action_url', '/backoffice/crm-killer/lead/' || NEW.lead_id::text,
        'lead_id', NEW.lead_id::text,
        'document_type', NEW.document_type,
        'document_id', NEW.id::text
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Cron pour envoyer les emails de notification de documents en attente
SELECT cron.schedule(
  'send-document-notification-emails',
  '*/2 * * * *', -- Toutes les 2 minutes
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-document-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'action', 'process_pending'
      ),
      timeout_milliseconds := 15000
    );
  $$
);

COMMENT ON FUNCTION notify_document_upload() IS 'Notifie le prospect par email quand le commercial upload un document, notifie le commercial quand le prospect upload';
