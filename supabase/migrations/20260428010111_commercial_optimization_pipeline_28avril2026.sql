/*
  # Pipeline d'optimisation commerciale (relances + escalades)

  Comble deux lacunes du système de relances :
  1. Aucune relance explicite "accepter / refuser" basée sur `lead_company_quotes`
  2. Aucune escalade vers le commercial quand documents ou décisions stagnent

  ## Nouvelles fonctions
  - `cron_quote_decision_followup()` : pour chaque devis envoyé sans décision
    après 3j / 7j / 14j, file un email "Acceptez ou refusez votre devis"
    dans `email_queue` (idempotent via `last_sent_at`).
  - `cron_escalate_stuck_documents_to_commercial()` : si un lead reste en
    statut documents avec pièces manquantes >5j, crée une notif commerciale
    dans `crm_event_notifications`.
  - `cron_escalate_stalled_quotes_to_commercial()` : si un devis envoyé
    dépasse 7j sans décision, crée une notif commerciale.
  - `cron_notify_commercial_on_refusal()` : pour chaque devis refusé dans
    les dernières 24h sans notif commerciale, en crée une.
  - `run_commercial_optimization_pipeline()` : orchestrateur appelé par cron.

  ## Cron
  - `commercial-optimization-2h` : toutes les 2 heures, exécute l'orchestrateur.

  ## Sécurité
  Toutes les fonctions sont SECURITY DEFINER avec search_path verrouillé.
  Aucune donnée existante n'est supprimée. RLS inchangée.
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
      to_email, subject, body_html, lead_id, status, created_at
    ) VALUES (
      v_quote.email, v_template_subject, v_template_body,
      v_quote.lead_id, 'pending', now()
    );

    UPDATE lead_company_quotes
       SET last_sent_at = now()
     WHERE id = v_quote.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('relances_devis_envoyees', v_count, 'executed_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.cron_escalate_stuck_documents_to_commercial()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer := 0;
  v_lead record;
BEGIN
  FOR v_lead IN
    SELECT l.id, l.first_name, l.last_name, l.email, l.created_at, l.assigned_to
    FROM crm_leads l
    WHERE l.status IN ('nouveau_lead', 'documents_en_cours', 'collecte_documents', 'COLLECTE_DOCUMENTS')
      AND l.created_at < now() - interval '5 days'
      AND COALESCE(l.is_archived, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM crm_event_notifications n
        WHERE n.lead_id = l.id
          AND n.event_type = 'documents_stalled'
          AND n.created_at > now() - interval '3 days'
      )
  LOOP
    INSERT INTO crm_event_notifications (
      lead_id, event_type, type, title, message, priority, context_data, action_url, created_at
    ) VALUES (
      v_lead.id,
      'documents_stalled',
      'warning',
      'Documents bloqués depuis +5 jours',
      format('Le prospect %s %s n''a toujours pas fourni tous les documents nécessaires pour générer un devis.',
             COALESCE(v_lead.first_name, ''), COALESCE(v_lead.last_name, '')),
      2,
      jsonb_build_object('lead_id', v_lead.id, 'days_since_creation',
                         EXTRACT(DAY FROM now() - v_lead.created_at)),
      '/admin/crm/leads/' || v_lead.id,
      now()
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('escalades_documents', v_count, 'executed_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.cron_escalate_stalled_quotes_to_commercial()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer := 0;
  v_quote record;
BEGIN
  FOR v_quote IN
    SELECT lcq.id, lcq.lead_id, lcq.sent_at,
           l.first_name, l.last_name,
           ic.name AS company_name
    FROM lead_company_quotes lcq
    JOIN crm_leads l ON l.id = lcq.lead_id
    LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
    WHERE lcq.sent_at IS NOT NULL
      AND lcq.sent_at < now() - interval '7 days'
      AND lcq.quote_accepted_at IS NULL
      AND lcq.refused_at IS NULL
      AND COALESCE(l.is_archived, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM crm_event_notifications n
        WHERE n.lead_id = lcq.lead_id
          AND n.event_type = 'quote_stalled'
          AND n.context_data->>'quote_id' = lcq.id::text
          AND n.created_at > now() - interval '5 days'
      )
  LOOP
    INSERT INTO crm_event_notifications (
      lead_id, event_type, type, title, message, priority, context_data, action_url, created_at
    ) VALUES (
      v_quote.lead_id,
      'quote_stalled',
      'warning',
      'Devis sans décision depuis +7 jours',
      format('%s %s n''a pas répondu au devis %s. Un appel pourrait débloquer la situation.',
             COALESCE(v_quote.first_name, ''), COALESCE(v_quote.last_name, ''),
             COALESCE(v_quote.company_name, '')),
      2,
      jsonb_build_object('quote_id', v_quote.id, 'lead_id', v_quote.lead_id,
                         'days_since_sent', EXTRACT(DAY FROM now() - v_quote.sent_at)),
      '/admin/crm/leads/' || v_quote.lead_id,
      now()
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('escalades_devis', v_count, 'executed_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.cron_notify_commercial_on_refusal()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer := 0;
  v_quote record;
BEGIN
  FOR v_quote IN
    SELECT lcq.id, lcq.lead_id, lcq.refused_at, lcq.refusal_reason,
           l.first_name, l.last_name,
           ic.name AS company_name
    FROM lead_company_quotes lcq
    JOIN crm_leads l ON l.id = lcq.lead_id
    LEFT JOIN insurance_companies ic ON ic.id = lcq.insurance_company_id
    WHERE lcq.refused_at IS NOT NULL
      AND lcq.refused_at > now() - interval '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM crm_event_notifications n
        WHERE n.lead_id = lcq.lead_id
          AND n.event_type = 'quote_refused_alert'
          AND n.context_data->>'quote_id' = lcq.id::text
      )
  LOOP
    INSERT INTO crm_event_notifications (
      lead_id, event_type, type, title, message, priority, context_data, action_url, created_at
    ) VALUES (
      v_quote.lead_id,
      'quote_refused_alert',
      'error',
      'Devis refusé par le prospect',
      format('%s %s a refusé le devis %s. Motif : %s',
             COALESCE(v_quote.first_name, ''), COALESCE(v_quote.last_name, ''),
             COALESCE(v_quote.company_name, ''),
             COALESCE(v_quote.refusal_reason, 'non précisé')),
      3,
      jsonb_build_object('quote_id', v_quote.id, 'lead_id', v_quote.lead_id,
                         'refusal_reason', v_quote.refusal_reason),
      '/admin/crm/leads/' || v_quote.lead_id,
      now()
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('notifs_refus', v_count, 'executed_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.run_commercial_optimization_pipeline()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_followup jsonb;
  v_doc_esc jsonb;
  v_quote_esc jsonb;
  v_refusal jsonb;
BEGIN
  v_followup := cron_quote_decision_followup();
  v_doc_esc := cron_escalate_stuck_documents_to_commercial();
  v_quote_esc := cron_escalate_stalled_quotes_to_commercial();
  v_refusal := cron_notify_commercial_on_refusal();

  RETURN jsonb_build_object(
    'quote_followup', v_followup,
    'documents_escalation', v_doc_esc,
    'quotes_escalation', v_quote_esc,
    'refusal_notifications', v_refusal,
    'completed_at', now()
  );
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'commercial-optimization-2h') THEN
    PERFORM cron.unschedule('commercial-optimization-2h');
  END IF;

  PERFORM cron.schedule(
    'commercial-optimization-2h',
    '0 */2 * * *',
    $cron$ SELECT public.run_commercial_optimization_pipeline(); $cron$
  );
END $$;
