/*
  # Lead Magnet Follow-Up Email System

  ## Summary
  Adds a follow-up tracking column to lead_magnet_downloads and creates a cron
  job that sends a J+48h follow-up email to users who downloaded a guide but
  haven't yet been sent a devis CTA email.

  ## Changes to existing tables
  - `lead_magnet_downloads`
    - `followup_sent_at` (timestamptz) — set when the follow-up has been dispatched

  ## New Functions
  - `process_lead_magnet_followups()` — finds eligible downloads and calls the
    send-email-ionos edge function with a personalised follow-up

  ## New Cron
  - Runs every day at 10:00 (Europe/Paris) — sends follow-ups to downloads
    that are 48–96 h old and haven't been followed up yet.
*/

-- 1. Add tracking column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_magnet_downloads' AND column_name = 'followup_sent_at'
  ) THEN
    ALTER TABLE lead_magnet_downloads ADD COLUMN followup_sent_at timestamptz;
  END IF;
END $$;

-- 2. Create the follow-up processing function
CREATE OR REPLACE FUNCTION public.process_lead_magnet_followups()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row       RECORD;
  v_sent      integer := 0;
  v_errors    integer := 0;
  v_html      text;
  v_result    jsonb;
  v_resp      jsonb;
  v_base_url  text;
  v_key       text;
BEGIN
  v_base_url := current_setting('app.supabase_url', true);
  v_key      := current_setting('app.service_role_key', true);

  FOR v_row IN
    SELECT id, email, first_name, guide_type, created_at
    FROM lead_magnet_downloads
    WHERE followup_sent_at IS NULL
      AND created_at < NOW() - INTERVAL '48 hours'
      AND created_at > NOW() - INTERVAL '96 hours'
    ORDER BY created_at
    LIMIT 50
  LOOP
    BEGIN
      v_html := format(
        $html$
        <!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#f4f6fa;font-family:Arial,sans-serif;">
        <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:32px 16px;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:100%%;">
              <tr><td style="background:linear-gradient(135deg,#1a1a2e 0%%,#0f3460 100%%);padding:40px;text-align:center;">
                <div style="font-size:28px;font-weight:900;color:#f5b400;margin-bottom:8px;">TaxiAssur</div>
              </td></tr>
              <tr><td style="padding:40px;">
                <p style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 16px;">Bonjour %s,</p>
                <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 24px;">
                  Vous avez telecharge notre guide il y a 2 jours. Avez-vous pu le consulter ?
                </p>
                <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 24px;">
                  La plupart de nos lecteurs economisent entre <strong>200 et 500€ par an</strong> apres avoir mis en
                  pratique les conseils du guide. Le plus simple est de nous laisser comparer les offres pour vous.
                </p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="https://taxiassur.com/#devis"
                     style="display:inline-block;background:#f5b400;color:#1a1a2e;font-weight:700;
                            font-size:16px;padding:16px 36px;border-radius:10px;text-decoration:none;">
                    Obtenir mon devis gratuit en 2 min
                  </a>
                </div>
                <p style="color:#888;font-size:13px;line-height:1.6;margin:0;">
                  Notre service est 100%% gratuit et sans engagement. Nous comparons 15+ assureurs pour vous.
                </p>
              </td></tr>
              <tr><td style="background:#f8f9fa;padding:20px 40px;border-top:1px solid #e8e8e8;">
                <p style="color:#aaa;font-size:12px;margin:0;text-align:center;">TaxiAssur · taxiassur.com</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
        </body></html>
        $html$,
        COALESCE(NULLIF(v_row.first_name, ''), 'Chauffeur')
      );

      SELECT content::jsonb INTO v_resp
      FROM http((
        'POST',
        v_base_url || '/functions/v1/send-email-ionos',
        ARRAY[
          http_header('Content-Type', 'application/json'),
          http_header('Authorization', 'Bearer ' || v_key),
          http_header('Apikey', v_key)
        ],
        'application/json',
        json_build_object(
          'to',      v_row.email,
          'toName',  COALESCE(NULLIF(v_row.first_name, ''), 'Chauffeur'),
          'subject', 'Avez-vous consulte votre guide assurance taxi ? — TaxiAssur',
          'html',    v_html
        )::text
      )::http_request);

      UPDATE lead_magnet_downloads
      SET followup_sent_at = NOW()
      WHERE id = v_row.id;

      v_sent := v_sent + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'sent',   v_sent,
    'errors', v_errors,
    'ts',     NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_lead_magnet_followups() TO service_role;

-- 3. Schedule the daily follow-up cron (10:00 Paris time = 09:00 UTC)
SELECT cron.schedule(
  'lead-magnet-followup-daily',
  '0 9 * * *',
  $$SELECT public.process_lead_magnet_followups();$$
);
