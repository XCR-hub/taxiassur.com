/*
  # FIX COMPLET - Synchronisation Documents Prospect → CRM
  
  ## Problèmes Identifiés
  
  1. **Frontend** : Utilisait `file_name` au lieu de `document_name`
  2. **Trigger** : Référençait `NEW.file_name` qui n'existe pas dans prospect_documents
  3. **Trigger** : Tentait d'insérer `uploaded_by_prospect` qui n'existe pas dans crm_lead_documents
  4. **Tables** : Divergence entre les colonnes des 2 tables
  
  ## Solution
  
  - Corriger le trigger pour utiliser les bonnes colonnes
  - Mapper document_name → document_name
  - Retirer uploaded_by_prospect (n'existe pas)
  - Ajouter metadata pour tracer l'origine (prospect vs commercial)
  
  ## Impact
  
  - Les documents uploadés depuis l'espace prospect seront ENFIN synchronisés dans le CRM
  - Le commercial verra tous les documents dans son interface
  - L'email de notification sera envoyé correctement
*/

-- Recréer la fonction de sync avec les BONNES colonnes
CREATE OR REPLACE FUNCTION public.sync_prospect_document_to_crm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_email text;
  v_lead_name text;
  v_commercial_email text;
  v_commercial_name text;
  v_document_label text;
  v_crm_url text;
  v_email_html text;
  v_http_response record;
