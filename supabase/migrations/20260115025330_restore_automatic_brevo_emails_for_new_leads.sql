/*
  # RESTORATION SYSTÈME EMAIL AUTOMATIQUE

  ## Objectif
  Restaurer le système d'emails automatiques avec :
  1. **BREVO** : Pour les nouveaux leads (formulaire) - emails team + prospect
  2. **IONOS** : Pour les communications commerciales (via send-crm-email)

  ## Fonctionnement
  - Nouveau lead inséré → Trigger → Edge function send-lead-email-brevo (Brevo API)
  - Emails commerciaux → Frontend appelle send-crm-email (IONOS SMTP)

  ## Emails automatiques Brevo (nouveaux leads)
  1. team@taxiassur.com : Notification interne "NOUVEAU LEAD"
  2. Prospect : Email de bienvenue avec lien espace personnel + liste des 7 documents
*/

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trg_send_lead_email_brevo ON crm_leads;
DROP FUNCTION IF EXISTS send_lead_email_via_brevo();

-- Fonction qui appelle automatiquement l'edge function Brevo
CREATE OR REPLACE FUNCTION send_lead_email_via_brevo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  supabase_url text;
  supabase_anon_key text;
BEGIN
  -- Récupérer les variables d'environnement
  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Si les variables ne sont pas définies, utiliser les valeurs par défaut
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://bpwcakjtwgdtfwghylwv.supabase.co';
  END IF;

  IF supabase_anon_key IS NULL OR supabase_anon_key = '' THEN
    RAISE LOG 'ATTENTION: supabase_anon_key non définie, les emails ne seront pas envoyés';
    RETURN NEW;
  END IF;

  -- Construire le payload pour l'edge function
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

  -- Appeler l'edge function send-lead-email-brevo via HTTP (asynchrone)
  BEGIN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-lead-email-brevo',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || supabase_anon_key
      ),
      body := payload
    );

    RAISE LOG '[BREVO] Email automatique déclenché pour lead % (%)', NEW.id, NEW.email;
  EXCEPTION WHEN OTHERS THEN
    -- En cas d'erreur, on log mais on ne bloque pas l'insertion du lead
    RAISE LOG '[BREVO] Erreur envoi email pour lead % : %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Créer le trigger APRÈS l'insertion d'un nouveau lead
CREATE TRIGGER trg_send_lead_email_brevo
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION send_lead_email_via_brevo();

-- Ajouter des commentaires explicatifs
COMMENT ON FUNCTION send_lead_email_via_brevo() IS
'Trigger automatique : appelle send-lead-email-brevo (Brevo API) pour envoyer les emails team + prospect lors d un nouveau lead';

COMMENT ON TRIGGER trg_send_lead_email_brevo ON crm_leads IS
'Déclenche automatiquement l envoi d emails via Brevo (team@taxiassur.com + prospect) à chaque nouveau lead';

-- Configuration des variables d'environnement
-- Ces valeurs sont automatiquement disponibles dans l'environnement Supabase
DO $$
BEGIN
  -- Essayer de définir les settings s'ils ne sont pas déjà définis
  BEGIN
    PERFORM set_config('app.settings.supabase_url',
      COALESCE(current_setting('SUPABASE_URL', true), 'https://bpwcakjtwgdtfwghylwv.supabase.co'),
      false);
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Config supabase_url déjà définie ou non disponible';
  END;

  BEGIN
    PERFORM set_config('app.settings.supabase_anon_key',
      current_setting('SUPABASE_ANON_KEY', true),
      false);
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Config supabase_anon_key déjà définie ou non disponible';
  END;
END $$;

-- Vérifier que l'extension pg_net est activée pour les appels HTTP asynchrones
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ SYSTÈME EMAIL AUTOMATIQUE RESTAURÉ';
  RAISE NOTICE '📧 Nouveaux leads : Brevo (send-lead-email-brevo)';
  RAISE NOTICE '📨 Emails commerciaux : IONOS (send-crm-email)';
END $$;