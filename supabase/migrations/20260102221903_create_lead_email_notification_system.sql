/*
  # Système d'Envoi d'Emails Automatique pour les Leads

  1. Fonction
    - `send_lead_notification_emails()` : Envoie automatiquement des emails après création d'un lead
      - Email de confirmation au client
      - Email de notification à l'équipe

  2. Trigger
    - `trigger_send_lead_emails` : Se déclenche après l'insertion d'un nouveau lead

  3. Sécurité
    - Utilise pg_net pour appeler l'edge function send-email
    - Gestion d'erreurs robuste
    - Logging des envois
*/

-- Fonction pour envoyer les emails de notification
CREATE OR REPLACE FUNCTION send_lead_notification_emails()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url text;
  v_supabase_anon_key text;
  v_client_email_subject text;
  v_client_email_html text;
  v_team_email_subject text;
  v_team_email_html text;
  v_response jsonb;
BEGIN
  -- Récupérer l'URL Supabase
  v_supabase_url := current_setting('app.supabase_url', true);
  v_supabase_anon_key := current_setting('app.supabase_anon_key', true);

  -- Si pas configuré, utiliser les valeurs par défaut de l'environnement
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://drohhxrkoequjphvabvq.supabase.co';
  END IF;

  -- Email de confirmation au client
  v_client_email_subject := '✅ Demande de devis reçue - TaxiAssur';
  v_client_email_html := format('
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; max-width: 600px; margin: 0 auto; }
    .info-box { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; margin-top: 30px; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚕 TaxiAssur</h1>
    <p>Votre demande de devis a bien été reçue</p>
  </div>
  
  <div class="content">
    <p>Bonjour <strong>%s</strong>,</p>
    
    <p>Nous avons bien reçu votre demande de devis pour l''assurance taxi/VTC. Notre équipe va l''étudier dans les plus brefs délais.</p>
    
    <div class="info-box">
      <h3>📋 Récapitulatif de votre demande</h3>
      <ul>
        <li><strong>Nom:</strong> %s</li>
        <li><strong>Email:</strong> %s</li>
        <li><strong>Téléphone:</strong> %s</li>
        <li><strong>Ville:</strong> %s</li>
        <li><strong>Type d''activité:</strong> %s</li>
        <li><strong>Immatriculation:</strong> %s</li>
      </ul>
    </div>
    
    <p><strong>⏱️ Délai de réponse:</strong> Nous vous contacterons sous 24 heures ouvrées.</p>
    
    <p><strong>📞 Besoin d''aide ?</strong> N''hésitez pas à nous appeler au <strong>01 80 85 57 81</strong></p>
    
    <div style="text-align: center;">
      <a href="https://taxiassur.com" class="button">Visitez notre site</a>
    </div>
  </div>

  <div class="footer">
    <p><strong>TaxiAssur - L''assurance des professionnels du taxi et VTC</strong></p>
    <p>📧 team@taxiassur.com | ☎️ 01 80 85 57 81</p>
    <p style="margin-top: 15px; font-size: 0.85em;">
      Vous recevez cet email suite à votre demande de devis sur taxiassur.com
    </p>
  </div>
</body>
</html>',
    NEW.name,
    NEW.name,
    NEW.email,
    NEW.phone,
    NEW.city,
    COALESCE(NEW.status, 'Non précisé'),
    COALESCE(NEW.immatriculation, 'Non renseignée')
  );

  -- Email de notification à l'équipe
  v_team_email_subject := format('🎯 Nouveau lead: %s - %s', NEW.name, NEW.city);
  v_team_email_html := format('
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .lead-box { background: #f0fdf4; border: 2px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .urgent { background: #fef2f2; border-color: #ef4444; }
    .info-line { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .footer { background: #f8f9fa; padding: 15px; text-align: center; margin-top: 20px; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎯 NOUVEAU LEAD</h1>
    <p>Demande de devis reçue</p>
  </div>
  
  <div class="content">
    <div class="lead-box">
      <h2>👤 Informations du Lead</h2>
      
      <div class="info-line">
        <strong>Nom:</strong> %s
      </div>
      <div class="info-line">
        <strong>Email:</strong> <a href="mailto:%s">%s</a>
      </div>
      <div class="info-line">
        <strong>Téléphone:</strong> <a href="tel:%s">%s</a>
      </div>
      <div class="info-line">
        <strong>Ville:</strong> %s
      </div>
      <div class="info-line">
        <strong>Type d''activité:</strong> %s
      </div>
      <div class="info-line">
        <strong>Immatriculation:</strong> %s
      </div>
      <div class="info-line">
        <strong>Source:</strong> %s
      </div>
      <div class="info-line">
        <strong>Date de création:</strong> %s
      </div>
    </div>
    
    <p><strong>⚡ Action requise:</strong> Contacter ce lead dans les 24 heures pour maximiser les chances de conversion.</p>
    
    <div style="text-align: center;">
      <a href="https://taxiassur.com/backoffice/crm" class="button">Voir dans le CRM</a>
    </div>
    
    <h3>📊 Statistiques du jour</h3>
    <p>Ce lead fait partie des nouveaux contacts reçus aujourd''hui. Consultez le dashboard pour voir la performance globale.</p>
  </div>

  <div class="footer">
    <p>TaxiAssur CRM - Notification automatique</p>
    <p style="margin-top: 10px; font-size: 0.8em;">
      Cet email est envoyé automatiquement lors de chaque nouveau lead
    </p>
  </div>
</body>
</html>',
    NEW.name,
    NEW.email,
    NEW.email,
    NEW.phone,
    NEW.phone,
    NEW.city,
    COALESCE(NEW.status, 'Non précisé'),
    COALESCE(NEW.immatriculation, 'Non renseignée'),
    COALESCE(NEW.source, 'website_form'),
    to_char(NEW.created_at, 'DD/MM/YYYY à HH24:MI')
  );

  -- Envoyer l'email au client (async, pas bloquant)
  BEGIN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_supabase_anon_key, '')
      ),
      body := jsonb_build_object(
        'to', NEW.email,
        'subject', v_client_email_subject,
        'html', v_client_email_html
      )
    );
    
    RAISE NOTICE 'Email de confirmation envoyé à: %', NEW.email;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erreur lors de l''envoi de l''email client: %', SQLERRM;
  END;

  -- Envoyer l'email à l'équipe (async, pas bloquant)
  BEGIN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_supabase_anon_key, '')
      ),
      body := jsonb_build_object(
        'to', 'team@taxiassur.com',
        'subject', v_team_email_subject,
        'html', v_team_email_html
      )
    );
    
    RAISE NOTICE 'Email de notification équipe envoyé';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erreur lors de l''envoi de l''email équipe: %', SQLERRM;
  END;

  -- Mettre à jour le compteur d'emails envoyés
  NEW.emails_sent := COALESCE(NEW.emails_sent, 0) + 2;
  NEW.last_email_sent_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur INSERT
DROP TRIGGER IF EXISTS trigger_send_lead_emails ON leads;
CREATE TRIGGER trigger_send_lead_emails
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION send_lead_notification_emails();

-- Commenter la fonction
COMMENT ON FUNCTION send_lead_notification_emails() IS 
'Envoie automatiquement des emails de confirmation au client et de notification à l''équipe lors de la création d''un nouveau lead';

COMMENT ON TRIGGER trigger_send_lead_emails ON leads IS
'Déclenche l''envoi automatique d''emails lors de la création d''un nouveau lead';
