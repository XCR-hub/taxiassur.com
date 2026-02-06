/*
  # Fix send_client_activation_email function - remove invalid "archived" status check

  Corrige la fonction send_client_activation_email qui utilise la valeur "archived"
  qui n'existe pas dans l'ENUM lead_status.
  
  Remplace la condition `NEW.status != 'archived'` par une vérification
  que le lead n'est pas perdu.
*/

CREATE OR REPLACE FUNCTION send_client_activation_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_supabase_url text;
  v_anon_key text;
BEGIN
  -- Vérifier si on passe à client_actif
  -- ET que le lead est toujours actif (pas perdu)
  IF NEW.pipeline_stage = 'client_actif' 
     AND OLD.pipeline_stage != 'client_actif' 
     AND NEW.status NOT IN ('PERDU', 'CLIENT_LOST') THEN

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

    -- Vérifier que le lead a bien un email et un access_token
    IF v_lead.email IS NOT NULL AND v_lead.access_token IS NOT NULL THEN

      -- Récupérer l'URL Supabase
      v_supabase_url := current_setting('app.settings.supabase_url', true);
      IF v_supabase_url IS NULL THEN
        v_supabase_url := 'https://kgsivvblaxrvxvpupbjw.supabase.co';
      END IF;

      v_anon_key := current_setting('app.settings.supabase_anon_key', true);
      IF v_anon_key IS NULL THEN
        v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtnc2l2dmJsYXhydnh2cHVwYmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MjE4ODIsImV4cCI6MjA1MDE5Nzg4Mn0.KdnwYAm6P_3TtvgOIXxT6rcS5K-aFVG29I8F0Wlcqzs';
      END IF;

      -- Appel asynchrone à l'edge function
      BEGIN
        PERFORM net.http_post(
          url := v_supabase_url || '/functions/v1/send-client-welcome-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key
          ),
          body := jsonb_build_object(
            'leadId', v_lead.id,
            'leadEmail', v_lead.email,
            'leadFirstName', COALESCE(v_lead.first_name, 'Cher client'),
            'accessToken', v_lead.access_token
          ),
          timeout_milliseconds := 10000
        );

        -- Logger l'événement avec priority INTEGER
        INSERT INTO crm_event_notifications (
          lead_id,
          event_type,
          title,
          message,
          priority,
          metadata
        ) VALUES (
          NEW.id,
          'client_activated',
          '🎉 Client activé avec succès',
          'Le prospect est maintenant un client actif. Email de bienvenue envoyé avec tous les documents.',
          10, -- high = 10
          jsonb_build_object(
            'trigger', 'automatic_activation',
            'email', v_lead.email,
            'client_name', COALESCE(v_lead.first_name || ' ' || v_lead.last_name, v_lead.email),
            'activation_date', NOW()
          )
        );
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Erreur lors de l''envoi de l''email client actif pour le lead % : %', v_lead.id, SQLERRM;
      END;

    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION send_client_activation_email() IS 'Envoie automatiquement un email de bienvenue quand le lead devient client actif (FIXED: removed invalid archived status)';
