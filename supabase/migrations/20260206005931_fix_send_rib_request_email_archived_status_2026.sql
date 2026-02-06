/*
  # Fix send_rib_request_email function - remove invalid "archived" status check

  Corrige la fonction send_rib_request_email qui utilise la valeur "archived"
  qui n'existe pas dans l'ENUM lead_status.
  
  Remplace la condition `NEW.status != 'archived'` par une vérification
  que le lead n'est pas perdu.
*/

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
  -- ET que le lead est toujours actif (pas perdu)
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

      -- Récupérer l'URL Supabase et la clé anon depuis system_config
      SELECT 
        config_value->>'supabase_url',
        config_value->>'supabase_anon_key'
      INTO 
        v_supabase_url,
        v_anon_key
      FROM system_config
      WHERE config_key = 'supabase_credentials'
      LIMIT 1;

      -- Valeurs par défaut si non configurées
      IF v_supabase_url IS NULL THEN
        v_supabase_url := current_setting('app.settings.supabase_url', true);
      END IF;

      IF v_anon_key IS NULL THEN
        v_anon_key := current_setting('app.settings.supabase_anon_key', true);
      END IF;

      -- Appeler l'edge function pour envoyer l'email (fire and forget avec timeout 5s)
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

COMMENT ON FUNCTION send_rib_request_email() IS 'Envoie automatiquement un email de demande de RIB quand le lead passe à l''étape Paiement RIB (FIXED: removed invalid archived status)';
