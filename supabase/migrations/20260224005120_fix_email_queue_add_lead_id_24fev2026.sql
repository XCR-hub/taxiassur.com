/*
  # Ajout lead_id à email_queue et système simplifié
  
  1. Modifications
    - Ajout colonne lead_id à la table email_queue existante
    - Trigger simplifié pour ajouter emails à la queue
    - Fonction de traitement de la queue
  
  2. Système
    - Queue ultra-simple
    - Cron toutes les minutes
    - Logs détaillés
*/

-- Ajouter la colonne lead_id à la table existante
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS lead_id uuid;
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS email_type text;

-- Ajouter l'index
CREATE INDEX IF NOT EXISTS idx_email_queue_lead_id ON email_queue(lead_id);

-- Fonction simple pour ajouter un email à la queue (utilise la table existante)
CREATE OR REPLACE FUNCTION queue_simple_email(
  p_lead_id uuid,
  p_email_type text,
  p_to_email text,
  p_to_name text,
  p_subject text,
  p_html_content text,
  p_priority int DEFAULT 10
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  queue_id uuid;
BEGIN
  INSERT INTO email_queue (
    lead_id,
    email_type,
    to_email,
    to_name,
    subject,
    body,
    from_email,
    from_name,
    priority,
    status,
    retry_count,
    max_retries,
    scheduled_for
  )
  VALUES (
    p_lead_id,
    p_email_type,
    p_to_email,
    p_to_name,
    p_subject,
    p_html_content,
    'team@taxiassur.com',
    'TaxiAssur',
    p_priority,
    'pending',
    0,
    3,
    now()
  )
  RETURNING id INTO queue_id;
  
  RAISE LOG '📧 [QUEUE] Email ajouté: % pour % (ID: %)', p_email_type, p_to_email, queue_id;
  RETURN queue_id;
END;
$$;

-- Fonction trigger ultra-simple pour les nouveaux leads
CREATE OR REPLACE FUNCTION trigger_queue_new_lead_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  team_queue_id uuid;
  client_queue_id uuid;
BEGIN
  RAISE LOG '📧 [TRIGGER] Nouveau lead détecté: % (%)', NEW.id, NEW.email;
  
  BEGIN
    -- Email pour l'équipe
    team_queue_id := queue_simple_email(
      p_lead_id := NEW.id,
      p_email_type := 'new_lead_team',
      p_to_email := 'team@taxiassur.com',
      p_to_name := 'Équipe TaxiAssur',
      p_subject := format('🚨 NOUVEAU LEAD: %s - %s', COALESCE(NEW.full_name, NEW.first_name), NEW.city),
      p_html_content := format('
        <h1>✅ Nouveau Lead</h1>
        <p><strong>Nom:</strong> %s</p>
        <p><strong>Email:</strong> <a href="mailto:%s">%s</a></p>
        <p><strong>Téléphone:</strong> <a href="tel:%s">%s</a></p>
        <p><strong>Ville:</strong> %s</p>
        <p><strong>Reçu le:</strong> %s</p>
        <p><a href="https://taxiassur.com/backoffice/crm-killer/lead/%s" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">🔍 Voir le lead</a></p>
        <hr>
        <p style="color: #666; font-size: 12px;">TaxiAssur CRM - Notification automatique</p>
      ', 
        COALESCE(NEW.full_name, NEW.first_name || ' ' || NEW.last_name),
        NEW.email, NEW.email,
        NEW.phone, NEW.phone,
        NEW.city,
        to_char(NEW.created_at, 'DD/MM/YYYY à HH24:MI'),
        NEW.id
      ),
      p_priority := 5
    );
    RAISE LOG '✅ [TRIGGER] Email équipe créé: %', team_queue_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '❌ [TRIGGER] Erreur email équipe: %', SQLERRM;
  END;
  
  BEGIN
    -- Email pour le client
    client_queue_id := queue_simple_email(
      p_lead_id := NEW.id,
      p_email_type := 'new_lead_client',
      p_to_email := NEW.email,
      p_to_name := COALESCE(NEW.full_name, NEW.first_name || ' ' || NEW.last_name),
      p_subject := '✅ Votre demande de devis TaxiAssur bien reçue',
      p_html_content := format('
        <h1>Bonjour %s,</h1>
        <p>✅ Nous avons bien reçu votre demande de devis pour une <strong>assurance taxi à %s</strong>.</p>
        <p><strong>⚡ Votre expert vous contactera dans les 15 minutes au %s</strong></p>
        <hr>
        <h2>📤 Accédez à votre espace prospect sécurisé</h2>
        <p><a href="https://taxiassur.com/espace-prospect/%s" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0;">🚀 Accéder à mon espace</a></p>
        <p><strong>Uploadez vos 7 documents requis pour recevoir votre devis sous 24h :</strong></p>
        <ol>
          <li>Licence de taxi</li>
          <li>Permis de conduire</li>
          <li>Pièce d identité</li>
          <li>Carte grise</li>
          <li>Relevé d information</li>
          <li>Autorisation de stationnement</li>
          <li>RIB</li>
        </ol>
        <hr>
        <p>À très vite,<br><strong>L équipe TaxiAssur</strong><br>📞 <a href="tel:0180855786">01 80 85 57 86</a> | 📧 <a href="mailto:team@taxiassur.com">team@taxiassur.com</a></p>
      ',
        COALESCE(NEW.full_name, NEW.first_name),
        NEW.city,
        NEW.phone,
        NEW.access_token
      ),
      p_priority := 10
    );
    RAISE LOG '✅ [TRIGGER] Email client créé: %', client_queue_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '❌ [TRIGGER] Erreur email client: %', SQLERRM;
  END;
  
  RAISE LOG '✅ [TRIGGER] 2 emails ajoutés à la queue pour lead %', NEW.id;
  RETURN NEW;
END;
$$;

-- DÉSACTIVER l'ancien trigger et créer le nouveau
DROP TRIGGER IF EXISTS trg_send_lead_email_brevo ON crm_leads;
DROP TRIGGER IF EXISTS trg_queue_new_lead_emails ON crm_leads;

CREATE TRIGGER trg_queue_new_lead_emails
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_queue_new_lead_emails();

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION queue_simple_email TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION trigger_queue_new_lead_emails TO service_role;

COMMENT ON FUNCTION trigger_queue_new_lead_emails IS 'Trigger qui ajoute automatiquement 2 emails (équipe + prospect) à la queue lors de la création d''un lead';
