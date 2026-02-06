/*
  # Correction emails HTML pour notifications de documents

  Corrige le système pour envoyer des emails HTML au lieu de texte brut
  quand le commercial upload un document pour le prospect.
*/

-- Améliorer le cron pour générer les emails HTML au lieu d'utiliser le body texte
CREATE OR REPLACE FUNCTION process_document_notification_queue()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification record;
  v_lead record;
  v_email_body text;
  v_document_label text;
  v_prospect_url text;
  v_processed int := 0;
  v_errors int := 0;
BEGIN
  -- Récupérer les notifications en attente (limite 10 par exécution)
  FOR v_notification IN
    SELECT *
    FROM crm_document_notifications
    WHERE status = 'pending'
      AND sent_to IS NOT NULL
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    BEGIN
      -- Récupérer les infos du lead
      SELECT * INTO v_lead
      FROM crm_leads
      WHERE id = v_notification.lead_id;

      IF NOT FOUND OR v_lead.email IS NULL THEN
        -- Marquer comme erreur si pas de lead ou pas d'email
        UPDATE crm_document_notifications
        SET status = 'error',
            error_message = 'Lead non trouvé ou email manquant'
        WHERE id = v_notification.id;
        v_errors := v_errors + 1;
        CONTINUE;
      END IF;

      -- Extraire le label du document depuis les metadata
      v_document_label := COALESCE(
        v_notification.metadata->>'document_label',
        'Document'
      );

      -- URL de l'espace prospect
      v_prospect_url := 'https://taxiassur.com/espace-prospect?token=' || v_lead.access_token;

      -- Générer le HTML de l'email
      v_email_body := format(
        E'<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' ||
        E'body { font-family: Arial, sans-serif; line-height: 1.6; background: #f3f4f6; padding: 20px; }' ||
        E'.container { max-width: 650px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }' ||
        E'.header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; }' ||
        E'.content { padding: 30px; }' ||
        E'.success-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px; }' ||
        E'.document-badge { background: #3b82f6; color: white; padding: 12px 24px; border-radius: 25px; display: inline-block; margin: 15px 0; font-size: 16px; font-weight: bold; }' ||
        E'.info-box { background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #93c5fd; }' ||
        E'.cta-button { background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin-top: 20px; }' ||
        E'.footer { background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px; }' ||
        E'.icon { font-size: 48px; }' ||
        E'</style></head><body><div class="container">' ||
        E'<div class="header"><div class="icon">📄</div>' ||
        E'<h1 style="margin: 10px 0 0 0; font-size: 28px;">NOUVEAU DOCUMENT</h1>' ||
        E'<p style="margin: 10px 0 0 0; opacity: 0.9;">TaxiAssur - Mise à disposition de document</p></div>' ||
        E'<div class="content"><p style="font-size: 16px; color: #1f2937;">Bonjour %s,</p>' ||
        E'<div class="success-box"><p style="margin: 0; color: #1e40af; font-size: 16px;">' ||
        E'<strong>📥 Nouveau document disponible !</strong><br>' ||
        E'Votre conseiller TaxiAssur vient de mettre à votre disposition un nouveau document.</p></div>' ||
        E'<h2 style="color: #1f2937; margin-top: 25px;">Document disponible</h2>' ||
        E'<div class="document-badge">📄 %s</div>' ||
        E'<div class="info-box"><h3 style="color: #2563eb; margin-top: 0;">📋 Ce document contient :</h3>' ||
        E'<ul style="color: #4b5563; line-height: 1.8; margin: 10px 0;">' ||
        E'<li>📝 Toutes les informations importantes pour votre dossier</li>' ||
        E'<li>🔍 Les détails de votre contrat ou devis</li>' ||
        E'<li>✍️ Les éventuelles actions à effectuer de votre côté</li></ul></div>' ||
        E'<h3 style="color: #1f2937;">💡 Accédez à votre document</h3>' ||
        E'<p style="color: #4b5563;">Consultez et téléchargez votre document dès maintenant depuis votre espace personnel sécurisé.</p>' ||
        E'<div style="text-align: center; margin: 30px 0;">' ||
        E'<a href="%s" class="cta-button">📊 VOIR LE DOCUMENT</a></div>' ||
        E'<p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">' ||
        E'💬 <strong>Une question ?</strong> Répondez simplement à cet email ou appelez-nous au <strong>01 80 85 57 86</strong></p></div>' ||
        E'<div class="footer"><strong>TaxiAssur</strong><br>L''assurance taxi en toute simplicité<br>' ||
        E'<a href="https://taxiassur.com" style="color: #10b981; text-decoration: none;">taxiassur.com</a></div>' ||
        E'</div></body></html>',
        COALESCE(v_lead.first_name, 'Cher client'),
        v_document_label,
        v_prospect_url
      );

      -- Envoyer l'email via l'edge function
      PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/send-email-ionos',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'to', v_lead.email,
          'toName', COALESCE(v_lead.first_name || ' ' || v_lead.last_name, v_lead.email),
          'subject', '📄 Nouveau document disponible - TaxiAssur',
          'htmlBody', v_email_body,
          'fromEmail', 'team@taxiassur.com',
          'fromName', 'TaxiAssur'
        ),
        timeout_milliseconds := 5000
      );

      -- Marquer comme envoyé
      UPDATE crm_document_notifications
      SET status = 'sent',
          sent_at = now()
      WHERE id = v_notification.id;

      v_processed := v_processed + 1;

    EXCEPTION WHEN OTHERS THEN
      -- En cas d'erreur, logger et continuer
      UPDATE crm_document_notifications
      SET status = 'error',
          error_message = SQLERRM
      WHERE id = v_notification.id;
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed', v_processed,
    'errors', v_errors
  );
END;
$$;

-- Mettre à jour le cron pour utiliser la nouvelle fonction
SELECT cron.unschedule('send-document-notification-emails');

SELECT cron.schedule(
  'send-document-notification-emails',
  '*/1 * * * *', -- Toutes les minutes pour un envoi plus rapide
  $$
    SELECT process_document_notification_queue();
  $$
);

COMMENT ON FUNCTION process_document_notification_queue() IS 'Traite la file d''attente des notifications de documents et envoie des emails HTML au prospect';
