/*
  # Correction du trigger de détection d'upload commercial

  Le problème : uploaded_by est NULL quand le commercial upload, pas un UUID
  Solution : Si uploaded_by != 'prospect', c'est le commercial
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

  -- CORRECTION : Détecter si c'est le commercial qui a uploadé
  -- Si uploaded_by est NULL ou différent de 'prospect', c'est le COMMERCIAL
  -- Si uploaded_by = 'prospect', c'est le PROSPECT
  v_is_from_commercial := (
    NEW.uploaded_by IS NULL 
    OR NEW.uploaded_by != 'prospect'
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
      WHEN 'licence_taxi' THEN 'Licence de taxi'
      WHEN 'piece_identite' THEN 'Pièce d''identité'
      WHEN 'releve_information' THEN 'Relevé d''information'
      WHEN 'autorisation_stationnement' THEN 'Autorisation de stationnement'
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
      'commercial_uploaded_document', -- Type correct
      v_lead_email,
      'email',
      format('📄 Nouveau document disponible - TaxiAssur'),
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

COMMENT ON FUNCTION notify_document_upload() IS 'Notifie le prospect par email quand le commercial upload un document (uploaded_by IS NULL ou != prospect)';
