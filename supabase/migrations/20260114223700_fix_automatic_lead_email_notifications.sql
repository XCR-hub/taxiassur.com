/*
  # Configuration des notifications automatiques par email pour les nouveaux leads
  
  ## Problème
  - Les emails ne sont pas envoyés automatiquement lors de la soumission du formulaire
  - Le trigger existe mais l'extension pg_net n'est pas activée
  - Les paramètres de configuration ne sont pas définis
  
  ## Solution
  1. Activer l'extension pg_net pour les appels HTTP
  2. Simplifier le trigger pour utiliser directement les variables d'environnement Supabase
  3. S'assurer que le trigger est bien actif sur crm_leads
  
  ## Sécurité
  - Utilise SECURITY DEFINER avec search_path sécurisé
  - Gestion des erreurs pour ne pas bloquer l'insertion du lead
*/

-- ================================================================
-- 1. Activer l'extension pg_net si pas déjà fait
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ================================================================
-- 2. Fonction simplifiée pour envoyer les notifications par email
-- ================================================================

CREATE OR REPLACE FUNCTION trigger_send_lead_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id bigint;
  v_supabase_url text;
  v_anon_key text;
  v_full_name text;
BEGIN
  -- Générer access_token si pas défini
  IF NEW.access_token IS NULL OR NEW.access_token = '' THEN
    NEW.access_token := encode(sha256((NEW.id::text || COALESCE(NEW.email, '') || random()::text)::bytea), 'hex');
  END IF;

  -- Construire le nom complet
  v_full_name := COALESCE(NEW.full_name, TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '')));
  IF v_full_name = '' THEN
    v_full_name := 'Prospect';
  END IF;

  -- Récupérer l'URL Supabase depuis les variables d'environnement
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_anon_key := current_setting('app.settings.anon_key', true);

  -- Si les paramètres ne sont pas configurés, utiliser les valeurs par défaut de Supabase
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://zzwqkjpafrsaanfbjigz.supabase.co';
  END IF;

  -- Appeler l'edge function send-lead-notification via pg_net
  BEGIN
    SELECT extensions.http_post(
      url := v_supabase_url || '/functions/v1/send-lead-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_anon_key, current_setting('request.headers', true)::json->>'authorization')
      ),
      body := jsonb_build_object(
        'lead_id', NEW.id::text,
        'name', v_full_name,
        'email', NEW.email,
        'phone', COALESCE(NEW.phone, ''),
        'city', COALESCE(NEW.city, ''),
        'status', COALESCE(NEW.status::text, 'new'),
        'immatriculation', NEW.metadata->>'immatriculation',
        'access_token', NEW.access_token
      )::text
    ) INTO v_request_id;
    
    RAISE NOTICE 'Email notification request sent for lead %, request_id=%', NEW.id, v_request_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Ne pas bloquer l'insertion si l'envoi échoue
    RAISE WARNING 'Failed to send email notification for lead %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- ================================================================
-- 3. Créer le trigger sur crm_leads
-- ================================================================

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trg_send_lead_notification ON crm_leads;
DROP TRIGGER IF EXISTS trg_new_lead_created ON crm_leads;
DROP TRIGGER IF EXISTS on_new_lead_created ON crm_leads;

-- Créer le nouveau trigger (AFTER INSERT pour ne pas bloquer)
CREATE TRIGGER trg_send_lead_notification
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_send_lead_notification();

-- ================================================================
-- 4. Configurer les paramètres Supabase (optionnel mais recommandé)
-- ================================================================

-- Ces paramètres peuvent être définis via l'API Supabase
-- Pour l'instant, la fonction utilisera les valeurs par défaut

COMMENT ON FUNCTION trigger_send_lead_notification() IS 
  'Envoie automatiquement des emails de notification (team + prospect) via IONOS SMTP lors de la création d''un nouveau lead. Utilise l''edge function send-lead-notification.';

COMMENT ON TRIGGER trg_send_lead_notification ON crm_leads IS
  'Déclenche l''envoi automatique d''emails de notification pour chaque nouveau lead créé';
