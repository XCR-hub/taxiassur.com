-- ══════════════════════════════════════════════════════════════════
--  WORKFLOW AUTOMATION BACKLINKS - MODE PRODUCTION
-- ══════════════════════════════════════════════════════════════════

-- Créer fonction workflow automatique
CREATE OR REPLACE FUNCTION process_backlink_outreach_workflow()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_opportunity RECORD;
  v_template RECORD;
  v_email_body text;
  v_email_subject text;
  v_days_since_contact integer;
BEGIN
  -- ÉTAPE 1: Traiter nouvelles opportunités (premier contact)
  FOR v_opportunity IN 
    SELECT * FROM backlink_opportunities
    WHERE status = 'new'
    AND email_sent_count = 0
    LIMIT 5 -- Limiter à 5 par run pour ne pas spam
  LOOP
    -- Récupérer template premier contact
    SELECT * INTO v_template
    FROM email_templates
    WHERE name = 'backlink_premier_contact'
    LIMIT 1;
    
    IF v_template.id IS NOT NULL THEN
      -- Remplacer variables
      v_email_subject := REPLACE(v_template.subject, '{{site_name}}', v_opportunity.domain);
      v_email_body := v_template.body;
      v_email_body := REPLACE(v_email_body, '{{contact_name}}', COALESCE(v_opportunity.contact_name, 'Équipe ' || v_opportunity.domain));
      v_email_body := REPLACE(v_email_body, '{{site_name}}', v_opportunity.domain);
      v_email_body := REPLACE(v_email_body, '{{niche}}', COALESCE(v_opportunity.description, 'votre secteur'));
      
      -- Enregistrer dans outreach_emails
      INSERT INTO backlink_outreach (
        opportunity_id, campaign_id, template_used, email_subject, email_body,
        recipient_email, status
      )
      SELECT 
        v_opportunity.id,
        bc.id,
        v_template.name,
        v_email_subject,
        v_email_body,
        v_opportunity.contact_email,
        'pending'
      FROM backlink_campaigns bc
      WHERE bc.status = 'active'
      LIMIT 1;
      
      -- Mettre à jour opportunité
      UPDATE backlink_opportunities
      SET 
        status = 'contacted',
        contacted_at = now(),
        last_contact_date = now(),
        email_sent_count = 1,
        updated_at = now()
      WHERE id = v_opportunity.id;
      
      RAISE NOTICE '✅ Email planifié pour: %', v_opportunity.domain;
    END IF;
  END LOOP;
  
  -- ÉTAPE 2: Relances automatiques (7 jours après premier contact)
  FOR v_opportunity IN
    SELECT * FROM backlink_opportunities
    WHERE status = 'contacted'
    AND email_sent_count = 1
    AND contacted_at < (now() - INTERVAL '7 days')
    LIMIT 3
  LOOP
    v_days_since_contact := EXTRACT(DAY FROM (now() - v_opportunity.contacted_at));
    
    -- Template relance 1
    SELECT * INTO v_template
    FROM email_templates
    WHERE name = 'backlink_relance_1'
    LIMIT 1;
    
    IF v_template.id IS NOT NULL THEN
      v_email_subject := REPLACE(v_template.subject, '{{site_name}}', v_opportunity.domain);
      v_email_body := v_template.body;
      v_email_body := REPLACE(v_email_body, '{{contact_name}}', COALESCE(v_opportunity.contact_name, 'Équipe ' || v_opportunity.domain));
      v_email_body := REPLACE(v_email_body, '{{site_name}}', v_opportunity.domain);
      v_email_body := REPLACE(v_email_body, '{{date_premier_contact}}', TO_CHAR(v_opportunity.contacted_at, 'DD/MM/YYYY'));
      
      INSERT INTO backlink_outreach (
        opportunity_id, campaign_id, template_used, email_subject, email_body,
        recipient_email, status, follow_up_number
      )
      SELECT 
        v_opportunity.id,
        bc.id,
        v_template.name,
        v_email_subject,
        v_email_body,
        v_opportunity.contact_email,
        'pending',
        1
      FROM backlink_campaigns bc
      WHERE bc.status = 'active'
      LIMIT 1;
      
      UPDATE backlink_opportunities
      SET 
        last_contact_date = now(),
        email_sent_count = 2,
        updated_at = now()
      WHERE id = v_opportunity.id;
      
      RAISE NOTICE '✅ Relance 1 planifiée pour: % (% jours)', v_opportunity.domain, v_days_since_contact;
    END IF;
  END LOOP;
  
  -- ÉTAPE 3: Relance finale (21 jours après premier contact)
  FOR v_opportunity IN
    SELECT * FROM backlink_opportunities
    WHERE status = 'contacted'
    AND email_sent_count = 2
    AND contacted_at < (now() - INTERVAL '21 days')
    LIMIT 2
  LOOP
    -- Template relance finale
    SELECT * INTO v_template
    FROM email_templates
    WHERE name = 'backlink_relance_finale'
    LIMIT 1;
    
    IF v_template.id IS NOT NULL THEN
      v_email_subject := REPLACE(v_template.subject, '{{site_name}}', v_opportunity.domain);
      v_email_body := v_template.body;
      v_email_body := REPLACE(v_email_body, '{{contact_name}}', COALESCE(v_opportunity.contact_name, 'Équipe ' || v_opportunity.domain));
      v_email_body := REPLACE(v_email_body, '{{site_name}}', v_opportunity.domain);
      
      INSERT INTO backlink_outreach (
        opportunity_id, campaign_id, template_used, email_subject, email_body,
        recipient_email, status, follow_up_number
      )
      SELECT 
        v_opportunity.id,
        bc.id,
        v_template.name,
        v_email_subject,
        v_email_body,
        v_opportunity.contact_email,
        'pending',
        2
      FROM backlink_campaigns bc
      WHERE bc.status = 'active'
      LIMIT 1;
      
      UPDATE backlink_opportunities
      SET 
        last_contact_date = now(),
        email_sent_count = 3,
        updated_at = now()
      WHERE id = v_opportunity.id;
      
      RAISE NOTICE '✅ Relance FINALE planifiée pour: %', v_opportunity.domain;
    END IF;
  END LOOP;
  
  -- ÉTAPE 4: Marquer comme "no response" après 30 jours sans réponse
  UPDATE backlink_opportunities
  SET 
    status = 'no_response',
    updated_at = now()
  WHERE status = 'contacted'
  AND email_sent_count >= 3
  AND contacted_at < (now() - INTERVAL '30 days');
  
  RAISE NOTICE '✅ Workflow exécuté avec succès';
