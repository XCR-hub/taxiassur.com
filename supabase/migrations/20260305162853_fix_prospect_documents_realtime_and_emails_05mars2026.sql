/*
  # Fix Espace Prospect - Realtime + Email Confirmation
  
  Date: 5 mars 2026
  
  ## Problèmes Corrigés
  
  1. **Realtime désactivé** - Les documents n'apparaissent pas automatiquement
  2. **Pas d'email de confirmation** - Le prospect ne reçoit pas d'email quand il upload un document
  
  ## Changements
  
  1. Tables avec Realtime Activé
     - `prospect_documents` - Pour voir les documents apparaître en temps réel
     - `crm_lead_documents` - Pour le backoffice (si pas déjà activé)
  
  2. Nouvelle Fonction
     - `send_prospect_document_confirmation_email()` - Envoie un email de confirmation au prospect
  
  3. Nouveau Trigger
     - `trigger_prospect_confirmation_email` - Déclenché à chaque upload par le prospect
  
  ## Résultat Attendu
  
  - Le prospect voit ses documents apparaître instantanément après upload
  - Le prospect reçoit un email de confirmation immédiat
  - L'admin continue de recevoir une notification
*/

-- ========================================
-- 1. ACTIVER REALTIME SUR LES TABLES
-- ========================================

-- Activer realtime sur prospect_documents
DO $$
BEGIN
  -- Vérifier si déjà dans la publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'prospect_documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE prospect_documents;
    RAISE NOTICE '✅ Realtime activé sur prospect_documents';
  ELSE
    RAISE NOTICE 'ℹ️ Realtime déjà activé sur prospect_documents';
  END IF;
END $$;

-- Activer realtime sur crm_lead_documents (si existe et pas déjà activé)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'crm_lead_documents'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'crm_lead_documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE crm_lead_documents;
    RAISE NOTICE '✅ Realtime activé sur crm_lead_documents';
  ELSE
    RAISE NOTICE 'ℹ️ Realtime déjà activé ou table inexistante: crm_lead_documents';
  END IF;
END $$;


-- ========================================
-- 2. FONCTION EMAIL CONFIRMATION PROSPECT
-- ========================================

CREATE OR REPLACE FUNCTION send_prospect_document_confirmation_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_email text;
  v_lead_name text;
  v_access_token text;
  v_document_name text;
  v_queue_id uuid;
BEGIN
  -- Récupérer les infos du lead
  SELECT 
    email,
    COALESCE(full_name, first_name || ' ' || last_name) as name,
    access_token
  INTO v_lead_email, v_lead_name, v_access_token
  FROM crm_leads
  WHERE id = NEW.lead_id;

  -- Ignorer si pas d'email
  IF v_lead_email IS NULL THEN
    RAISE LOG '⚠️ [PROSPECT_EMAIL] Pas d''email pour lead %', NEW.lead_id;
    RETURN NEW;
  END IF;

  -- Nom du document lisible
  v_document_name := CASE NEW.document_type
    WHEN 'licence_taxi' THEN 'Licence de taxi professionnelle'
    WHEN 'permis_conduire' THEN 'Permis de conduire'
    WHEN 'piece_identite' THEN 'Pièce d''identité'
    WHEN 'carte_grise' THEN 'Carte grise'
    WHEN 'releve_information' THEN 'Relevé d''information'
    WHEN 'autorisation_stationnement' THEN 'Autorisation de stationnement'
    WHEN 'rib' THEN 'RIB bancaire'
    ELSE NEW.document_type
  END;

  RAISE LOG '📧 [PROSPECT_EMAIL] Envoi confirmation upload à % pour document %', v_lead_email, v_document_name;

  -- Ajouter l'email à la queue
  BEGIN
    v_queue_id := queue_simple_email(
      p_lead_id := NEW.lead_id,
      p_email_type := 'prospect_document_confirmation',
      p_to_email := v_lead_email,
      p_to_name := v_lead_name,
      p_subject := format('✅ Document "%s" bien reçu - TaxiAssur', v_document_name),
      p_html_content := format('
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">

<h1 style="color: #10b981;">✅ Document bien reçu !</h1>

<p style="font-size: 16px;">Bonjour %s,</p>

<p style="font-size: 16px;">Nous avons bien reçu votre document :</p>

<div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
<p style="margin: 0; font-size: 18px; font-weight: bold; color: #059669;">
📄 %s
</p>
<p style="margin: 10px 0 0 0; font-size: 14px; color: #047857;">
Fichier: %s
</p>
</div>

<p style="font-size: 15px;">
Notre équipe va vérifier ce document. Vous recevrez une notification dès sa validation.
</p>

<div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
<p style="margin: 0; font-weight: bold; color: #1e40af;">💡 Prochaine étape</p>
<p style="margin: 10px 0 0 0; font-size: 14px; color: #1e3a8a;">
Continuez à uploader vos autres documents pour accélérer le traitement de votre dossier.
</p>
</div>

<a href="https://taxiassur.com/espace-prospect/%s" 
   style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold;">
   📤 Retour à mon espace
</a>

<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

<p style="font-size: 15px;">
Questions ? Notre équipe est là pour vous aider :<br>
📞 <a href="tel:0180855786" style="color: #10b981; text-decoration: none;">01 80 85 57 86</a> | 
📧 <a href="mailto:team@taxiassur.com" style="color: #10b981; text-decoration: none;">team@taxiassur.com</a>
</p>

<div style="background: #f9fafb; padding: 15px; margin-top: 30px; border-radius: 5px;">
<p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
TaxiAssur - Assurance professionnelle pour taxis et VTC<br>
Notification automatique - Ne pas répondre à cet email
</p>
</div>

</div>
',
        v_lead_name,
        v_document_name,
        NEW.file_name,
        v_access_token
      ),
      p_priority := 8
    );
    
    RAISE LOG '✅ [PROSPECT_EMAIL] Email confirmation ajouté à la queue: %', v_queue_id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '❌ [PROSPECT_EMAIL] Erreur lors de l''envoi: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION send_prospect_document_confirmation_email() IS 
