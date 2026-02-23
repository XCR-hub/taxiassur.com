/*
  # FIX URGENT : Réactivation Emails & Accès Espace Prospect - 23 Février 2026

  1. Problèmes Identifiés
    - Plus d'emails envoyés aux nouveaux leads
    - Plus d'emails envoyés à la team
    - Erreur d'accès à l'espace prospect

  2. Actions Correctives
    - Vérification et réactivation des triggers d'emails
    - Vérification des fonctions RPC pour l'espace prospect
    - Réactivation des notifications documents

  3. Sécurité
    - Tous les triggers utilisent SECURITY DEFINER
    - Gestion des erreurs pour ne pas bloquer les insertions
*/

-- 1. RÉACTIVER LE TRIGGER EMAIL NOUVEAU LEAD
DROP TRIGGER IF EXISTS trg_send_lead_email_brevo ON crm_leads;
DROP FUNCTION IF EXISTS send_lead_email_via_brevo() CASCADE;

CREATE OR REPLACE FUNCTION send_lead_email_via_brevo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  supabase_url text := 'https://bpwcakjtwgdtfwghylwv.supabase.co';
  supabase_anon_key text;
BEGIN
  BEGIN
    supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[BREVO] Impossible de récupérer supabase_anon_key';
    RETURN NEW;
  END;

  IF supabase_anon_key IS NULL OR supabase_anon_key = '' THEN
    RAISE LOG '[BREVO] supabase_anon_key non définie';
    RETURN NEW;
  END IF;

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

  BEGIN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-lead-email-brevo',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || supabase_anon_key
      ),
      body := payload,
      timeout_milliseconds := 5000
    );
    RAISE LOG '[BREVO] Email déclenché pour lead %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[BREVO] Erreur envoi email : %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_send_lead_email_brevo
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION send_lead_email_via_brevo();

-- 2. RÉACTIVER LE TRIGGER NOTIFICATION DOCUMENTS
DROP TRIGGER IF EXISTS trg_notify_document_upload ON prospect_documents;
DROP FUNCTION IF EXISTS notify_document_upload() CASCADE;

CREATE OR REPLACE FUNCTION notify_document_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_email text;
  lead_name text;
  supabase_url text := 'https://bpwcakjtwgdtfwghylwv.supabase.co';
  supabase_anon_key text;
BEGIN
  SELECT email, COALESCE(full_name, first_name || ' ' || last_name, 'Prospect')
  INTO lead_email, lead_name
  FROM crm_leads
  WHERE id = NEW.lead_id;

  BEGIN
    supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[DOCUMENTS] Impossible de récupérer supabase_anon_key';
    RETURN NEW;
  END;

  IF supabase_anon_key IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-document-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || supabase_anon_key
      ),
      body := jsonb_build_object(
        'lead_id', NEW.lead_id,
        'lead_name', lead_name,
        'lead_email', lead_email,
        'document_type', NEW.document_type,
        'document_name', NEW.file_name,
        'uploaded_at', NEW.uploaded_at
      ),
      timeout_milliseconds := 5000
    );
    RAISE LOG '[DOCUMENTS] Notification envoyée pour document %', NEW.document_type;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[DOCUMENTS] Erreur notification : %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_document_upload
  AFTER INSERT ON prospect_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_upload();

-- 3. FIX FONCTION get_lead_by_token
DROP FUNCTION IF EXISTS get_lead_by_token(text);

CREATE OR REPLACE FUNCTION get_lead_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'lead', jsonb_build_object(
      'id', l.id,
      'full_name', COALESCE(l.full_name, l.first_name || ' ' || l.last_name),
      'first_name', l.first_name,
      'last_name', l.last_name,
      'email', l.email,
      'phone', l.phone,
      'city', l.city,
      'status', l.status,
      'immatriculation', l.immatriculation,
      'access_token', l.access_token,
      'created_at', l.created_at,
      'pipeline_stage', l.pipeline_stage,
      'current_stage_key', l.pipeline_stage
    ),
    'documents', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pd.id,
          'document_type', pd.document_type,
          'file_name', pd.file_name,
          'file_path', pd.file_path,
          'file_url', pd.file_url,
          'uploaded_at', pd.uploaded_at,
          'validated', COALESCE(pd.validated, false),
          'validation_status', COALESCE(pd.validation_status, 'pending')
        )
      )
      FROM prospect_documents pd
      WHERE pd.lead_id = l.id
    ), '[]'::jsonb),
    'quotes', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', lq.id,
          'insurance_company_id', lq.insurance_company_id,
          'company_name', ic.name,
          'company_logo', ic.logo_url,
          'amount', lq.amount,
          'status', lq.status,
          'created_at', lq.created_at,
          'quote_accepted_at', lq.quote_accepted_at
        )
      )
      FROM lead_company_quotes lq
      LEFT JOIN insurance_companies ic ON ic.id = lq.insurance_company_id
      WHERE lq.lead_id = l.id
      AND lq.status IN ('pending', 'validated', 'accepted')
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM crm_leads l
  WHERE l.access_token = p_token
  AND l.is_archived = false
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Lead non trouvé ou token invalide');
  END IF;

  RETURN v_result;
END;
$$;

-- 4. VÉRIFIER L'EXTENSION pg_net
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