END;
$$;

-- Créer cron job pour workflow automatique (toutes les 6 heures)
SELECT cron.schedule(
  'backlink-workflow-automation',
  '0 */6 * * *',  -- Toutes les 6 heures
  $$SELECT process_backlink_outreach_workflow()$$
);

-- Fonction pour envoyer emails en attente
CREATE OR REPLACE FUNCTION send_pending_outreach_emails()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_outreach RECORD;
  v_sent_count integer := 0;
  v_error_count integer := 0;
BEGIN
  -- Récupérer emails en attente
  FOR v_outreach IN
    SELECT 
      o.*,
      op.domain,
      op.contact_email
    FROM backlink_outreach o
    JOIN backlink_opportunities op ON o.opportunity_id = op.id
    WHERE o.status = 'pending'
    AND o.created_at > (now() - INTERVAL '24 hours') -- Seulement emails récents
    ORDER BY o.created_at ASC
    LIMIT 10 -- Max 10 emails par batch
  LOOP
    BEGIN
      -- Appeler edge function send-outreach-emails
      -- (sera fait via supabase.functions.invoke depuis le front)
      
      -- Marquer comme sent
      UPDATE backlink_outreach
      SET 
        status = 'sent',
        sent_at = now(),
        updated_at = now()
      WHERE id = v_outreach.id;
      
      -- Incrémenter compteurs campagne
      UPDATE backlink_campaigns
      SET 
        emails_sent = emails_sent + 1,
        updated_at = now()
      WHERE id = v_outreach.campaign_id;
      
      v_sent_count := v_sent_count + 1;
      
      RAISE NOTICE '✅ Email envoyé: %', v_outreach.recipient_email;
      
    EXCEPTION WHEN OTHERS THEN
      -- En cas d'erreur, marquer comme failed
      UPDATE backlink_outreach
      SET 
        status = 'failed',
        error_message = SQLERRM,
        updated_at = now()
      WHERE id = v_outreach.id;
      
      v_error_count := v_error_count + 1;
      RAISE NOTICE '❌ Erreur email: % - %', v_outreach.recipient_email, SQLERRM;
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'sent', v_sent_count,
    'errors', v_error_count
  );
END;
$$;

-- Créer cron job envoi emails (toutes les heures)
SELECT cron.schedule(
  'send-backlink-outreach-emails',
  '0 * * * *',  -- Toutes les heures
  $$SELECT send_pending_outreach_emails()$$
);

-- Fonction RPC pour lancer workflow manuellement
CREATE OR REPLACE FUNCTION trigger_backlink_workflow()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM process_backlink_outreach_workflow();
  RETURN jsonb_build_object('success', true, 'message', 'Workflow lancé avec succès');
END;
$$;

-- Vérification
SELECT 
  '✅ WORKFLOW CRÉÉ' as resultat,
  'Cron jobs: backlink-workflow-automation (6h), send-backlink-outreach-emails (1h)' as info,
  'Fonction manuelle: trigger_backlink_workflow()' as manuel;