'Envoie un email de confirmation au prospect quand il upload un document';


-- ========================================
-- 3. CRÉER LE TRIGGER
-- ========================================

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_prospect_confirmation_email ON prospect_documents;

-- Créer le nouveau trigger
-- Note: uploaded_by peut être NULL pour les uploads prospect, donc on ne filtre pas dessus
CREATE TRIGGER trigger_prospect_confirmation_email
  AFTER INSERT ON prospect_documents
  FOR EACH ROW
  EXECUTE FUNCTION send_prospect_document_confirmation_email();

COMMENT ON TRIGGER trigger_prospect_confirmation_email ON prospect_documents IS 
'Envoie un email de confirmation au prospect après upload d''un document';


-- ========================================
-- 4. AJOUTER UNE COLONNE POUR TRACKING
-- ========================================

-- Ajouter une colonne pour savoir si l'email de confirmation a été envoyé
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'prospect_documents'
    AND column_name = 'confirmation_email_sent'
  ) THEN
    ALTER TABLE prospect_documents 
    ADD COLUMN confirmation_email_sent boolean DEFAULT false;
  END IF;
END $$;

COMMENT ON COLUMN prospect_documents.confirmation_email_sent IS 
'Indique si l''email de confirmation a été envoyé au prospect';


-- ========================================
-- 5. MISE À JOUR DES RLS POUR REALTIME
-- ========================================

-- S'assurer que les prospects peuvent lire leurs propres documents en temps réel
DO $$
BEGIN
  -- Recréer la politique de lecture pour les prospects
  DROP POLICY IF EXISTS "Prospects can view own documents" ON prospect_documents;
  
  CREATE POLICY "Prospects can view own documents"
    ON prospect_documents
    FOR SELECT
    TO public
    USING (
      -- Via token d'accès (pour les prospects non authentifiés)
      lead_id IN (
        SELECT id FROM crm_leads
        WHERE access_token = current_setting('request.jwt.claims', true)::json->>'access_token'
      )
      -- Ou via session authentifiée (backoffice)
      OR auth.uid() IS NOT NULL
    );
    
  RAISE NOTICE '✅ RLS mis à jour pour realtime';
END $$;


-- ========================================
-- 6. LOG ET VÉRIFICATION
-- ========================================

-- Log de confirmation
DO $$
DECLARE
  v_realtime_status text;
BEGIN
  -- Vérifier le statut realtime
  SELECT 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'prospect_documents'
      ) THEN '✅ ACTIVÉ'
      ELSE '❌ DÉSACTIVÉ'
    END
  INTO v_realtime_status;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   FIX ESPACE PROSPECT TERMINÉ';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Realtime sur prospect_documents: %', v_realtime_status;
  RAISE NOTICE '✅ Trigger email confirmation prospect: CRÉÉ';
  RAISE NOTICE '✅ RLS mis à jour pour realtime: OK';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Prochains tests:';
  RAISE NOTICE '   1. Uploader un document via espace prospect';
  RAISE NOTICE '   2. Vérifier email de confirmation reçu';
  RAISE NOTICE '   3. Vérifier que le document apparaît instantanément';
  RAISE NOTICE '';
END $$;
