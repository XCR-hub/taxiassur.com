/*
  # Amélioration de l'activation client avec email automatique

  Améliore la fonction activate_lead_as_client pour :
  - Envoyer automatiquement un email de félicitations au client
  - Fournir l'accès à l'espace client
  - Logger l'événement avec les détails
*/

CREATE OR REPLACE FUNCTION activate_lead_as_client(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_prospect_url text;
BEGIN
  -- Vérifier que le lead existe et est à l'étape contrat_final
  SELECT * INTO v_lead
  FROM crm_leads
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lead non trouvé'
    );
  END IF;

  -- Vérifier qu'on est bien à l'étape contrat_final
  IF v_lead.pipeline_stage != 'contrat_final' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Le lead doit être à l''étape "Contrat Final" (actuellement: %s)', v_lead.pipeline_stage),
      'current_stage', v_lead.pipeline_stage
    );
  END IF;

  -- Vérifier que le statut n'est pas déjà CLIENT_ACTIF
  IF v_lead.status = 'CLIENT_ACTIF' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Le lead est déjà un client actif'
    );
  END IF;

  -- Mettre à jour le statut en CLIENT_ACTIF
  UPDATE crm_leads
  SET 
    status = 'CLIENT_ACTIF'::lead_status,
    updated_at = now()
  WHERE id = p_lead_id;

  -- Logger l'événement
  INSERT INTO crm_event_notifications (
    lead_id,
    event_type,
    title,
    message,
    priority,
    metadata
  ) VALUES (
    p_lead_id,
    'lead_activated',
    'Client Activé',
    format('%s %s est maintenant un client actif', v_lead.first_name, v_lead.last_name),
    10,
    jsonb_build_object(
      'old_status', v_lead.status,
      'new_status', 'CLIENT_ACTIF',
      'pipeline_stage', 'contrat_final',
      'activated_by', auth.uid(),
      'activated_at', now()
    )
  );

  -- Envoyer email de félicitations au client via Edge Function
  IF v_lead.email IS NOT NULL AND v_lead.access_token IS NOT NULL THEN
    v_prospect_url := 'https://taxiassur.com/espace-client?token=' || v_lead.access_token;
    
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-crm-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'to', v_lead.email,
        'subject', 'Félicitations ! Bienvenue chez TaxiAssur',
        'content', format(
          E'<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' ||
          E'body { font-family: Arial, sans-serif; line-height: 1.6; background: #f3f4f6; padding: 20px; }' ||
          E'.container { max-width: 650px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }' ||
          E'.header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px; text-align: center; }' ||
          E'.content { padding: 40px; }' ||
          E'.success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; }' ||
          E'.cta-button { background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin-top: 20px; }' ||
          E'.footer { background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px; }' ||
          E'.party { font-size: 64px; margin-bottom: 20px; }' ||
          E'</style></head><body><div class="container">' ||
          E'<div class="header"><div class="party">🎉</div>' ||
          E'<h1 style="margin: 0; font-size: 32px;">FÉLICITATIONS !</h1>' ||
          E'<p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 18px;">Bienvenue chez TaxiAssur</p></div>' ||
          E'<div class="content"><p style="font-size: 18px; color: #1f2937;">Bonjour %s,</p>' ||
          E'<div class="success-box"><p style="margin: 0; color: #065f46; font-size: 18px; font-weight: bold;">' ||
          E'🎊 Votre contrat est maintenant actif !</p></div>' ||
          E'<h2 style="color: #1f2937;">Votre espace client est prêt</h2>' ||
          E'<p style="color: #4b5563; font-size: 16px;">Vous avez désormais accès à votre espace personnel où vous pouvez :</p>' ||
          E'<ul style="color: #4b5563; line-height: 1.8; font-size: 16px;">' ||
          E'<li>📄 Consulter tous vos documents contractuels</li>' ||
          E'<li>💳 Gérer vos paiements</li>' ||
          E'<li>🚨 Déclarer un sinistre en ligne</li>' ||
          E'<li>📞 Contacter votre conseiller</li>' ||
          E'<li>📊 Suivre votre dossier en temps réel</li></ul>' ||
          E'<div style="text-align: center; margin: 40px 0;">' ||
          E'<a href="%s" class="cta-button">🔐 ACCÉDER À MON ESPACE CLIENT</a></div>' ||
          E'<div style="background: #eff6ff; border: 2px solid #93c5fd; border-radius: 8px; padding: 20px; margin: 30px 0;">' ||
          E'<h3 style="color: #2563eb; margin-top: 0;">💡 Besoin d''aide ?</h3>' ||
          E'<p style="color: #4b5563; margin-bottom: 0;">Notre équipe est à votre disposition du lundi au vendredi de 9h à 18h.<br>' ||
          E'📞 <strong>01 80 85 57 86</strong> | 📧 <strong>team@taxiassur.com</strong></p></div>' ||
          E'<p style="color: #6b7280; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">' ||
          E'Merci de nous faire confiance pour votre assurance taxi.</p></div>' ||
          E'<div class="footer"><strong>TaxiAssur</strong><br>L''assurance taxi en toute simplicité<br>' ||
          E'<a href="https://taxiassur.com" style="color: #10b981; text-decoration: none;">taxiassur.com</a></div>' ||
          E'</div></body></html>',
          COALESCE(v_lead.first_name, 'Cher client'),
          v_prospect_url
        ),
        'leadId', p_lead_id
      ),
      timeout_milliseconds := 5000
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Lead activé avec succès en Client Actif',
    'lead_id', p_lead_id,
    'new_status', 'CLIENT_ACTIF',
    'email_sent', v_lead.email IS NOT NULL
  );
END;
$$;

COMMENT ON FUNCTION activate_lead_as_client(uuid) IS 'Active un lead en client actif et envoie automatiquement un email de félicitations avec accès à l''espace client';
