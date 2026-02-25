/*
  # Fix Email Templates HTML Complet
  
  Remplace les templates basiques par les beaux templates HTML professionnels
  pour les emails de nouveaux leads (client + équipe)
*/

-- Fonction pour générer le beau template HTML email client
CREATE OR REPLACE FUNCTION generate_client_email_html(
  lead_name TEXT,
  lead_email TEXT,
  lead_phone TEXT,
  lead_city TEXT,
  lead_status TEXT,
  lead_immatriculation TEXT,
  access_token TEXT,
  created_at TIMESTAMPTZ
) RETURNS TEXT AS $$
BEGIN
  RETURN format('
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;
      line-height: 1.6;
      background: #f3f4f6;
      padding: 20px;
    }
    .email-wrapper {
      max-width: 680px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%%, #059669 100%%);
      padding: 50px 30px;
      text-align: center;
    }
    .logo {
      color: white;
      font-size: 28px;
      font-weight: 900;
      margin-bottom: 20px;
      letter-spacing: 1px;
    }
    .header h1 {
      color: white;
      font-size: 36px;
      font-weight: 800;
      margin: 15px 0 10px 0;
    }
    .header .subtitle {
      color: #d1fae5;
      font-size: 18px;
      font-weight: 500;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      color: #1e293b;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 20px;
    }
    .highlight-box {
      background: linear-gradient(135deg, #fef3c7 0%%, #fde68a 100%%);
      border-left: 6px solid #f59e0b;
      padding: 25px;
      border-radius: 12px;
      margin: 30px 0;
    }
    .urgent-action {
      background: linear-gradient(135deg, #10b981 0%%, #059669 100%%);
      padding: 35px;
      border-radius: 16px;
      margin: 35px 0;
      text-align: center;
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
    }
    .urgent-action h2 {
      color: white;
      font-size: 28px;
      font-weight: 900;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .cta-button {
      background: white;
      color: #059669 !important;
      padding: 18px 45px;
      text-decoration: none;
      border-radius: 50px;
      display: inline-block;
      font-weight: 800;
      font-size: 18px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.2);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .footer {
      background: #1e293b;
      color: white;
      padding: 30px;
      text-align: center;
    }
    .footer-logo {
      font-size: 24px;
      font-weight: 900;
      color: #10b981;
      margin-bottom: 10px;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <div class="logo">🚕 TaxiAssur</div>
      <h1>Demande Confirmée !</h1>
      <div class="subtitle">Nous avons bien reçu votre demande</div>
    </div>

    <div class="content">
      <div class="greeting">Bonjour %1$s,</div>

      <p style="color: #475569; font-size: 16px; line-height: 1.8; margin-bottom: 30px;">
        Merci de nous avoir choisi pour votre <strong>assurance taxi professionnel à %3$s</strong>.
        Votre demande a été enregistrée avec succès et notre équipe d''experts est déjà mobilisée pour vous proposer
        les meilleures offres du marché.
      </p>

      <div class="highlight-box">
        <h3 style="color: #92400e; font-size: 20px; font-weight: 800; margin-bottom: 12px;">⚡ Réponse sous 15 minutes</h3>
        <p style="color: #78350f; font-size: 16px;">
          Notre expert vous contactera au <strong>%2$s</strong> dans les <strong>15 prochaines minutes</strong>
          pour analyser vos besoins spécifiques.
        </p>
      </div>

      <div class="urgent-action">
        <h2>📤 Action Immédiate Requise</h2>
        <p style="color: #d1fae5; font-size: 17px; margin-bottom: 25px; font-weight: 500;">
          Accélérez le traitement de votre dossier en uploadant vos documents dès maintenant
        </p>
        <a href="https://taxiassur.com/espace-prospect/%6$s" class="cta-button" style="text-decoration: none; color: #059669 !important;">
          📂 Accéder à mon espace sécurisé
        </a>
      </div>

      <div style="background: #f8fafc; border: 2px solid #e2e8f0; padding: 20px; border-radius: 12px; margin: 25px 0;">
        <h4 style="color: #1e293b; font-size: 16px; margin-bottom: 12px; font-weight: 700;">✅ Vos Informations Enregistrées</h4>
        <ul style="list-style: none; padding: 0;">
          <li style="color: #475569; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;"><strong>Nom :</strong> %1$s</li>
          <li style="color: #475569; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;"><strong>Téléphone :</strong> %2$s</li>
          <li style="color: #475569; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;"><strong>Email :</strong> %7$s</li>
          <li style="color: #475569; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;"><strong>Ville :</strong> %3$s</li>
          <li style="color: #475569; padding: 8px 0; font-size: 14px;"><strong>Statut :</strong> %4$s</li>
        </ul>
      </div>

      <div style="background: linear-gradient(135deg, #0ea5e9 0%%, #0284c7 100%%); border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
        <h3 style="color: white; font-size: 20px; font-weight: 700; margin-bottom: 12px;">💬 Une Question ? Nous Sommes Là</h3>
        <p style="color: #e0f2fe; margin-bottom: 15px; font-size: 15px;">
          Notre équipe d''experts est disponible pour vous accompagner
        </p>
        <p>
          <a href="tel:0180855786" style="color: white; text-decoration: none; font-weight: 700; font-size: 16px; margin: 0 10px;">📞 01 80 85 57 86</a> |
          <a href="mailto:team@taxiassur.com" style="color: white; text-decoration: none; font-weight: 700; font-size: 16px; margin: 0 10px;">📧 team@taxiassur.com</a>
        </p>
      </div>
    </div>

    <div class="footer">
      <div class="footer-logo">🚕 TaxiAssur</div>
      <p><strong>Courtier Spécialisé en Assurance Taxi et VTC</strong></p>
      <p style="margin-top: 15px;">Excellence Coverage Risks | ORIAS 11 061 425</p>
      <p>📞 01 80 85 57 86 | 📧 team@taxiassur.com</p>
      <p style="margin-top: 15px; font-size: 12px;">© 2026 TaxiAssur - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>',
    lead_name,
    lead_phone,
    lead_city,
    lead_status,
    lead_immatriculation,
    access_token,
    lead_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour générer le beau template HTML email équipe
CREATE OR REPLACE FUNCTION generate_team_email_html(
  lead_name TEXT,
  lead_email TEXT,
  lead_phone TEXT,
  lead_city TEXT,
  lead_status TEXT,
  lead_immatriculation TEXT,
  lead_id UUID,
  created_at TIMESTAMPTZ
) RETURNS TEXT AS $$
BEGIN
  RETURN format('
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f3f4f6; }
    .container { max-width: 650px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%%, #1d4ed8 100%%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .info-item { background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .info-label { color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
    .info-value { color: #1f2937; font-weight: bold; font-size: 16px; }
    .cta-button { background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin: 20px 0; text-align: center; }
    .footer { background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 32px;">🎯 NOUVEAU LEAD</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">Traitement prioritaire requis</p>
    </div>

    <div class="content">
      <div class="alert-box">
        <strong>⚡ ACTION REQUISE :</strong> Contactez ce prospect dans les <strong>15 minutes</strong>
      </div>

      <h2 style="color: #1f2937; margin-top: 0;">Informations du prospect</h2>

      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Nom complet</div>
          <div class="info-value">%1$s</div>
        </div>

        <div class="info-item">
          <div class="info-label">📞 Téléphone</div>
          <div class="info-value"><a href="tel:%3$s" style="color: #10b981; text-decoration: none;">%3$s</a></div>
        </div>

        <div class="info-item">
          <div class="info-label">📧 Email</div>
          <div class="info-value"><a href="mailto:%2$s" style="color: #3b82f6; text-decoration: none; font-size: 14px;">%2$s</a></div>
        </div>

        <div class="info-item">
          <div class="info-label">📍 Ville</div>
          <div class="info-value">%4$s</div>
        </div>

        <div class="info-item">
          <div class="info-label">👤 Statut professionnel</div>
          <div class="info-value">%5$s</div>
        </div>

        <div class="info-item">
          <div class="info-label">⏰ Date de demande</div>
          <div class="info-value">%8$s</div>
        </div>
      </div>

      <h3 style="color: #1f2937;">📋 Prochaines actions</h3>
      <ol style="color: #4b5563; line-height: 1.8;">
        <li>☎️ Appeler le prospect au <strong>%3$s</strong></li>
        <li>✅ Qualifier le besoin et confirmer les informations</li>
        <li>📄 Vérifier l''envoi des 7 documents requis</li>
        <li>💰 Préparer et envoyer le devis sous 24h</li>
      </ol>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://taxiassur.com/backoffice/crm-commercial" class="cta-button">
          📊 OUVRIR LE CRM
        </a>
      </div>
    </div>

    <div class="footer">
      <strong>TaxiAssur CRM</strong><br>
      Notification automatique via IONOS SMTP
    </div>
  </div>
</body>
</html>',
    lead_name,
    lead_email,
    lead_phone,
    lead_city,
    lead_status,
    lead_immatriculation,
    lead_id,
    to_char(created_at, 'DD/MM/YYYY HH24:MI')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modifier le trigger pour utiliser les beaux templates
CREATE OR REPLACE FUNCTION enqueue_lead_emails()
RETURNS TRIGGER AS $$
DECLARE
  client_html TEXT;
  team_html TEXT;
BEGIN
  -- Générer les beaux templates HTML
  client_html := generate_client_email_html(
    NEW.name,
    NEW.email,
    NEW.phone,
    NEW.city,
    NEW.status,
    NEW.immatriculation,
    NEW.access_token,
    NEW.created_at
  );

  team_html := generate_team_email_html(
    NEW.name,
    NEW.email,
    NEW.phone,
    NEW.city,
    NEW.status,
    NEW.immatriculation,
    NEW.id,
    NEW.created_at
  );

  -- Insérer l'email client avec le beau template
  INSERT INTO email_queue (
    lead_id,
    email_type,
    to_email,
    to_name,
    from_email,
    from_name,
    subject,
    body,
    status,
    priority,
    scheduled_for
  ) VALUES (
    NEW.id,
    'new_lead_client',
    NEW.email,
    NEW.name,
    'team@taxiassur.com',
    'TaxiAssur',
    'Votre demande de devis TaxiAssur bien reçue',
    client_html,
    'pending',
    1,
    NOW()
  );

  -- Insérer l'email équipe avec le beau template
  INSERT INTO email_queue (
    lead_id,
    email_type,
    to_email,
    to_name,
    from_email,
    from_name,
    subject,
    body,
    status,
    priority,
    scheduled_for
  ) VALUES (
    NEW.id,
    'new_lead_team',
    'team@taxiassur.com',
    'Equipe TaxiAssur',
    'team@taxiassur.com',
    'TaxiAssur Notifications',
    'NOUVEAU LEAD: ' || NEW.name || ' - ' || NEW.city,
    team_html,
    'pending',
    1,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
