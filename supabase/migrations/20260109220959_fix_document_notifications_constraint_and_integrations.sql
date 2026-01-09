/*
  # Fix système documents + historique + signature électronique
  
  1. Corrections
    - Correction contrainte status sur crm_document_notifications
    - Trigger pour alimenter crm_interactions automatiquement
    - Ajout colonnes manquantes
    
  2. Sécurité
    - Maintien des politiques RLS existantes
*/

-- 1. CORRIGER LE CONSTRAINT SUR crm_document_notifications
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'crm_document_notifications_status_check'
  ) THEN
    ALTER TABLE crm_document_notifications 
    DROP CONSTRAINT crm_document_notifications_status_check;
  END IF;
  
  -- Recréer avec tous les statuts possibles
  ALTER TABLE crm_document_notifications 
  ADD CONSTRAINT crm_document_notifications_status_check 
  CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'failed', 'pending', 'error', 'bounced'));
END $$;

-- 2. TRIGGER pour alimenter crm_interactions automatiquement
CREATE OR REPLACE FUNCTION log_interaction_from_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Créer une entrée dans crm_interactions pour l'historique
  INSERT INTO crm_interactions (
    lead_id,
    type,
    direction,
    channel,
    subject,
    content,
    status,
    metadata
  ) VALUES (
    NEW.lead_id,
    'notification',
    'outbound',
    NEW.sent_via,
    NEW.subject,
    NEW.body,
    NEW.status,
    jsonb_build_object(
      'notification_id', NEW.id,
      'notification_type', NEW.notification_type,
      'sent_to', NEW.sent_to
    )
  );
  
  RETURN NEW;
END;
$$;

-- Créer le trigger s'il n'existe pas
DROP TRIGGER IF EXISTS trigger_log_document_notification ON crm_document_notifications;
CREATE TRIGGER trigger_log_document_notification
  AFTER INSERT ON crm_document_notifications
  FOR EACH ROW
  EXECUTE FUNCTION log_interaction_from_document();

-- 3. TRIGGER pour alimenter crm_interactions depuis les emails envoyés
CREATE OR REPLACE FUNCTION log_interaction_from_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Créer une entrée dans crm_interactions
  IF NEW.lead_id IS NOT NULL THEN
    INSERT INTO crm_interactions (
      lead_id,
      type,
      direction,
      channel,
      subject,
      content,
      status,
      metadata
    ) VALUES (
      NEW.lead_id,
      'email',
      'outbound',
      'email',
      NEW.subject,
      COALESCE(NEW.body_text, NEW.body_html, ''),
      NEW.status,
      jsonb_build_object(
        'email_send_id', NEW.id,
        'to', NEW.email_to,
        'from', NEW.email_from
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger s'il n'existe pas
DROP TRIGGER IF EXISTS trigger_log_email_send ON email_sends;
CREATE TRIGGER trigger_log_email_send
  AFTER INSERT ON email_sends
  FOR EACH ROW
  EXECUTE FUNCTION log_interaction_from_email();

-- 4. TRIGGER pour alimenter crm_interactions depuis les emails REÇUS
CREATE OR REPLACE FUNCTION log_interaction_from_email_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Créer une entrée dans crm_interactions
  IF NEW.lead_id IS NOT NULL THEN
    INSERT INTO crm_interactions (
      lead_id,
      type,
      direction,
      channel,
      subject,
      content,
      status,
      metadata
    ) VALUES (
      NEW.lead_id,
      'email',
      'inbound',
      'email',
      NEW.subject,
      NEW.body,
      CASE WHEN NEW.is_processed THEN 'read' ELSE 'unread' END,
      jsonb_build_object(
        'email_reply_id', NEW.id,
        'from', NEW.from_email,
        'from_name', NEW.from_name,
        'sentiment', NEW.sentiment
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger s'il n'existe pas
DROP TRIGGER IF EXISTS trigger_log_email_reply ON email_replies;
CREATE TRIGGER trigger_log_email_reply
  AFTER INSERT ON email_replies
  FOR EACH ROW
  EXECUTE FUNCTION log_interaction_from_email_reply();

-- 5. S'assurer que crm_interactions a les bonnes colonnes
DO $$
BEGIN
  -- Ajouter colonne content si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_interactions' AND column_name = 'content'
  ) THEN
    ALTER TABLE crm_interactions ADD COLUMN content text;
  END IF;
  
  -- Ajouter colonne subject si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_interactions' AND column_name = 'subject'
  ) THEN
    ALTER TABLE crm_interactions ADD COLUMN subject text;
  END IF;
  
  -- Ajouter colonne status si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_interactions' AND column_name = 'status'
  ) THEN
    ALTER TABLE crm_interactions ADD COLUMN status text DEFAULT 'sent';
  END IF;
END $$;