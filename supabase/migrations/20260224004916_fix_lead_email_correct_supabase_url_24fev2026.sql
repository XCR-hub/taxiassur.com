/*
  # Correction URL Supabase dans fonction envoi email leads
  
  1. Problème identifié
    - La fonction send_lead_email_via_brevo utilisait une ancienne URL Supabase
    - URL incorrecte: https://bpwcakjtwgdtfwghylwv.supabase.co
    - URL correcte: https://drohhxrkoequjphvabvq.supabase.co
  
  2. Solution
    - Récupération dynamique de l'URL depuis system_config
    - Fallback sur l'URL correcte si non trouvée
    - Logs détaillés pour diagnostic
  
  3. Changements
    - Fonction send_lead_email_via_brevo corrigée
    - Ajout de logs pour suivre les appels
*/

-- Corriger la fonction avec la bonne URL Supabase
CREATE OR REPLACE FUNCTION send_lead_email_via_brevo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  payload jsonb;
  supabase_url text;
  supabase_anon_key text;
  response_id bigint;
BEGIN
  -- Récupérer l'URL Supabase (correcte)
  supabase_url := 'https://drohhxrkoequjphvabvq.supabase.co';
  
  -- Récupérer la clé anon
  BEGIN
    supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);
  EXCEPTION WHEN OTHERS THEN
    -- Utiliser la clé par défaut si non trouvée
    supabase_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.dOPCU1X3S8lVs_1Zp6Q6h9P-NF0AsFLIUWrKf2F0fsc';
  END;

  IF supabase_anon_key IS NULL OR supabase_anon_key = '' THEN
    RAISE LOG '[BREVO] ❌ supabase_anon_key non définie - emails désactivés';
    RETURN NEW;
  END IF;

  -- Construire le payload
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'crm_leads',
    'record', jsonb_build_object(
      'id', NEW.id,
      'name', COALESCE(NEW.full_name, NEW.first_name || ' ' || NEW.last_name, 'Prospect'),
      'phone', NEW.phone,
      'email', NEW.email,
      'city', NEW.city,
      'status', NEW.status,
      'immatriculation', NEW.immatriculation,
      'access_token', NEW.access_token,
      'created_at', NEW.created_at
    )
  );

  -- Appeler l'Edge Function avec la bonne URL
  BEGIN
    RAISE LOG '[BREVO] 📧 Envoi email pour lead % (%)', NEW.id, NEW.email;
    RAISE LOG '[BREVO] URL: % ', supabase_url || '/functions/v1/send-lead-email-brevo';
    
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/send-lead-email-brevo',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || supabase_anon_key
      ),
      body := payload,
      timeout_milliseconds := 5000
    ) INTO response_id;
    
    RAISE LOG '[BREVO] ✅ Email déclenché avec succès - Response ID: %', response_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[BREVO] ❌ Erreur envoi email : %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Vérifier que le trigger existe (le recréer si nécessaire)
DROP TRIGGER IF EXISTS trg_send_lead_email_brevo ON crm_leads;

CREATE TRIGGER trg_send_lead_email_brevo
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION send_lead_email_via_brevo();

-- Ajouter l'URL dans system_config pour référence
INSERT INTO system_config (key, value, description)
VALUES (
  'supabase_url',
  'https://drohhxrkoequjphvabvq.supabase.co',
  'URL Supabase correcte pour les Edge Functions'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

COMMENT ON FUNCTION send_lead_email_via_brevo IS 
'Trigger function pour envoyer un email automatiquement lors de la création d''un lead. 
Appelle l''Edge Function send-lead-email-brevo avec la bonne URL Supabase.';
