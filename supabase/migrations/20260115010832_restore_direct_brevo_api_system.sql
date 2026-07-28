/*
  # Restaurer le système Brevo API direct depuis le trigger
  
  1. Supprimer le trigger edge function
  2. Créer un trigger qui appelle Brevo API directement
*/

-- Supprimer le trigger edge function
DROP TRIGGER IF EXISTS trg_after_insert_lead_notification ON crm_leads;
DROP FUNCTION IF EXISTS trg_send_lead_notification_direct();

-- Créer la fonction d'envoi direct via Brevo API
CREATE OR REPLACE FUNCTION trg_send_lead_email_brevo()
RETURNS TRIGGER AS $$
DECLARE
  v_brevo_key TEXT := 'xkeysib_REDACTED';
  v_prospect_url TEXT;
  v_response_id INTEGER;
BEGIN
  -- URL espace prospect
  v_prospect_url := 'https://taxiassur.com/espace-prospect/' || NEW.access_token;
  
  -- Email au prospect
  SELECT net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object(
      'accept', 'application/json',
      'api-key', v_brevo_key,
      'content-type', 'application/json'
    ),
    body := jsonb_build_object(
      'sender', jsonb_build_object('name', 'TaxiAssur', 'email', 'team@taxiassur.com'),
      'to', jsonb_build_array(jsonb_build_object('email', NEW.email, 'name', NEW.full_name)),
      'subject', 'Demande confirmée ! Votre expert TaxiAssur vous recontacte rapidement',
      'htmlContent', '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;background:#f3f4f6;margin:0;padding:20px}.container{max-width:600px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1)}.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:40px 30px;text-align:center;color:white}.header h1{margin:0 0 10px 0;font-size:28px}.content{padding:30px}.success-box{background:#fef3c7;border-left:4px solid #f59e0b;padding:20px;margin:20px 0;border-radius:8px}.docs-section{background:#f0f9ff;border:2px solid #3b82f6;padding:25px;border-radius:15px;margin:25px 0}.doc-item{background:white;padding:12px 15px;margin:8px 0;border-radius:8px;border-left:4px solid #10b981}.cta-button{background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);color:white;padding:18px 35px;text-decoration:none;border-radius:50px;display:inline-block;font-weight:bold;font-size:16px}.contact-box{background:#dbeafe;padding:25px;border-radius:15px;margin:25px 0;text-align:center}.footer{background:#1f2937;color:white;padding:30px;text-align:center}</style></head><body><div class="container"><div class="header"><h1>✅ DEMANDE REÇUE !</h1><p style="margin:0;font-size:18px">Bonjour ' || NEW.full_name || '</p></div><div class="content"><div class="success-box"><strong>Excellente nouvelle !</strong><br>Votre demande de devis d''assurance taxi a été confirmée avec succès.</div><h2 style="color:#1f2937">🎯 Prochaines étapes</h2><ul style="color:#4b5563"><li>Votre expert TaxiAssur vous recontacte <strong>sous 15 minutes</strong></li><li>Analyse personnalisée de vos besoins</li><li>Proposition des meilleures offres du marché</li><li>Économies moyennes constatées : <strong>580 €/an</strong></li></ul><div class="docs-section"><h3 style="color:#1e40af;margin-top:0;text-align:center">📄 7 Documents requis</h3><div class="doc-item"><strong>1.</strong> Licence de taxi professionnelle</div><div class="doc-item"><strong>2.</strong> Permis de conduire (recto-verso)</div><div class="doc-item"><strong>3.</strong> Pièce d''identité (CNI/passeport)</div><div class="doc-item"><strong>4.</strong> Carte grise du véhicule</div><div class="doc-item"><strong>5.</strong> Relevé d''information assureur</div><div class="doc-item"><strong>6.</strong> Autorisation de stationnement</div><div class="doc-item"><strong>7.</strong> RIB - Relevé d''Identité Bancaire</div></div><div style="text-align:center;background:#fef3c7;padding:25px;border-radius:15px;margin:25px 0"><p style="color:#92400e;font-weight:bold;margin-bottom:15px">📤 Uploadez vos documents maintenant !</p><a href="' || v_prospect_url || '" class="cta-button">ACCÉDER À MON ESPACE</a></div><div class="contact-box"><h3 style="color:#1e40af;margin-top:0">💬 Besoin d''aide ?</h3><p style="margin:10px 0"><strong>📞 01 80 85 57 86</strong><br><a href="mailto:team@taxiassur.com" style="color:#1e40af">📧 team@taxiassur.com</a></p></div></div><div class="footer"><div style="font-size:22px;font-weight:bold;color:#10b981;margin-bottom:10px">TaxiAssur</div><p>Courtier spécialisé en assurance taxi et VTC</p><p style="margin-top:10px;font-size:12px">ORIAS 11 061 425 - Excellence Coverage Risks</p></div></div></body></html>'
    )
  ) INTO v_response_id;
  
  -- Email à l'équipe
  SELECT net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object(
      'accept', 'application/json',
      'api-key', v_brevo_key,
      'content-type', 'application/json'
    ),
    body := jsonb_build_object(
      'sender', jsonb_build_object('name', 'TaxiAssur CRM', 'email', 'team@taxiassur.com'),
      'to', jsonb_build_array(
        jsonb_build_object('email', 'team@taxiassur.com', 'name', 'Équipe TaxiAssur'),
        jsonb_build_object('email', 'commercial@xcr.fr', 'name', 'Commercial XCR')
      ),
      'subject', '[TAXIASSUR] Nouveau Lead - ' || NEW.full_name || ' - ' || NEW.city,
      'htmlContent', '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f3f4f6;margin:0;padding:20px}.container{max-width:650px;margin:0 auto}.header{background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);color:white;padding:25px;text-align:center;border-radius:10px 10px 0 0}.content{background:#ffffff;padding:30px;border:1px solid #e5e7eb}.alert-box{background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:20px 0}.info-grid{display:grid;gap:15px;margin:20px 0}.info-item{background:#f9fafb;padding:15px;border-radius:8px;border:1px solid #e5e7eb}.info-label{color:#6b7280;font-size:12px;text-transform:uppercase;margin-bottom:5px}.info-value{color:#1f2937;font-weight:bold;font-size:16px}.cta-button{background:#10b981;color:white;padding:15px 30px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:bold}.footer{background:#1f2937;color:white;padding:20px;text-align:center;font-size:12px;border-radius:0 0 10px 10px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;font-size:28px">🚕 NOUVEAU LEAD TAXIASSUR</h1><p style="margin:10px 0 0 0">Traitement prioritaire requis</p></div><div class="content"><div class="alert-box"><strong>⚡ ACTION REQUISE :</strong> Contactez ce prospect dans les <strong>15 minutes</strong></div><h2 style="color:#1f2937;margin-top:0">📋 Informations du prospect</h2><div class="info-grid"><div class="info-item"><div class="info-label">Nom complet</div><div class="info-value">' || NEW.full_name || '</div></div><div class="info-item"><div class="info-label">📞 Téléphone</div><div class="info-value"><a href="tel:' || NEW.phone || '" style="color:#10b981;text-decoration:none">' || NEW.phone || '</a></div></div><div class="info-item"><div class="info-label">📧 Email</div><div class="info-value"><a href="mailto:' || NEW.email || '" style="color:#3b82f6;text-decoration:none">' || NEW.email || '</a></div></div><div class="info-item"><div class="info-label">📍 Ville</div><div class="info-value">' || NEW.city || '</div></div><div class="info-item"><div class="info-label">Statut</div><div class="info-value">' || NEW.status || '</div></div></div><h3 style="color:#1f2937">✅ Prochaines actions</h3><ol style="color:#4b5563;line-height:1.8"><li>Appeler le prospect au <strong>' || NEW.phone || '</strong></li><li>Qualifier le besoin et confirmer les informations</li><li>Vérifier l''envoi des 7 documents requis</li><li>Préparer et envoyer le devis sous 24h</li></ol><div style="text-align:center;margin:30px 0"><a href="https://taxiassur.com/backoffice/crm-commercial" class="cta-button">OUVRIR LE CRM</a></div></div><div class="footer"><strong>TaxiAssur CRM</strong> - Notification automatique</div></div></body></html>'
    )
  ) INTO v_response_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ne jamais bloquer l'insertion
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
CREATE TRIGGER trg_after_insert_lead_brevo
  AFTER INSERT ON crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION trg_send_lead_email_brevo();
