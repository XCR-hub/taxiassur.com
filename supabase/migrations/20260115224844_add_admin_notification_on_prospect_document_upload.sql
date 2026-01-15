/*
  # Add admin notification on prospect document upload
  
  1. New Functions
    - `notify_admin_prospect_document_upload()` - Creates admin notification when prospect uploads document
  
  2. Changes
    - Add trigger on `prospect_documents` to notify admin
  
  3. Security
    - Function with SECURITY DEFINER to allow notification creation
*/

-- Create function to notify admin when prospect uploads document
CREATE OR REPLACE FUNCTION notify_admin_prospect_document_upload()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_name text;
  v_lead_email text;
  v_doc_label text;
BEGIN
  -- Get lead information
  SELECT 
    COALESCE(first_name || ' ' || last_name, email) as full_name,
    email
  INTO v_lead_name, v_lead_email
  FROM crm_leads
  WHERE id = NEW.lead_id;
  
  -- Get document label
  v_doc_label := CASE NEW.document_type
    WHEN 'licence_taxi' THEN 'Licence de taxi professionnelle'
    WHEN 'permis_conduire' THEN 'Permis de conduire'
    WHEN 'piece_identite' THEN 'Pièce d''identité'
    WHEN 'carte_grise' THEN 'Carte grise du véhicule'
    WHEN 'releve_information' THEN 'Relevé d''information'
    WHEN 'autorisation_stationnement' THEN 'Autorisation de stationnement'
    WHEN 'rib' THEN 'RIB - Relevé d''Identité Bancaire'
    ELSE NEW.document_type
  END;
  
  -- Insert admin notification in crm_event_notifications
  INSERT INTO crm_event_notifications (
    lead_id,
    event_type,
    message,
    priority,
    context_data,
    is_read
  ) VALUES (
    NEW.lead_id,
    'document_uploaded',
    '📄 ' || v_lead_name || ' a uploadé: ' || v_doc_label,
    5,
    jsonb_build_object(
      'document_id', NEW.id,
      'document_type', NEW.document_type,
      'file_name', NEW.file_name,
      'lead_name', v_lead_name,
      'lead_email', v_lead_email
    ),
    false
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public';

-- Add trigger on prospect_documents
DROP TRIGGER IF EXISTS trigger_notify_admin_prospect_document ON prospect_documents;

CREATE TRIGGER trigger_notify_admin_prospect_document
  AFTER INSERT ON prospect_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_prospect_document_upload();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION notify_admin_prospect_document_upload() TO anon, authenticated;
