/*
  # Trigger pour les uploads de documents

  1. Fonction de notification
    - Appelle l'Edge Function send-document-notification
    - Crée une notification dans admin_notifications
    - Timeout de 30 secondes pour l'email
    - Gestion d'erreur pour ne pas bloquer l'insertion

  2. Trigger
    - Se déclenche AFTER INSERT sur prospect_documents
    - Appel asynchrone
*/

-- Fonction qui gère l'upload de documents
CREATE OR REPLACE FUNCTION handle_document_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
  supabase_url text := 'https://drohhxrkoequjphvabvq.supabase.co';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';
  lead_name text;
  document_type_name text;
BEGIN
  -- Récupérer le nom du lead
  SELECT name INTO lead_name
  FROM leads
  WHERE id = NEW.lead_id;

  -- Traduction du type de document
  document_type_name := CASE NEW.document_type
    WHEN 'licence' THEN 'Licence de taxi'
    WHEN 'permis' THEN 'Permis de conduire'
    WHEN 'identite' THEN 'Pièce d''identité'
    WHEN 'carte_grise' THEN 'Carte grise'
    WHEN 'releve_info' THEN 'Relevé d''information'
    WHEN 'parking_authorization' THEN 'Autorisation de stationnement'
    WHEN 'rib' THEN 'RIB'
    ELSE NEW.document_type
  END;

  -- Créer une notification dans la base
  INSERT INTO admin_notifications (
    type,
    title,
    message,
    lead_id,
    document_id,
    metadata
  ) VALUES (
    'document_uploaded',
    'Nouveau document reçu',
    format('%s a uploadé : %s', COALESCE(lead_name, 'Un prospect'), document_type_name),
    NEW.lead_id,
    NEW.id,
    jsonb_build_object(
      'document_type', NEW.document_type,
      'file_name', NEW.file_name,
      'file_size', NEW.file_size
    )
  );

  -- Appel HTTP asynchrone pour envoyer l'email
  BEGIN
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/send-document-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'prospect_documents',
        'record', to_jsonb(NEW)
      ),
      timeout_milliseconds := 30000
    ) INTO request_id;

    RAISE NOTICE 'Document notification sent for document %: request_id=%', NEW.id, request_id;
  EXCEPTION WHEN OTHERS THEN
    -- En cas d'erreur email, on log mais on continue
    RAISE WARNING 'Error sending document email for document %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- En cas d'erreur, on log mais on ne bloque pas l'insertion
  RAISE WARNING 'Error in document upload handler for document %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_document_upload ON prospect_documents;

CREATE TRIGGER trigger_document_upload
  AFTER INSERT ON prospect_documents
  FOR EACH ROW
  EXECUTE FUNCTION handle_document_upload();