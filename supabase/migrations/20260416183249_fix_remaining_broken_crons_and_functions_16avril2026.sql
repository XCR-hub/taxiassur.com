/*
  # Fix remaining broken crons and functions

  1. Problem
    - recalculate_lead_scores (392): references `stage` column which does not exist in crm_leads, 
      the correct column is `pipeline_stage`
    - generate_ai_suggestions_cron (393): also references `stage` which does not exist
    - backlink-workflow-automation (334): process_backlink_outreach_workflow() fails because 
      backlink_opportunities have NULL contact_email, causing NOT NULL constraint violation

  2. Fixes Applied
    - Updated recalculate_lead_scores to use `pipeline_stage` column
    - Updated generate_ai_suggestions_cron to use `pipeline_stage` column
    - Updated process_backlink_outreach_workflow() to skip opportunities with NULL contact_email

  3. Important Notes
    - crm_leads table has `pipeline_stage` not `stage`
    - The backlink function now filters out opportunities without email addresses
*/

-- Fix recalculate_lead_scores (jobid 392) - 'stage' column doesn't exist, use 'pipeline_stage'
SELECT cron.alter_job(
  392,
  command := $$
SELECT calculate_lead_score(id)
FROM crm_leads
WHERE pipeline_stage NOT IN ('contrat_signe', 'perdu', 'Contrat Signé', 'Perdu')
AND deleted_at IS NULL
LIMIT 100;
$$
);

-- Fix generate_ai_suggestions_cron (jobid 393) - same issue with 'stage' column
SELECT cron.alter_job(
  393,
  command := $$
SELECT generate_ai_suggestions(id)
FROM crm_leads
WHERE status = 'active'
AND pipeline_stage NOT IN ('contrat_signe', 'perdu', 'Contrat Signé', 'Perdu')
AND deleted_at IS NULL
LIMIT 50;
$$
);

-- Fix process_backlink_outreach_workflow() - skip opportunities with NULL contact_email
CREATE OR REPLACE FUNCTION public.process_backlink_outreach_workflow()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_opportunity RECORD;
  v_template RECORD;
  v_email_body text;
  v_email_subject text;
  v_days_since_contact integer;
BEGIN
  FOR v_opportunity IN 
    SELECT * FROM backlink_opportunities
    WHERE status = 'new'
    AND email_sent_count = 0
    AND contact_email IS NOT NULL
    AND contact_email <> ''
    LIMIT 5
  LOOP
    SELECT * INTO v_template
    FROM email_templates
    WHERE name = 'backlink_premier_contact'
    LIMIT 1;
    
    IF v_template.id IS NOT NULL THEN
      v_email_subject := REPLACE(v_template.subject, '{{site_name}}', v_opportunity.domain);
      v_email_body := v_template.body;
      v_email_body := REPLACE(v_email_body, '{{contact_name}}', COALESCE(v_opportunity.contact_name, 'Équipe ' || v_opportunity.domain));
      v_email_body := REPLACE(v_email_body, '{{site_name}}', v_opportunity.domain);
      v_email_body := REPLACE(v_email_body, '{{niche}}', COALESCE(v_opportunity.description, 'votre secteur'));
      
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
      
      UPDATE backlink_opportunities
      SET 
        status = 'contacted',
        contacted_at = now(),
        last_contact_date = now(),
        email_sent_count = 1,
        updated_at = now()
      WHERE id = v_opportunity.id;
    END IF;
  END LOOP;
  
  FOR v_opportunity IN
    SELECT * FROM backlink_opportunities
    WHERE status = 'contacted'
    AND email_sent_count = 1
    AND contacted_at < (now() - INTERVAL '7 days')
    AND contact_email IS NOT NULL
    AND contact_email <> ''
    LIMIT 3
  LOOP
    v_days_since_contact := EXTRACT(DAY FROM (now() - v_opportunity.contacted_at));
    
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
    END IF;
  END LOOP;
  
  FOR v_opportunity IN
    SELECT * FROM backlink_opportunities
    WHERE status = 'contacted'
    AND email_sent_count = 2
    AND contacted_at < (now() - INTERVAL '21 days')
    AND contact_email IS NOT NULL
    AND contact_email <> ''
    LIMIT 2
  LOOP
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
    END IF;
  END LOOP;
  
  UPDATE backlink_opportunities
  SET 
    status = 'no_response',
    updated_at = now()
  WHERE status = 'contacted'
  AND email_sent_count >= 3
  AND contacted_at < (now() - INTERVAL '30 days');
END;
$function$;
