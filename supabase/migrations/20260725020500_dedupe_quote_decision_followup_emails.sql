/*
  # Deduplicate quote decision follow-up emails

  Prevents concurrent commercial optimization runs from enqueueing duplicate
  quote_decision_followup emails for the same lead, recipient and follow-up step.
*/

-- Production was checked before this index: no pending/sending duplicate quote follow-ups existed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_queue_quote_followup_pending_unique
ON public.email_queue (lead_id, lower(to_email), email_type, subject)
WHERE email_type = 'quote_decision_followup'
  AND status IN ('pending', 'sending');

CREATE OR REPLACE FUNCTION public.cron_quote_decision_followup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer := 0;
  v_skipped integer := 0;
  v_inserted integer := 0;
  v_quote record;
  v_template_subject text;
  v_template_body text;
  v_url text;
  v_step text;
  v_company_name text;
  v_to_name text;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('cron_quote_decision_followup')) THEN
    RETURN jsonb_build_object(
      'relances_devis_envoyees', 0,
      'relances_devis_ignorees', 0,
      'skipped', true,
      'reason', 'already_running',
      'executed_at', now()
    );
  END IF;

  FOR v_quote IN
    SELECT
      lcq.id,
      lcq.lead_id,
      lcq.insurance_company_id,
      COALESCE(lcq.sent_at, lcq.submitted_at) AS sent_at,
      lcq.last_sent_at,
      l.first_name,
      l.last_name,
      NULLIF(trim(l.email), '') AS email,
      NULLIF(trim(l.access_token), '') AS access_token,
      ic.name AS company_name,
      lcq.quote_amount,
      lcq.monthly_price
    FROM public.lead_company_quotes lcq
    JOIN public.crm_leads l ON l.id = lcq.lead_id
    LEFT JOIN public.insurance_companies ic ON ic.id = lcq.insurance_company_id
    WHERE COALESCE(lcq.sent_at, lcq.submitted_at) IS NOT NULL
      AND lcq.quote_accepted_at IS NULL
      AND lcq.refused_at IS NULL
      AND NULLIF(trim(l.email), '') IS NOT NULL
      AND lower(trim(l.email)) NOT IN ('undefined', 'null')
      AND NULLIF(trim(l.access_token), '') IS NOT NULL
      AND lower(trim(l.access_token)) NOT IN ('undefined', 'null')
      AND (
        (lcq.last_sent_at IS NULL AND COALESCE(lcq.sent_at, lcq.submitted_at) < now() - interval '3 days')
        OR (lcq.last_sent_at < now() - interval '4 days')
      )
    ORDER BY COALESCE(lcq.last_sent_at, COALESCE(lcq.sent_at, lcq.submitted_at)) ASC
    FOR UPDATE OF lcq SKIP LOCKED
  LOOP
    v_step := CASE
      WHEN v_quote.sent_at < now() - interval '14 days' THEN 'final'
      WHEN v_quote.sent_at < now() - interval '7 days' THEN 'second'
      ELSE 'first'
    END;

    v_company_name := NULLIF(trim(COALESCE(v_quote.company_name, '')), '');
    v_to_name := NULLIF(trim(concat_ws(' ', v_quote.first_name, v_quote.last_name)), '');
    v_url := 'https://taxiassur.com/espace-prospect/' || v_quote.access_token || '?tab=devis';

    v_template_subject := CASE v_step
      WHEN 'final' THEN 'Derniere relance : votre devis ' || COALESCE(v_company_name, 'TaxiAssur') || ' expire bientot'
      WHEN 'second' THEN 'Avez-vous pu consulter votre devis ' || COALESCE(v_company_name, 'TaxiAssur') || ' ?'
      ELSE 'Votre devis ' || COALESCE(v_company_name, 'TaxiAssur') || ' attend votre decision'
    END;

    IF EXISTS (
      SELECT 1
      FROM public.email_queue eq
      WHERE eq.lead_id = v_quote.lead_id
        AND eq.email_type = 'quote_decision_followup'
        AND lower(eq.to_email) = lower(v_quote.email)
        AND eq.subject = v_template_subject
        AND eq.status IN ('pending', 'sending', 'sent')
        AND eq.created_at >= v_quote.sent_at
      LIMIT 1
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_template_body := format(
      '<p>Bonjour %s,</p>' ||
      '<p>Votre devis%s est en attente de decision.</p>' ||
      '<p><strong>Souhaitez-vous l''accepter ou le refuser ?</strong> ' ||
      'Cliquez sur le bouton ci-dessous pour valider, refuser ou demander une modification.</p>' ||
      '<p style="text-align:center;margin:30px 0;">' ||
      '<a href="%s" style="background:#10b981;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;">' ||
      'Accepter ou refuser mon devis</a></p>' ||
      '<p>Sans reponse de votre part%s, votre devis pourrait expirer.</p>' ||
      '<p>L''equipe TaxiAssur</p>',
      COALESCE(v_quote.first_name, ''),
      CASE WHEN v_company_name IS NOT NULL THEN ' ' || v_company_name ELSE '' END,
      v_url,
      CASE v_step
        WHEN 'final' THEN ' sous 48h'
        WHEN 'second' THEN ' rapidement'
        ELSE ''
      END
    );

    INSERT INTO public.email_queue (
      to_email,
      to_name,
      subject,
      body,
      from_email,
      from_name,
      priority,
      status,
      scheduled_for,
      retry_count,
      max_retries,
      lead_id,
      email_type,
      metadata,
      created_at
    ) VALUES (
      v_quote.email,
      v_to_name,
      v_template_subject,
      v_template_body,
      'team@taxiassur.com',
      'TaxiAssur',
      10,
      'pending',
      now(),
      0,
      3,
      v_quote.lead_id,
      'quote_decision_followup',
      jsonb_build_object(
        'quote_id', v_quote.id,
        'insurance_company_id', v_quote.insurance_company_id,
        'company_name', v_company_name,
        'step', v_step,
        'quote_sent_at', v_quote.sent_at,
        'dedupe_scope', 'lead_email_subject_step'
      ),
      now()
    )
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    IF v_inserted = 1 THEN
      UPDATE public.lead_company_quotes
         SET last_sent_at = now()
       WHERE id = v_quote.id;

      v_count := v_count + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'relances_devis_envoyees', v_count,
    'relances_devis_ignorees', v_skipped,
    'executed_at', now()
  );
END;
$$;