BEGIN
  -- Vérifier que le document n'existe pas déjà dans le CRM
  IF EXISTS (
    SELECT 1 FROM crm_lead_documents
    WHERE lead_id = NEW.lead_id
    AND document_type = NEW.document_type
    AND file_path = NEW.file_path
    AND deleted_at IS NULL
  ) THEN
    RAISE NOTICE 'Document déjà présent dans CRM, skip sync';
    RETURN NEW;
  END IF;
  
  -- ✅ Insérer dans crm_lead_documents avec les BONNES colonnes
  INSERT INTO crm_lead_documents (
    lead_id, 
    document_type, 
    document_name,        -- ✅ Utiliser document_name
    file_path, 
    file_size, 
    mime_type,
    status,
    uploaded_at,
    metadata              -- ✅ Ajouter metadata pour tracer l'origine
  ) VALUES (
    NEW.lead_id, 
    NEW.document_type, 
    NEW.document_name,    -- ✅ NEW.document_name (pas NEW.file_name)
    NEW.file_path,
    NEW.file_size, 
    NEW.mime_type, 
    'pending',
    NEW.uploaded_at,
    jsonb_build_object(    -- ✅ Tracer que c'est uploadé par le prospect
      'uploaded_by', 'prospect',
      'prospect_document_id', NEW.id
    )
  );
  
  RAISE NOTICE 'Document inséré dans CRM : % (lead: %)', NEW.document_name, NEW.lead_id;
  
  -- Récupérer les infos du lead et du commercial assigné
  SELECT 
    l.email,
    COALESCE(l.first_name || ' ' || l.last_name, l.first_name, l.email),
    au.email,
    COALESCE(au.email, 'Commercial')
  INTO 
    v_lead_email,
    v_lead_name,
    v_commercial_email,
    v_commercial_name
  FROM crm_leads l
  LEFT JOIN admin_users au ON l.assigned_to = au.id
  WHERE l.id = NEW.lead_id;
  
  -- Si pas d'email commercial, utiliser l'email par défaut
  IF v_commercial_email IS NULL THEN
    v_commercial_email := 'team@taxiassur.com';
    v_commercial_name := 'Équipe TaxiAssur';
  END IF;
  
  -- Label du document
  v_document_label := CASE NEW.document_type
    WHEN 'contrat' THEN 'Contrat d''assurance'
    WHEN 'devis' THEN 'Devis'
    WHEN 'devis_signe' THEN 'Devis signé'
    WHEN 'attestation' THEN 'Attestation d''assurance'
    WHEN 'conditions_generales' THEN 'Conditions générales'
    WHEN 'mandat_prelevement' THEN 'Mandat de prélèvement'
    WHEN 'rib' THEN 'RIB'
    WHEN 'carte_grise' THEN 'Carte grise'
    WHEN 'permis_conduire' THEN 'Permis de conduire'
    WHEN 'kbis' THEN 'Extrait Kbis'
    WHEN 'carte_pro' THEN 'Carte professionnelle'
    WHEN 'licence_taxi' THEN 'Licence de taxi'
    WHEN 'piece_identite' THEN 'Pièce d''identité'
    WHEN 'releve_information' THEN 'Relevé d''information'
    WHEN 'autorisation_stationnement' THEN 'Autorisation de stationnement'
    ELSE NEW.document_type
  END;
  
  v_crm_url := 'https://taxiassur.com/backoffice/crm-killer/lead/' || NEW.lead_id::text;
  
  -- Construire l'email HTML pour le commercial
  v_email_html := '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' ||
    'body{font-family:Arial,sans-serif;line-height:1.6;background:#f3f4f6;padding:20px}' ||
    '.container{max-width:650px;margin:0 auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1)}' ||
    '.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;text-align:center}' ||
    '.content{padding:30px}' ||
    '.alert-box{background:#d1fae5;border-left:4px solid #10b981;padding:20px;margin:20px 0;border-radius:8px}' ||
    '.document-badge{background:#10b981;color:white;padding:12px 24px;border-radius:25px;display:inline-block;margin:15px 0;font-size:16px;font-weight:bold}' ||
    '.info-box{background:#ecfdf5;padding:20px;border-radius:8px;margin:20px 0;border:2px solid #a7f3d0}' ||
    '.cta-button{background:#3b82f6;color:white;padding:15px 30px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:bold;margin-top:20px}' ||
    '.footer{background:#1f2937;color:white;padding:20px;text-align:center;font-size:12px}' ||
    '.icon{font-size:48px}' ||
    '</style></head><body><div class="container">' ||
    '<div class="header"><div class="icon">📥</div>' ||
    '<h1 style="margin:10px 0 0 0;font-size:28px">DOCUMENT REÇU</h1>' ||
    '<p style="margin:10px 0 0 0;opacity:0.9">TaxiAssur CRM - Notification Commercial</p></div>' ||
    '<div class="content"><p style="font-size:16px;color:#1f2937">Bonjour ' || v_commercial_name || ',</p>' ||
    '<div class="alert-box"><p style="margin:0;color:#065f46;font-size:16px">' ||
    '<strong>📥 Nouveau document uploadé par le prospect !</strong><br>' ||
    v_lead_name || ' vient d''uploader un document sur son espace prospect.</p></div>' ||
    '<h2 style="color:#1f2937;margin-top:25px">Informations</h2>' ||
    '<div class="info-box">' ||
    '<p style="margin:5px 0"><strong>👤 Prospect :</strong> ' || v_lead_name || '</p>' ||
    '<p style="margin:5px 0"><strong>📧 Email :</strong> ' || COALESCE(v_lead_email, 'Non renseigné') || '</p>' ||
    '<p style="margin:5px 0"><strong>📄 Document :</strong> ' || v_document_label || '</p>' ||
    '<p style="margin:5px 0"><strong>📁 Fichier :</strong> ' || NEW.document_name || '</p>' ||
    '</div>' ||
    '<h3 style="color:#1f2937">⚡ Action requise</h3>' ||
    '<p style="color:#4b5563">Accédez au CRM pour consulter et valider ce document.</p>' ||
    '<div style="text-align:center;margin:30px 0">' ||
    '<a href="' || v_crm_url || '" class="cta-button">📊 VOIR DANS LE CRM</a></div>' ||
    '<p style="color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb">' ||
    '💡 <strong>Astuce :</strong> Pensez à valider rapidement le document pour accélérer le processus commercial.</p></div>' ||
    '<div class="footer"><strong>TaxiAssur CRM</strong><br>Système de gestion commerciale<br>' ||
    '<a href="https://taxiassur.com/backoffice" style="color:#10b981;text-decoration:none">Accéder au backoffice</a></div>' ||
    '</div></body></html>';
  
  -- Envoyer l'email au commercial via l'edge function (utiliser http_post de l'extension http)
  BEGIN
    SELECT * INTO v_http_response FROM http_post(
      'https://qiavtxpaznxpttkdaevy.supabase.co/functions/v1/send-email-ionos',
      jsonb_build_object(
        'to', v_commercial_email,
        'toName', v_commercial_name,
        'subject', '📥 Nouveau document reçu de ' || v_lead_name || ' - TaxiAssur',
        'htmlBody', v_email_html,
        'fromEmail', 'team@taxiassur.com',
        'fromName', 'TaxiAssur CRM'
      )::text,
      'application/json',
      ARRAY[
        http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXZ0eHBhem54cHR0a2RhZXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5Njg1ODUsImV4cCI6MjA4NjU0NDU4NX0.FvEbDxwQy8tsTgeGr4skoJh2KXWJldlSm1RIhoDPY5g')
      ],
      5000
    );
    
    RAISE NOTICE 'Email envoyé au commercial % (HTTP status: %)', v_commercial_email, v_http_response.status;
  EXCEPTION WHEN OTHERS THEN
    -- Si l'envoi échoue, on log mais on ne bloque pas
    RAISE WARNING 'Erreur envoi email commercial: %', SQLERRM;
  END;
  
  -- Créer la notification CRM pour l'interface
  INSERT INTO crm_event_notifications (
    lead_id, 
    event_type, 
    title, 
    message, 
    priority,
    context_data
  ) VALUES (
    NEW.lead_id, 
    'document_uploaded', 
    '📥 Nouveau document reçu',
    v_lead_name || ' a uploadé : ' || v_document_label, 
    7,
    jsonb_build_object(
      'action_url', v_crm_url,
      'lead_id', NEW.lead_id::text,
      'document_type', NEW.document_type,
      'document_name', NEW.document_name,
      'commercial_email', v_commercial_email
    )
  );
  
  -- Logger l'envoi dans crm_document_notifications (si la table existe)
  BEGIN
    INSERT INTO crm_document_notifications (
      lead_id,
      document_id,
      notification_type,
      sent_to,
      sent_via,
      subject,
      body,
      status,
      sent_at,
      metadata
    ) VALUES (
      NEW.lead_id,
      NEW.id,
      'prospect_uploaded_document',
      v_commercial_email,
      'email',
      '📥 Nouveau document reçu de ' || v_lead_name,
      'Email HTML envoyé au commercial',
      'sent',
      now(),
      jsonb_build_object(
        'document_type', NEW.document_type,
        'document_label', v_document_label,
        'document_name', NEW.document_name,
        'prospect_email', v_lead_email,
        'prospect_name', v_lead_name,
        'http_status', COALESCE(v_http_response.status::text, 'unknown')
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Si la table n'existe pas encore, pas grave
    RAISE WARNING 'Table crm_document_notifications non trouvée: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION sync_prospect_document_to_crm() IS 'Synchro prospect → CRM avec BONNES colonnes (document_name, pas file_name) + Email commercial';

-- Vérifier que le trigger existe et est actif
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'sync_prospect_document_trigger'
    AND tgrelid = 'prospect_documents'::regclass
  ) THEN
    CREATE TRIGGER sync_prospect_document_trigger
      AFTER INSERT ON prospect_documents
      FOR EACH ROW
      EXECUTE FUNCTION sync_prospect_document_to_crm();
    
    RAISE NOTICE 'Trigger sync_prospect_document_trigger créé';
  ELSE
    RAISE NOTICE 'Trigger sync_prospect_document_trigger existe déjà';
  END IF;
END $$;
