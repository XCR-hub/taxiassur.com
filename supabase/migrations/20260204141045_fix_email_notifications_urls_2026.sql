/*
  # Correction des URLs pour les notifications email - 2026-02-04
  
  1. Corrections
    - Mise à jour de l'URL Supabase dans send_lead_email_via_brevo()
    - Correction de la valeur par défaut (ancienne URL obsolète)
    - Ajout de logs pour faciliter le débogage
  
  2. Impact
    - Les emails aux nouveaux leads seront envoyés correctement
    - Les notifications admin fonctionneront
*/

-- Corriger la fonction send_lead_email_via_brevo avec la bonne URL
CREATE OR REPLACE FUNCTION send_lead_email_via_brevo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payload jsonb;
  supabase_url text;
  supabase_anon_key text;
  http_response record;
BEGIN
  -- Récupérer les variables d'environnement
  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Si les variables ne sont pas définies, utiliser les valeurs par défaut CORRECTES
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://drohhxrkoequjphvabvq.supabase.co';
  END IF;

  IF supabase_anon_key IS NULL OR supabase_anon_key = '' THEN
    supabase_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
  END IF;

  -- Construire le payload pour l'edge function
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'crm_leads',
    'record', jsonb_build_object(
      'id', NEW.id,
      'name', COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.email),
      'phone', NEW.phone,
      'email', NEW.email,
      'city', NEW.city,
      'status', NEW.status,
      'immatriculation', NEW.immatriculation,
      'access_token', NEW.access_token,
      'created_at', NEW.created_at
    )
  );

  -- Appeler l'edge function send-lead-email-brevo via HTTP (asynchrone)
  BEGIN
    SELECT * INTO http_response FROM net.http_post(
      url := supabase_url || '/functions/v1/send-lead-email-brevo',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || supabase_anon_key
      ),
      body := payload
    );

    RAISE LOG '[BREVO-EMAIL] ✅ Email déclenché pour lead % (%) - HTTP Status: %', 
      NEW.id, NEW.email, http_response.status;
      
  EXCEPTION WHEN OTHERS THEN
    -- En cas d'erreur, on log mais on ne bloque pas l'insertion du lead
    RAISE LOG '[BREVO-EMAIL] ❌ Erreur envoi email pour lead % : %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Fonction pour envoyer les emails admin via edge function
CREATE OR REPLACE FUNCTION send_admin_notification_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payload jsonb;
  supabase_url text := 'https://drohhxrkoequjphvabvq.supabase.co';
  supabase_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
  lead_info record;
BEGIN
  -- Récupérer les infos du lead
  SELECT * INTO lead_info FROM crm_leads WHERE id = NEW.lead_id;
  
  IF lead_info IS NULL THEN
    RETURN NEW;
  END IF;

  -- Construire le payload
  payload := jsonb_build_object(
    'event_type', NEW.event_type,
    'lead', jsonb_build_object(
      'id', lead_info.id,
      'name', COALESCE(lead_info.first_name || ' ' || lead_info.last_name, lead_info.email),
      'email', lead_info.email,
      'phone', lead_info.phone,
      'city', lead_info.city,
      'status', lead_info.status
    ),
    'message', NEW.message,
    'context', NEW.context_data
  );

  -- Appeler l'edge function pour l'email admin
  BEGIN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-email-notification-alert',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || supabase_anon_key
      ),
      body := payload
    );

    RAISE LOG '[ADMIN-EMAIL] ✅ Notification admin envoyée pour lead %', lead_info.id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[ADMIN-EMAIL] ❌ Erreur notification admin : %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Créer le trigger pour les notifications admin
DROP TRIGGER IF EXISTS trigger_send_admin_email ON crm_event_notifications;
CREATE TRIGGER trigger_send_admin_email
  AFTER INSERT ON crm_event_notifications
  FOR EACH ROW
  WHEN (NEW.event_type IN ('new_lead', 'document_uploaded'))
  EXECUTE FUNCTION send_admin_notification_email();

-- Vérifier que le trigger send_lead_email_brevo existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_send_lead_email_brevo'
  ) THEN
    CREATE TRIGGER trg_send_lead_email_brevo
      AFTER INSERT ON crm_leads
      FOR EACH ROW
      EXECUTE FUNCTION send_lead_email_via_brevo();
  END IF;
END $$;

-- Log de confirmation
DO $$
BEGIN
  RAISE LOG '[EMAIL-SETUP] ✅ Système de notification email configuré avec succès';
END $$;
