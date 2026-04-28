/*
  # Correction colonnes email_queue dans cron_quote_decision_followup

  La table `email_queue` utilise `body` et `email_type` (pas `body_html`).
*/

CREATE OR REPLACE FUNCTION public.cron_quote_decision_followup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer := 0;
  v_quote record;
  v_template_subject text;
  v_template_body text;
  v_url text;
  v_step text;
BEGIN
  FOR v_quote IN
    SELECT lcq.id, lcq.lead_id, lcq.sent_at, lcq.last_sent_at,
           l.first_name, l.last_name, l.email, l.access_token,
           ic.name AS company_name,
           lcq.quote_amount, lcq.monthly_price
    FROM lead_company_quotes lcq
    JOIN crm_leads l ON l.id = lcq.lead_id
    LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
    WHERE lcq.sent_at IS NOT NULL
      AND lcq.quote_accepted_at IS NULL
      AND lcq.refused_at IS NULL
      AND l.email IS NOT NULL
      AND l.access_token IS NOT NULL
      AND (
        (lcq.last_sent_at IS NULL AND lcq.sent_at < now() - interval '3 days')
        OR (lcq.last_sent_at < now() - interval '4 days')
      )
  LOOP
    v_step := CASE
      WHEN v_quote.sent_at < now() - interval '14 days' THEN 'final'
      WHEN v_quote.sent_at < now() - interval '7 days' THEN 'second'
      ELSE 'first'
    END;

    v_url := 'https://taxiassur.com/espace-prospect/' || v_quote.access_token || '?tab=devis';

    v_template_subject := CASE v_step
      WHEN 'final' THEN 'Dernière relance : votre devis ' || COALESCE(v_quote.company_name, '') || ' expire bientôt'
      WHEN 'second' THEN 'Avez-vous pu consulter votre devis ' || COALESCE(v_quote.company_name, '') || ' ?'
      ELSE 'Votre devis ' || COALESCE(v_quote.company_name, '') || ' attend votre décision'
    END;

    v_template_body := format(
      '<p>Bonjour %s,</p>'
      '<p>Votre devis%s est en attente de décision.</p>'
      '<p><strong>Souhaitez-vous l''accepter ou le refuser ?</strong> '
      'Cliquez sur le bouton ci-dessous pour valider, refuser ou demander une modification.</p>'
      '<p style="text-align:center;margin:30px 0;">'
      '<a href="%s" style="background:#10b981;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;">'
      'Accepter ou refuser mon devis</a></p>'
      '<p>Sans réponse de votre part%s, votre devis pourrait expirer.</p>'
      '<p>L''équipe TaxiAssur</p>',
      COALESCE(v_quote.first_name, ''),
      CASE WHEN v_quote.company_name IS NOT NULL THEN ' ' || v_quote.company_name ELSE '' END,
      v_url,
      CASE v_step
        WHEN 'final' THEN ' sous 48h'
        WHEN 'second' THEN ' rapidement'
        ELSE ''
      END
    );

    INSERT INTO email_queue (
      to_email, subject, body, lead_id, email_type, status, created_at
    ) VALUES (
      v_quote.email, v_template_subject, v_template_body,
      v_quote.lead_id, 'quote_decision_followup', 'pending', now()
    );

    UPDATE lead_company_quotes
       SET last_sent_at = now()
     WHERE id = v_quote.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('relances_devis_envoyees', v_count, 'executed_at', now());
END;
$$;
