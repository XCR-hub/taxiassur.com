/*
  # Fix URGENT: Erreur config_value étape 5→6

  ## Problème
  La fonction send_rib_request_email() utilise encore l'ancienne version qui référence 
  system_config.config_value qui n'existe pas.

  ## Solution
  Recréer la fonction avec la version corrigée qui utilise current_setting() 
  avec fallback hardcodé.
*/

-- =============================================
-- RECREER: send_rib_request_email() CORRIGEE
-- =============================================

DROP TRIGGER IF EXISTS trigger_send_rib_request_email ON crm_leads;
DROP FUNCTION IF EXISTS send_rib_request_email() CASCADE;

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
     AND NEW.status NOT IN ('PERDU', 'CLIENT_LOST') THEN

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

      -- Utiliser directement les environment settings avec fallback
      BEGIN
        v_supabase_url := current_setting('app.settings.supabase_url', true);
        v_anon_key := current_setting('app.settings.supabase_anon_key', true);
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END;

      -- Fallback si pas de config
      IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
        v_supabase_url := 'https://drohhxrkoequjphvabvq.supabase.co';
      END IF;

      IF v_anon_key IS NULL OR v_anon_key = '' THEN
        v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
      END IF;

      -- Appeler l'edge function pour envoyer l'email
      BEGIN
        PERFORM net.http_post(
          url := v_supabase_url || '/functions/v1/send-intelligent-document-request',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key
          ),
          body := jsonb_build_object(
            'lead_id', v_lead.id,
            'email', v_lead.email,
            'first_name', v_lead.first_name,
            'last_name', v_lead.last_name,
            'document_type', 'rib',
            'access_token', v_lead.access_token
          ),
          timeout_milliseconds := 5000
        );
        
        RAISE NOTICE 'Email de demande de RIB envoyé pour le lead %', v_lead.id;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Erreur lors de l''envoi de l''email RIB pour le lead % : %', v_lead.id, SQLERRM;
      END;

    ELSE
      RAISE NOTICE 'RIB déjà présent pour le lead %, pas d''email envoyé', NEW.id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- Recréer le trigger
CREATE TRIGGER trigger_send_rib_request_email
  AFTER UPDATE OF pipeline_stage ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION send_rib_request_email();

COMMENT ON FUNCTION send_rib_request_email IS 
'Envoie automatiquement un email de demande de RIB quand le lead passe à l''étape Paiement RIB (FIXED: removed system_config.config_value dependency)';
