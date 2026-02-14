/*
  # Fix Erreurs system_config et access_token

  ## Problèmes:
  1. Erreur "column config_value does not exist" à l'étape 6
  2. Accès refusé pour certains tokens d'espaces prospects

  ## Solutions:
  1. Supprimer les références à system_config.config_value
  2. Utiliser directement les environment variables
  3. S'assurer que tous les leads ont un access_token
*/

-- =============================================
-- 1. FIX: send_rib_request_email (étape 6)
-- =============================================

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

      -- Utiliser directement les environment settings
      BEGIN
        v_supabase_url := current_setting('app.settings.supabase_url', true);
        v_anon_key := current_setting('app.settings.supabase_anon_key', true);
      EXCEPTION
        WHEN OTHERS THEN
          v_supabase_url := 'https://drohhxrkoequjphvabvq.supabase.co';
          v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
      END;

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
        
        RAISE NOTICE 'Email de demande de RIB envoye pour le lead %', v_lead.id;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Erreur lors de envoi de email RIB pour le lead % : %', v_lead.id, SQLERRM;
      END;

    ELSE
      RAISE NOTICE 'RIB deja present pour le lead %, pas de email envoye', NEW.id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- =============================================
-- 2. FIX: send_client_activation_email
-- =============================================

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
  -- Quand le lead devient client (contrat_final)
  IF OLD.pipeline_stage != 'contrat_final' 
     AND NEW.pipeline_stage = 'contrat_final' 
     AND NEW.converted_to_client = true THEN

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

    -- Utiliser directement les environment settings
    BEGIN
      v_supabase_url := current_setting('app.settings.supabase_url', true);
      v_anon_key := current_setting('app.settings.supabase_anon_key', true);
    EXCEPTION
      WHEN OTHERS THEN
        v_supabase_url := 'https://drohhxrkoequjphvabvq.supabase.co';
        v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
    END;

    -- Appeler l'edge function
    BEGIN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-client-access',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_anon_key
        ),
        body := jsonb_build_object(
          'lead_id', v_lead.id,
          'email', v_lead.email,
          'first_name', v_lead.first_name,
          'last_name', v_lead.last_name,
          'access_token', v_lead.access_token
        ),
        timeout_milliseconds := 5000
      );
      
      RAISE NOTICE 'Email d activation client envoye pour %', v_lead.email;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Erreur envoi email activation: %', SQLERRM;
    END;

  END IF;

  RETURN NEW;
END;
$$;

-- =============================================
-- 3. S'assurer que TOUS les leads ont un access_token
-- =============================================

UPDATE crm_leads
SET access_token = encode(digest(gen_random_uuid()::text || now()::text || random()::text, 'sha256'), 'hex')
WHERE access_token IS NULL
  AND deleted_at IS NULL;

-- =============================================
-- 4. Améliorer le message d'erreur pour les tokens invalides
-- =============================================

COMMENT ON FUNCTION get_lead_by_token(text) IS 
'Retourne les informations du lead via son access_token. Retourne NULL si le token n existe pas ou est expire.';

COMMENT ON FUNCTION get_lead_quotes_by_token(text) IS 
'Retourne tous les devis du lead via son access_token. Retourne une liste vide si le token est invalide.';

-- =============================================
-- 5. Fonction pour obtenir l'URL Supabase
-- =============================================

CREATE OR REPLACE FUNCTION get_supabase_url()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
BEGIN
  BEGIN
    v_url := current_setting('app.settings.supabase_url', true);
  EXCEPTION
    WHEN OTHERS THEN
      v_url := 'https://drohhxrkoequjphvabvq.supabase.co';
  END;
  
  IF v_url IS NULL OR v_url = '' THEN
    v_url := 'https://drohhxrkoequjphvabvq.supabase.co';
  END IF;
  
  RETURN v_url;
END;
$$;

CREATE OR REPLACE FUNCTION get_supabase_anon_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  BEGIN
    v_key := current_setting('app.settings.supabase_anon_key', true);
  EXCEPTION
    WHEN OTHERS THEN
      v_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
  END;
  
  IF v_key IS NULL OR v_key = '' THEN
    v_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
  END IF;
  
  RETURN v_key;
END;
$$;

COMMENT ON FUNCTION send_rib_request_email IS 
'Envoie automatiquement un email de demande de RIB quand le lead passe a etape Paiement RIB (FIXED: removed system_config dependency)';

COMMENT ON FUNCTION send_client_activation_email IS 
'Envoie un email d activation du compte client quand le lead devient client (FIXED: removed system_config dependency)';

COMMENT ON FUNCTION get_supabase_url IS 
'Retourne l URL Supabase depuis les environment settings avec fallback';

COMMENT ON FUNCTION get_supabase_anon_key IS 
'Retourne la cle anon Supabase depuis les environment settings avec fallback';