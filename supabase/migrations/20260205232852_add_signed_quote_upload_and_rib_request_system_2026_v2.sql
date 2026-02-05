/*
  # Système d'upload devis signé et demande RIB automatique - 2026

  1. Modifications
    - Ajout du type de document 'devis_signe' (text field, pas d'enum à modifier)
    - Création d'une fonction pour vérifier si un RIB existe
    - Création d'un trigger pour envoyer un email de demande de RIB automatiquement

  2. Logique
    - Quand le lead passe de l'étape 5 (signature_devis) à l'étape 6 (paiement_rib)
    - On vérifie si un document de type 'rib' existe et est validé
    - Si NON : envoi automatique d'un email au prospect pour demander le RIB
    - Si OUI : pas d'email, le RIB est déjà présent

  3. Sécurité
    - Fonction RLS-safe avec SECURITY DEFINER
    - Envoi d'email via edge function send-intelligent-document-request
    - Timeout de 5 secondes pour ne pas bloquer
*/

-- Fonction pour vérifier si un RIB existe et est validé
CREATE OR REPLACE FUNCTION check_rib_exists(p_lead_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rib_count integer;
BEGIN
  -- Compter les documents RIB validés pour ce lead
  SELECT COUNT(*)
  INTO v_rib_count
  FROM crm_lead_documents
  WHERE lead_id = p_lead_id
    AND document_type = 'rib'
    AND is_validated = true
    AND deleted_at IS NULL;

  RETURN v_rib_count > 0;
END;
$$;

-- Fonction pour envoyer un email de demande de RIB
CREATE OR REPLACE FUNCTION send_rib_request_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rib_exists boolean;
  v_lead record;
  v_supabase_url text;
  v_anon_key text;
BEGIN
  -- Vérifier si on passe bien de signature_devis à paiement_rib
  IF OLD.pipeline_stage = 'signature_devis' 
     AND NEW.pipeline_stage = 'paiement_rib' 
     AND NEW.status != 'archived' THEN

    -- Vérifier si un RIB existe déjà
    v_rib_exists := check_rib_exists(NEW.id);

    -- Si le RIB n'existe pas, envoyer un email
    IF NOT v_rib_exists THEN
      
      -- Récupérer les infos du lead
      SELECT 
        id, 
        email, 
        first_name, 
        last_name, 
        access_token
      INTO v_lead
      FROM crm_leads
      WHERE id = NEW.id;

      -- Récupérer l'URL Supabase
      v_supabase_url := current_setting('app.settings.supabase_url', true);
      IF v_supabase_url IS NULL THEN
        v_supabase_url := 'https://kgsivvblaxrvxvpupbjw.supabase.co';
      END IF;

      v_anon_key := current_setting('app.settings.supabase_anon_key', true);
      IF v_anon_key IS NULL THEN
        v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtnc2l2dmJsYXhydnh2cHVwYmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MjE4ODIsImV4cCI6MjA1MDE5Nzg4Mn0.KdnwYAm6P_3TtvgOIXxT6rcS5K-aFVG29I8F0Wlcqzs';
      END IF;

      -- Appel asynchrone à l'edge function pour envoyer l'email
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-intelligent-document-request',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_anon_key
        ),
        body := jsonb_build_object(
          'leadId', v_lead.id,
          'leadEmail', v_lead.email,
          'leadName', COALESCE(v_lead.first_name || ' ' || v_lead.last_name, v_lead.email),
          'documentType', 'rib',
          'accessToken', v_lead.access_token,
          'reason', 'Passage à l''étape 6 : Paiement RIB - RIB manquant'
        ),
        timeout_milliseconds := 5000
      );

      -- Logger l'événement
      INSERT INTO crm_event_notifications (
        lead_id,
        event_type,
        title,
        message,
        priority,
        metadata
      ) VALUES (
        NEW.id,
        'document_request_sent',
        'Demande de RIB envoyée',
        'Un email a été envoyé au prospect pour demander son RIB',
        'medium',
        jsonb_build_object(
          'document_type', 'rib',
          'trigger', 'automatic_stage_change',
          'from_stage', 'signature_devis',
          'to_stage', 'paiement_rib'
        )
      );

    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Créer ou remplacer le trigger
DROP TRIGGER IF EXISTS trigger_send_rib_request_on_stage_change ON crm_leads;

CREATE TRIGGER trigger_send_rib_request_on_stage_change
  AFTER UPDATE OF pipeline_stage ON crm_leads
  FOR EACH ROW
  WHEN (OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage)
  EXECUTE FUNCTION send_rib_request_email();

-- Commentaires
COMMENT ON FUNCTION check_rib_exists IS 'Vérifie si un RIB validé existe pour un lead';
COMMENT ON FUNCTION send_rib_request_email IS 'Envoie automatiquement un email de demande de RIB quand on passe à l''étape paiement_rib si le RIB n''existe pas';
COMMENT ON TRIGGER trigger_send_rib_request_on_stage_change ON crm_leads IS 'Déclenche l''envoi d''email de demande de RIB lors du passage à l''étape 6';
