/*
  # Fix upsert_lead - Envoyer emails même pour leads existants
  
  ## Changement
  - Envoie maintenant les emails de notification même si le lead existe déjà
  - Permet au prospect de re-recevoir le lien d'accès à son espace
  - L'équipe reçoit une notification de "lead réactivé"
  
  ## Impact
  - Les prospects peuvent soumettre le formulaire plusieurs fois
  - Chaque soumission envoie un email de confirmation
  - L'équipe est notifiée à chaque fois
*/

CREATE OR REPLACE FUNCTION upsert_lead(
  p_email text,
  p_first_name text,
  p_last_name text DEFAULT '',
  p_phone text DEFAULT '',
  p_city text DEFAULT '',
  p_source text DEFAULT 'website',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(lead_id uuid, access_token text, is_new boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id uuid;
  v_token text;
  v_is_new boolean := false;
  v_existing_id uuid;
  v_existing_token text;
  v_full_name text;
  v_team_queue_id uuid;
  v_client_queue_id uuid;
  v_send_emails boolean := false;
BEGIN
  RAISE LOG '[UPSERT_LEAD] 🚀 Début - Email: %, Nom: % %', p_email, p_first_name, p_last_name;

  -- Vérifier si le lead existe
  SELECT crm_leads.id, crm_leads.access_token
  INTO v_existing_id, v_existing_token
  FROM crm_leads
  WHERE crm_leads.email = p_email
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Lead existant : mise à jour
    RAISE LOG '[UPSERT_LEAD] ℹ️  Lead existant trouvé: %', v_existing_id;
    v_lead_id := v_existing_id;
    v_is_new := false;
    v_send_emails := true; -- ✨ NOUVEAU : Envoyer emails même si existant

    -- Générer un nouveau token si vide
    IF v_existing_token IS NULL OR v_existing_token = '' THEN
      v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
      RAISE LOG '[UPSERT_LEAD] 🔑 Nouveau token généré';
    ELSE
      v_token := v_existing_token;
      RAISE LOG '[UPSERT_LEAD] 🔑 Token existant réutilisé';
    END IF;

    -- Mettre à jour
    UPDATE crm_leads SET
      first_name = COALESCE(p_first_name, crm_leads.first_name),
      last_name = COALESCE(NULLIF(p_last_name, ''), crm_leads.last_name),
      phone = COALESCE(NULLIF(p_phone, ''), crm_leads.phone),
      city = COALESCE(NULLIF(p_city, ''), crm_leads.city),
      source = COALESCE(NULLIF(p_source, ''), crm_leads.source),
      metadata = COALESCE(p_metadata, crm_leads.metadata),
      access_token = v_token,
      updated_at = now()
    WHERE crm_leads.id = v_lead_id;

    RAISE LOG '[UPSERT_LEAD] ✅ Lead mis à jour - Emails seront envoyés';

  ELSE
    -- Nouveau lead : création
    RAISE LOG '[UPSERT_LEAD] ✨ Création d''un NOUVEAU lead';
    v_is_new := true;
    v_send_emails := true;
    v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    v_lead_id := gen_random_uuid();

    RAISE LOG '[UPSERT_LEAD] 🔑 Lead ID: %', v_lead_id;
    RAISE LOG '[UPSERT_LEAD] 🔑 Token: %', substring(v_token from 1 for 16) || '...';

    INSERT INTO crm_leads (
      id,
      email,
      first_name,
      last_name,
      phone,
      city,
      source,
      status,
      current_stage_key,
      pipeline_stage,
      metadata,
      access_token,
      created_at,
      updated_at,
      stage_entered_at
    ) VALUES (
      v_lead_id,
      p_email,
      p_first_name,
      COALESCE(p_last_name, ''),
      COALESCE(p_phone, ''),
      COALESCE(p_city, ''),
      COALESCE(p_source, 'website'),
      'NOUVEAU_LEAD'::lead_status,
      'nouveau_lead',
      'nouveau_lead',
      COALESCE(p_metadata, '{}'::jsonb),
      v_token,
      now(),
      now(),
      now()
    );

    RAISE LOG '[UPSERT_LEAD] ✅ Nouveau lead créé dans crm_leads';
  END IF;

  -- ============================================
  -- ENVOYER LES EMAILS (nouveau ET existant)
  -- ============================================
  
  IF v_send_emails THEN
    v_full_name := p_first_name || CASE WHEN p_last_name != '' THEN ' ' || p_last_name ELSE '' END;

    BEGIN
      -- Email 1 : Pour l'équipe
      RAISE LOG '[UPSERT_LEAD] 📧 Envoi email équipe...';
      v_team_queue_id := queue_simple_email(
        p_lead_id := v_lead_id,
        p_email_type := CASE WHEN v_is_new THEN 'new_lead_team' ELSE 'lead_resubmitted_team' END,
        p_to_email := 'team@taxiassur.com',
        p_to_name := 'Équipe TaxiAssur',
        p_subject := format('%s LEAD: %s - %s', 
          CASE WHEN v_is_new THEN '🚨 NOUVEAU' ELSE '🔄 RÉACTIVÉ' END,
          v_full_name, 
          p_city
        ),
        p_html_content := format('
<h1>%s Lead</h1>
<p><strong>Nom:</strong> %s</p>
<p><strong>Email:</strong> <a href="mailto:%s">%s</a></p>
<p><strong>Téléphone:</strong> <a href="tel:%s">%s</a></p>
<p><strong>Ville:</strong> %s</p>
<p><strong>%s:</strong> %s</p>
<p><a href="https://taxiassur.com/backoffice/crm-killer/lead/%s" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">🔍 Voir le lead</a></p>
<hr>
<p style="color: #666; font-size: 12px;">TaxiAssur CRM - Notification automatique</p>
', 
          CASE WHEN v_is_new THEN '✅ Nouveau' ELSE '🔄 Réactivé' END,
          v_full_name,
          p_email, p_email,
          p_phone, p_phone,
          p_city,
          CASE WHEN v_is_new THEN 'Reçu le' ELSE 'Réactivé le' END,
          to_char(now(), 'DD/MM/YYYY à HH24:MI'),
          v_lead_id
        ),
        p_priority := 5
      );
      RAISE LOG '[UPSERT_LEAD] ✅ Email équipe créé: %', v_team_queue_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[UPSERT_LEAD] ❌ Erreur email équipe: %', SQLERRM;
    END;

    BEGIN
      -- Email 2 : Pour le prospect
      RAISE LOG '[UPSERT_LEAD] 📧 Envoi email prospect...';
      v_client_queue_id := queue_simple_email(
        p_lead_id := v_lead_id,
        p_email_type := 'new_lead_client',
        p_to_email := p_email,
        p_to_name := v_full_name,
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
          v_full_name,
          p_city,
          p_phone,
          v_token
        ),
        p_priority := 10
      );
      RAISE LOG '[UPSERT_LEAD] ✅ Email prospect créé: %', v_client_queue_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[UPSERT_LEAD] ❌ Erreur email prospect: %', SQLERRM;
    END;

    RAISE LOG '[UPSERT_LEAD] 🎉 2 emails ajoutés à la queue';
  END IF;

  -- Retourner les résultats
  RAISE LOG '[UPSERT_LEAD] 🎉 Fin - Lead ID: %, Is New: %, Emails: Envoyés', v_lead_id, v_is_new;
  RETURN QUERY SELECT v_lead_id, v_token, v_is_new;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[UPSERT_LEAD] ❌ ERREUR CRITIQUE: % (Code: %)', SQLERRM, SQLSTATE;
  RAISE;
END;
$function$;
